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

  private async getTeamLeaderForAgent(agentId: string): Promise<User | undefined> {
    const teams = await storage.getUserTeams(agentId);
    if (teams.length === 0) return undefined;

    const team = teams[0];
    if (team.leaderId) {
      return storage.getUser(team.leaderId);
    }
    return undefined;
  }

  private async getHRUsers(): Promise<User[]> {
    return storage.getUsersByRole('hr');
  }

  private async getAdminUsers(): Promise<User[]> {
    return storage.getUsersByRole('admin');
  }

  async notifyTransferRequested(transfer: Transfer, requestedByUser: User): Promise<void> {
    const targetUser = await storage.getUser(transfer.userId);
    if (!targetUser) return;

    const managers = await this.getManagersForUser(transfer.userId);
    const hrUsers = await this.getHRUsers();

    const recipientIds = new Set<string>();
    managers.forEach(m => recipientIds.add(m.id));
    hrUsers.forEach(h => recipientIds.add(h.id));

    recipientIds.delete(requestedByUser.id);

    const notifications: InsertNotification[] = [];
    const targetName = targetUser.firstName && targetUser.lastName 
      ? `${targetUser.firstName} ${targetUser.lastName}` 
      : targetUser.username;

    for (const recipientId of Array.from(recipientIds)) {
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
        actionUrl: '/admin/hr?view=transfers'
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

    if (transfer.requestedBy !== approvedByUser.id) {
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
        actionUrl: '/admin/hr?view=transfers'
      });
    }

    const teamLeader = await this.getTeamLeaderForAgent(transfer.userId);
    if (teamLeader && teamLeader.id !== approvedByUser.id && teamLeader.id !== transfer.requestedBy) {
      notifications.push({
        recipientUserId: teamLeader.id,
        actorUserId: approvedByUser.id,
        subjectType: 'transfer',
        subjectId: transfer.id,
        severity: 'info',
        title: 'Agent Transfer Approved',
        body: `Your team member ${targetName} has been approved for a ${transfer.transferType} transfer.`,
        metadata: {
          transferType: transfer.transferType,
          targetUserId: transfer.userId,
          targetUserName: targetName
        },
        requiresAction: false,
        actionUrl: '/admin/team-leader'
      });
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
        actionUrl: '/admin/hr?view=transfers'
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

    const teamLeader = await this.getTeamLeaderForAgent(termination.userId);
    
    const managersToNotify = await this.getManagersForUser(termination.userId);
    const hrUsers = await this.getHRUsers();

    const recipientIds = new Set<string>();
    
    if (teamLeader && teamLeader.id !== processedByUser.id) {
      recipientIds.add(teamLeader.id);
    }
    
    managersToNotify.forEach(m => {
      if (m.id !== processedByUser.id) recipientIds.add(m.id);
    });
    
    hrUsers.forEach(h => {
      if (h.id !== processedByUser.id) recipientIds.add(h.id);
    });

    const severity: NotificationSeverity = termination.statusType === 'AWOL' ? 'urgent' : 'warning';

    for (const recipientId of Array.from(recipientIds)) {
      notifications.push({
        recipientUserId: recipientId,
        actorUserId: processedByUser.id,
        subjectType: 'termination',
        subjectId: termination.id,
        severity,
        title: `Agent ${termination.statusType} Status`,
        body: `${targetName} has been marked as ${termination.statusType}.${termination.comment ? ` Comment: ${termination.comment}` : ''}`,
        metadata: {
          statusType: termination.statusType,
          targetUserId: termination.userId,
          targetUserName: targetName,
          effectiveDate: termination.effectiveDate
        },
        requiresAction: false,
        actionUrl: '/admin/hr?view=terminations'
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

    for (const recipientId of Array.from(recipientIds)) {
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
        actionUrl: '/admin/hr?view=assets'
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

    const recipientIds = new Set<string>();
    
    if (teamLeader && teamLeader.id !== reportedByUser.id) {
      recipientIds.add(teamLeader.id);
    }
    
    managers.forEach(m => {
      if (m.id !== reportedByUser.id) recipientIds.add(m.id);
    });

    for (const recipientId of Array.from(recipientIds)) {
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
        actionUrl: '/admin/hr?view=assets'
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

    const managers = await this.getManagersForUser(userId);
    const notifications: InsertNotification[] = [];

    for (const manager of managers) {
      if (manager.id !== changedByUser.id) {
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
          actionUrl: '/admin/hr?view=employees'
        });
      }
    }

    if (notifications.length > 0) {
      await storage.createBulkNotifications(notifications);
    }
  }
}

export const notificationService = new NotificationService();
