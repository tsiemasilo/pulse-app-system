import {
  users,
  departments,
  assets,
  attendance,
  teams,
  teamMembers,
  transfers,
  terminations,
  assetLossRecords,
  historicalAssetRecords,
  assetDailyStates,
  assetStateAudit,
  assetIncidents,
  assetDetails,
  type User,
  type UpsertUser,
  type InsertUser,
  type Department,
  type InsertDepartment,
  type Asset,
  type InsertAsset,
  type Attendance,
  type InsertAttendance,
  type Team,
  type InsertTeam,
  type TeamMember,
  type Transfer,
  type InsertTransfer,
  type Termination,
  type InsertTermination,
  type AssetLossRecord,
  type InsertAssetLossRecord,
  type HistoricalAssetRecord,
  type InsertHistoricalAssetRecord,
  type AssetDailyState,
  type InsertAssetDailyState,
  type AssetStateAudit,
  type InsertAssetStateAudit,
  type AssetIncident,
  type InsertAssetIncident,
  type AssetDetails,
  type InsertAssetDetails,
  type UserRole,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for local auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, userData: Partial<InsertUser>): Promise<User>;
  updateUserRole(userId: string, role: UserRole): Promise<User>;
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: UserRole): Promise<User[]>;
  
  // Department management
  getAllDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  
  // Asset management
  getAllAssets(): Promise<Asset[]>;
  getAssetsByUser(userId: string): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  assignAsset(assetId: string, userId: string): Promise<Asset>;
  updateAssetStatus(assetId: string, status: string): Promise<Asset>;
  
  // Attendance management
  getAttendanceByDate(date: Date): Promise<Attendance[]>;
  getAttendanceByUser(userId: string, startDate: Date, endDate: Date): Promise<Attendance[]>;
  clockIn(userId: string): Promise<Attendance>;
  clockOut(userId: string): Promise<Attendance>;
  
  // Team management
  getAllTeams(): Promise<Team[]>;
  getTeamsByLeader(leaderId: string): Promise<Team[]>;
  getTeamMembers(teamId: string): Promise<User[]>;
  addTeamMember(teamId: string, userId: string): Promise<any>;
  removeTeamMember(teamId: string, userId: string): Promise<any>;
  getUserTeams(userId: string): Promise<Team[]>;
  reassignAgentToTeamLeader(agentId: string, newTeamLeaderId: string): Promise<any>;
  
  // Transfer management
  getAllTransfers(): Promise<Transfer[]>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  
  // Termination management
  getAllTerminations(): Promise<Termination[]>;
  createTermination(termination: InsertTermination): Promise<Termination>;
  
  // Asset loss record management
  getAllAssetLossRecords(): Promise<AssetLossRecord[]>;
  getAssetLossRecordsByDate(date: string): Promise<AssetLossRecord[]>;
  createAssetLossRecord(assetLossRecord: InsertAssetLossRecord): Promise<AssetLossRecord>;
  deleteAssetLossRecord(userId: string, assetType: string, date?: string): Promise<void>;
  
  // Unreturned assets management
  getAllUnreturnedAssets(): Promise<Array<{
    userId: string;
    agentName: string;
    assetType: string;
    status: string;
    date: string;
    reason?: string;
  }>>;
  hasUnreturnedAssets(userId: string): Promise<boolean>;

  // Historical asset records management  
  getAllHistoricalAssetRecords(): Promise<HistoricalAssetRecord[]>;
  getHistoricalAssetRecordsByDate(date: string): Promise<HistoricalAssetRecord[]>;
  createHistoricalAssetRecord(record: InsertHistoricalAssetRecord): Promise<HistoricalAssetRecord>;
  
  // Asset daily state management
  getAssetDailyStatesByUserAndDate(userId: string, date: string): Promise<AssetDailyState[]>;
  upsertAssetDailyState(dailyState: InsertAssetDailyState): Promise<AssetDailyState>;
  getAllAssetDailyStatesByDate(date: string): Promise<AssetDailyState[]>;
  
  // Asset state audit management
  createAssetStateAudit(audit: InsertAssetStateAudit): Promise<AssetStateAudit>;
  getAssetStateAuditByUserId(userId: string): Promise<AssetStateAudit[]>;
  
  // Asset incident management
  createAssetIncident(incident: InsertAssetIncident): Promise<AssetIncident>;
  getAllAssetIncidents(): Promise<AssetIncident[]>;
  getAssetIncidentsByUserId(userId: string): Promise<AssetIncident[]>;
  updateAssetIncidentStatus(incidentId: string, status: string, resolution?: string, resolvedBy?: string): Promise<AssetIncident>;
  
  // Asset details management
  getAssetDetailsByUserId(userId: string): Promise<AssetDetails[]>;
  upsertAssetDetails(details: InsertAssetDetails): Promise<AssetDetails>;
  deleteAssetDetails(id: string): Promise<void>;
  
  // Enhanced daily reset functionality
  performDailyReset(targetDate: string, resetPerformedBy: string): Promise<{
    message: string;
    resetCount: number;
    incidentsCreated: number;
    details: Array<{
      userId: string;
      agentName: string;
      assetType: string;
      action: string;
      previousState?: string;
      newState: string;
      reason: string;
    }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for local auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Create a proper hashed password for OIDC users
    const { hashPassword } = await import("./replitAuth");
    const hashedTempPassword = await hashPassword("temp-password");
    
    const result = await db
      .insert(users)
      .values({
        id: userData.id!,
        username: userData.username!,
        password: hashedTempPassword,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        role: (userData.role as UserRole) || 'agent',
        departmentId: userData.departmentId || null,
        isActive: userData.isActive ?? true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email || null,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          role: (userData.role as UserRole) || 'agent',
          departmentId: userData.departmentId || null,
          isActive: userData.isActive ?? true,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error("Failed to upsert user");
    }
    return result[0];
  }

  // User management
  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...userData,
      role: userData.role as UserRole
    }).returning();
    
    if (!result || result.length === 0) {
      throw new Error("Failed to create user");
    }
    return result[0];
  }

  async updateUser(userId: string, userData: Partial<InsertUser>): Promise<User> {
    const updateData: any = {
      ...userData,
      updatedAt: new Date()
    };
    
    if (userData.role) {
      updateData.role = userData.role as UserRole;
    }
    
    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error("Failed to update user");
    }
    return result[0];
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // Use transaction to ensure all operations complete or none do
    await db.transaction(async (tx) => {
      // Clean up all foreign key references before deleting the user
      
      // 1. Remove user from all teams
      await tx.delete(teamMembers).where(eq(teamMembers.userId, userId));
      
      // 2. Unassign all assets from the user
      await tx.update(assets)
        .set({ assignedToUserId: null, assignedAt: null })
        .where(eq(assets.assignedToUserId, userId));
      
      // 3. Delete attendance records for the user
      await tx.delete(attendance).where(eq(attendance.userId, userId));
      
      // 4. Update teams where this user is the leader (set leader to null)
      await tx.update(teams)
        .set({ leaderId: sql`NULL` })
        .where(eq(teams.leaderId, userId));
      
      // 5. Handle transfers - update references to null or delete records
      await tx.update(transfers)
        .set({ requestedBy: sql`NULL` })
        .where(eq(transfers.requestedBy, userId));
      await tx.update(transfers)
        .set({ approvedBy: sql`NULL` })
        .where(eq(transfers.approvedBy, userId));
      await tx.delete(transfers).where(eq(transfers.userId, userId));
      
      // 6. Handle terminations - update processedBy to null or delete records
      await tx.update(terminations)
        .set({ processedBy: sql`NULL` })
        .where(eq(terminations.processedBy, userId));
      await tx.delete(terminations).where(eq(terminations.userId, userId));
      
      // 7. Delete asset daily states for the user
      await tx.delete(assetDailyStates).where(eq(assetDailyStates.userId, userId));
      
      // 8. Delete asset state audit records for the user
      await tx.delete(assetStateAudit).where(eq(assetStateAudit.userId, userId));
      
      // 9. Delete asset incidents for the user
      await tx.delete(assetIncidents).where(eq(assetIncidents.userId, userId));
      
      // 10. Delete asset loss records for the user
      await tx.delete(assetLossRecords).where(eq(assetLossRecords.userId, userId));
      
      // 11. Delete asset details for the user
      await tx.delete(assetDetails).where(eq(assetDetails.userId, userId));
      
      // Finally, delete the user
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Department management
  async getAllDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(departmentData).returning();
    return department;
  }

  // Asset management
  async getAllAssets(): Promise<Asset[]> {
    return await db.select().from(assets);
  }

  async getAssetsByUser(userId: string): Promise<Asset[]> {
    return await db.select().from(assets).where(eq(assets.assignedToUserId, userId));
  }

  async createAsset(assetData: InsertAsset): Promise<Asset> {
    const [asset] = await db.insert(assets).values(assetData).returning();
    return asset;
  }

  async assignAsset(assetId: string, userId: string): Promise<Asset> {
    const [asset] = await db
      .update(assets)
      .set({ 
        assignedToUserId: userId, 
        status: 'assigned',
        assignedAt: new Date()
      })
      .where(eq(assets.id, assetId))
      .returning();
    return asset;
  }

  async updateAssetStatus(assetId: string, status: string): Promise<Asset> {
    const [asset] = await db
      .update(assets)
      .set({ status })
      .where(eq(assets.id, assetId))
      .returning();
    return asset;
  }

  // Attendance management
  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select({
        id: attendance.id,
        userId: attendance.userId,
        date: attendance.date,
        clockIn: attendance.clockIn,
        clockOut: attendance.clockOut,
        status: attendance.status,
        hoursWorked: attendance.hoursWorked,
        createdAt: attendance.createdAt,
        user: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        }
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.userId, users.id))
      .where(and(
        gte(attendance.date, startOfDay),
        lte(attendance.date, endOfDay)
      ));
  }

  async getAttendanceByUser(userId: string, startDate: Date, endDate: Date): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.userId, userId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      ))
      .orderBy(desc(attendance.date));
  }

  async clockIn(userId: string): Promise<Attendance> {
    const now = new Date();
    const [record] = await db
      .insert(attendance)
      .values({
        userId,
        date: now,
        clockIn: now,
        status: 'present',
      })
      .returning();
    return record;
  }

  async clockOut(userId: string): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [record] = await db
      .update(attendance)
      .set({ 
        clockOut: new Date(),
        hoursWorked: Math.floor((new Date().getTime() - new Date().getTime()) / (1000 * 60 * 60))
      })
      .where(and(
        eq(attendance.userId, userId),
        gte(attendance.date, today)
      ))
      .returning();
    return record;
  }

  // Team management
  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getTeamsByLeader(leaderId: string): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.leaderId, leaderId));
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        departmentId: users.departmentId,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
  }

  async addTeamMember(teamId: string, userId: string): Promise<any> {
    const [member] = await db.insert(teamMembers).values({
      teamId,
      userId,
    }).returning();
    return member;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<any> {
    return await db.delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    return await db
      .select({
        id: teams.id,
        name: teams.name,
        leaderId: teams.leaderId,
        departmentId: teams.departmentId,
        createdAt: teams.createdAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));
  }

  async reassignAgentToTeamLeader(agentId: string, newTeamLeaderId: string): Promise<any> {
    // First remove from all existing teams
    await db.delete(teamMembers).where(eq(teamMembers.userId, agentId));
    
    // Find or create team for the new team leader
    let team = await db
      .select()
      .from(teams)
      .where(eq(teams.leaderId, newTeamLeaderId))
      .limit(1);

    if (team.length === 0) {
      // Create a default team for the team leader if none exists
      const teamLeader = await this.getUser(newTeamLeaderId);
      const [newTeam] = await db.insert(teams).values({
        name: `${teamLeader?.firstName || 'TL'} Team`,
        leaderId: newTeamLeaderId,
      }).returning();
      team = [newTeam];
    }

    // Add agent to the team
    return await this.addTeamMember(team[0].id, agentId);
  }

  // Transfer management
  async getAllTransfers(): Promise<Transfer[]> {
    return await db.select().from(transfers).orderBy(desc(transfers.createdAt));
  }

  async createTransfer(transferData: InsertTransfer): Promise<Transfer> {
    const [transfer] = await db.insert(transfers).values(transferData).returning();
    return transfer;
  }

  // Termination management
  async getAllTerminations(): Promise<Termination[]> {
    return await db.select().from(terminations).orderBy(desc(terminations.createdAt));
  }

  async createTermination(terminationData: InsertTermination): Promise<Termination> {
    const [termination] = await db.insert(terminations).values(terminationData).returning();
    return termination;
  }

  // Asset loss record management
  async getAllAssetLossRecords(): Promise<AssetLossRecord[]> {
    return await db.select().from(assetLossRecords).orderBy(desc(assetLossRecords.createdAt));
  }

  async getAssetLossRecordsByDate(date: string): Promise<AssetLossRecord[]> {
    return await db.select().from(assetLossRecords)
      .where(sql`DATE(${assetLossRecords.dateLost}) = ${date}`)
      .orderBy(desc(assetLossRecords.createdAt));
  }

  async createAssetLossRecord(assetLossData: InsertAssetLossRecord): Promise<AssetLossRecord> {
    const [assetLossRecord] = await db.insert(assetLossRecords).values(assetLossData).returning();
    return assetLossRecord;
  }

  async deleteAssetLossRecord(userId: string, assetType: string, date?: string): Promise<void> {
    const conditions = [
      eq(assetLossRecords.userId, userId),
      eq(assetLossRecords.assetType, assetType)
    ];
    
    if (date) {
      conditions.push(sql`DATE(${assetLossRecords.dateLost}) = ${date}`);
    }
    
    await db.delete(assetLossRecords)
      .where(and(...conditions));
  }

  // Unreturned assets management
  async getAllUnreturnedAssets(): Promise<Array<{
    userId: string;
    agentName: string;
    assetType: string;
    status: string;
    date: string;
    reason?: string;
  }>> {
    const unreturnedAssets: Array<{
      userId: string;
      agentName: string;
      assetType: string;
      status: string;
      date: string;
      reason?: string;
    }> = [];

    // Get all lost assets (these are permanently lost)
    const lostAssets = await db
      .select({
        userId: assetLossRecords.userId,
        assetType: assetLossRecords.assetType,
        dateLost: assetLossRecords.dateLost,
        reason: assetLossRecords.reason,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
        }
      })
      .from(assetLossRecords)
      .leftJoin(users, eq(assetLossRecords.userId, users.id))
      .where(eq(assetLossRecords.status, 'reported')); // Only unresolved losses

    // Add lost assets
    lostAssets.forEach(asset => {
      const fullName = `${asset.user?.firstName || ''} ${asset.user?.lastName || ''}`.trim();
      const displayName = fullName || asset.user?.username || 'Unknown User';
      
      unreturnedAssets.push({
        userId: asset.userId,
        agentName: displayName,
        assetType: asset.assetType,
        status: 'Lost',
        date: asset.dateLost instanceof Date 
          ? asset.dateLost.toISOString().split('T')[0]
          : asset.dateLost,
        reason: asset.reason
      });
    });

    // Get all assets with 'not_returned' state from asset daily states
    const unreturnedStates = await db
      .select({
        userId: assetDailyStates.userId,
        date: assetDailyStates.date,
        assetType: assetDailyStates.assetType,
        currentState: assetDailyStates.currentState,
        reason: assetDailyStates.reason,
        agentName: assetDailyStates.agentName,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
        }
      })
      .from(assetDailyStates)
      .leftJoin(users, eq(assetDailyStates.userId, users.id))
      .where(eq(assetDailyStates.currentState, 'not_returned'));

    // Add not returned assets from daily states
    for (const state of unreturnedStates) {
      const fullName = `${state.user?.firstName || ''} ${state.user?.lastName || ''}`.trim();
      const displayName = fullName || state.agentName || state.user?.username || 'Unknown User';
      
      // Check if this asset is already marked as lost
      const isAlreadyLost = unreturnedAssets.some(
        asset => asset.userId === state.userId && 
                asset.assetType === state.assetType && 
                asset.status === 'Lost'
      );
      
      if (!isAlreadyLost) {
        unreturnedAssets.push({
          userId: state.userId,
          agentName: displayName,
          assetType: state.assetType,
          status: 'Not Returned Yet',
          date: state.date,
          reason: state.reason || undefined
        });
      }
    }

    return unreturnedAssets.sort((a, b) => a.agentName.localeCompare(b.agentName));
  }

  async hasUnreturnedAssets(userId: string): Promise<boolean> {
    // Check if user has any lost assets
    const lostAssetsCount = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(assetLossRecords)
      .where(and(
        eq(assetLossRecords.userId, userId),
        eq(assetLossRecords.status, 'reported') // Only unresolved losses
      ));

    if (lostAssetsCount[0]?.count > 0) {
      return true;
    }

    // Check if user has any unresolved unreturned assets from daily states
    const unreturnedStates = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(assetDailyStates)
      .where(and(
        eq(assetDailyStates.userId, userId),
        eq(assetDailyStates.currentState, 'not_returned')
      ));

    if (unreturnedStates[0]?.count > 0) {
      return true;
    }

    return false;
  }

  // Historical asset records management
  async getAllHistoricalAssetRecords(): Promise<HistoricalAssetRecord[]> {
    return await db.select().from(historicalAssetRecords).orderBy(desc(historicalAssetRecords.createdAt));
  }

  async getHistoricalAssetRecordsByDate(date: string): Promise<HistoricalAssetRecord[]> {
    return await db.select().from(historicalAssetRecords).where(eq(historicalAssetRecords.date, date)).orderBy(desc(historicalAssetRecords.createdAt));
  }

  async createHistoricalAssetRecord(recordData: InsertHistoricalAssetRecord): Promise<HistoricalAssetRecord> {
    const [record] = await db.insert(historicalAssetRecords).values(recordData).returning();
    return record;
  }

  // Asset daily state management
  async getAssetDailyStatesByUserAndDate(userId: string, date: string): Promise<AssetDailyState[]> {
    return await db
      .select()
      .from(assetDailyStates)
      .where(and(
        eq(assetDailyStates.userId, userId),
        eq(assetDailyStates.date, date)
      ))
      .orderBy(assetDailyStates.assetType);
  }

  async upsertAssetDailyState(dailyStateData: InsertAssetDailyState): Promise<AssetDailyState> {
    // Check if a daily state already exists for this user, date, and asset type
    const existingStates = await db
      .select()
      .from(assetDailyStates)
      .where(and(
        eq(assetDailyStates.userId, dailyStateData.userId),
        eq(assetDailyStates.date, dailyStateData.date),
        eq(assetDailyStates.assetType, dailyStateData.assetType)
      ));
    
    if (existingStates.length > 0) {
      // Update existing state
      const [updatedState] = await db
        .update(assetDailyStates)
        .set({
          currentState: dailyStateData.currentState,
          confirmedBy: dailyStateData.confirmedBy,
          confirmedAt: dailyStateData.confirmedAt,
          reason: dailyStateData.reason,
          agentName: dailyStateData.agentName,
          updatedAt: new Date(),
        })
        .where(eq(assetDailyStates.id, existingStates[0].id))
        .returning();
      return updatedState;
    } else {
      // Create new state
      const [newState] = await db
        .insert(assetDailyStates)
        .values(dailyStateData)
        .returning();
      return newState;
    }
  }

  async getAllAssetDailyStatesByDate(date: string): Promise<AssetDailyState[]> {
    return await db
      .select()
      .from(assetDailyStates)
      .where(eq(assetDailyStates.date, date))
      .orderBy(assetDailyStates.userId, assetDailyStates.assetType);
  }

  // Asset state audit management
  async createAssetStateAudit(auditData: InsertAssetStateAudit): Promise<AssetStateAudit> {
    const [audit] = await db
      .insert(assetStateAudit)
      .values(auditData)
      .returning();
    return audit;
  }

  async getAssetStateAuditByUserId(userId: string): Promise<AssetStateAudit[]> {
    return await db
      .select()
      .from(assetStateAudit)
      .where(eq(assetStateAudit.userId, userId))
      .orderBy(desc(assetStateAudit.changedAt));
  }

  // Enhanced daily reset functionality
  async performDailyReset(targetDate: string, resetPerformedBy: string): Promise<{
    message: string;
    resetCount: number;
    incidentsCreated: number;
    details: Array<{
      userId: string;
      agentName: string;
      assetType: string;
      action: string;
      previousState?: string;
      newState: string;
      reason: string;
    }>;
  }> {
    // Calculate previous day
    const targetDateTime = new Date(targetDate);
    const previousDay = new Date(targetDateTime);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDate = previousDay.toISOString().split('T')[0];

    // Get all active users
    const allUsers = await this.getAllUsers();
    const activeUsers = allUsers.filter(u => u.isActive);
    
    const assetTypes = ['laptop', 'headsets', 'dongle'];
    const resetDetails: Array<{
      userId: string;
      agentName: string;
      assetType: string;
      action: string;
      previousState?: string;
      newState: string;
      reason: string;
    }> = [];
    
    let incidentsCreated = 0;

    // Process each user and asset type
    for (const user of activeUsers) {
      const agentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      
      for (const assetType of assetTypes) {
        // Get previous day's state for this user/asset type
        const previousStates = await this.getAssetDailyStatesByUserAndDate(user.id, previousDate);
        const previousState = previousStates.find(s => s.assetType === assetType);
        
        // Get current state to check if it exists
        const currentStates = await this.getAssetDailyStatesByUserAndDate(user.id, targetDate);
        const currentState = currentStates.find(s => s.assetType === assetType);
        
        let actionTaken = '';
        let newState = '';
        let reason = '';
        
        if (previousState) {
          // Handle based on previous day's state
          switch (previousState.currentState) {
            case 'collected':
              // Asset was collected but not returned - mark as unreturned and create incident
              newState = 'not_returned';
              reason = 'Asset was not returned/booked out from previous day';
              actionTaken = 'auto_mark_unreturned';
              
              // Create incident for unreturned asset
              await this.createAssetIncident({
                userId: user.id,
                assetType,
                incidentType: 'unreturned',
                description: `Asset was collected on ${previousDate} but was not returned. Automatically marked as not returned during daily reset.`,
                reportedBy: resetPerformedBy
              });
              incidentsCreated++;
              break;
              
            case 'returned':
              // Asset completed full cycle - reset to ready for collection
              newState = 'ready_for_collection';
              reason = 'Daily reset - asset completed full cycle';
              actionTaken = 'reset_completed_cycle';
              break;
              
            case 'not_collected':
              // Asset was not collected - reset to ready for collection
              newState = 'ready_for_collection';
              reason = 'Daily reset - asset was not collected previous day';
              actionTaken = 'reset_not_collected';
              break;
              
            case 'not_returned':
            case 'lost':
              // Persistent states - keep the same state
              if (!currentState) {
                newState = previousState.currentState;
                reason = `Persisting ${previousState.currentState} state from previous day`;
                actionTaken = 'persist_problematic_state';
              } else {
                // State already exists, skip
                continue;
              }
              break;
              
            case 'ready_for_collection':
              // Was ready but not collected - reset to ready again
              newState = 'ready_for_collection';
              reason = 'Daily reset - asset remained ready for collection';
              actionTaken = 'reset_ready_state';
              break;
              
            default:
              // Unknown state - reset to ready for collection
              newState = 'ready_for_collection';
              reason = 'Daily reset - unknown previous state';
              actionTaken = 'reset_unknown_state';
              break;
          }
        } else {
          // No previous state - initialize as ready for collection
          newState = 'ready_for_collection';
          reason = 'Daily reset - initializing new asset state';
          actionTaken = 'initialize_new_state';
        }
        
        // Only create/update state if we have an action to take and no current state exists
        if (actionTaken && !currentState) {
          const dailyStateData = {
            userId: user.id,
            date: targetDate,
            assetType,
            currentState: newState as any,
            confirmedBy: resetPerformedBy,
            confirmedAt: new Date(),
            reason,
            agentName
          };
          
          const createdState = await this.upsertAssetDailyState(dailyStateData);
          
          // Create audit trail
          await this.createAssetStateAudit({
            dailyStateId: createdState.id,
            userId: user.id,
            assetType,
            previousState: previousState?.currentState || null,
            newState,
            reason,
            changedBy: resetPerformedBy,
            changedAt: new Date()
          });
          
          resetDetails.push({
            userId: user.id,
            agentName,
            assetType,
            action: actionTaken,
            previousState: previousState?.currentState,
            newState,
            reason
          });
        }
      }
    }
    
    return {
      message: `Daily reset completed for ${targetDate}`,
      resetCount: resetDetails.length,
      incidentsCreated,
      details: resetDetails
    };
  }

  // Asset incident management
  async createAssetIncident(incidentData: InsertAssetIncident): Promise<AssetIncident> {
    const [incident] = await db
      .insert(assetIncidents)
      .values(incidentData)
      .returning();
    return incident;
  }

  async getAllAssetIncidents(): Promise<AssetIncident[]> {
    return await db
      .select()
      .from(assetIncidents)
      .orderBy(desc(assetIncidents.reportedAt));
  }

  async getAssetIncidentsByUserId(userId: string): Promise<AssetIncident[]> {
    return await db
      .select()
      .from(assetIncidents)
      .where(eq(assetIncidents.userId, userId))
      .orderBy(desc(assetIncidents.reportedAt));
  }

  async updateAssetIncidentStatus(incidentId: string, status: string, resolution?: string, resolvedBy?: string): Promise<AssetIncident> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    if (resolution) {
      updateData.resolution = resolution;
    }
    
    if (resolvedBy) {
      updateData.resolvedBy = resolvedBy;
      updateData.resolvedAt = new Date();
    }
    
    const [incident] = await db
      .update(assetIncidents)
      .set(updateData)
      .where(eq(assetIncidents.id, incidentId))
      .returning();
    return incident;
  }
  
  // Asset details management
  async getAssetDetailsByUserId(userId: string): Promise<AssetDetails[]> {
    return await db
      .select()
      .from(assetDetails)
      .where(eq(assetDetails.userId, userId))
      .orderBy(assetDetails.assetType);
  }
  
  async upsertAssetDetails(detailsData: InsertAssetDetails): Promise<AssetDetails> {
    // Check if asset details already exist for this user and asset type
    const existingDetails = await db
      .select()
      .from(assetDetails)
      .where(and(
        eq(assetDetails.userId, detailsData.userId),
        eq(assetDetails.assetType, detailsData.assetType)
      ));
    
    if (existingDetails.length > 0) {
      // Update existing details
      const [updatedDetails] = await db
        .update(assetDetails)
        .set({
          assetId: detailsData.assetId,
          serialNumber: detailsData.serialNumber,
          brandModel: detailsData.brandModel,
          accessories: detailsData.accessories,
          condition: detailsData.condition,
          notes: detailsData.notes,
          updatedAt: new Date(),
        })
        .where(eq(assetDetails.id, existingDetails[0].id))
        .returning();
      return updatedDetails;
    } else {
      // Create new details
      const [newDetails] = await db
        .insert(assetDetails)
        .values(detailsData)
        .returning();
      return newDetails;
    }
  }
  
  async deleteAssetDetails(id: string): Promise<void> {
    await db.delete(assetDetails).where(eq(assetDetails.id, id));
  }
}

export const storage = new DatabaseStorage();
