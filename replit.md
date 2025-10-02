# Pulse - Workforce Management System

## Overview
Pulse is a comprehensive workforce management system for contact centers, providing role-based dashboards and functionalities for administrators, HR, contact center managers, team leaders, and agents. It includes user management, attendance tracking, asset management, and team coordination. The system is a full-stack web application with a React frontend, Express.js backend, PostgreSQL database, and Replit authentication. Its vision is to streamline contact center operations, enhance workforce efficiency, and provide robust management tools for diverse user roles.

## User Preferences
Preferred communication style: Simple, everyday language.

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