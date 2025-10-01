import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export type UserRole = 'admin' | 'hr' | 'contact_center_ops_manager' | 'contact_center_manager' | 'team_leader' | 'agent';

// Departments
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table with local authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: text("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").$type<UserRole>().notNull().default('agent'),
  departmentId: varchar("department_id").references(() => departments.id),
  reportsTo: varchar("reports_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assets
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type").notNull(), // laptop, headset, phone, etc.
  serialNumber: varchar("serial_number").unique(),
  status: varchar("status").notNull().default('available'), // available, assigned, maintenance, missing
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attendance records
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  status: varchar("status").notNull(), // present, absent, late, leave
  hoursWorked: integer("hours_worked").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Historical Asset Records for Reports
export const historicalAssetRecords = pgTable("historical_asset_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  bookInRecords: jsonb("book_in_records").notNull(), // JSON of agent booking data
  bookOutRecords: jsonb("book_out_records").notNull(), // JSON of agent booking data  
  lostAssets: jsonb("lost_assets").notNull(), // JSON array of lost asset records
  createdAt: timestamp("created_at").defaultNow(),
});

// Team assignments
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  leaderId: varchar("leader_id").references(() => users.id),
  departmentId: varchar("department_id").references(() => departments.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Employee transfers (temporary or permanent)
export const transfers = pgTable("transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fromDepartmentId: varchar("from_department_id").references(() => departments.id),
  toDepartmentId: varchar("to_department_id").notNull().references(() => departments.id),
  fromRole: varchar("from_role"),
  toRole: varchar("to_role"),
  transferType: varchar("transfer_type").notNull(), // temporary, permanent
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // null for permanent transfers
  reason: text("reason"),
  status: varchar("status").notNull().default('pending'), // pending, approved, rejected, completed
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee terminations
export const terminations = pgTable("terminations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  terminationType: varchar("termination_type").notNull(), // voluntary, involuntary, layoff, retirement
  terminationDate: timestamp("termination_date").notNull(),
  lastWorkingDay: timestamp("last_working_day").notNull(),
  reason: text("reason"),
  assetReturnStatus: varchar("asset_return_status").default('pending'), // pending, partial, completed
  processedBy: varchar("processed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asset loss records
export const assetLossRecords = pgTable("asset_loss_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  assetType: varchar("asset_type").notNull(), // laptop, headsets, dongle
  dateLost: timestamp("date_lost").notNull(),
  reason: text("reason").notNull(),
  reportedBy: varchar("reported_by").notNull().references(() => users.id),
  status: varchar("status").notNull().default('reported'), // reported, investigating, resolved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asset daily states (state-machine based tracking)
export const assetDailyStates = pgTable("asset_daily_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD format
  assetType: varchar("asset_type").notNull(), // laptop, headsets, dongle
  currentState: varchar("current_state").notNull(), // ready_for_collection, collected, not_collected, returned, not_returned, lost
  confirmedBy: varchar("confirmed_by").references(() => users.id), // who confirmed the state
  confirmedAt: timestamp("confirmed_at"), // when state was confirmed
  reason: text("reason"), // reason for current state if applicable
  agentName: varchar("agent_name"), // Cache for performance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asset state audit (tracking all state changes)
export const assetStateAudit = pgTable("asset_state_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dailyStateId: varchar("daily_state_id").notNull().references(() => assetDailyStates.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  assetType: varchar("asset_type").notNull(), // laptop, headsets, dongle
  previousState: varchar("previous_state"), // previous state (null for initial state)
  newState: varchar("new_state").notNull(), // new state
  reason: text("reason"), // reason for state change
  changedBy: varchar("changed_by").notNull().references(() => users.id), // who made the change
  changedAt: timestamp("changed_at").notNull().defaultNow(), // when change was made
  createdAt: timestamp("created_at").defaultNow(),
});

// Asset incidents (tracking asset-related incidents and issues)
export const assetIncidents = pgTable("asset_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  assetType: varchar("asset_type").notNull(), // laptop, headsets, dongle
  incidentType: varchar("incident_type").notNull(), // lost, damaged, missing, unreturned, maintenance
  description: text("description").notNull(),
  reportedBy: varchar("reported_by").notNull().references(() => users.id),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
  status: varchar("status").notNull().default('reported'), // reported, investigating, resolved, closed
  resolution: text("resolution"), // resolution description
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define asset state types for type safety
export type AssetState = 'ready_for_collection' | 'collected' | 'not_collected' | 'returned' | 'not_returned' | 'lost';
export type IncidentType = 'lost' | 'damaged' | 'missing' | 'unreturned' | 'maintenance';
export type IncidentStatus = 'reported' | 'investigating' | 'resolved' | 'closed';

// Asset details (comprehensive asset information)
export const assetDetails = pgTable("asset_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  assetType: varchar("asset_type").notNull(), // laptop, headsets, dongle
  assetId: varchar("asset_id").notNull(), // LP-001, HS-001, DG-001
  serialNumber: varchar("serial_number"),
  brandModel: varchar("brand_model"),
  accessories: text("accessories").array(), // Array of accessories
  condition: varchar("condition").notNull().default('good'), // good, fair, poor, damaged
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  departmentId: true,
  reportsTo: true,
  isActive: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTerminationSchema = createInsertSchema(terminations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetLossRecordSchema = createInsertSchema(assetLossRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHistoricalAssetRecordSchema = createInsertSchema(historicalAssetRecords).omit({
  id: true,
  createdAt: true,
});

export const insertAssetDailyStateSchema = createInsertSchema(assetDailyStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetStateAuditSchema = createInsertSchema(assetStateAudit).omit({
  id: true,
  createdAt: true,
});

export const insertAssetIncidentSchema = createInsertSchema(assetIncidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetDetailsSchema = createInsertSchema(assetDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Termination = typeof terminations.$inferSelect;
export type InsertTermination = z.infer<typeof insertTerminationSchema>;
export type AssetLossRecord = typeof assetLossRecords.$inferSelect;
export type InsertAssetLossRecord = z.infer<typeof insertAssetLossRecordSchema>;
export type HistoricalAssetRecord = typeof historicalAssetRecords.$inferSelect;
export type InsertHistoricalAssetRecord = z.infer<typeof insertHistoricalAssetRecordSchema>;
export type AssetDailyState = typeof assetDailyStates.$inferSelect;
export type InsertAssetDailyState = z.infer<typeof insertAssetDailyStateSchema>;
export type AssetStateAudit = typeof assetStateAudit.$inferSelect;
export type InsertAssetStateAudit = z.infer<typeof insertAssetStateAuditSchema>;
export type AssetIncident = typeof assetIncidents.$inferSelect;
export type InsertAssetIncident = z.infer<typeof insertAssetIncidentSchema>;
export type AssetDetails = typeof assetDetails.$inferSelect;
export type InsertAssetDetails = z.infer<typeof insertAssetDetailsSchema>;
