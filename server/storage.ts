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
  createAssetLossRecord(assetLossRecord: InsertAssetLossRecord): Promise<AssetLossRecord>;

  // Historical asset records management  
  getAllHistoricalAssetRecords(): Promise<HistoricalAssetRecord[]>;
  getHistoricalAssetRecordsByDate(date: string): Promise<HistoricalAssetRecord[]>;
  createHistoricalAssetRecord(record: InsertHistoricalAssetRecord): Promise<HistoricalAssetRecord>;
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
    
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        username: userData.username!,
        password: hashedTempPassword,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        role: userData.role as UserRole,
        departmentId: userData.departmentId,
        isActive: userData.isActive ?? true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          role: userData.role as UserRole,
          departmentId: userData.departmentId,
          isActive: userData.isActive ?? true,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // User management
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...userData,
      role: userData.role as UserRole
    }).returning();
    return user;
  }

  async updateUser(userId: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...userData,
        role: userData.role as UserRole,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
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

  async createAssetLossRecord(assetLossData: InsertAssetLossRecord): Promise<AssetLossRecord> {
    const [assetLossRecord] = await db.insert(assetLossRecords).values(assetLossData).returning();
    return assetLossRecord;
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
}

export const storage = new DatabaseStorage();
