import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

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
export const db = drizzle(pool, { schema });