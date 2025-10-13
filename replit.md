# Pulse - Workforce Management System

## Overview
Pulse is a comprehensive workforce management system for contact centers, providing role-based dashboards and functionalities for administrators, HR, contact center managers, team leaders, and agents. It includes user management, attendance tracking, asset management, and team coordination. The system is a full-stack web application with a React frontend, Express.js backend, PostgreSQL database, and Replit authentication. Its vision is to streamline contact center operations, enhance workforce efficiency, and provide robust management tools for diverse user roles.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### October 13, 2025
- **Attendance Count Fix**: Fixed critical bug where "Present Today" count showed 0 even though attendance table displayed team members with "at work" status. The issue was that the attendance table was creating frontend-only placeholder records that weren't in the database.
  - Implemented automatic attendance record creation: When team leaders view the attendance tab, the system now automatically creates real database records for team members without attendance records
  - Added ref-based deduplication to prevent duplicate record creation during rapid re-renders
  - Records are created with status "at work" by default
  - Present Today count now accurately reflects team members with "at work" or "present" status

### October 3, 2025

#### Initial Setup
- **GitHub Import Setup**: Successfully imported and configured the Pulse Workforce Management System in Replit environment
- **Environment Configuration**: Created .env file with database credentials (Neon PostgreSQL) and session secret
- **Workflow Setup**: Configured "Start application" workflow to run on port 5000 with webview output
- **Deployment Configuration**: Set up autoscale deployment with build and start scripts
- **Verification**: Application is running correctly, login page displaying properly with Alteram Solutions branding
- **Database Schema**: Verified database schema is synced and up-to-date using Drizzle Kit
- **Vite Configuration**: Frontend properly configured with host 0.0.0.0:5000 and allowedHosts enabled for Replit proxy compatibility

#### Asset Management Bug Fixes
- **Mark as Found Bug Fix**: Fixed critical bug where "Mark as Found" functionality was checking historical dates instead of current state. Now correctly validates and updates TODAY's asset state when marking assets as found/returned.
- **Asset Status Display Fix**: Fixed display logic to show correct current status ("Lost" vs "Not Returned Yet") based on today's asset state instead of historical loss records.
- **Reason Preservation Fix**: Fixed issue where original loss/unreturned reasons were being overwritten by generic system messages during daily resets. Implemented two-tier approach:
  1. Daily reset now preserves original reasons when persisting lost/unreturned states across days
  2. Display logic falls back to original reasons from loss records when daily state has generic messages
  3. Users now see the actual reason they entered when marking assets as lost/unreturned, even after multiple daily resets

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing and role-based redirection
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: shadcn/ui built on Radix UI with Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe operations
- **Authentication**: Replit's OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage
- **Database Migrations**: Drizzle Kit

### Database Design
- **Primary Database**: PostgreSQL with Neon Database serverless driver
- **Schema Structure**: Includes tables for Users (with role-based access: admin, hr, contact_center_ops_manager, contact_center_manager, team_leader, agent), Departments, Assets, Attendance, Teams, Team Members, and Sessions.

### System Design Choices
- **Role-Based Access Control**: Granular permissions for Admin, HR, Contact Center Managers, Team Leaders, and Agents.
- **UI/UX**: Utilizes shadcn/ui for consistent design, with a focus on intuitive dashboards and data visualization.
- **Technical Implementations**:
    - **Team Leader Reports**: Data filtering ensures team leaders only view data for their assigned agents (attendance, users, assets, historical records). Includes advanced charts for attendance trends, asset usage, and team performance, with export functionality.
    - **Attendance System**: Enhanced tracking with interactive status dropdowns for team leaders, restricted to their team members. Integrates with termination processes to update attendance status automatically. Default status logic based on clock-in times.
    - **Asset Control Logic**: Robust handling of unreturned and lost assets, persisting status across days. Frontend displays all asset states, and a resilient daily scheduler ensures asset state updates even if the server starts late.
- **API Architecture**: RESTful design with route protection, centralized error handling, and Zod schema validation.

## External Dependencies

### Authentication Services
- **Replit OIDC**: Primary authentication provider.
- **Passport.js**: Authentication middleware for Express.js.

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **WebSocket Support**: For real-time database connections.

### UI and Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **shadcn/ui**: Pre-built component library.

### Development Tools
- **TypeScript**: Static type checking.
- **Vite**: Frontend build tool.
- **ESBuild**: Fast JavaScript bundler.

### Additional Libraries
- **date-fns**: Date manipulation.
- **clsx**: Conditional className utility.
- **nanoid**: Unique ID generation.