import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./replitAuth";
import { insertUserSchema, insertDepartmentSchema, insertAssetSchema, insertTransferSchema, insertTerminationSchema, insertAssetLossRecordSchema, insertHistoricalAssetRecordSchema, insertAssetDailyStateSchema, insertAssetStateAuditSchema, insertAssetIncidentSchema, insertAssetDetailsSchema, users, attendance } from "@shared/schema";
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
      // Allow admins and team leaders to access user data for asset management
      if (!user?.role || !['admin', 'team_leader', 'contact_center_manager', 'contact_center_ops_manager'].includes(user.role)) {
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

      const dailyStates = await storage.getAllAssetDailyStatesByDate(req.params.date);
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
  
  // Book In Route - Confirm asset collection status
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

      // Validate that the asset is in a state that allows book-in
      const currentStates = await storage.getAssetDailyStatesByUserAndDate(userId, date);
      const existingState = currentStates.find(s => s.assetType === assetType);
      
      if (existingState && !['ready_for_collection', 'collected', 'not_collected'].includes(existingState.currentState)) {
        return res.status(400).json({ 
          message: `Cannot book in asset in current state: ${existingState.currentState}` 
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

  // Book Out Route - Confirm asset return status  
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

      // Validate that the asset was booked in (collected) before allowing book out
      const currentStates = await storage.getAssetDailyStatesByUserAndDate(userId, date);
      const existingState = currentStates.find(s => s.assetType === assetType);
      
      if (!existingState || existingState.currentState !== 'collected') {
        return res.status(400).json({ 
          message: "Asset must be collected before it can be booked out" 
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
        previousState: existingState.currentState,
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
        date: z.string(), // YYYY-MM-DD format of the day when asset was lost
        recoveryReason: z.string(),
      }).parse(req.body);

      // Find the lost/unreturned asset state
      const currentStates = await storage.getAssetDailyStatesByUserAndDate(userId, date);
      const existingState = currentStates.find(s => s.assetType === assetType);
      
      if (!existingState || !['not_returned', 'lost'].includes(existingState.currentState)) {
        return res.status(400).json({ 
          message: "Asset is not in a lost/unreturned state" 
        });
      }

      const dailyStateData = {
        userId,
        date,
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
        status: z.enum(['present', 'absent', 'late', 'sick', 'on leave', 'AWOL', 'suspended'])
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

  app.patch('/api/attendance/:attendanceId/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'team_leader' && user?.role !== 'admin' && user?.role !== 'hr') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { status } = z.object({ 
        status: z.enum(['present', 'absent', 'late', 'sick', 'on leave', 'AWOL', 'suspended'])
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

      // Update the attendance status
      const updatedRecord = await db
        .update(attendance)
        .set({ status })
        .where(eq(attendance.id, req.params.attendanceId))
        .returning();

      if (!updatedRecord || updatedRecord.length === 0) {
        return res.status(404).json({ message: "Failed to update attendance record" });
      }

      res.json(updatedRecord[0]);
    } catch (error) {
      console.error("Error updating attendance status:", error);
      res.status(500).json({ message: "Failed to update attendance status" });
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

      const transferData = transferApiSchema.parse(req.body);
      const transfer = await storage.createTransfer(transferData);
      res.json(transfer);
    } catch (error) {
      console.error("Error creating transfer:", error);
      res.status(500).json({ message: "Failed to create transfer" });
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
        terminationDate: z.string().transform((str) => new Date(str)),
        lastWorkingDay: z.string().transform((str) => new Date(str)),
      });

      const terminationData = terminationApiSchema.parse(req.body);
      
      // Check for existing active termination (idempotency check)
      const allTerminations = await storage.getAllTerminations();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeTermination = allTerminations.find(t => 
        t.userId === terminationData.userId && 
        (new Date(t.terminationDate) >= today || new Date(t.lastWorkingDay) >= today)
      );
      
      if (activeTermination) {
        return res.status(400).json({ 
          message: "User already has an active termination record",
          existingTermination: activeTermination
        });
      }
      
      // Create the termination
      const termination = await storage.createTermination(terminationData);
      
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
        // Map termination type to attendance status
        let attendanceStatus = 'absent';
        switch (terminationData.terminationType) {
          case 'retirement':
            attendanceStatus = 'on leave';
            break;
          case 'voluntary':
          case 'involuntary':
          case 'layoff':
          default:
            attendanceStatus = 'absent';
            break;
        }
        
        await db
          .update(attendance)
          .set({ status: attendanceStatus })
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

  const httpServer = createServer(app);
  return httpServer;
}
