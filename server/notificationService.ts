import { storage } from "./storage";
import type { InsertNotification, User, Transfer, Termination, AssetDailyState, NotificationSubjectType, NotificationSeverity } from "@shared/schema";

interface NotificationContext {
  actorUserId: string;
  subjectType: NotificationSubjectType;
  subjectId: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private async getManagersForUser(userId: string): Promise<User[]> {
    const user = await storage.getUser(userId);
    if (!user) return [];

    const managers: User[] = [];

    if (user.reportsTo) {
      const directManager = await storage.getUser(user.reportsTo);
      if (directManager) {
        managers.push(directManager);
      }
    }

    const allUsers = await storage.getAllUsers();
    const ccManagers = allUsers.filter(u => 
      u.role === 'contact_center_manager' || 
      u.role === 'contact_center_ops_manager'
    );
    
    for (const manager of ccManagers) {
      if (!managers.find(m => m.id === manager.id)) {
        managers.push(manager);
      }
    }

    return managers;
  }

  private async getManagerForTeamLeader(teamLeaderId: string): Promise<User | undefined> {
    const teamLeader = await storage.getUser(teamLeaderId);
    if (!teamLeader || !teamLeader.reportsTo) return undefined;
    
    return storage.getUser(teamLeader.reportsTo);
  }

  private async getTeamLeaderForAgent(agentId: string): Promise<User | undefined> {
    const teams = await storage.getUserTeams(agentId);
    if (teams.length === 0) return undefined;

    const team = teams[0];
    if (team.leaderId) {
      return storage.getUser(team.leaderId);
    }
    return undefined;
  }

  private async getTeamLeaderByTeamId(teamId: string): Promise<User | undefined> {
    const allTeams = await storage.getAllTeams();
    const team = allTeams.find(t => t.id === teamId);
    if (!team || !team.leaderId) return undefined;
    
    return storage.getUser(team.leaderId);
  }

  private async getHRUsers(): Promise<User[]> {
    return storage.getUsersByRole('hr');
  }

  private async getAdminUsers(): Promise<User[]> {
    return storage.getUsersByRole('admin');
  }

  private async getActionUrlForRecipient(recipientId: string, viewType: 'transfers' | 'terminations' | 'assets' | 'employees' | 'team'): Promise<string> {
    const recipient = await storage.getUser(recipientId);
    if (!recipient) return '/';

    const viewParam = viewType !== 'team' ? `?view=${viewType}` : '';
    
    switch (recipient.role) {
      case 'admin':
        if (viewType === 'team') return '/admin/team-leader';
        return `/admin/hr${viewParam}`;
      case 'hr':
        if (viewType === 'team') return '/';
        return `/hr${viewParam}`;
      case 'contact_center_manager':
      case 'contact_center_ops_manager':
        return '/contact-center';
      case 'team_leader':
        return '/team-leader';
      default:
        return '/';
    }
  }

  private getTerminationMessage(statusType: string, agentName: string, comment?: string | null): { title: string; body: string; severity: NotificationSeverity } {
    switch (statusType) {
      case 'AWOL':
        return {
          title: 'Agent AWOL Alert',
          body: `${agentName} has been marked as Absent Without Leave (AWOL). Immediate attention required.${comment ? ` Reason: ${comment}` : ''}`,
          severity: 'urgent'
        };
      case 'suspended':
        return {
          title: 'Agent Suspended',
          body: `${agentName} has been placed on suspension pending investigation.${comment ? ` Reason: ${comment}` : ''}`,
          severity: 'warning'
        };
      case 'resignation':
        return {
          title: 'Agent Resignation Notice',
          body: `${agentName} has submitted their resignation.${comment ? ` Details: ${comment}` : ''}`,
          severity: 'info'
        };
      case 'terminated':
        return {
          title: 'Agent Terminated',
          body: `${agentName} has been terminated from their position.${comment ? ` Reason: ${comment}` : ''}`,
          severity: 'warning'
        };
      default:
        return {
          title: `Agent ${statusType} Status`,
          body: `${agentName} has been marked as ${statusType}.${comment ? ` Comment: ${comment}` : ''}`,
          severity: 'warning'
        };
    }
  }

