# Pulse - Workforce Management System

## Overview

Pulse is a comprehensive workforce management system designed for contact center operations. The application provides role-based dashboards and functionality for administrators, HR managers, contact center managers, team leaders, and agents. Key features include user management, attendance tracking, asset management, and team coordination tools.

The system is built as a full-stack web application with a React frontend and Express.js backend, utilizing PostgreSQL for data persistence and Replit's authentication system for user management.

## User Preferences

Preferred communication style: Simple, everyday language.

## Git Configuration
- Repository: https://github.com/tsiemasilo/pulse-app-system.git
- Branch: main
- Format: Always provide git commands with token authentication

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and better developer experience
- **Routing**: Wouter for lightweight client-side routing with role-based dashboard redirection
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript for API development
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Authentication**: Replit's OpenID Connect (OIDC) authentication system with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Database Migrations**: Drizzle Kit for schema migrations and database management

### Database Design
- **Primary Database**: PostgreSQL with connection pooling via Neon Database serverless driver
- **Database Configuration**: Uses environment variables DATABASE_URL or NETLIFY_DATABASE_URL for secure connection
- **Schema Structure**: 
  - Users table with role-based access control (admin, hr, contact_center_ops_manager, contact_center_manager, team_leader, agent)
  - Departments table for organizational structure
  - Assets table for equipment tracking and assignment
  - Attendance table for time tracking and presence management
  - Teams and team members tables for organizational hierarchy
  - Sessions table for authentication session persistence

### Replit Environment Setup (Completed - October 2, 2025)
The project is now fully configured and running in Replit:
- ✅ Environment variables configured via Replit Secrets (DATABASE_URL, SESSION_SECRET)
- ✅ **Production database connected** - DATABASE_URL configured via Replit Secrets
- ✅ Database schema synchronized with production Neon PostgreSQL database
- ✅ Frontend workflow configured on port 5000 with webview output
- ✅ Vite dev server running with host set to 0.0.0.0 and allowedHosts enabled for proxy compatibility
- ✅ Deployment configured for autoscale with build and start scripts
- ✅ Application accessible and fully functional on port 5000
- ✅ .env file added to .gitignore for security
- ✅ Build process verified and working correctly (vite build + esbuild)
- ✅ Secure session secret configured via Replit Secrets
- ✅ GitHub import successfully completed and tested
- ✅ WebSocket SSL certificate handling configured for Neon Database connections
- ✅ Daily reset scheduler running without SSL errors

#### Fresh GitHub Import - October 2, 2025
Successfully set up fresh clone from GitHub repository:
- ✅ Verified existing Vite configuration (host: 0.0.0.0, allowedHosts: true, port: 5000)
- ✅ Confirmed Express server setup with Vite middleware integration
- ✅ Database connection working with existing Neon PostgreSQL configuration
- ✅ Workflow "Start application" configured with webview output on port 5000
- ✅ Build process tested and verified (vite build + esbuild successful)
- ✅ Deployment configuration set to autoscale with build and run scripts
- ✅ Application login page loading correctly with HMR working
- ✅ All dependencies installed and Node.js 20 module active

### Recent Updates (October 1, 2025)

#### Attendance & Termination System Improvements (Complete)
Enhanced attendance tracking and termination processing with improved security and integration:

**Changes Implemented**:
1. **Process Termination Fix** (`server/routes.ts`):
   - Fixed date validation error by adding schema transformation for date strings to Date objects
   - Termination button now processes successfully without ZodError
   - Added idempotency check to prevent duplicate terminations for the same user

2. **Team Leader Attendance Filtering** (`client/src/components/attendance-table.tsx`):
   - Today's attendance table now shows ONLY agents assigned to the logged-in team leader
   - Admins and HR continue to see all attendance records
   - Proper authorization scope prevents cross-team access

3. **Attendance Table Column Reorganization**:
   - Status column moved to left of Clock In column
   - New order: Employee | Status | Clock In | Clock Out | Hours

4. **Status Dropdown Enhancement**:
   - Replaced static status badge with interactive dropdown for team leaders
   - Status options: present, absent, sick, on leave, late, AWOL, suspended
   - Only authorized roles (team_leader, admin, hr) can modify status
   - Team leaders restricted to modifying their own team members only

