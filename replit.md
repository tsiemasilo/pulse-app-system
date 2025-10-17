# Pulse - Workforce Management System

## Overview
Pulse is a comprehensive workforce management system for contact centers, providing role-based dashboards and functionalities for administrators, HR, contact center managers, team leaders, and agents. It streamlines contact center operations, enhances workforce efficiency, and offers robust management tools. Key capabilities include user management, attendance tracking, and asset management. The system is a full-stack web application with a React frontend, Express.js backend, PostgreSQL database, and Replit authentication.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing and role-based redirection
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: shadcn/ui built on Radix UI with Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe operations
- **Authentication**: Replit's OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage
- **Database Migrations**: Drizzle Kit
- **API Architecture**: RESTful design with route protection, centralized error handling, and Zod schema validation.

### Database Design
- **Primary Database**: PostgreSQL with Neon Database serverless driver
- **Schema Structure**: Includes tables for Users (with role-based access), Departments, Assets, Attendance, Teams, Team Members, Sessions, Organizational Positions, and User Positions.

### System Design Choices
- **Role-Based Access Control**:
    - **Login-Enabled Roles (Dashboard Access)**: Admin, Team Leader, Contact Center Manager.
    - **Non-Login Roles (Managed Users)**: HR Manager, Agent (no login credentials or dashboards).
    - Password field is optional in database schema.
    - Authentication middleware validates both role eligibility and password presence.
- **UI/UX**: Consistent design using shadcn/ui, focusing on intuitive dashboards and data visualization. Mobile-first responsive design implemented across the application, including responsive navigation, dashboards, and tables.
- **Feature Specifications**:
    - **Attendance System**: Enhanced tracking with interactive status dropdowns for team leaders, restricted to their team members. Integrates with termination processes. Automatic attendance record creation for team members without records.
    - **Terminations System**: Redesigned to integrate with attendance tracking, allowing team leaders to initiate terminations (AWOL, Suspended, Resignation) directly from attendance actions, requiring comments, and automatically creating termination records.
    - **Asset Control Logic**: Robust handling of unreturned and lost assets, persisting status across days. Daily scheduler ensures asset state updates.
    - **Team Leader Functionality**: Data filtering ensures team leaders only view data for their assigned agents. Includes advanced charts for attendance trends, asset usage, and team performance, with export functionality. Multi-team support for team leaders in attendance management.
    - **Organogram Management**: Full-screen interactive organizational chart powered by GoJS library with professional styling. Features include:
        - **Full-screen layout**: Maximized diagram space without cards or legends
        - **GoJS Theme Manager**: Light/dark theme support with custom color schemes
        - **Professional node design**: Table-based layout with name+department badge on same row, title below, avatar/initials on right
        - **Interactive bottom buttons**: Email and Phone buttons with hover effects
        - **Smart button visibility**: Add Employee and Expand/Collapse buttons appear on hover/selection
        - **Enhanced tooltips**: Contextual tooltips for all interactive elements
        - **Drag-to-reorganize**: Interactive drag and drop to update reporting relationships
        - **Tree-level coloring**: Left bar colored dynamically based on organizational depth
        - **Mouse interactions**: Hover highlights, drag-over feedback, drop validation
        - **Context menu**: Right-click menu for viewing details, adding employees, removing from chart
        - **Zoom and pan controls**: Full navigation support for large organizational structures
        - **Real-time sync**: Live data synchronization with user database

## External Dependencies

### Authentication Services
- **Replit OIDC**: Primary authentication provider.
- **Passport.js**: Authentication middleware for Express.js.

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.

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
- **GoJS**: Professional diagramming library for interactive organizational charts.
- **gojs-react**: React wrapper for GoJS integration.