  async notifyTransferRequested(transfer: Transfer, requestedByUser: User): Promise<void> {
    const targetUser = await storage.getUser(transfer.userId);
    if (!targetUser) return;

    const teamLeader = await this.getTeamLeaderForAgent(transfer.userId);
    const managers = await this.getManagersForUser(transfer.userId);
    const hrUsers = await this.getHRUsers();
    const adminUsers = await this.getAdminUsers();

    const recipientIds = new Set<string>();
    if (teamLeader) recipientIds.add(teamLeader.id);
    managers.forEach(m => recipientIds.add(m.id));
    hrUsers.forEach(h => recipientIds.add(h.id));
    adminUsers.forEach(a => recipientIds.add(a.id));

    recipientIds.delete(requestedByUser.id);

    const notifications: InsertNotification[] = [];
    const targetName = targetUser.firstName && targetUser.lastName 
      ? `${targetUser.firstName} ${targetUser.lastName}` 
      : targetUser.username;

    for (const recipientId of Array.from(recipientIds)) {
      const actionUrl = await this.getActionUrlForRecipient(recipientId, 'transfers');
      notifications.push({
        recipientUserId: recipientId,
        actorUserId: requestedByUser.id,
        subjectType: 'transfer',
        subjectId: transfer.id,
        severity: 'warning',
        title: 'Transfer Request Pending Approval',
        body: `A ${transfer.transferType} transfer has been requested for ${targetName}. Please review and approve/reject.`,
        metadata: {
          transferType: transfer.transferType,
          targetUserId: transfer.userId,
          targetUserName: targetName,
          fromDepartmentId: transfer.fromDepartmentId,
          toDepartmentId: transfer.toDepartmentId
        },
        requiresAction: true,
        actionUrl
      });
    }

    if (notifications.length > 0) {
      await storage.createBulkNotifications(notifications);
    }
  }

  async notifyTransferApproved(transfer: Transfer, approvedByUser: User): Promise<void> {
    const targetUser = await storage.getUser(transfer.userId);
    if (!targetUser) return;

    const notifications: InsertNotification[] = [];
    const targetName = targetUser.firstName && targetUser.lastName 
      ? `${targetUser.firstName} ${targetUser.lastName}` 
      : targetUser.username;

    const notifiedIds = new Set<string>();
    notifiedIds.add(approvedByUser.id);

    if (transfer.requestedBy && transfer.requestedBy !== approvedByUser.id) {
      const actionUrl = await this.getActionUrlForRecipient(transfer.requestedBy, 'transfers');
      notifications.push({
        recipientUserId: transfer.requestedBy,
        actorUserId: approvedByUser.id,
        subjectType: 'transfer',
        subjectId: transfer.id,
        severity: 'info',
        title: 'Transfer Request Approved',
        body: `The ${transfer.transferType} transfer for ${targetName} has been approved.`,
        metadata: {
          transferType: transfer.transferType,
          targetUserId: transfer.userId,
          targetUserName: targetName
        },
        requiresAction: false,
        actionUrl
      });
      notifiedIds.add(transfer.requestedBy);
    }

    let oldTeamLeader: User | undefined;
    if (transfer.fromTeamId) {
      oldTeamLeader = await this.getTeamLeaderByTeamId(transfer.fromTeamId);
    }
    if (!oldTeamLeader) {
      oldTeamLeader = await this.getTeamLeaderForAgent(transfer.userId);
    }
    
    if (oldTeamLeader && !notifiedIds.has(oldTeamLeader.id)) {
      const actionUrl = await this.getActionUrlForRecipient(oldTeamLeader.id, 'team');
      notifications.push({
        recipientUserId: oldTeamLeader.id,
        actorUserId: approvedByUser.id,
        subjectType: 'transfer',
        subjectId: transfer.id,
        severity: 'info',
        title: 'Agent Transferred Out',
        body: `${targetName} has been transferred out of your team. Transfer type: ${transfer.transferType}.`,
        metadata: {
          transferType: transfer.transferType,
          targetUserId: transfer.userId,
          targetUserName: targetName,
          direction: 'outgoing'
        },
        requiresAction: false,
        actionUrl
      });
      notifiedIds.add(oldTeamLeader.id);
    }

    if (transfer.toTeamId) {
      const newTeamLeader = await this.getTeamLeaderByTeamId(transfer.toTeamId);
      if (newTeamLeader && !notifiedIds.has(newTeamLeader.id)) {
        const actionUrl = await this.getActionUrlForRecipient(newTeamLeader.id, 'team');
        notifications.push({
          recipientUserId: newTeamLeader.id,
          actorUserId: approvedByUser.id,
          subjectType: 'transfer',
          subjectId: transfer.id,
          severity: 'info',
          title: 'New Agent Assigned',
          body: `${targetName} has been transferred to your team. Transfer type: ${transfer.transferType}.`,
          metadata: {
            transferType: transfer.transferType,
            targetUserId: transfer.userId,
            targetUserName: targetName,
            direction: 'incoming'
          },
          requiresAction: false,
          actionUrl
        });
        notifiedIds.add(newTeamLeader.id);
      }
    }

    if (notifications.length > 0) {
      await storage.createBulkNotifications(notifications);
    }
  }