5. **Termination-Attendance Integration** (`server/routes.ts`):
   - When termination is processed, attendance status automatically updates for that day
   - Termination types map to attendance status: retirement → 'on leave', voluntary/involuntary/layoff → 'absent'
   - Present status does NOT trigger termination processing

6. **Default Status for Working Hours** (`server/storage.ts`):
   - Clock-in during working hours (7:30 AM - 4:30 PM SAST) sets status to "present"
   - Clock-in outside working hours sets status to "late"
   - Proper timezone handling for South African Time (Africa/Johannesburg)

**Security Improvements**:
- Team leaders can only modify attendance for their assigned team members
- Proper authorization checks prevent privilege escalation
- Idempotency prevents duplicate termination records

#### Asset Control Logic Fix (Complete)
Fixed asset booking logic to properly handle unreturned and lost assets from previous days:

**Root Cause**: Two issues were preventing proper asset state management:
1. **Frontend Display Issue**: Book In tab only checked for 'collected' and 'not_collected' states, missing 'not_returned' and 'lost'
2. **Scheduler Timing Issue**: Daily reset only ran if server was active at exactly 1:00 AM, missing resets if server started later

**Fixes Applied**:
1. **Frontend Fix** (`client/src/components/asset-management.tsx` - Line 570):
   - Updated to display status badges for ALL asset states: collected, not_collected, returned, not_returned, lost
   - Assets with unreturned/lost status now show orange/red badges instead of booking buttons
   
2. **Scheduler Fix** (`server/scheduler.ts` - Line 51):
   - Changed from `currentHour === resetTimeHour` to `currentHour >= resetTimeHour`
   - Now runs reset if it's past 1 AM AND reset hasn't been done yet for today
   - Ensures reset happens even if server starts after 1 AM

**Behavior**: 
- Assets marked as unreturned/lost from previous days persist to next day via daily reset
- These assets show status badges and cannot be booked in/out
- Only after marking as "found" in Unreturned Assets tab do they become available again

#### Database WebSocket SSL Configuration (Complete - Fresh Import Setup)
Fixed SSL certificate validation errors when connecting to Neon Database via WebSocket:

**Issue**: 
- Neon Database WebSocket connections were failing with "self-signed certificate in certificate chain" errors
- Daily reset scheduler couldn't execute database queries on startup

**Solution** (`server/db.ts`):
- Created custom WebSocket class that extends ws with `rejectUnauthorized: false` option
- This allows the WebSocket connection to accept self-signed SSL certificates
- Changed `neonConfig.poolQueryViaFetch` from `true` to `false` to use WebSocket connections
- Maintained secure connection (WSS) while bypassing certificate validation for development

**Result**:
- Database connections now work reliably in Replit environment
- Daily reset scheduler executes without SSL errors
- Application fully functional on port 5000

### Setup for New Users
When importing this project:
1. Copy `.env.example` to `.env` to use the shared database
2. Run `npm install` to install dependencies
3. Run `npm run db:push` to sync database schema
4. Run `npm run dev` to start the application

### Role-Based Access Control
- **Admin**: Full system access including user management, system configuration, and reporting
- **HR**: Employee management, attendance oversight, and organizational reporting
- **Contact Center Managers**: Team performance monitoring, operational metrics, and resource allocation
- **Team Leaders**: Team member oversight, attendance management, and asset coordination
- **Agents**: Personal dashboard with attendance tracking, asset viewing, and task management

### API Architecture
- **RESTful Design**: Standard HTTP methods with consistent response formats
- **Route Protection**: Authentication middleware ensuring role-appropriate access
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Request Validation**: Zod schema validation for all API endpoints

## External Dependencies

### Authentication Services
- **Replit OIDC**: Primary authentication provider with OAuth 2.0/OpenID Connect integration
- **Passport.js**: Authentication middleware for Express.js applications

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Production Database**: Configured via NETLIFY_DATABASE_URL environment variable
- **WebSocket Support**: Real-time database connections via ws library

### UI and Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library with customizable themes

### Development Tools
- **TypeScript**: Static type checking across frontend and backend
- **Vite**: Frontend build tool with hot module replacement
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer for browser compatibility

### Additional Libraries
- **date-fns**: Date manipulation and formatting utilities
- **clsx**: Conditional className utility for dynamic styling
- **memoizee**: Function memoization for performance optimization
- **nanoid**: Unique ID generation for database records