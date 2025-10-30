import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./replitAuth";
import { insertUserSchema, insertDivisionSchema, insertDepartmentSchema, insertSectionSchema, insertUserDepartmentAssignmentSchema, insertAssetSchema, insertTransferSchema, insertTerminationSchema, insertAssetLossRecordSchema, insertHistoricalAssetRecordSchema, insertAssetDailyStateSchema, insertAssetStateAuditSchema, insertAssetIncidentSchema, insertAssetDetailsSchema, insertOrganizationalPositionSchema, insertUserPositionSchema, users, attendance, organizationalPositions, userPositions } from "@shared/schema";
import { dailyResetScheduler } from "./scheduler";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);


  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (Admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow admins, team leaders, managers, and HR to access user data
      if (!user?.role || !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const users = await storage.getAllUsers();
      
      // For non-admins, return only safe fields
      if (user.role !== 'admin') {
        const safeUsers = users.map(u => ({
          id: u.id,
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          departmentId: u.departmentId,
          isActive: u.isActive
        }));
        res.json(safeUsers);
      } else {
        res.json(users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userData = insertUserSchema.parse(req.body);
      
      // Hash the password before creating the user
      if (userData.password && typeof userData.password === 'string') {
        (userData as any).password = await hashPassword(userData.password);
      }
      
      const newUser = await storage.createUser(userData);
      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { role } = z.object({ role: z.string() }).parse(req.body);
      const updatedUser = await storage.updateUserRole(req.params.userId, role as any);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/users/:userId/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      const updatedUser = await storage.updateUserStatus(req.params.userId, isActive);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.patch('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updateData = z.object({
        username: z.string().optional(),
        email: z.string().email().nullable().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        role: z.string().optional(),
        departmentId: z.string().optional(),
        reportsTo: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(1, "Password must not be empty").optional(),
      }).parse(req.body);
      
      // If password is provided, hash it before updating
      if (updateData.password) {
        (updateData as any).password = await hashPassword(updateData.password);
      }
      
      const updatedUser = await storage.updateUser(req.params.userId, updateData as any);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post('/api/users/:agentId/reassign-team-leader', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { teamLeaderId } = z.object({ 
        teamLeaderId: z.string() 
      }).parse(req.body);
      
      const result = await storage.reassignAgentToTeamLeader(req.params.agentId, teamLeaderId);
      res.json({ message: "Agent successfully reassigned", result });
    } catch (error) {
      console.error("Error reassigning agent:", error);
      res.status(500).json({ message: "Failed to reassign agent" });
    }
  });

  app.delete('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteUser(req.params.userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow admins, team leaders, and managers to access individual user data
      if (!user?.role || !['admin', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // For non-admins, return only safe fields
      if (user.role !== 'admin') {
        const safeUser = {
          id: targetUser.id,
          username: targetUser.username,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          role: targetUser.role,
          departmentId: targetUser.departmentId,
          reportsTo: targetUser.reportsTo,
          isActive: targetUser.isActive
        };
        res.json(safeUser);
      } else {
        res.json(targetUser);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/users/:userId/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userTeams = await storage.getUserTeams(req.params.userId);
      res.json(userTeams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ message: "Failed to fetch user teams" });
    }
  });

  // Team leaders endpoint - accessible to admins and HR for team assignment
  app.get('/api/team-leaders', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const teamLeaders = await storage.getUsersByRole('team_leader');
      res.json(teamLeaders);
    } catch (error) {
      console.error("Error fetching team leaders:", error);
      res.status(500).json({ message: "Failed to fetch team leaders" });
    }
  });

  // Department management
  app.get('/api/departments', isAuthenticated, async (req: any, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post('/api/departments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  // Division management
  app.get('/api/divisions', isAuthenticated, async (req: any, res) => {
    try {
      const divisions = await storage.getAllDivisions();
      res.json(divisions);
    } catch (error) {
      console.error("Error fetching divisions:", error);
      res.status(500).json({ message: "Failed to fetch divisions" });
    }
  });

  app.post('/api/divisions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const divisionData = insertDivisionSchema.parse(req.body);
      const division = await storage.createDivision(divisionData);
      res.json(division);
    } catch (error) {
      console.error("Error creating division:", error);
      res.status(500).json({ message: "Failed to create division" });
    }
  });

  // Section management
  app.get('/api/sections', isAuthenticated, async (req: any, res) => {
    try {
      const sections = await storage.getAllSections();
      res.json(sections);
    } catch (error) {
      console.error("Error fetching sections:", error);
      res.status(500).json({ message: "Failed to fetch sections" });
    }
  });

  app.post('/api/sections', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sectionData = insertSectionSchema.parse(req.body);
      const section = await storage.createSection(sectionData);
      res.json(section);
    } catch (error) {
      console.error("Error creating section:", error);
      res.status(500).json({ message: "Failed to create section" });
    }
  });

  // User department assignment management
  app.get('/api/user-department-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const assignments = await storage.getAllUserDepartmentAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user department assignments:", error);
      res.status(500).json({ message: "Failed to fetch user department assignments" });
    }
  });

  app.get('/api/user-department-assignments/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const assignment = await storage.getUserDepartmentAssignment(req.params.userId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching user department assignment:", error);
      res.status(500).json({ message: "Failed to fetch user department assignment" });
    }
  });

  app.post('/api/user-department-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const assignmentData = insertUserDepartmentAssignmentSchema.parse(req.body);
      const assignment = await storage.assignUserToDepartment(assignmentData);
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning user to department:", error);
      res.status(500).json({ message: "Failed to assign user to department" });
    }
  });

  app.delete('/api/user-department-assignments/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.removeUserDepartmentAssignment(req.params.userId);
      res.json({ message: "User department assignment removed successfully" });
    } catch (error) {
      console.error("Error removing user department assignment:", error);
      res.status(500).json({ message: "Failed to remove user department assignment" });
    }
  });

  // Asset management
  app.get('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const assets = await storage.getAllAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get('/api/assets/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const assets = await storage.getAssetsByUser(req.params.userId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching user assets:", error);
      res.status(500).json({ message: "Failed to fetch user assets" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const assetData = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(assetData);
      res.json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.patch('/api/assets/:assetId/assign', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId } = z.object({ userId: z.string() }).parse(req.body);
      const asset = await storage.assignAsset(req.params.assetId, userId);
      res.json(asset);
    } catch (error) {
      console.error("Error assigning asset:", error);
      res.status(500).json({ message: "Failed to assign asset" });
    }
  });

  // Asset loss records
  app.post('/api/asset-loss', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Convert dateLost string to Date object before validation
      const requestData = {
        ...req.body,
        dateLost: new Date(req.body.dateLost),
        reportedBy: user.id,
      };

      const assetLossData = insertAssetLossRecordSchema.parse(requestData);
      
      const assetLossRecord = await storage.createAssetLossRecord(assetLossData);
      
      // Note: Historical record sync will be handled by daily state management
      
      res.json(assetLossRecord);
    } catch (error) {
      console.error("Error creating asset loss record:", error);
      res.status(500).json({ message: "Failed to create asset loss record" });
    }
  });

  app.get('/api/asset-loss', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { date } = req.query;
      
      if (date) {
        // Get asset loss records for specific date
        const assetLossRecords = await storage.getAssetLossRecordsByDate(date as string);
        res.json(assetLossRecords);
      } else {
        // Get all asset loss records (backward compatibility)
        const assetLossRecords = await storage.getAllAssetLossRecords();
        res.json(assetLossRecords);
      }
    } catch (error) {
      console.error("Error fetching asset loss records:", error);
      res.status(500).json({ message: "Failed to fetch asset loss records" });
    }
  });

  app.delete('/api/asset-loss', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId, assetType, date } = req.body;
      
      if (!userId || !assetType || !date) {
        return res.status(400).json({ message: "Missing required fields: userId, assetType, date" });
      }

      await storage.deleteAssetLossRecord(userId, assetType, date);
      
      // Note: Historical record sync will be handled by daily state management
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting asset loss record:", error);
      res.status(500).json({ message: "Failed to delete asset loss record" });
    }
  });

  // Get all unreturned assets across all dates
  app.get('/api/unreturned-assets', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const unreturnedAssets = await storage.getAllUnreturnedAssets();
      res.json(unreturnedAssets);
    } catch (error) {
      console.error("Error fetching unreturned assets:", error);
      res.status(500).json({ message: "Failed to fetch unreturned assets" });
    }
  });

  // Check if a specific user has unreturned assets
  app.get('/api/unreturned-assets/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const targetUserId = req.params.userId;
      
      // Allow access to own data or if user has management permissions
      if (user?.id !== targetUserId && !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const hasUnreturnedAssets = await storage.hasUnreturnedAssets(targetUserId);
      res.json({ hasUnreturnedAssets });
    } catch (error) {
      console.error("Error checking unreturned assets for user:", error);
      res.status(500).json({ message: "Failed to check unreturned assets for user" });
    }
  });


  // Asset daily states routes (replacement for asset bookings)
  app.get('/api/assets/daily-states/:date', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      // First try to get exact date matches
      let dailyStates = await storage.getAllAssetDailyStatesByDate(req.params.date);
      
      // If no exact matches found, get the most recent states up to this date
      if (dailyStates.length === 0) {
        dailyStates = await storage.getAllMostRecentAssetStatesByDate(req.params.date);
      }
      
      res.json(dailyStates);
    } catch (error) {
      console.error("Error fetching daily states:", error);
      res.status(500).json({ message: "Failed to fetch daily states" });
    }
  });

  app.get('/api/assets/daily-states/user/:userId/date/:date', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow access to own data or if user has management permissions
      if (user?.id !== req.params.userId && !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const dailyStates = await storage.getAssetDailyStatesByUserAndDate(req.params.userId, req.params.date);
      res.json(dailyStates);
    } catch (error) {
      console.error("Error fetching user daily states:", error);
      res.status(500).json({ message: "Failed to fetch user daily states" });
    }
  });

  app.get('/api/assets/most-recent-state/user/:userId/asset/:assetType', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow access to own data or if user has management permissions
      if (user?.id !== req.params.userId && !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const mostRecentState = await storage.getMostRecentAssetState(req.params.userId, req.params.assetType);
      res.json(mostRecentState || null);
    } catch (error) {
      console.error("Error fetching most recent asset state:", error);
      res.status(500).json({ message: "Failed to fetch most recent asset state" });
    }
  });

  app.post('/api/assets/daily-state', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const dailyStateData = insertAssetDailyStateSchema.parse(req.body);
      const dailyState = await storage.upsertAssetDailyState(dailyStateData);
      res.json(dailyState);
    } catch (error) {
      console.error("Error creating/updating daily state:", error);
      res.status(500).json({ message: "Failed to create/update daily state" });
    }
  });

  // Helper function to get user full name
  async function getUserFullName(userId: string): Promise<string> {
    const user = await storage.getUser(userId);
    return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown';
  }

  // Helper function to check if user has unreturned asset of specific type
  async function checkUserHasUnreturnedAssetType(userId: string, assetType: string): Promise<boolean> {
    const unreturnedAssets = await storage.getAllUnreturnedAssets();
    return unreturnedAssets.some(asset => asset.userId === userId && asset.assetType === assetType);
  }

  // New Asset Booking API Routes
  
  // Book Out Route - Confirm asset collection status (issuing/handing out assets to agents)
  app.post('/api/assets/book-in', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId, assetType, date, status, reason } = z.object({
        userId: z.string(),
        assetType: z.string(),
        date: z.string(), // YYYY-MM-DD format
        status: z.enum(['collected', 'not_collected']),
        reason: z.string().optional(),
      }).parse(req.body);

      // Validate that the asset is in a state that allows book-out (issuing)
      const currentStates = await storage.getAssetDailyStatesByUserAndDate(userId, date);
      const existingState = currentStates.find(s => s.assetType === assetType);
      
      if (existingState && !['ready_for_collection', 'collected', 'not_collected'].includes(existingState.currentState)) {
        return res.status(400).json({ 
          message: `Cannot book out asset in current state: ${existingState.currentState}` 
        });
      }

      const dailyStateData = {
        userId,
        date,
        assetType,
        currentState: status,
        confirmedBy: user.id,
        confirmedAt: new Date(),
        reason: reason || null,
        agentName: await getUserFullName(userId)
      };

      const dailyState = await storage.upsertAssetDailyState(dailyStateData);
      
      // Create audit trail
      await storage.createAssetStateAudit({
        dailyStateId: dailyState.id,
        userId,
        assetType,
        previousState: existingState?.currentState || 'ready_for_collection',
        newState: status,
        reason: reason || `Book out: ${status}`,
        changedBy: user.id,
        changedAt: new Date()
      });

      res.json(dailyState);
    } catch (error) {
      console.error("Error processing book-out:", error);
      res.status(500).json({ message: "Failed to process book-out" });
    }
  });

  // Book In Route - Confirm asset return status (agents returning assets)
  app.post('/api/assets/book-out', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId, assetType, date, status, reason } = z.object({
        userId: z.string(),
        assetType: z.string(),
        date: z.string(), // YYYY-MM-DD format
        status: z.enum(['returned', 'not_returned', 'lost']),
        reason: z.string().optional(),
      }).parse(req.body);

      // Validate that the asset was booked out (collected) before allowing book in (return)
      const currentStates = await storage.getAssetDailyStatesByUserAndDate(userId, date);
      const existingState = currentStates.find(s => s.assetType === assetType);
      
      if (!existingState || existingState.currentState !== 'collected') {
        return res.status(400).json({ 
          message: "Asset must be collected before it can be booked in" 
        });
      }

      let dateLost = null;
      
      // If marking as lost or not_returned, create/check asset loss record
      if (status === 'lost' || status === 'not_returned') {
        // Check if a loss record already exists for this user/asset
        const existingLossRecord = await storage.getAssetLossRecordByUserAndType(userId, assetType);
        
        if (existingLossRecord) {
          // Use existing dateLost
          dateLost = existingLossRecord.dateLost;
        } else {
          // Create new loss record with current date
          dateLost = new Date(date);
          await storage.createAssetLossRecord({
            userId,
            assetType,
            dateLost,
            reason: reason || `Asset marked as ${status}`,
            reportedBy: user.id,
            status: 'reported'
          });
        }
      }

      const dailyStateData = {
        userId,
        date,
        assetType,
        currentState: status,
        confirmedBy: user.id,
        confirmedAt: new Date(),
        reason: reason || null,
        agentName: await getUserFullName(userId),
        dateLost
      };

      const dailyState = await storage.upsertAssetDailyState(dailyStateData);
      
      // Create audit trail
      await storage.createAssetStateAudit({
        dailyStateId: dailyState.id,
        userId,
        assetType,
        previousState: existingState.currentState,
        newState: status,
        reason: reason || `Book in: ${status}`,
        changedBy: user.id,
        changedAt: new Date()
      });

      res.json(dailyState);
    } catch (error) {
      console.error("Error processing book-in:", error);
      res.status(500).json({ message: "Failed to process book-in" });
    }
  });

  // Mark Asset as Found Route
  app.post('/api/assets/mark-found', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId, assetType, date, recoveryReason } = z.object({
        userId: z.string(),
        assetType: z.string(),
        date: z.string(), // YYYY-MM-DD format of the day when asset was lost (not used for validation)
        recoveryReason: z.string(),
      }).parse(req.body);

      // Get today's date - we need to check and update TODAY's state, not the old lost date
      const today = new Date().toISOString().split('T')[0];

      // Find the current state (today's state) for this asset
      const todayStates = await storage.getAssetDailyStatesByUserAndDate(userId, today);
      const existingState = todayStates.find(s => s.assetType === assetType);
      
      if (!existingState || !['not_returned', 'lost'].includes(existingState.currentState)) {
        return res.status(400).json({ 
          message: "Asset is not in a lost/unreturned state" 
        });
      }

      // Update TODAY's state to returned
      const dailyStateData = {
        userId,
        date: today, // Use today's date, not the old lost date
        assetType,
        currentState: 'returned' as const,
        confirmedBy: user.id,
        confirmedAt: new Date(),
        reason: `Found: ${recoveryReason}`,
        agentName: await getUserFullName(userId)
      };

      const dailyState = await storage.upsertAssetDailyState(dailyStateData);
      
      // Create audit trail
      await storage.createAssetStateAudit({
        dailyStateId: dailyState.id,
        userId,
        assetType,
        previousState: existingState.currentState,
        newState: 'returned',
        reason: `Asset found: ${recoveryReason}`,
        changedBy: user.id,
        changedAt: new Date()
      });

      // Resolve any asset loss records for this asset
      try {
        await storage.deleteAssetLossRecord(userId, assetType);
      } catch (lossRecordError) {
        console.log("No loss record to delete or error deleting:", lossRecordError);
      }

      res.json(dailyState);
    } catch (error) {
      console.error("Error marking asset as found:", error);
      res.status(500).json({ message: "Failed to mark asset as found" });
    }
  });

  // Reset Agent Asset Records Route - Team leaders can reset their team members' daily asset states
  app.post('/api/assets/reset-agent', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden - Team leaders only" });
      }

      const { agentId, password } = z.object({
        agentId: z.string(),
        password: z.string(),
      }).parse(req.body);

      // Import comparePasswords function
      const { comparePasswords } = await import('./replitAuth');

      // Verify team leader's password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid password" });
      }

      // Get the agent to verify they belong to team leader's team
      const agent = await storage.getUser(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Verify the agent belongs to team leader's team
      const leaderTeams = await storage.getTeamsByLeader(user.id);
      if (leaderTeams.length === 0) {
        return res.status(403).json({ message: "You are not assigned as a team leader" });
      }

      const teamMembers = await storage.getTeamMembers(leaderTeams[0].id);
      const isAgentInTeam = teamMembers.some(member => member.id === agentId);
      if (!isAgentInTeam) {
        return res.status(403).json({ message: "Agent is not in your team" });
      }

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Get all of agent's daily states for today
      const existingStates = await storage.getAssetDailyStatesByUserAndDate(agentId, today);
      
      // First, delete the existing audit records for these daily states to avoid constraint issues
      for (const state of existingStates) {
        // Delete any existing audit records that reference this daily state
        await storage.deleteAssetStateAuditByDailyStateId(state.id);
      }

      // Remove the agent's daily states for today (this will reset their assets to default state)
      await storage.deleteAssetDailyStatesByUserAndDate(agentId, today);

      // Now create new audit records for the reset action (without dailyStateId since states are deleted)
      for (const state of existingStates) {
        await storage.createAssetIncident({
          userId: agentId,
          assetType: state.assetType,
          incidentType: 'maintenance',
          description: `Asset records reset by team leader: ${user.username}. Previous state was: ${state.currentState}`,
          reportedBy: user.id,
          status: 'resolved',
          resolution: 'Records reset - agent can start fresh booking process',
          resolvedBy: user.id,
          resolvedAt: new Date()
        });
      }

      res.json({ 
        message: "Agent asset records reset successfully",
        agentId,
        date: today,
        resetBy: user.username,
        statesReset: existingStates.length
      });
    } catch (error) {
      console.error("Error resetting agent:", error);
      res.status(500).json({ message: "Failed to reset agent" });
    }
  });

  // Enhanced Daily Reset Route - Intelligent state management across days
  app.post('/api/assets/daily-reset', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden - Admin/HR only" });
      }

      const { date } = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      }).parse(req.body);

      console.log(`Starting enhanced daily reset for ${date} by user ${user.id} (${user.username})`);
      
      // Use the enhanced daily reset logic
      const result = await storage.performDailyReset(date, user.id);
      
      console.log(`Daily reset completed for ${date}:`, {
        resetCount: result.resetCount,
        incidentsCreated: result.incidentsCreated,
        actionsPerformed: result.details.map(d => `${d.agentName} - ${d.assetType}: ${d.action}`)
      });

      res.json(result);
    } catch (error) {
      console.error("Error performing daily reset:", error);
      res.status(500).json({ 
        message: "Failed to perform daily reset", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Automated Daily Reset Trigger Route (for scheduling systems)
  app.post('/api/assets/daily-reset/auto', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden - Admin only" });
      }

      // Auto-calculate today's date
      const today = new Date().toISOString().split('T')[0];
      
      console.log(`Starting automated daily reset for ${today} by user ${user.id} (${user.username})`);
      
      // Use the enhanced daily reset logic with today's date
      const result = await storage.performDailyReset(today, user.id);
      
      console.log(`Automated daily reset completed for ${today}:`, {
        resetCount: result.resetCount,
        incidentsCreated: result.incidentsCreated,
        actionsPerformed: result.details.map(d => `${d.agentName} - ${d.assetType}: ${d.action}`)
      });

      res.json({
        ...result,
        automated: true,
        processedDate: today
      });
    } catch (error) {
      console.error("Error performing automated daily reset:", error);
      res.status(500).json({ 
        message: "Failed to perform automated daily reset", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Daily Reset Status Route - Check if reset has been performed for a date
  app.get('/api/assets/daily-reset/status/:date', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { date } = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      }).parse({ date: req.params.date });

      const dailyStates = await storage.getAllAssetDailyStatesByDate(date);
      const stateGroups = dailyStates.reduce((acc, state) => {
        const key = state.currentState;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        date,
        resetPerformed: dailyStates.length > 0,
        totalStates: dailyStates.length,
        stateBreakdown: stateGroups,
        lastActivity: dailyStates.length > 0 ? 
          Math.max(...dailyStates.map(s => new Date(s.updatedAt || s.createdAt || new Date()).getTime())) : null
      });
    } catch (error) {
      console.error("Error checking daily reset status:", error);
      res.status(500).json({ message: "Failed to check daily reset status" });
    }
  });

  // Scheduler Management Routes
  app.get('/api/assets/daily-reset/scheduler/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!['admin', 'hr'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden - Admin/HR only" });
      }

      const status = dailyResetScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ message: "Failed to get scheduler status" });
    }
  });

  app.post('/api/assets/daily-reset/scheduler/trigger', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!['admin', 'hr'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden - Admin/HR only" });
      }

      const { date } = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
      }).parse(req.body);

      const result = await dailyResetScheduler.triggerManualReset(date);
      res.json({
        ...result,
        triggeredBy: user.username,
        triggeredAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error triggering manual reset:", error);
      res.status(500).json({ 
        message: "Failed to trigger manual reset", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Asset State Audit Trail Route
  app.get('/api/assets/state-audit/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow access to own data or if user has management permissions
      if (user?.id !== req.params.userId && !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const auditTrail = await storage.getAssetStateAuditByUserId(req.params.userId);
      res.json(auditTrail);
    } catch (error) {
      console.error("Error fetching asset state audit:", error);
      res.status(500).json({ message: "Failed to fetch asset state audit" });
    }
  });

  // Alias route for asset audit (matches UI component specification)
  app.get('/api/assets/audit/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow access to own data or if user has management permissions
      if (user?.id !== req.params.userId && !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const auditTrail = await storage.getAssetStateAuditByUserId(req.params.userId);
      res.json(auditTrail);
    } catch (error) {
      console.error("Error fetching asset audit:", error);
      res.status(500).json({ message: "Failed to fetch asset audit" });
    }
  });

  // Alias route for unreturned assets (matches required API specification)
  app.get('/api/assets/unreturned', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const unreturnedAssets = await storage.getAllUnreturnedAssets();
      res.json(unreturnedAssets);
    } catch (error) {
      console.error("Error fetching unreturned assets:", error);
      res.status(500).json({ message: "Failed to fetch unreturned assets" });
    }
  });

  // Asset details routes
  app.get('/api/asset-details/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow access to own data or if user has management permissions
      if (user?.id !== req.params.userId && !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const assetDetails = await storage.getAssetDetailsByUserId(req.params.userId);
      res.json(assetDetails);
    } catch (error) {
      console.error("Error fetching asset details:", error);
      res.status(500).json({ message: "Failed to fetch asset details" });
    }
  });

  app.post('/api/asset-details', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const detailsData = insertAssetDetailsSchema.parse(req.body);
      const assetDetails = await storage.upsertAssetDetails(detailsData);
      res.json(assetDetails);
    } catch (error) {
      console.error("Error creating/updating asset details:", error);
      res.status(500).json({ message: "Failed to create/update asset details" });
    }
  });

  app.delete('/api/asset-details/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'team_leader' && user?.role !== 'contact_center_manager' && user?.role !== 'contact_center_ops_manager') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteAssetDetails(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting asset details:", error);
      res.status(500).json({ message: "Failed to delete asset details" });
    }
  });

  // Attendance routes
  app.get('/api/attendance/today', isAuthenticated, async (req: any, res) => {
    try {
      const today = new Date();
      const attendanceRecords = await storage.getAttendanceByDate(today);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.get('/api/attendance/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const attendanceRecords = await storage.getAttendanceByUser(req.params.userId, start, end);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching user attendance:", error);
      res.status(500).json({ message: "Failed to fetch user attendance" });
    }
  });

  app.get('/api/attendance/range', isAuthenticated, async (req: any, res) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ message: "Start and end dates are required" });
      }
      
      // Parse dates and ensure they're set to start/end of day
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      // Set start date to beginning of day (00:00:00.000)
      startDate.setHours(0, 0, 0, 0);
      
      // Set end date to end of day (23:59:59.999) to include all records from that day
      endDate.setHours(23, 59, 59, 999);
      
      const attendanceRecords = await storage.getAttendanceByDateRange(startDate, endDate);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance range:", error);
      res.status(500).json({ message: "Failed to fetch attendance range" });
    }
  });

  app.post('/api/attendance/clock-in', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const record = await storage.clockIn(userId);
      res.json(record);
    } catch (error) {
      console.error("Error clocking in:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  app.post('/api/attendance/clock-in-for-user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Only team leaders, HR, and admins can create attendance for other users
      if (user?.role !== 'team_leader' && user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { userId, status } = z.object({ 
        userId: z.string(),
        status: z.enum(['at work', 'at work (remote)', 'present', 'absent', 'late', 'sick', 'on leave', 'AWOL', 'suspended', 'resignation', 'terminated'])
      }).parse(req.body);

      // If the user is a team leader, verify the userId belongs to their team
      if (user.role === 'team_leader') {
        const leaderTeams = await storage.getTeamsByLeader(user.id);
        
        if (leaderTeams.length === 0) {
          return res.status(403).json({ message: "You are not assigned as a team leader" });
        }

        // Get all team members across all teams this leader manages
        let isInTeam = false;
        for (const team of leaderTeams) {
          const teamMembers = await storage.getTeamMembers(team.id);
          if (teamMembers.some(member => member.id === userId)) {
            isInTeam = true;
            break;
          }
        }

        if (!isInTeam) {
          return res.status(403).json({ message: "You can only create attendance for your team members" });
        }
      }

      // Create attendance record with the specified status
      const record = await storage.clockInWithStatus(userId, status);
      console.log("Created attendance record:", record);
      res.json(record);
    } catch (error) {
      console.error("Error creating attendance:", error);
      res.status(500).json({ message: "Failed to create attendance" });
    }
  });

  app.post('/api/attendance/clock-out', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const record = await storage.clockOut(userId);
      res.json(record);
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  app.get('/api/attendance/:id/audit', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.role || !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const attendanceId = req.params.id;
      const auditLogs = await storage.getAttendanceAuditByAttendanceId(attendanceId);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching attendance audit logs:", error);
      res.status(500).json({ message: "Failed to fetch attendance audit logs" });
    }
  });

  app.patch('/api/attendance/:attendanceId/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'team_leader' && user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { status } = z.object({ 
        status: z.enum(['at work', 'at work (remote)', 'present', 'absent', 'late', 'sick', 'on leave', 'AWOL', 'suspended', 'resignation', 'terminated'])
      }).parse(req.body);

      // First, fetch the attendance record to get the userId
      const [attendanceRecord] = await db
        .select()
        .from(attendance)
        .where(eq(attendance.id, req.params.attendanceId));

      if (!attendanceRecord) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      // If the user is a team leader, verify the userId belongs to their team
      if (user.role === 'team_leader') {
        const leaderTeams = await storage.getTeamsByLeader(user.id);
        
        if (leaderTeams.length === 0) {
          return res.status(403).json({ message: "You are not assigned as a team leader" });
        }

        // Get all team members across all teams this leader manages
        let isInTeam = false;
        for (const team of leaderTeams) {
          const teamMembers = await storage.getTeamMembers(team.id);
          if (teamMembers.some(member => member.id === attendanceRecord.userId)) {
            isInTeam = true;
            break;
          }
        }

        if (!isInTeam) {
          return res.status(403).json({ message: "You can only modify attendance for your team members" });
        }
      }

      // Check if this is a change FROM a termination status TO a non-termination status
      const terminationStatuses = ['AWOL', 'suspended', 'resignation', 'terminated'];
      const wasTerminationStatus = terminationStatuses.includes(attendanceRecord.status);
      const isNowTerminationStatus = terminationStatuses.includes(status);
      
      // If changing from termination status to non-termination status, check if we should delete the termination record
      if (wasTerminationStatus && !isNowTerminationStatus) {
        try {
          // Get all terminations for this user and find the most recent one
          const allTerminations = await storage.getAllTerminations();
          const userTerminations = allTerminations
            .filter(t => t.userId === attendanceRecord.userId && terminationStatuses.includes(t.statusType))
            .sort((a, b) => {
              // Sort by effectiveDate DESC, then by id DESC for deterministic ordering
              const dateCompare = new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime();
              if (dateCompare !== 0) return dateCompare;
              return b.id.localeCompare(a.id);
            });
          
          if (userTerminations.length > 0) {
            const mostRecentTermination = userTerminations[0];
            
            // Check if the termination's effectiveDate is today
            const terminationDate = new Date(mostRecentTermination.effectiveDate);
            const today = new Date();
            terminationDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const isSameDay = terminationDate.getTime() === today.getTime();
            
            // Also check if the attendance record date is today
            const attendanceDate = new Date(attendanceRecord.date);
            attendanceDate.setHours(0, 0, 0, 0);
            const isAttendanceToday = attendanceDate.getTime() === today.getTime();
            
            // Only delete if BOTH the termination and attendance change are happening on the same day
            if (isSameDay && isAttendanceToday) {
              await storage.deleteTerminationById(mostRecentTermination.id);
              console.log(`Deleted termination record ${mostRecentTermination.id} for user ${attendanceRecord.userId} (marked and changed on same day: ${mostRecentTermination.effectiveDate})`);
            } else {
              console.log(`Keeping termination record ${mostRecentTermination.id} for user ${attendanceRecord.userId} (termination date: ${mostRecentTermination.effectiveDate}, attendance date: ${attendanceRecord.date})`);
            }
          } else {
            console.log(`No termination record found for user ${attendanceRecord.userId} to delete`);
          }
        } catch (error) {
          console.error("Error handling termination record:", error);
          // Continue with the status update even if deletion fails
        }
      }

      // Capture previous status for audit
      const previousStatus = attendanceRecord.status;

      // Update the attendance status
      const updatedRecord = await db
        .update(attendance)
        .set({ status })
        .where(eq(attendance.id, req.params.attendanceId))
        .returning();

      if (!updatedRecord || updatedRecord.length === 0) {
        return res.status(404).json({ message: "Failed to update attendance record" });
      }

      // Create audit entry
      try {
        await storage.createAttendanceAudit({
          attendanceId: req.params.attendanceId,
          userId: attendanceRecord.userId,
          previousStatus: previousStatus,
          newStatus: status,
          reason: `Status changed from ${previousStatus} to ${status}`,
          changedBy: user.id,
          changedAt: new Date(),
        });
      } catch (auditError) {
        console.error("Error creating attendance audit:", auditError);
        // Continue even if audit fails
      }

      res.json(updatedRecord[0]);
    } catch (error) {
      console.error("Error updating attendance status:", error);
      res.status(500).json({ message: "Failed to update attendance status" });
    }
  });

  // Create termination record from attendance status change
  app.post('/api/attendance/:attendanceId/terminate', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'team_leader' && user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { status, userId, comment } = z.object({
        status: z.enum(['AWOL', 'suspended', 'resignation', 'terminated']),
        userId: z.string(),
        comment: z.string().min(1, "Comment is required"),
      }).parse(req.body);

      // Verify the user belongs to the team leader's team (if team leader)
      if (user.role === 'team_leader') {
        const leaderTeams = await storage.getTeamsByLeader(user.id);
        
        if (leaderTeams.length === 0) {
          return res.status(403).json({ message: "You are not assigned as a team leader" });
        }

        let isInTeam = false;
        for (const team of leaderTeams) {
          const teamMembers = await storage.getTeamMembers(team.id);
          if (teamMembers.some(member => member.id === userId)) {
            isInTeam = true;
            break;
          }
        }

        if (!isInTeam) {
          return res.status(403).json({ message: "You can only terminate your team members" });
        }
      }

      // Update the attendance status
      const attendanceId = req.params.attendanceId;
      if (attendanceId.startsWith('placeholder-')) {
        // Create attendance record first
        await storage.clockInWithStatus(userId, status);
      } else {
        // Update existing attendance
        await db
          .update(attendance)
          .set({ status })
          .where(eq(attendance.id, attendanceId));
      }

      // Create termination record with recordDate and entryType
      const today = new Date();
      const recordDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const termination = await storage.createTermination({
        userId,
        statusType: status,
        effectiveDate: new Date(),
        recordDate,
        entryType: 'initial',
        comment,
        processedBy: user.id,
      });

      res.json(termination);
    } catch (error) {
      console.error("Error creating termination:", error);
      res.status(500).json({ message: "Failed to create termination" });
    }
  });

  // Team management
  app.get('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get('/api/teams/leader/:leaderId', isAuthenticated, async (req: any, res) => {
    try {
      const teams = await storage.getTeamsByLeader(req.params.leaderId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching leader teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get('/api/teams/:teamId/members', isAuthenticated, async (req: any, res) => {
    try {
      const members = await storage.getTeamMembers(req.params.teamId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.get('/api/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const teamMembers = await storage.getAllTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching all team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post('/api/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { teamId, userId } = z.object({ 
        teamId: z.string(),
        userId: z.string()
      }).parse(req.body);
      
      const teamMember = await storage.addTeamMember(teamId, userId);
      res.json(teamMember);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  // Transfer management routes (HR only)
  app.get('/api/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'hr' && user?.role !== 'admin' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const transfers = await storage.getAllTransfers();
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ message: "Failed to fetch transfers" });
    }
  });

  app.post('/api/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'hr' && user?.role !== 'admin' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Create API schema that accepts date strings and converts them
      const transferApiSchema = insertTransferSchema.extend({
        startDate: z.string().transform((str) => new Date(str)),
        endDate: z.string().nullable().transform((str) => str ? new Date(str) : null),
      });

      const { newDepartmentId, ...transferBody } = req.body;
      const transferData = transferApiSchema.parse(transferBody);
      
      // Pass newDepartmentId separately to createTransfer
      const transfer = await storage.createTransfer({
        ...transferData,
        newDepartmentId,
      });
      
      res.json(transfer);
    } catch (error) {
      console.error("Error creating transfer:", error);
      res.status(500).json({ message: "Failed to create transfer" });
    }
  });

  app.patch('/api/transfers/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'contact_center_manager') {
        return res.status(403).json({ message: "Only admins and managers can approve transfers" });
      }

      const transferId = req.params.id;
      
      // Fetch the transfer first to capture previous status
      const allTransfers = await storage.getAllTransfers();
      const existingTransfer = allTransfers.find(t => t.id === transferId);
      
      if (!existingTransfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      const previousStatus = existingTransfer.status;
      const transfer = await storage.updateTransferStatus(transferId, 'approved', user.id);
      
      // Create audit entry
      try {
        await storage.createTransfersAudit({
          transferId: transferId,
          userId: existingTransfer.userId,
          action: 'approved',
          previousStatus: previousStatus,
          newStatus: 'approved',
          comment: `Transfer approved by ${user.username || user.firstName || 'user'}`,
          actionBy: user.id,
          actionAt: new Date(),
        });
      } catch (auditError) {
        console.error("Error creating transfers audit:", auditError);
        // Continue even if audit fails
      }
      
      res.json(transfer);
    } catch (error) {
      console.error("Error approving transfer:", error);
      res.status(500).json({ message: "Failed to approve transfer" });
    }
  });

  app.patch('/api/transfers/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'contact_center_manager') {
        return res.status(403).json({ message: "Only admins and managers can reject transfers" });
      }

      const transferId = req.params.id;
      
      // Fetch the transfer first to capture previous status
      const allTransfers = await storage.getAllTransfers();
      const existingTransfer = allTransfers.find(t => t.id === transferId);
      
      if (!existingTransfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      const previousStatus = existingTransfer.status;
      const transfer = await storage.updateTransferStatus(transferId, 'rejected', user.id);
      
      // Create audit entry
      try {
        await storage.createTransfersAudit({
          transferId: transferId,
          userId: existingTransfer.userId,
          action: 'rejected',
          previousStatus: previousStatus,
          newStatus: 'rejected',
          comment: `Transfer rejected by ${user.username || user.firstName || 'user'}`,
          actionBy: user.id,
          actionAt: new Date(),
        });
      } catch (auditError) {
        console.error("Error creating transfers audit:", auditError);
        // Continue even if audit fails
      }
      
      res.json(transfer);
    } catch (error) {
      console.error("Error rejecting transfer:", error);
      res.status(500).json({ message: "Failed to reject transfer" });
    }
  });

  app.get('/api/transfers/:id/audit', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.role || !['admin', 'hr', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const transferId = req.params.id;
      const auditLogs = await storage.getTransfersAuditByTransferId(transferId);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching transfers audit logs:", error);
      res.status(500).json({ message: "Failed to fetch transfers audit logs" });
    }
  });

  app.post('/api/transfers/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can complete transfers" });
      }

      const transferId = req.params.id;
      
      // Fetch the transfer first to capture previous status
      const allTransfers = await storage.getAllTransfers();
      const existingTransfer = allTransfers.find(t => t.id === transferId);
      
      if (!existingTransfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      const previousStatus = existingTransfer.status;
      await storage.completeTransfer(transferId);
      
      // Create audit entry
      try {
        await storage.createTransfersAudit({
          transferId: transferId,
          userId: existingTransfer.userId,
          action: 'completed',
          previousStatus: previousStatus,
          newStatus: 'completed',
          comment: `Transfer completed by ${user.username || user.firstName || 'user'}`,
          actionBy: user.id,
          actionAt: new Date(),
        });
      } catch (auditError) {
        console.error("Error creating transfers audit:", auditError);
        // Continue even if audit fails
      }
      
      res.json({ message: "Transfer completed successfully" });
    } catch (error) {
      console.error("Error completing transfer:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to complete transfer" });
    }
  });

  // Termination management routes (HR only)
  app.get('/api/terminations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'hr' && user?.role !== 'admin' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const terminations = await storage.getAllTerminations();
      res.json(terminations);
    } catch (error) {
      console.error("Error fetching terminations:", error);
      res.status(500).json({ message: "Failed to fetch terminations" });
    }
  });

  app.post('/api/terminations', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'hr' && user?.role !== 'admin' && user?.role !== 'team_leader') {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Create API schema that accepts date strings and converts them
      const terminationApiSchema = insertTerminationSchema.extend({
        effectiveDate: z.string().transform((str) => new Date(str)),
      });

      const terminationData = terminationApiSchema.parse(req.body);
      
      // Set recordDate and entryType for initial termination
      const today = new Date();
      const recordDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const terminationWithTracking = {
        ...terminationData,
        recordDate,
        entryType: 'initial' as const,
      };
      
      // Check for duplicate termination (same user, same effective date)
      const allTerminations = await storage.getAllTerminations();
      
      const duplicateTermination = allTerminations.find(t => {
        const existingDate = new Date(t.effectiveDate);
        const newDate = new Date(terminationData.effectiveDate);
        existingDate.setHours(0, 0, 0, 0);
        newDate.setHours(0, 0, 0, 0);
        
        return t.userId === terminationData.userId && 
               existingDate.getTime() === newDate.getTime();
      });
      
      if (duplicateTermination) {
        return res.status(400).json({ 
          message: "A termination record already exists for this user on this date. Please use a different effective date or delete the existing record first.",
          existingTermination: duplicateTermination
        });
      }
      
      // Create the termination
      const termination = await storage.createTermination(terminationWithTracking);
      
      // Deactivate the user when termination is processed
      await storage.updateUserStatus(terminationData.userId, false);
      
      // Update today's attendance status based on termination type
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const todayAttendance = await storage.getAttendanceByUser(
        terminationData.userId, 
        todayStart, 
        todayEnd
      );
      
      if (todayAttendance.length > 0) {
        // Set attendance status to the termination type
        await db
          .update(attendance)
          .set({ status: terminationData.statusType })
          .where(eq(attendance.id, todayAttendance[0].id));
      }
      
      res.json(termination);
    } catch (error) {
      console.error("Error creating termination:", error);
      res.status(500).json({ message: "Failed to process termination" });
    }
  });

  // Historical Asset Records routes (for asset control system reports)
  app.get('/api/historical-asset-records', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow team leaders and above to access historical records
      if (!user?.role || !['admin', 'hr', 'contact_center_ops_manager', 'contact_center_manager', 'team_leader'].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const date = req.query.date as string | undefined;
      
      let records;
      if (date) {
        records = await storage.getHistoricalAssetRecordsByDate(date);
      } else {
        records = await storage.getAllHistoricalAssetRecords();
      }
      
      res.json(records);
    } catch (error) {
      console.error("Error fetching historical asset records:", error);
      res.status(500).json({ message: "Failed to fetch historical asset records" });
    }
  });

  app.post('/api/historical-asset-records', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Allow team leaders and above to save asset records
      if (!user?.role || !['admin', 'hr', 'contact_center_ops_manager', 'contact_center_manager', 'team_leader'].includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const recordData = insertHistoricalAssetRecordSchema.parse(req.body);
      const record = await storage.createHistoricalAssetRecord(recordData);
      res.json(record);
    } catch (error) {
      console.error("Error creating historical asset record:", error);
      res.status(500).json({ message: "Failed to save historical asset record" });
    }
  });

  // Organizational Positions routes (for dynamic organogram)
  app.get('/api/organizational-positions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user?.role || user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const positions = await db.select().from(organizationalPositions).where(eq(organizationalPositions.isActive, true));
      res.json(positions);
    } catch (error) {
      console.error("Error fetching organizational positions:", error);
      res.status(500).json({ message: "Failed to fetch organizational positions" });
    }
  });

  app.get('/api/organizational-positions/hierarchy', isAuthenticated, async (req: any, res) => {
    try {
      const positions = await db.select().from(organizationalPositions).where(eq(organizationalPositions.isActive, true));
      
      // Build hierarchy tree
      const buildTree = (parentId: string | null = null): any[] => {
        return positions
          .filter(p => p.parentId === parentId)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(position => ({
            ...position,
            children: buildTree(position.id)
          }));
      };
      
      const hierarchy = buildTree(null);
      res.json(hierarchy);
    } catch (error) {
      console.error("Error fetching organizational hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch organizational hierarchy" });
    }
  });

  app.post('/api/organizational-positions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const positionData = insertOrganizationalPositionSchema.parse(req.body);
      // Convert "none" to null for parentId
      if (positionData.parentId === 'none') {
        positionData.parentId = null;
      }
      const [position] = await db.insert(organizationalPositions).values(positionData).returning();
      res.json(position);
    } catch (error) {
      console.error("Error creating organizational position:", error);
      res.status(500).json({ message: "Failed to create organizational position" });
    }
  });

  app.patch('/api/organizational-positions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updateData = insertOrganizationalPositionSchema.partial().parse(req.body);
      // Convert "none" to null for parentId
      if (updateData.parentId === 'none') {
        updateData.parentId = null;
      }
      const [position] = await db.update(organizationalPositions)
        .set(updateData)
        .where(eq(organizationalPositions.id, req.params.id))
        .returning();
      res.json(position);
    } catch (error) {
      console.error("Error updating organizational position:", error);
      res.status(500).json({ message: "Failed to update organizational position" });
    }
  });

  app.delete('/api/organizational-positions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Soft delete by setting isActive to false
      await db.update(organizationalPositions)
        .set({ isActive: false })
        .where(eq(organizationalPositions.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting organizational position:", error);
      res.status(500).json({ message: "Failed to delete organizational position" });
    }
  });

  // User Position assignments
  app.get('/api/user-positions', isAuthenticated, async (req: any, res) => {
    try {
      const assignments = await db.select().from(userPositions);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user positions:", error);
      res.status(500).json({ message: "Failed to fetch user positions" });
    }
  });

  app.post('/api/user-positions', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const assignmentData = insertUserPositionSchema.parse(req.body);
      const [assignment] = await db.insert(userPositions).values(assignmentData).returning();
      res.json(assignment);
    } catch (error) {
      console.error("Error creating user position assignment:", error);
      res.status(500).json({ message: "Failed to assign user to position" });
    }
  });

  app.delete('/api/user-positions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      await db.delete(userPositions).where(eq(userPositions.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user position assignment:", error);
      res.status(500).json({ message: "Failed to remove user position assignment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
