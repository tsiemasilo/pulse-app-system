import {
  users,
  departments,
  assets,
  attendance,
  teams,
  teamMembers,
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
  type UserRole,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(userId: string, role: UserRole): Promise<User>;
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;
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
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
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
      .select()
      .from(attendance)
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
}

export const storage = new DatabaseStorage();