  async notifyTransferRejected(transfer: Transfer, rejectedByUser: User, reason?: string): Promise<void> {
    const targetUser = await storage.getUser(transfer.userId);
    if (!targetUser) return;

    const targetName = targetUser.firstName && targetUser.lastName 
      ? `${targetUser.firstName} ${targetUser.lastName}` 
      : targetUser.username;

    if (transfer.requestedBy !== rejectedByUser.id) {
      const actionUrl = await this.getActionUrlForRecipient(transfer.requestedBy, 'transfers');
      await storage.createNotification({
        recipientUserId: transfer.requestedBy,
        actorUserId: rejectedByUser.id,
        subjectType: 'transfer',
        subjectId: transfer.id,
        severity: 'warning',
        title: 'Transfer Request Rejected',
        body: `The ${transfer.transferType} transfer for ${targetName} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
        metadata: {
          transferType: transfer.transferType,
          targetUserId: transfer.userId,
          targetUserName: targetName,
          reason
        },
        requiresAction: false,
        actionUrl
      });
    }
  }

  async notifyTerminationCreated(termination: Termination, processedByUser: User): Promise<void> {
    const targetUser = await storage.getUser(termination.userId);
    if (!targetUser) return;

    const notifications: InsertNotification[] = [];
    const targetName = targetUser.firstName && targetUser.lastName 
      ? `${targetUser.firstName} ${targetUser.lastName}` 
      : targetUser.username;

    const recipientIds = new Set<string>();
    
    recipientIds.add(processedByUser.id);
    
    if (processedByUser.role === 'team_leader') {
      const managerOfProcessor = await this.getManagerForTeamLeader(processedByUser.id);
      if (managerOfProcessor) {
        recipientIds.add(managerOfProcessor.id);
        console.log(`[NotificationService] Termination: notifying manager ${managerOfProcessor.username} of team leader ${processedByUser.username}`);
      } else {
        console.warn(`[NotificationService] Termination: team leader ${processedByUser.username} has no manager assigned`);
        const allManagers = await this.getManagersForUser(termination.userId);
        allManagers.forEach(m => recipientIds.add(m.id));
      }
    } else {
      const agentTeamLeader = await this.getTeamLeaderForAgent(termination.userId);
      if (agentTeamLeader) {
        recipientIds.add(agentTeamLeader.id);
        const managerForAgentTeamLeader = await this.getManagerForTeamLeader(agentTeamLeader.id);
        if (managerForAgentTeamLeader) {
          recipientIds.add(managerForAgentTeamLeader.id);
        }
      } else {
        const allManagers = await this.getManagersForUser(termination.userId);
        allManagers.forEach(m => recipientIds.add(m.id));
      }
    }

    const hrUsers = await this.getHRUsers();
    const adminUsers = await this.getAdminUsers();
    
    hrUsers.forEach(h => recipientIds.add(h.id));
    adminUsers.forEach(a => recipientIds.add(a.id));

    const terminationMessage = this.getTerminationMessage(
      termination.statusType, 
      targetName, 
      termination.comment
    );

    const processedByName = processedByUser.firstName && processedByUser.lastName
      ? `${processedByUser.firstName} ${processedByUser.lastName}`
      : processedByUser.username;

    for (const recipientId of Array.from(recipientIds)) {
      const isProcessedBy = recipientId === processedByUser.id;
      const actionUrl = await this.getActionUrlForRecipient(recipientId, 'terminations');
      notifications.push({
        recipientUserId: recipientId,
        actorUserId: processedByUser.id,
        subjectType: 'termination',
        subjectId: termination.id,
        severity: terminationMessage.severity,
        title: isProcessedBy ? `${terminationMessage.title} - Confirmation` : terminationMessage.title,
        body: isProcessedBy 
          ? `You have recorded: ${terminationMessage.body}`
          : `${terminationMessage.body} (Reported by: ${processedByName})`,
        metadata: {
          statusType: termination.statusType,
          targetUserId: termination.userId,
          targetUserName: targetName,
          processedByName,
          processedByRole: processedByUser.role,
          effectiveDate: termination.effectiveDate,
          isConfirmation: isProcessedBy
        },
        requiresAction: false,
        actionUrl
      });
    }

    if (notifications.length > 0) {
      await storage.createBulkNotifications(notifications);
    }
  }

  async notifyAssetLost(assetState: AssetDailyState, reportedByUser: User): Promise<void> {
    const targetUser = await storage.getUser(assetState.userId);
    if (!targetUser) return;

    const notifications: InsertNotification[] = [];
    const targetName = targetUser.firstName && targetUser.lastName 
      ? `${targetUser.firstName} ${targetUser.lastName}` 
      : targetUser.username;

    const teamLeader = await this.getTeamLeaderForAgent(assetState.userId);
    const managers = await this.getManagersForUser(assetState.userId);
    const hrUsers = await this.getHRUsers();
    const adminUsers = await this.getAdminUsers();

    const recipientIds = new Set<string>();
    
    if (teamLeader && teamLeader.id !== reportedByUser.id) {
      recipientIds.add(teamLeader.id);
    }
    
    managers.forEach(m => {
      if (m.id !== reportedByUser.id) recipientIds.add(m.id);
    });
    
    hrUsers.forEach(h => {
      if (h.id !== reportedByUser.id) recipientIds.add(h.id);
    });
    
    adminUsers.forEach(a => {
      if (a.id !== reportedByUser.id) recipientIds.add(a.id);
    });

    for (const recipientId of Array.from(recipientIds)) {
      const actionUrl = await this.getActionUrlForRecipient(recipientId, 'assets');
      notifications.push({
        recipientUserId: recipientId,
        actorUserId: reportedByUser.id,
        subjectType: 'asset',
        subjectId: assetState.id,
        severity: 'urgent',
        title: 'Asset Reported Lost',
        body: `${targetName}'s ${assetState.assetType} has been reported as lost.${assetState.reason ? ` Reason: ${assetState.reason}` : ''}`,
        metadata: {
          assetType: assetState.assetType,
          targetUserId: assetState.userId,
          targetUserName: targetName,
          date: assetState.date,
          currentState: assetState.currentState
        },
        requiresAction: true,
        actionUrl
      });
    }

    if (notifications.length > 0) {
      await storage.createBulkNotifications(notifications);
    }
  }

