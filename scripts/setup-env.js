#!/usr/bin/env node
/**
 * Automatic environment setup script
 * This script sets up the environment variables for new users importing the project
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  process.exit(0);
}

// Check if .env.example exists
if (!fs.existsSync(envExamplePath)) {
  console.error('❌ .env.example file not found');
  process.exit(1);
}

// Copy .env.example to .env
try {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ Created .env file from .env.example');
  console.log('🔗 Database connection configured automatically');
  console.log('🚀 Run "npm run dev" to start the application');
} catch (error) {
  console.error('❌ Failed to create .env file:', error.message);
  process.exit(1);
}