# Pulse - Workforce Management System

A comprehensive workforce management system for contact center operations with role-based dashboards and functionality.

## Quick Start for New Users

### 1. Clone the Repository
```bash
git clone https://github.com/tsiemasilo/pulse-app-system.git
cd pulse-app-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Database Connection
```bash
# Copy the example environment file
cp .env.example .env

# The database connection is already configured in .env.example
# No additional setup needed - it connects to the shared database
```

### 4. Sync Database Schema
```bash
npm run db:push
```

### 5. Start the Application
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Database Configuration

This project is pre-configured to use a shared Neon PostgreSQL database. The connection details are:

- **Development**: Uses `DATABASE_URL` environment variable
- **Production**: Uses `NETLIFY_DATABASE_URL` environment variable
- **Shared Database**: All users connect to the same database instance for seamless collaboration

## Default Admin Login
- Username: `admin`
- Password: `admin123`

## Features
- Role-based access control (Admin, HR, Managers, Team Leaders, Agents)
- User management and team assignments
- Asset tracking and management
- Attendance monitoring
- Real-time team coordination

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Neon)
- **UI**: shadcn/ui + Tailwind CSS
- **ORM**: Drizzle ORM

## Project Structure
```
├── client/src/          # Frontend React application
├── server/              # Backend Express.js API
├── shared/              # Shared types and schemas
├── .env.example         # Environment variables template
└── setup-database.md    # Detailed database setup guide
```

## Contributing
1. Make your changes
2. Test locally with `npm run dev`
3. Commit and push to GitHub
4. The shared database ensures all changes are immediately available to all users

For detailed setup and configuration options, see `setup-database.md`.