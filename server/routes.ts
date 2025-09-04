import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./replitAuth";
import { insertUserSchema, insertDepartmentSchema, insertAssetSchema, insertTransferSchema, insertTerminationSchema, users } from "@shared/schema";
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
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
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
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
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
        email: z.string().email().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        role: z.string().optional(),
        departmentId: z.string().optional(),
        isActive: z.boolean().optional(),
        password: z.string().min(1, "Password must not be empty").optional(),
      }).parse(req.body);
      
      // If password is provided, hash it before updating
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }
      
      const updatedUser = await storage.updateUser(req.params.userId, updateData);
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
      if (user?.role !== 'hr' && user?.role !== 'admin') {
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
      if (user?.role !== 'hr' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const transferData = insertTransferSchema.parse(req.body);
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
      if (user?.role !== 'hr' && user?.role !== 'admin') {
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
      if (user?.role !== 'hr' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const terminationData = insertTerminationSchema.parse(req.body);
      const termination = await storage.createTermination(terminationData);
      
      // Deactivate the user when termination is processed
      await storage.updateUserStatus(terminationData.userId, false);
      
      res.json(termination);
    } catch (error) {
      console.error("Error creating termination:", error);
      res.status(500).json({ message: "Failed to process termination" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
