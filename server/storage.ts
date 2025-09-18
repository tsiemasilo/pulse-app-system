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
  assetBookings,
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
  type AssetBooking,
  type InsertAssetBooking,
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

  // Historical asset records management  
  getAllHistoricalAssetRecords(): Promise<HistoricalAssetRecord[]>;
  getHistoricalAssetRecordsByDate(date: string): Promise<HistoricalAssetRecord[]>;
  createHistoricalAssetRecord(record: InsertHistoricalAssetRecord): Promise<HistoricalAssetRecord>;
  
  // Asset booking management
  getAssetBookingsByUserAndDate(userId: string, date: string): Promise<AssetBooking[]>;
  upsertAssetBooking(booking: InsertAssetBooking): Promise<AssetBooking>;
  getAllAssetBookingsByDate(date: string): Promise<AssetBooking[]>;
  
  // Asset details management
  getAssetDetailsByUserId(userId: string): Promise<AssetDetails[]>;
  upsertAssetDetails(details: InsertAssetDetails): Promise<AssetDetails>;
  deleteAssetDetails(id: string): Promise<void>;
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
      
      // 7. Delete asset bookings for the user
      await tx.delete(assetBookings).where(eq(assetBookings.userId, userId));
      
      // 8. Delete asset loss records for the user
      await tx.delete(assetLossRecords).where(eq(assetLossRecords.userId, userId));
      
      // 9. Delete asset details for the user
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

  async upsertHistoricalAssetRecord(recordData: InsertHistoricalAssetRecord): Promise<HistoricalAssetRecord> {
    // Check if a record already exists for this date
    const existingRecords = await this.getHistoricalAssetRecordsByDate(recordData.date);
    
    if (existingRecords.length > 0) {
      // Update the most recent record for this date
      const existingRecord = existingRecords[0];
      const [updatedRecord] = await db
        .update(historicalAssetRecords)
        .set({
          bookInRecords: recordData.bookInRecords,
          bookOutRecords: recordData.bookOutRecords,
          lostAssets: recordData.lostAssets,
        })
        .where(eq(historicalAssetRecords.id, existingRecord.id))
        .returning();
      return updatedRecord;
    } else {
      // Create new record if none exists
      return await this.createHistoricalAssetRecord(recordData);
    }
  }
  
  // Asset booking management
  async getAssetBookingsByUserAndDate(userId: string, date: string): Promise<AssetBooking[]> {
    return await db
      .select()
      .from(assetBookings)
      .where(and(
        eq(assetBookings.userId, userId),
        eq(assetBookings.date, date)
      ));
  }
  
  async upsertAssetBooking(bookingData: InsertAssetBooking): Promise<AssetBooking> {
    // Check if a booking already exists for this user, date, and booking type
    const existingBookings = await db
      .select()
      .from(assetBookings)
      .where(and(
        eq(assetBookings.userId, bookingData.userId),
        eq(assetBookings.date, bookingData.date),
        eq(assetBookings.bookingType, bookingData.bookingType as string)
      ));
    
    let resultBooking: AssetBooking;
    
    if (existingBookings.length > 0) {
      // Update existing booking
      const [updatedBooking] = await db
        .update(assetBookings)
        .set({
          laptop: bookingData.laptop as string,
          headsets: bookingData.headsets as string,
          dongle: bookingData.dongle as string,
          agentName: bookingData.agentName,
          updatedAt: new Date(),
        })
        .where(eq(assetBookings.id, existingBookings[0].id))
        .returning();

      // Auto-remove lost asset records when assets are marked as returned or collected (date-scoped)
      if (bookingData.laptop === 'returned' || bookingData.laptop === 'collected') {
        await this.deleteAssetLossRecord(bookingData.userId, 'laptop', bookingData.date);
      }
      if (bookingData.headsets === 'returned' || bookingData.headsets === 'collected') {
        await this.deleteAssetLossRecord(bookingData.userId, 'headsets', bookingData.date);
      }
      if (bookingData.dongle === 'returned' || bookingData.dongle === 'collected') {
        await this.deleteAssetLossRecord(bookingData.userId, 'dongle', bookingData.date);
      }

      resultBooking = updatedBooking;
    } else {
      // Create new booking
      const [newBooking] = await db
        .insert(assetBookings)
        .values({
          ...bookingData,
          bookingType: bookingData.bookingType as string,
          laptop: bookingData.laptop as string,
          headsets: bookingData.headsets as string,
          dongle: bookingData.dongle as string,
        })
        .returning();

      // Auto-remove lost asset records when assets are marked as returned or collected (date-scoped, for new bookings too)
      if (bookingData.laptop === 'returned' || bookingData.laptop === 'collected') {
        await this.deleteAssetLossRecord(bookingData.userId, 'laptop', bookingData.date);
      }
      if (bookingData.headsets === 'returned' || bookingData.headsets === 'collected') {
        await this.deleteAssetLossRecord(bookingData.userId, 'headsets', bookingData.date);
      }
      if (bookingData.dongle === 'returned' || bookingData.dongle === 'collected') {
        await this.deleteAssetLossRecord(bookingData.userId, 'dongle', bookingData.date);
      }

      resultBooking = newBooking;
    }

    // CRITICAL FIX: Sync historical asset records with current asset bookings
    await this.syncHistoricalRecordsFromBookings(bookingData.date);

    return resultBooking;
  }
  
  async getAllAssetBookingsByDate(date: string): Promise<AssetBooking[]> {
    return await db
      .select()
      .from(assetBookings)
      .where(eq(assetBookings.date, date))
      .orderBy(assetBookings.bookingType);
  }

  // Helper method to sync historical records from current asset bookings
  async syncHistoricalRecordsFromBookings(date: string): Promise<void> {
    try {
      // Get all asset bookings for this date
      const allBookings = await this.getAllAssetBookingsByDate(date);
      
      // Group bookings by user and type
      const bookingsByUser: Record<string, Record<string, AssetBooking>> = {};
      for (const booking of allBookings) {
        if (!bookingsByUser[booking.userId]) {
          bookingsByUser[booking.userId] = {};
        }
        bookingsByUser[booking.userId][booking.bookingType] = booking;
      }

      // Build historical record format (JSON snapshots)
      const bookInRecords: Record<string, any> = {};
      const bookOutRecords: Record<string, any> = {};

      for (const [userId, userBookings] of Object.entries(bookingsByUser)) {
        // Build book-in record
        if (userBookings.book_in) {
          const booking = userBookings.book_in;
          bookInRecords[userId] = {
            agentId: userId,
            agentName: booking.agentName,
            date: booking.date,
            type: 'book_in',
            laptop: booking.laptop,
            headsets: booking.headsets,
            dongle: booking.dongle,
          };
        }

        // Build book-out record
        if (userBookings.book_out) {
          const booking = userBookings.book_out;
          bookOutRecords[userId] = {
            agentId: userId,
            agentName: booking.agentName,
            date: booking.date,
            type: 'book_out',
            laptop: booking.laptop,
            headsets: booking.headsets,
            dongle: booking.dongle,
          };
        }
      }

      // Get current lost assets for this date
      const lostAssets = await this.getAllAssetLossRecords();
      const todayLostAssets = lostAssets.filter(asset => {
        // Convert dateLost to string format for comparison
        const assetDateString = asset.dateLost instanceof Date 
          ? asset.dateLost.toISOString().split('T')[0]
          : asset.dateLost;
        return assetDateString === date;
      });

      // Update or create historical record
      await this.upsertHistoricalAssetRecord({
        date: date,
        bookInRecords: bookInRecords,
        bookOutRecords: bookOutRecords,
        lostAssets: todayLostAssets,
      });
    } catch (error) {
      console.error('Error syncing historical records from bookings:', error);
      // Don't throw error to avoid breaking the main booking operation
    }
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
