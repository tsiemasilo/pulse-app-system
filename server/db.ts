import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Only use WebSocket in production/deployment environments
if (process.env.NODE_ENV === 'production') {
  neonConfig.webSocketConstructor = ws;
} else {
  // Disable WebSocket for development to avoid SSL issues
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
}

// Use NETLIFY_DATABASE_URL for production or DATABASE_URL for development
const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Either NETLIFY_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
export const db = drizzle({ client: pool, schema });