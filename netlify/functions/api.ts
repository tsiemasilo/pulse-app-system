import express from 'express';
import serverless from 'serverless-http';
import { registerRoutes } from '../../server/routes';

const app = express();

// Set up JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up database connection for production
if (process.env.NETLIFY_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL;
}

// Register all routes
registerRoutes(app);

export const handler = serverless(app);