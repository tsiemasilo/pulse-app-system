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

### Replit Environment Setup (Completed - October 1, 2025)
The project is now fully configured and running in Replit:
- ✅ Environment variables configured from `.env.example` 
- ✅ Database schema synchronized with existing Neon PostgreSQL database
- ✅ Frontend workflow configured on port 5000 with webview output
- ✅ Vite dev server running with host set to 0.0.0.0 and allowedHosts enabled
- ✅ Deployment configured for autoscale with build and start scripts
- ✅ Application accessible and fully functional
- ✅ .env file added to .gitignore for security
- ✅ Package.json dev script updated to use npx tsx for TypeScript execution
- ✅ Build process verified and working correctly

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