  async notifyAssetNotReturned(assetState: AssetDailyState, reportedByUser: User): Promise<void> {
    const targetUser = await storage.getUser(assetState.userId);
    if (!targetUser) return;

    const notifications: InsertNotification[] = [];
    const targetName = targetUser.firstName && targetUser.lastName 
      ? `${targetUser.firstName} ${targetUser.lastName}` 
      : targetUser.username;

    const teamLeader = await this.getTeamLeaderForAgent(assetState.userId);
    const managers = await this.getManagersForUser(assetState.userId);
    const hrUsers = await this.getHRUsers();
    const adminUsers = await this.getAdminUsers();

    const recipientIds = new Set<string>();
    
    if (teamLeader && teamLeader.id !== reportedByUser.id) {
      recipientIds.add(teamLeader.id);
    }
    
    managers.forEach(m => {
      if (m.id !== reportedByUser.id) recipientIds.add(m.id);
    });
    
    hrUsers.forEach(h => {
      if (h.id !== reportedByUser.id) recipientIds.add(h.id);
    });
    
    adminUsers.forEach(a => {
      if (a.id !== reportedByUser.id) recipientIds.add(a.id);
    });

    for (const recipientId of Array.from(recipientIds)) {
      const actionUrl = await this.getActionUrlForRecipient(recipientId, 'assets');
      notifications.push({
        recipientUserId: recipientId,
        actorUserId: reportedByUser.id,
        subjectType: 'asset',
        subjectId: assetState.id,
        severity: 'warning',
        title: 'Asset Not Returned',
        body: `${targetName} has not returned their ${assetState.assetType}.`,
        metadata: {
          assetType: assetState.assetType,
          targetUserId: assetState.userId,
          targetUserName: targetName,
          date: assetState.date,
          currentState: assetState.currentState
        },
        requiresAction: true,
        actionUrl
      });
    }

    if (notifications.length > 0) {
      await storage.createBulkNotifications(notifications);
    }
  }

