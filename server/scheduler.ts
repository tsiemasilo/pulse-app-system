import { storage } from "./storage";

// Daily Reset Scheduler Service
export class DailyResetScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private checkIntervalMs: number = 60 * 60 * 1000, // Check every hour
    private resetTimeHour: number = 1 // Reset at 1 AM
  ) {}

  start() {
    if (this.isRunning) {
      console.log("Daily reset scheduler is already running");
      return;
    }

    this.isRunning = true;
    console.log(`Starting daily reset scheduler - checking every ${this.checkIntervalMs / 1000 / 60} minutes`);
    console.log(`Daily reset will trigger at ${this.resetTimeHour}:00 AM each day`);

    // Check immediately on startup
    this.checkAndPerformReset();

    // Set up interval to check periodically
    this.intervalId = setInterval(() => {
      this.checkAndPerformReset();
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("Daily reset scheduler stopped");
  }

  private async checkAndPerformReset() {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if we're past the reset time for today
      const currentHour = now.getHours();
      const isPastResetTime = currentHour >= this.resetTimeHour;
      
      if (!isPastResetTime) {
        // Not time for reset yet (still before reset hour)
        return;
      }

      console.log(`Checking if daily reset needed for ${today}`);

      // Check if there are any users in the system
      const allUsers = await storage.getAllUsers();
      if (allUsers.length === 0) {
        // No users yet, skip automated reset
        return;
      }

      // Check if reset has already been performed today
      const existingStates = await storage.getAllAssetDailyStatesByDate(today);
      
      // If there are already states for today that were created during a reset, skip
      const hasResetStates = existingStates.some(state => 
        state.reason?.includes('Daily reset') || 
        state.reason?.includes('reset') ||
        state.reason?.includes('Persisting')
      );

      if (hasResetStates) {
        console.log(`Daily reset already performed for ${today}`);
        return;
      }

      console.log(`Performing automated daily reset for ${today}`);
      
      // Use system user ID for automated resets (create a system user if needed)
      const systemUserId = await this.getOrCreateSystemUser();
      
      const result = await storage.performDailyReset(today, systemUserId);
      
      console.log(`Automated daily reset completed for ${today}:`, {
        resetCount: result.resetCount,
        incidentsCreated: result.incidentsCreated,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error in automated daily reset:", error);
    }
  }

  private async getOrCreateSystemUser(): Promise<string> {
    try {
      // Try to find an existing admin user for system operations
      const adminUsers = await storage.getUsersByRole('admin');
      if (adminUsers.length > 0) {
        return adminUsers[0].id;
      }

      // If no admin exists, use first available user (fallback)
      const allUsers = await storage.getAllUsers();
      if (allUsers.length > 0) {
        return allUsers[0].id;
      }

      throw new Error("No users available for automated reset");
    } catch (error) {
      console.error("Error getting system user for automated reset:", error);
      throw error;
    }
  }

  // Manual trigger for testing
  async triggerManualReset(date?: string): Promise<any> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const systemUserId = await this.getOrCreateSystemUser();
      
      console.log(`Manually triggering daily reset for ${targetDate}`);
      const result = await storage.performDailyReset(targetDate, systemUserId);
      
      console.log(`Manual daily reset completed for ${targetDate}:`, {
        resetCount: result.resetCount,
        incidentsCreated: result.incidentsCreated
      });

      return result;
    } catch (error) {
      console.error("Error in manual daily reset:", error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
      resetTimeHour: this.resetTimeHour,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkIntervalMs).toISOString() : null
    };
  }
}

// Export singleton instance
export const dailyResetScheduler = new DailyResetScheduler();