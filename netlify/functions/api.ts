import express from 'express';
import serverless from 'serverless-http';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { registerRoutes } from '../../server/routes';

// Configure WebSocket for Neon (CRITICAL for production)
neonConfig.webSocketConstructor = ws;

// Set up database connection for production
if (process.env.NETLIFY_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DATABASE_URL;
}

const app = express();

// Set up JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced debug logging
console.log('🚀 Netlify function starting...');
console.log('📊 Environment check:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('  - NETLIFY_DATABASE_URL exists:', !!process.env.NETLIFY_DATABASE_URL);

// Register all routes with detailed logging
registerRoutes(app).then(() => {
  console.log('✅ Routes registered successfully');
  
  // Log all registered routes for debugging
  const routes: string[] = [];
  app._router?.stack?.forEach((layer: any) => {
    if (layer.route) {
      routes.push(`${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
    }
  });
  console.log('📍 Available routes:', routes.slice(0, 10));
  
}).catch(error => {
  console.error('❌ Error registering routes:', error);
});

// Enhanced handler with logging
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  console.log('📥 Incoming request:', {
    path: event.path,
    httpMethod: event.httpMethod,
    headers: event.headers ? Object.keys(event.headers) : 'none'
  });
  
  try {
    const result = await serverlessHandler(event, context);
    console.log('📤 Response status:', (result as any).statusCode);
    return result;
  } catch (error: any) {
    console.error('💥 Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};