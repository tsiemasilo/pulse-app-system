import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { dailyResetScheduler } from "./scheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Start the daily reset scheduler
    try {
      dailyResetScheduler.start();
      log("Daily reset scheduler started successfully");
    } catch (error) {
      console.error("Failed to start daily reset scheduler:", error);
    }
    
    // Backfill attendance for the last 30 days on startup
    try {
      log("Starting attendance backfill for last 30 days...");
      const { storage } = await import("./storage");
      const daysToBackfill = 30;
      let totalCreated = 0;
      
      for (let i = 0; i < daysToBackfill; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const result = await storage.ensureAttendanceForDate(dateString);
        totalCreated += result.created;
        
        // Short-circuit if no records created for consecutive days
        if (i > 0 && result.created === 0) {
          break;
        }
      }
      
      if (totalCreated > 0) {
        log(`Attendance backfill completed: Created ${totalCreated} records across last ${daysToBackfill} days`);
      } else {
        log("Attendance backfill completed: All records already exist");
      }
    } catch (error) {
      console.error("Failed to backfill attendance:", error);
    }
  });
})();