  async createSystemNotification(
    recipientUserId: string, 
    title: string, 
    body: string, 
    severity: NotificationSeverity = 'info',
    actionUrl?: string
  ): Promise<void> {
    await storage.createNotification({
      recipientUserId,
      actorUserId: null,
      subjectType: 'system',
      subjectId: null,
      severity,
      title,
      body,
      metadata: null,
      requiresAction: false,
      actionUrl: actionUrl || null
    });
  }

  async notifyDepartmentChange(
    userId: string, 
    oldDepartmentId: string | null, 
    newDepartmentId: string | null,
    changedByUser: User
  ): Promise<void> {
    const targetUser = await storage.getUser(userId);
    if (!targetUser) return;

    const allDepartments = await storage.getAllDepartments();
    const oldDept = oldDepartmentId ? allDepartments.find(d => d.id === oldDepartmentId) : null;
    const newDept = newDepartmentId ? allDepartments.find(d => d.id === newDepartmentId) : null;

    const targetName = targetUser.firstName && targetUser.lastName 
      ? `${targetUser.firstName} ${targetUser.lastName}` 
      : targetUser.username;

    const notifications: InsertNotification[] = [];
    const notifiedIds = new Set<string>();
    notifiedIds.add(changedByUser.id);

    const managers = await this.getManagersForUser(userId);
    for (const manager of managers) {
      if (!notifiedIds.has(manager.id)) {
        const actionUrl = await this.getActionUrlForRecipient(manager.id, 'employees');
        notifications.push({
          recipientUserId: manager.id,
          actorUserId: changedByUser.id,
          subjectType: 'transfer',
          subjectId: null,
          severity: 'info',
          title: 'Department Assignment Changed',
          body: `${targetName} has been moved from ${oldDept?.name || 'No Department'} to ${newDept?.name || 'No Department'}.`,
          metadata: {
            targetUserId: userId,
            targetUserName: targetName,
            oldDepartmentId,
            oldDepartmentName: oldDept?.name,
            newDepartmentId,
            newDepartmentName: newDept?.name
          },
          requiresAction: false,
          actionUrl
        });
        notifiedIds.add(manager.id);
      }
    }

    const currentTeamLeader = await this.getTeamLeaderForAgent(userId);
    
    if (currentTeamLeader && !notifiedIds.has(currentTeamLeader.id)) {
      const actionUrl = await this.getActionUrlForRecipient(currentTeamLeader.id, 'team');
      notifications.push({
        recipientUserId: currentTeamLeader.id,
        actorUserId: changedByUser.id,
        subjectType: 'transfer',
        subjectId: null,
        severity: 'info',
        title: 'Agent Department Changed',
        body: `Your team member ${targetName} has been moved from ${oldDept?.name || 'No Department'} to ${newDept?.name || 'No Department'}.`,
        metadata: {
          targetUserId: userId,
          targetUserName: targetName,
          oldDepartmentId,
          oldDepartmentName: oldDept?.name,
          newDepartmentId,
          newDepartmentName: newDept?.name
        },
        requiresAction: false,
        actionUrl
      });
      notifiedIds.add(currentTeamLeader.id);
    }

    if (notifications.length > 0) {
      await storage.createBulkNotifications(notifications);
    }
  }

