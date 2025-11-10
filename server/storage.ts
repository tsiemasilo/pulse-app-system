import {
  users,
  divisions,
  departments,
  sections,
  userDepartmentAssignments,
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
  attendanceAudit,
  transfersAudit,
  assetIncidents,
  assetDetails,
  type User,
  type UpsertUser,
  type InsertUser,
  type Division,
  type InsertDivision,
  type Department,
  type InsertDepartment,
  type Section,
  type InsertSection,
  type UserDepartmentAssignment,
  type InsertUserDepartmentAssignment,
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
  type AttendanceAudit,
  type InsertAttendanceAudit,
  type TransfersAudit,
  type InsertTransfersAudit,
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
  
  // Division management
  getAllDivisions(): Promise<Division[]>;
  createDivision(division: InsertDivision): Promise<Division>;
  
  // Section management
  getAllSections(): Promise<Section[]>;
  getSectionsByDepartment(departmentId: string): Promise<Section[]>;
  createSection(section: InsertSection): Promise<Section>;
  
  // User department assignment management
  getAllUserDepartmentAssignments(): Promise<UserDepartmentAssignment[]>;
  getUserDepartmentAssignment(userId: string): Promise<UserDepartmentAssignment | undefined>;
  assignUserToDepartment(assignment: InsertUserDepartmentAssignment): Promise<UserDepartmentAssignment>;
  removeUserDepartmentAssignment(userId: string): Promise<void>;
  
  // Asset management
  getAllAssets(): Promise<Asset[]>;
  getAssetsByUser(userId: string): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  assignAsset(assetId: string, userId: string): Promise<Asset>;
  updateAssetStatus(assetId: string, status: string): Promise<Asset>;
  
  // Attendance management
  getAttendanceByDate(date: Date): Promise<Attendance[]>;
  getAttendanceByUser(userId: string, startDate: Date, endDate: Date): Promise<Attendance[]>;
  getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]>;
  clockIn(userId: string): Promise<Attendance>;
  clockOut(userId: string): Promise<Attendance>;
  ensureAttendanceForDate(targetDate: string, performedBy?: string): Promise<{
    created: number;
    message: string;
  }>;
  
  // Team management
  getAllTeams(): Promise<Team[]>;
  getTeamsByLeader(leaderId: string): Promise<Team[]>;
  getTeamMembers(teamId: string): Promise<User[]>;
  getAllTeamMembers(): Promise<TeamMember[]>;
  addTeamMember(teamId: string, userId: string): Promise<any>;
  removeTeamMember(teamId: string, userId: string): Promise<any>;
  getUserTeams(userId: string): Promise<Team[]>;
  reassignAgentToTeamLeader(agentId: string, newTeamLeaderId: string): Promise<any>;
  
  // Transfer management
  getAllTransfers(): Promise<Transfer[]>;
  getTransfersByRequester(requesterId: string): Promise<Transfer[]>;
  createTransfer(transfer: InsertTransfer & { newDepartmentId?: string }): Promise<Transfer>;
  updateTransferStatus(transferId: string, status: string, approvedBy?: string): Promise<Transfer>;
  completeTransfer(transferId: string): Promise<void>;
  deleteTransfer(transferId: string): Promise<void>;
  
  // Termination management
  getAllTerminations(): Promise<Termination[]>;
  createTermination(termination: InsertTermination): Promise<Termination>;
  deleteTerminationForUserOnDate(userId: string, date: Date): Promise<void>;
  getTerminationsByRecordDate(recordDate: string): Promise<Termination[]>;
  checkTerminationExistsForUserAndDate(userId: string, recordDate: string): Promise<boolean>;
  getOriginalTerminationForUser(userId: string): Promise<Termination | undefined>;
  
  // Asset loss record management
  getAllAssetLossRecords(): Promise<AssetLossRecord[]>;
  getAssetLossRecordsByDate(date: string): Promise<AssetLossRecord[]>;
  getAssetLossRecordByUserAndType(userId: string, assetType: string): Promise<AssetLossRecord | undefined>;
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
  deleteAssetDailyStatesByUserAndDate(userId: string, date: string): Promise<void>;
  getMostRecentAssetState(userId: string, assetType: string): Promise<AssetDailyState | undefined>;
  
  // Asset state audit management
  createAssetStateAudit(audit: InsertAssetStateAudit): Promise<AssetStateAudit>;
  getAssetStateAuditByUserId(userId: string): Promise<AssetStateAudit[]>;
  deleteAssetStateAuditByDailyStateId(dailyStateId: string): Promise<void>;
  
  // Attendance audit management
  createAttendanceAudit(audit: InsertAttendanceAudit): Promise<AttendanceAudit>;
  getAttendanceAuditByAttendanceId(attendanceId: string): Promise<AttendanceAudit[]>;
  
  // Transfers audit management
  createTransfersAudit(audit: InsertTransfersAudit): Promise<TransfersAudit>;
  getTransfersAuditByTransferId(transferId: string): Promise<TransfersAudit[]>;
  
  // Asset incident management
  createAssetIncident(incident: InsertAssetIncident): Promise<AssetIncident>;
  getAllAssetIncidents(): Promise<AssetIncident[]>;
  getAssetIncidentsByUserId(userId: string): Promise<AssetIncident[]>;
  updateAssetIncidentStatus(incidentId: string, status: string, resolution?: string, resolvedBy?: string): Promise<AssetIncident>;
  
  // Asset details management
  getAssetDetailsByUserId(userId: string): Promise<AssetDetails[]>;
  upsertAssetDetails(details: InsertAssetDetails): Promise<AssetDetails>;
  deleteAssetDetails(id: string): Promise<void>;
  
  // Reset agent asset records
  resetAgentAssetRecords(agentId: string, resetBy: string, date: string): Promise<{
    message: string;
    assetTypesReset: string[];
  }>;
  
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
      
      // 7. Delete asset state audit records FIRST (they reference daily states)
      await tx.delete(assetStateAudit).where(eq(assetStateAudit.userId, userId));
      
      // 8. Delete asset daily states AFTER audit records are deleted
      await tx.delete(assetDailyStates).where(eq(assetDailyStates.userId, userId));
      
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

  // Division management
  async getAllDivisions(): Promise<Division[]> {
    return await db.select().from(divisions);
  }

  async createDivision(divisionData: InsertDivision): Promise<Division> {
    const [division] = await db.insert(divisions).values(divisionData).returning();
    return division;
  }

  // Section management
  async getAllSections(): Promise<Section[]> {
    return await db.select().from(sections);
  }

  async getSectionsByDepartment(departmentId: string): Promise<Section[]> {
    return await db.select().from(sections).where(eq(sections.departmentId, departmentId));
  }

  async createSection(sectionData: InsertSection): Promise<Section> {
    const [section] = await db.insert(sections).values(sectionData).returning();
    return section;
  }

  // User department assignment management
  async getAllUserDepartmentAssignments(): Promise<UserDepartmentAssignment[]> {
    return await db.select().from(userDepartmentAssignments);
  }

  async getUserDepartmentAssignment(userId: string): Promise<UserDepartmentAssignment | undefined> {
    const [assignment] = await db.select().from(userDepartmentAssignments).where(eq(userDepartmentAssignments.userId, userId));
    return assignment;
  }

  async assignUserToDepartment(assignmentData: InsertUserDepartmentAssignment): Promise<UserDepartmentAssignment> {
    // First, check if the user already has an assignment
    const existing = await this.getUserDepartmentAssignment(assignmentData.userId);
    
    if (existing) {
      // Update existing assignment
      const [updated] = await db
        .update(userDepartmentAssignments)
        .set({
          divisionId: assignmentData.divisionId,
          departmentId: assignmentData.departmentId,
          sectionId: assignmentData.sectionId,
          assignedBy: assignmentData.assignedBy,
          assignedAt: new Date(),
        })
        .where(eq(userDepartmentAssignments.userId, assignmentData.userId))
        .returning();
      return updated;
    } else {
      // Create new assignment
      const [assignment] = await db.insert(userDepartmentAssignments).values(assignmentData).returning();
      return assignment;
    }
  }

  async removeUserDepartmentAssignment(userId: string): Promise<void> {
    await db.delete(userDepartmentAssignments).where(eq(userDepartmentAssignments.userId, userId));
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

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendance)
      .where(and(
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      ))
      .orderBy(desc(attendance.date));
  }

  async clockIn(userId: string): Promise<Attendance> {
    const now = new Date();
    
    // Check if current time is within working hours (7:30 AM - 4:30 PM South African Time - UTC+2)
    const saTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
    const hours = saTime.getHours();
    const minutes = saTime.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;
    const workingStartMinutes = 7 * 60 + 30; // 7:30 AM
    const workingEndMinutes = 16 * 60 + 30; // 4:30 PM
    
    const isWorkingHours = currentTimeInMinutes >= workingStartMinutes && currentTimeInMinutes <= workingEndMinutes;
    
    const [record] = await db
      .insert(attendance)
      .values({
        userId,
        date: now,
        clockIn: now,
        status: isWorkingHours ? 'present' : 'late',
      })
      .returning();
    return record;
  }

  async clockInWithStatus(userId: string, status: string): Promise<Attendance> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Remote work persistence: if status is "at work", check most recent WORKING day's status
    // If most recent working status was "at work (remote)", maintain remote status
    let finalStatus = status;
    if (status === 'at work') {
      // Find the most recent working day (skip sick, absent, on leave, etc.)
      const recentWorkingDay = await db
        .select()
        .from(attendance)
        .where(and(
          eq(attendance.userId, userId),
          sql`(${attendance.status} = 'at work' OR ${attendance.status} = 'at work (remote)')`
        ))
        .orderBy(desc(attendance.date))
        .limit(1);
      
      // If most recent working status was remote, maintain it
      if (recentWorkingDay.length > 0 && recentWorkingDay[0].status === 'at work (remote)') {
        finalStatus = 'at work (remote)';
        console.log(`Persisting remote work status for user ${userId} from most recent working day`);
      }
    }
    
    // Check if attendance record already exists for this user today
    const existingRecords = await db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.userId, userId),
        gte(attendance.date, startOfDay),
        lte(attendance.date, endOfDay)
      ));
    
    // If record exists, update it instead of creating a new one
    if (existingRecords.length > 0) {
      const [updated] = await db
        .update(attendance)
        .set({ status: finalStatus })
        .where(eq(attendance.id, existingRecords[0].id))
        .returning();
      
      console.log("Updated existing attendance record:", updated);
      return updated;
    }
    
    // Otherwise create a new record
    const result = await db
      .insert(attendance)
      .values({
        userId,
        date: now,
        clockIn: now,
        status: finalStatus,
      })
      .returning();
    
    console.log("Created new attendance record:", result);
    
    if (!result || result.length === 0) {
      throw new Error("Failed to create attendance record");
    }
    
    return result[0];
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

  async ensureAttendanceForDate(targetDate: string, performedBy?: string): Promise<{
    created: number;
    message: string;
  }> {
    let attendanceCreatedCount = 0;
    
    // Normalize date to start/end of day once
    const targetDateTime = new Date(targetDate);
    const startOfDay = new Date(targetDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDateTime);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all active agents
    const allUsers = await this.getAllUsers();
    const agents = allUsers.filter(u => u.role === 'agent' && u.isActive);
    
    for (const agent of agents) {
      try {
        // Check if attendance record already exists for this agent on target date
        const existingRecords = await db
          .select()
          .from(attendance)
          .where(and(
            eq(attendance.userId, agent.id),
            gte(attendance.date, startOfDay),
            lte(attendance.date, endOfDay)
          ));
        
        // Skip if attendance record already exists (idempotent)
        if (existingRecords.length > 0) {
          continue;
        }
        
        // Determine appropriate status
        let statusToUse: any = 'at work';
        
        // Check for recent termination status
        const recentTerminations = await db
          .select()
          .from(attendance)
          .where(and(
            eq(attendance.userId, agent.id),
            sql`(${attendance.status} = 'AWOL' OR ${attendance.status} = 'suspended' OR ${attendance.status} = 'resignation' OR ${attendance.status} = 'terminated')`
          ))
          .orderBy(desc(attendance.date))
          .limit(1);
        
        if (recentTerminations.length > 0) {
          statusToUse = recentTerminations[0].status;
        } else {
          // Check for remote work persistence
          const recentWorkingDay = await db
            .select()
            .from(attendance)
            .where(and(
              eq(attendance.userId, agent.id),
              sql`(${attendance.status} = 'at work' OR ${attendance.status} = 'at work (remote)')`
            ))
            .orderBy(desc(attendance.date))
            .limit(1);
          
          if (recentWorkingDay.length > 0 && recentWorkingDay[0].status === 'at work (remote)') {
            statusToUse = 'at work (remote)';
          }
        }
        
        // Create attendance record for target date
        const recordDate = new Date(targetDate);
        recordDate.setHours(8, 0, 0, 0); // Default to 8:00 AM clock-in
        
        await db
          .insert(attendance)
          .values({
            userId: agent.id,
            date: recordDate,
            clockIn: recordDate,
            status: statusToUse,
          });
        
        attendanceCreatedCount++;
      } catch (error) {
        console.error(`Failed to create attendance for agent ${agent.id} on ${targetDate}:`, error);
      }
    }
    
    if (attendanceCreatedCount > 0) {
      console.log(`Ensured attendance for ${targetDate}: Created ${attendanceCreatedCount} new records`);
    }
    
    return {
      created: attendanceCreatedCount,
      message: attendanceCreatedCount > 0 
        ? `Created ${attendanceCreatedCount} attendance records for ${targetDate}`
        : `All attendance records already exist for ${targetDate}`
    };
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
        reportsTo: users.reportsTo,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
  }

  async getAllTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers);
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
    
    // Update the agent's reportsTo field to the new team leader
    await db.update(users)
      .set({ reportsTo: newTeamLeaderId })
      .where(eq(users.id, agentId));
    
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

  async getTransfersByRequester(requesterId: string): Promise<Transfer[]> {
    return await db
      .select()
      .from(transfers)
      .where(eq(transfers.requestedBy, requesterId))
      .orderBy(desc(transfers.createdAt));
  }

  async createTransfer(transferData: InsertTransfer & { newDepartmentId?: string }): Promise<Transfer> {
    const { newDepartmentId, ...transferValues } = transferData;
    
    const toDepartmentId = newDepartmentId || transferValues.toDepartmentId;
    
    if (toDepartmentId) {
      const [department] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, toDepartmentId))
        .limit(1);
      
      if (!department) {
        throw new Error(`Invalid department ID: ${toDepartmentId}`);
      }
    }
    
    const transferDataWithDept = {
      ...transferValues,
      toDepartmentId
    };
    
    const [transfer] = await db.insert(transfers).values(transferDataWithDept).returning();
    
    return transfer;
  }

  async updateTransferStatus(transferId: string, status: string, approvedBy?: string): Promise<Transfer> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (approvedBy) {
      updateData.approvedBy = approvedBy;
    }
    
    const [transfer] = await db
      .update(transfers)
      .set(updateData)
      .where(eq(transfers.id, transferId))
      .returning();
    
    return transfer;
  }

  async completeTransfer(transferId: string): Promise<void> {
    const [transfer] = await db
      .select()
      .from(transfers)
      .where(eq(transfers.id, transferId));
    
    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.status !== 'approved') {
      throw new Error("Transfer must be approved before completion");
    }

    if (!transfer.toTeamId) {
      throw new Error("Transfer must have a destination team");
    }

    await db
      .delete(teamMembers)
      .where(eq(teamMembers.userId, transfer.userId));

    await db
      .insert(teamMembers)
      .values({
        teamId: transfer.toTeamId,
        userId: transfer.userId,
      });

    const [destinationTeam] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, transfer.toTeamId));

    if (destinationTeam?.leaderId) {
      const updateData: any = { 
        reportsTo: destinationTeam.leaderId,
        updatedAt: new Date(),
      };
      
      // Update department if specified in the transfer
      if (transfer.toDepartmentId) {
        updateData.departmentId = transfer.toDepartmentId;
      }
      
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, transfer.userId));
    }

    await db
      .update(transfers)
      .set({ 
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, transferId));
  }

  async deleteTransfer(transferId: string): Promise<void> {
    await db
      .delete(transfers)
      .where(eq(transfers.id, transferId));
  }

  // Termination management
  async getAllTerminations(): Promise<Termination[]> {
    return await db.select().from(terminations).orderBy(desc(terminations.createdAt));
  }

  async createTermination(terminationData: InsertTermination): Promise<Termination> {
    const [termination] = await db.insert(terminations).values(terminationData).returning();
    return termination;
  }

  async deleteTerminationForUserOnDate(userId: string, date: Date): Promise<void> {
    // Delete termination records for a specific user on a specific date
    await db.delete(terminations).where(
      and(
        eq(terminations.userId, userId),
        sql`DATE(${terminations.effectiveDate}) = DATE(${date})`
      )
    );
  }

  async deleteTerminationById(terminationId: string): Promise<void> {
    // Delete a specific termination record by ID
    await db.delete(terminations).where(eq(terminations.id, terminationId));
  }

  async getTerminationsByRecordDate(recordDate: string): Promise<Termination[]> {
    return await db.select().from(terminations)
      .where(eq(terminations.recordDate, recordDate))
      .orderBy(desc(terminations.createdAt));
  }

  async checkTerminationExistsForUserAndDate(userId: string, recordDate: string): Promise<boolean> {
    const [record] = await db.select().from(terminations)
      .where(and(
        eq(terminations.userId, userId),
        eq(terminations.recordDate, recordDate)
      ))
      .limit(1);
    return !!record;
  }

  async getOriginalTerminationForUser(userId: string): Promise<Termination | undefined> {
    // Get the initial termination record for a user (entryType = 'initial')
    const [termination] = await db.select().from(terminations)
      .where(and(
        eq(terminations.userId, userId),
        eq(terminations.entryType, 'initial')
      ))
      .orderBy(terminations.effectiveDate)
      .limit(1);
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

  async getAssetLossRecordByUserAndType(userId: string, assetType: string): Promise<AssetLossRecord | undefined> {
    const [record] = await db.select().from(assetLossRecords)
      .where(and(
        eq(assetLossRecords.userId, userId),
        eq(assetLossRecords.assetType, assetType),
        eq(assetLossRecords.status, 'reported')
      ))
      .orderBy(desc(assetLossRecords.createdAt))
      .limit(1);
    return record;
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
    const results = await db.execute(sql`
      WITH ranked_states AS (
        SELECT 
          ads.user_id,
          ads.asset_type,
          ads.current_state,
          ads.date,
          ads.date_lost,
          ads.reason as state_reason,
          ROW_NUMBER() OVER (
            PARTITION BY ads.user_id, ads.asset_type 
            ORDER BY ads.date DESC
          ) as rn
        FROM asset_daily_states ads
      ),
      most_recent_states AS (
        SELECT * FROM ranked_states WHERE rn = 1
      ),
      unreturned_with_loss AS (
        SELECT 
          mrs.user_id,
          mrs.asset_type,
          mrs.current_state,
          mrs.date,
          mrs.date_lost,
          mrs.state_reason,
          alr.reason as loss_reason
        FROM most_recent_states mrs
        LEFT JOIN asset_loss_records alr ON (
          alr.user_id = mrs.user_id 
          AND alr.asset_type = mrs.asset_type
          AND alr.status = 'reported'
        )
        WHERE mrs.current_state IN ('lost', 'not_returned')
      )
      SELECT 
        u.id as user_id,
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.username,
          'Unknown User'
        ) as agent_name,
        uwl.asset_type,
        uwl.current_state,
        COALESCE(TO_CHAR(uwl.date_lost, 'YYYY-MM-DD'), uwl.date) as date,
        CASE 
          WHEN uwl.state_reason IS NULL 
            OR uwl.state_reason LIKE '%Persisting%'
            OR uwl.state_reason LIKE '%Daily reset%'
            OR uwl.state_reason LIKE '%Asset was not returned from previous day%'
          THEN COALESCE(
            CASE 
              WHEN uwl.loss_reason NOT LIKE '%Daily reset%' 
                AND uwl.loss_reason NOT LIKE '%Asset was not returned%'
              THEN uwl.loss_reason
              ELSE NULL
            END,
            uwl.state_reason
          )
          ELSE uwl.state_reason
        END as reason
      FROM unreturned_with_loss uwl
      INNER JOIN users u ON u.id = uwl.user_id
      ORDER BY agent_name
    `);

    return results.rows.map((row: any) => ({
      userId: row.user_id,
      agentName: row.agent_name,
      assetType: row.asset_type,
      status: row.current_state === 'lost' ? 'Lost' : 'Not Returned Yet',
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      reason: row.reason || undefined
    }));
  }

  async hasUnreturnedAssets(userId: string): Promise<boolean> {
    const results = await db.execute(sql`
      WITH ranked_states AS (
        SELECT 
          current_state,
          ROW_NUMBER() OVER (
            PARTITION BY asset_type 
            ORDER BY date DESC
          ) as rn
        FROM asset_daily_states
        WHERE user_id = ${userId}
      )
      SELECT COUNT(*) as count
      FROM ranked_states
      WHERE rn = 1 AND current_state IN ('lost', 'not_returned')
    `);
    
    const count = (results.rows[0] as any)?.count || 0;
    return count > 0;
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
      // Preserve dateLost from existing state if not provided in update
      const dateLostToUse = dailyStateData.dateLost !== undefined 
        ? dailyStateData.dateLost 
        : existingStates[0].dateLost;
      
      // Update existing state
      const [updatedState] = await db
        .update(assetDailyStates)
        .set({
          currentState: dailyStateData.currentState,
          confirmedBy: dailyStateData.confirmedBy,
          confirmedAt: dailyStateData.confirmedAt,
          reason: dailyStateData.reason,
          agentName: dailyStateData.agentName,
          dateLost: dateLostToUse,
          updatedAt: new Date(),
        })
        .where(eq(assetDailyStates.id, existingStates[0].id))
        .returning();
      
      // If marking as lost or not_returned, handle future states
      if (dailyStateData.currentState === 'lost' || dailyStateData.currentState === 'not_returned') {
        // Delete all future ready_for_collection states for this user/asset
        // They will be recreated by daily reset with the correct persistent state
        await db
          .delete(assetDailyStates)
          .where(and(
            eq(assetDailyStates.userId, dailyStateData.userId),
            eq(assetDailyStates.assetType, dailyStateData.assetType),
            sql`${assetDailyStates.date} > ${dailyStateData.date}`,
            eq(assetDailyStates.currentState, 'ready_for_collection')
          ));
      }
      
      return updatedState;
    } else {
      // Create new state
      const [newState] = await db
        .insert(assetDailyStates)
        .values(dailyStateData)
        .returning();
      
      // If marking as lost or not_returned, handle future states
      if (dailyStateData.currentState === 'lost' || dailyStateData.currentState === 'not_returned') {
        // Delete all future ready_for_collection states for this user/asset
        await db
          .delete(assetDailyStates)
          .where(and(
            eq(assetDailyStates.userId, dailyStateData.userId),
            eq(assetDailyStates.assetType, dailyStateData.assetType),
            sql`${assetDailyStates.date} > ${dailyStateData.date}`,
            eq(assetDailyStates.currentState, 'ready_for_collection')
          ));
      }
      
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

  async getAllMostRecentAssetStatesByDate(date: string): Promise<AssetDailyState[]> {
    // Get all states on or before the target date, ordered by date descending
    const states = await db
      .select()
      .from(assetDailyStates)
      .where(sql`${assetDailyStates.date} <= ${date}`)
      .orderBy(desc(assetDailyStates.date));
    
    // Filter to only keep the most recent state for each user/asset combination
    // Only include states that are on or before the target date
    const uniqueStates = new Map<string, AssetDailyState>();
    for (const state of states) {
      // Double-check date constraint in JavaScript to ensure no future states leak through
      if (state.date > date) {
        continue;
      }
      
      const key = `${state.userId}-${state.assetType}`;
      if (!uniqueStates.has(key)) {
        uniqueStates.set(key, state);
      }
    }
    
    return Array.from(uniqueStates.values());
  }

  async deleteAssetDailyStatesByUserAndDate(userId: string, date: string): Promise<void> {
    await db
      .delete(assetDailyStates)
      .where(and(
        eq(assetDailyStates.userId, userId),
        eq(assetDailyStates.date, date)
      ));
  }

  async getMostRecentAssetState(userId: string, assetType: string): Promise<AssetDailyState | undefined> {
    const [mostRecentState] = await db
      .select()
      .from(assetDailyStates)
      .where(and(
        eq(assetDailyStates.userId, userId),
        eq(assetDailyStates.assetType, assetType)
      ))
      .orderBy(desc(assetDailyStates.date))
      .limit(1);
    
    return mostRecentState;
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

  async deleteAssetStateAuditByDailyStateId(dailyStateId: string): Promise<void> {
    await db
      .delete(assetStateAudit)
      .where(eq(assetStateAudit.dailyStateId, dailyStateId));
  }

  // Attendance audit management
  async createAttendanceAudit(auditData: InsertAttendanceAudit): Promise<AttendanceAudit> {
    const [audit] = await db
      .insert(attendanceAudit)
      .values(auditData)
      .returning();
    return audit;
  }

  async getAttendanceAuditByAttendanceId(attendanceId: string): Promise<AttendanceAudit[]> {
    return await db
      .select()
      .from(attendanceAudit)
      .where(eq(attendanceAudit.attendanceId, attendanceId))
      .orderBy(desc(attendanceAudit.changedAt));
  }

  // Transfers audit management
  async createTransfersAudit(auditData: InsertTransfersAudit): Promise<TransfersAudit> {
    const [audit] = await db
      .insert(transfersAudit)
      .values(auditData)
      .returning();
    return audit;
  }

  async getTransfersAuditByTransferId(transferId: string): Promise<TransfersAudit[]> {
    return await db
      .select()
      .from(transfersAudit)
      .where(eq(transfersAudit.transferId, transferId))
      .orderBy(desc(transfersAudit.actionAt));
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

    // Get ALL users (including inactive) because terminated users can still have unreturned assets
    const allUsers = await this.getAllUsers();
    
    const assetTypes = ['laptop', 'headsets', 'dongle', 'mouse', 'lan_adapter'];
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
    for (const user of allUsers) {
      const agentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      
      for (const assetType of assetTypes) {
        // Get previous day's state for this user/asset type
        const previousStates = await this.getAssetDailyStatesByUserAndDate(user.id, previousDate);
        let previousState = previousStates.find(s => s.assetType === assetType);
        
        // If no state for previous day, check for the most recent state from any day
        // This ensures lost/not_returned states persist even if there are gaps in days
        if (!previousState) {
          previousState = await this.getMostRecentAssetState(user.id, assetType);
        }
        
        // Get current state to check if it exists
        const currentStates = await this.getAssetDailyStatesByUserAndDate(user.id, targetDate);
        const currentState = currentStates.find(s => s.assetType === assetType);
        
        let actionTaken = '';
        let newState = '';
        let reason = '';
        let dateLost = null;
        
        if (previousState) {
          // Handle based on previous day's state
          switch (previousState.currentState) {
            case 'collected':
              // Asset was collected but not returned - mark as unreturned and create incident
              // This applies to ALL users (active and inactive) for asset accountability
              newState = 'not_returned';
              reason = 'Asset was not returned/booked out from previous day';
              actionTaken = 'auto_mark_unreturned';
              
              // Check if a loss record exists, otherwise create one
              const existingLossRecord = await this.getAssetLossRecordByUserAndType(user.id, assetType);
              if (existingLossRecord) {
                dateLost = existingLossRecord.dateLost;
              } else {
                dateLost = new Date(previousDate);
                await this.createAssetLossRecord({
                  userId: user.id,
                  assetType,
                  dateLost,
                  reason: 'Asset was not returned during daily reset',
                  reportedBy: resetPerformedBy,
                  status: 'reported'
                });
              }
              
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
              // Only reset for active users
              if (user.isActive) {
                newState = 'ready_for_collection';
                reason = 'Daily reset - asset completed full cycle';
                actionTaken = 'reset_completed_cycle';
              }
              break;
              
            case 'not_collected':
              // Asset was not collected - reset to ready for collection
              // Only reset for active users
              if (user.isActive) {
                newState = 'ready_for_collection';
                reason = 'Daily reset - asset was not collected previous day';
                actionTaken = 'reset_not_collected';
              }
              break;
              
            case 'not_returned':
            case 'lost':
              // Persistent states - keep the same state for ALL users (active and inactive)
              if (!currentState) {
                newState = previousState.currentState;
                // PRESERVE the original reason from the previous state
                reason = previousState.reason || `Asset marked as ${previousState.currentState}`;
                actionTaken = 'persist_problematic_state';
                
                // Get the original dateLost from loss record or previous state
                const existingLossRecord = await this.getAssetLossRecordByUserAndType(user.id, assetType);
                if (existingLossRecord) {
                  dateLost = existingLossRecord.dateLost;
                } else if (previousState.dateLost) {
                  dateLost = previousState.dateLost;
                }
              } else {
                // State already exists, skip
                continue;
              }
              break;
              
            case 'ready_for_collection':
              // Was ready but not collected - reset to ready again
              // Only reset for active users
              if (user.isActive) {
                newState = 'ready_for_collection';
                reason = 'Daily reset - asset remained ready for collection';
                actionTaken = 'reset_ready_state';
              }
              break;
              
            default:
              // Unknown state - reset to ready for collection
              // Only reset for active users
              if (user.isActive) {
                newState = 'ready_for_collection';
                reason = 'Daily reset - unknown previous state';
                actionTaken = 'reset_unknown_state';
              }
              break;
          }
        } else {
          // No previous state - initialize as ready for collection
          // Only initialize for active users
          if (user.isActive) {
            newState = 'ready_for_collection';
            reason = 'Daily reset - initializing new asset state';
            actionTaken = 'initialize_new_state';
          }
        }
        
        // Only create/update state if we have an action to take and no current state exists
        if (actionTaken && !currentState) {
          const dailyStateData: any = {
            userId: user.id,
            date: targetDate,
            assetType,
            currentState: newState as any,
            confirmedBy: resetPerformedBy,
            confirmedAt: new Date(),
            reason,
            agentName
          };
          
          // Include dateLost if this is a lost/not_returned state
          if (dateLost && (newState === 'not_returned' || newState === 'lost')) {
            dailyStateData.dateLost = dateLost;
          }
          
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
    
    // AUTO-CREATE ATTENDANCE RECORDS FOR ALL ACTIVE AGENTS
    let attendanceCreatedCount = 0;
    const agents = allUsers.filter(u => u.role === 'agent' && u.isActive);
    
    for (const agent of agents) {
      try {
        // Check if attendance record already exists for this agent on target date
        const targetDateTime = new Date(targetDate);
        const startOfDay = new Date(targetDateTime);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDateTime);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existingRecords = await db
          .select()
          .from(attendance)
          .where(and(
            eq(attendance.userId, agent.id),
            gte(attendance.date, startOfDay),
            lte(attendance.date, endOfDay)
          ));
        
        // Skip if attendance record already exists
        if (existingRecords.length > 0) {
          continue;
        }
        
        // Determine appropriate status
        let statusToUse: any = 'at work';
        
        // Check for recent termination status
        const recentTerminations = await db
          .select()
          .from(attendance)
          .where(and(
            eq(attendance.userId, agent.id),
            sql`(${attendance.status} = 'AWOL' OR ${attendance.status} = 'suspended' OR ${attendance.status} = 'resignation' OR ${attendance.status} = 'terminated')`
          ))
          .orderBy(desc(attendance.date))
          .limit(1);
        
        if (recentTerminations.length > 0) {
          statusToUse = recentTerminations[0].status;
        } else {
          // Check for remote work persistence
          const recentWorkingDay = await db
            .select()
            .from(attendance)
            .where(and(
              eq(attendance.userId, agent.id),
              sql`(${attendance.status} = 'at work' OR ${attendance.status} = 'at work (remote)')`
            ))
            .orderBy(desc(attendance.date))
            .limit(1);
          
          if (recentWorkingDay.length > 0 && recentWorkingDay[0].status === 'at work (remote)') {
            statusToUse = 'at work (remote)';
          }
        }
        
        // Create attendance record for target date
        const recordDate = new Date(targetDate);
        recordDate.setHours(8, 0, 0, 0); // Default to 8:00 AM clock-in
        
        await db
          .insert(attendance)
          .values({
            userId: agent.id,
            date: recordDate,
            clockIn: recordDate,
            status: statusToUse,
          });
        
        attendanceCreatedCount++;
      } catch (error) {
        console.error(`Failed to create attendance for agent ${agent.id}:`, error);
      }
    }
    
    console.log(`Daily reset: Created ${attendanceCreatedCount} attendance records for ${targetDate}`);
    
    return {
      message: `Daily reset completed for ${targetDate}. Created ${attendanceCreatedCount} attendance records.`,
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

  async resetAgentAssetRecords(agentId: string, resetBy: string, date: string): Promise<{
    message: string;
    assetTypesReset: string[];
  }> {
    return await db.transaction(async (tx) => {
      const agent = await tx.select().from(users).where(eq(users.id, agentId)).limit(1);
      if (agent.length === 0) {
        throw new Error("Agent not found");
      }

      const agentName = `${agent[0].firstName || ''} ${agent[0].lastName || ''}`.trim() || agent[0].username;

      const existingStates = await tx
        .select()
        .from(assetDailyStates)
        .where(and(
          eq(assetDailyStates.userId, agentId),
          eq(assetDailyStates.date, date)
        ));

      for (const state of existingStates) {
        await tx
          .delete(assetStateAudit)
          .where(eq(assetStateAudit.dailyStateId, state.id));
      }

      await tx
        .delete(assetDailyStates)
        .where(and(
          eq(assetDailyStates.userId, agentId),
          eq(assetDailyStates.date, date)
        ));

      const historicalStates = await tx
        .select()
        .from(assetDailyStates)
        .where(eq(assetDailyStates.userId, agentId));

      const assetTypesUsed = new Set<string>();
      for (const state of historicalStates) {
        assetTypesUsed.add(state.assetType);
      }

      const assetTypesArray = Array.from(assetTypesUsed);

      for (const assetType of assetTypesArray) {
        await tx.insert(assetDailyStates).values({
          userId: agentId,
          assetType,
          date,
          currentState: 'ready_for_collection',
          confirmedBy: null,
          confirmedAt: null,
          agentName
        });
      }

      for (const state of existingStates) {
        await tx.insert(assetIncidents).values({
          userId: agentId,
          assetType: state.assetType,
          incidentType: 'maintenance',
          description: `Asset records reset by: ${resetBy}. Previous state was: ${state.currentState}`,
          reportedBy: resetBy,
          status: 'resolved',
          resolution: 'Records reset - agent can start fresh booking process',
          resolvedBy: resetBy,
          resolvedAt: new Date()
        });
      }

      return {
        message: "Agent asset records reset successfully",
        assetTypesReset: assetTypesArray
      };
    });
  }
}

export const storage = new DatabaseStorage();
