import express from 'express';
import serverless from 'serverless-http';
import { registerRoutes } from '../../server/routes';

// Set up database connection for production
if (process.env.NETLIFY_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL;
}

const app = express();

// Set up JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register all routes synchronously
registerRoutes(app).then(() => {
  console.log('Routes registered successfully');
}).catch(error => {
  console.error('Error registering routes:', error);
});

export const handler = serverless(app);