  async notifyAgentAddedToTeam(
    agentUserId: string,
    teamId: string,
    addedByUser: User
  ): Promise<void> {
    const agent = await storage.getUser(agentUserId);
    if (!agent) {
      console.warn(`[NotificationService] Cannot notify agent added: agent ${agentUserId} not found`);
      return;
    }

    const teamLeader = await this.getTeamLeaderByTeamId(teamId);
    if (!teamLeader) {
      console.warn(`[NotificationService] Cannot notify agent added: team ${teamId} has no leader`);
      return;
    }
    
    if (teamLeader.id === addedByUser.id) return;

    const agentName = agent.firstName && agent.lastName 
      ? `${agent.firstName} ${agent.lastName}` 
      : agent.username;

    const actionUrl = await this.getActionUrlForRecipient(teamLeader.id, 'team');
    await storage.createNotification({
      recipientUserId: teamLeader.id,
      actorUserId: addedByUser.id,
      subjectType: 'transfer',
      subjectId: null,
      severity: 'info',
      title: 'New Agent Added to Your Team',
      body: `${agentName} has been added to your team.`,
      metadata: {
        agentUserId,
        agentName,
        teamId
      },
      requiresAction: false,
      actionUrl
    });
  }

  async notifyAgentRemovedFromTeam(
    agentUserId: string,
    teamId: string,
    removedByUser: User
  ): Promise<void> {
    const agent = await storage.getUser(agentUserId);
    if (!agent) {
      console.warn(`[NotificationService] Cannot notify agent removed: agent ${agentUserId} not found`);
      return;
    }

    const teamLeader = await this.getTeamLeaderByTeamId(teamId);
    if (!teamLeader) {
      console.warn(`[NotificationService] Cannot notify agent removed: team ${teamId} has no leader`);
      return;
    }
    
    if (teamLeader.id === removedByUser.id) return;

    const agentName = agent.firstName && agent.lastName 
      ? `${agent.firstName} ${agent.lastName}` 
      : agent.username;

    const actionUrl = await this.getActionUrlForRecipient(teamLeader.id, 'team');
    await storage.createNotification({
      recipientUserId: teamLeader.id,
      actorUserId: removedByUser.id,
      subjectType: 'transfer',
      subjectId: null,
      severity: 'warning',
      title: 'Agent Removed from Your Team',
      body: `${agentName} has been removed from your team.`,
      metadata: {
        agentUserId,
        agentName,
        teamId
      },
      requiresAction: false,
      actionUrl
    });
  }
}

export const notificationService = new NotificationService();
