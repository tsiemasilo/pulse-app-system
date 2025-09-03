# Database Setup Instructions

## Quick Setup for New Users

When importing this project, you need to set up the database connection:

### Option 1: Use the Shared Database (Recommended)
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

The project will automatically connect to the shared Neon database.

### Option 2: Create Your Own Database
If you prefer to use your own database:
1. Create a new PostgreSQL database on Neon, Railway, or similar service
2. Update the `DATABASE_URL` and `NETLIFY_DATABASE_URL` in your `.env` file
3. Run `npm run db:push` to sync the database schema

## Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string for development
- `NETLIFY_DATABASE_URL`: PostgreSQL connection string for production
- `SESSION_SECRET`: Secret key for session management

## Database Schema
The database schema will be automatically synced when you run:
```bash
npm run db:push
```

This ensures all required tables are created in the database.