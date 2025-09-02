# Netlify Deployment Instructions

## Important Note
This is a full-stack application with PostgreSQL database. Netlify is designed for static sites, so you'll need to modify the deployment approach.

## Option 1: Frontend Only (Recommended for Netlify)
1. Remove backend dependencies from the frontend build
2. Use a separate backend service (Heroku, Railway, or Vercel)
3. Update API calls to point to your backend URL

## Option 2: Use a Full-Stack Platform
Consider using platforms that support full-stack apps:
- **Vercel** (supports serverless functions)
- **Railway** (supports PostgreSQL)
- **Heroku** (full backend support)
- **Render** (full-stack hosting)

## Current Build Settings for Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18

## Database Requirements
- PostgreSQL database (use Neon, Supabase, or similar)
- Environment variables for database connection