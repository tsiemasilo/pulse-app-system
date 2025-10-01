import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for both development and production
if (typeof WebSocket === 'undefined') {
  // Create a custom WebSocket class that accepts self-signed certificates
  class CustomWebSocket extends ws {
    constructor(address: string | URL, protocols?: string | string[], options?: ws.ClientOptions) {
      const wsOptions: ws.ClientOptions = {
        ...options,
        rejectUnauthorized: false
      };
      super(address, protocols, wsOptions);
    }
  }
  neonConfig.webSocketConstructor = CustomWebSocket as any;
} else {
  neonConfig.webSocketConstructor = WebSocket;
}

// Set additional configuration for better reliability
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = "password";
neonConfig.poolQueryViaFetch = false;

// Use NETLIFY_DATABASE_URL for production or DATABASE_URL for development
const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Either NETLIFY_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
  max: 20
});
export const db = drizzle({ client: pool, schema });