# Pulse - Workforce Management System

## Overview
Pulse is a comprehensive workforce management system for contact centers, providing role-based dashboards and functionalities for administrators, HR, contact center managers, team leaders, and agents. It includes user management, attendance tracking, asset management, and team coordination. The system is a full-stack web application with a React frontend, Express.js backend, PostgreSQL database, and Replit authentication. Its vision is to streamline contact center operations, enhance workforce efficiency, and provide robust management tools for diverse user roles.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### October 15, 2025

#### Team Leader Filtering and Multi-Team Support
- **Security and Multi-Team Bug Fixes**: Fixed critical team leader filtering issues in attendance management audit:
  - **Multi-Team Support**: Implemented `useQueries` pattern to fetch team members from ALL teams a leader manages (not just first team)
  - **Team Member Aggregation**: Added deduplication logic to aggregate members across multiple teams using Set-based approach
  - **Security Fix**: Removed conditional filtering that caused data leaks during loading states
  - **Always-On Filtering**: Team leaders now always have filtering applied, even when member array is empty (preventing unauthorized data exposure)
  - **Backend Date Fix**: Implemented end-of-day normalization (23:59:59.999) in /api/attendance/range endpoint for accurate same-day date filtering
  - **Applies to Both Views**: Filtering properly restricts data in both Terminations Management and Attendance Management views
  - **Performance**: useQueries scales efficiently for moderate team counts while maintaining type safety

#### Attendance Management Audit Feature
- **Terminations Tab Enhancement**: Added dual-purpose management interface to the terminations tab:
  - **Management Type Dropdown**: New dropdown allows switching between "Terminations Management" and "Attendance Management" views
  - **Attendance Audit Table**: When "Attendance Management" is selected, displays comprehensive attendance audit log:
    - Table columns: Employee, Date, Status, Clock In, Clock Out, Hours Worked
    - Color-coded status badges matching attendance tab design (green for present/at work, red for absent/AWOL, yellow for late, blue for sick/leave, orange for suspended, purple for resignation)
    - Search functionality to filter by employee name or status
    - Pagination for managing large datasets (10 records per page)
  - **Calendar Date Filter**: Interactive date picker button that allows filtering attendance records by specific date:
    - Button shows "All Records" when no date is selected (default state)
    - Displays selected date in readable format (e.g., "January 15, 2025")
    - "Clear Filter" button appears when date is selected to reset back to all records
    - Default behavior fetches last year of attendance data
  - **Data Fetching**: Custom query logic handles date-based filtering with proper API integration
  - **User Experience**: Seamless switching between terminations and attendance views with consistent UI/UX

#### Mobile-Responsive Design Implementation
- **Global Responsive Updates**: Implemented comprehensive mobile-first responsive design across the entire application:
  - **Viewport Configuration**: Updated body zoom to only apply on desktop (1024px+) to prevent mobile zoom issues
  - **Responsive CSS Utilities**: Added mobile-table-container class for horizontal scrolling tables on mobile devices
  - **Container Utilities**: Created responsive container classes with breakpoint-specific max-widths
  
- **Navigation Enhancements**:
  - **Admin Navigation**: Added mobile hamburger menu with slide-out overlay for admin role navigation
  - **Team Leader Dashboard**: Implemented full mobile menu system with hamburger icon and overlay navigation
  - Both navigation systems hide/show elements based on screen size for optimal mobile experience
  
- **Dashboard Responsiveness**:
  - **Admin Dashboard**: Updated padding, heading sizes, and stat card grids for mobile (1-col mobile, 2-col tablet, 4-col desktop)
  - **Team Leader Dashboard**: Full mobile layout with responsive header, hidden sidebar on mobile, mobile menu overlay
  - Stat cards now use responsive gaps and column layouts (sm:grid-cols-2, lg:grid-cols-4)
  
- **Table Enhancements**:
  - **User Management Table**: Wrapped in mobile-table-container for horizontal scrolling
  - Filter selects now full-width on mobile (w-full sm:w-[180px])
  - Pagination controls stack vertically on mobile with full-width buttons
  - Search and filter sections use responsive padding and text sizes
  
- **Touch-Friendly Interface**:
  - Increased touch targets with responsive padding
  - Text sizes scale appropriately (text-xs sm:text-sm sm:text-base)
  - Buttons and interactive elements sized for mobile interaction
  - Hidden non-essential elements on mobile (notifications, profile details) for cleaner UI

#### Terminations System Redesign
- **Complete Terminations Workflow Overhaul**: Redesigned the terminations system to integrate with attendance tracking:
  - **Schema Updates**: 
    - Changed `statusType` to accept only AWOL, suspended, and resignation statuses
    - Replaced `terminationDate` and `lastWorkingDay` with single `effectiveDate` field
    - Removed `assetReturnStatus` field (no longer needed)
    - Database migration completed via ALTER TABLE commands
  
  - **Attendance Integration**:
    - Added "Resignation" to attendance status dropdown
    - When team leaders mark employees as AWOL, Suspended, or Resignation, a comment dialog appears
    - Team leaders must provide a reason/comment for the termination action
    - System automatically creates termination records with effective date set to current date
  
  - **Terminations Table Redesign**:
    - Removed "Process Termination" button (terminations now created from attendance)
    - Updated table columns to: Employee, Status Type, Comment, Processed By, Effective Date
    - Simplified filters to show only AWOL, Suspended, and Resignation types
    - Added descriptive text explaining that terminations are created from attendance tab
  
  - **API Changes**:
    - New endpoint: POST /api/attendance/:attendanceId/terminate
    - Validates team leader permissions before allowing termination
    - Updates attendance status and creates termination record atomically
    - Maintains data integrity with proper error handling

### October 14, 2025
- **Access Control System Overhaul**: Implemented new role-based access control system where only specific management roles have login/dashboard access:
  - **Login Users (Dashboard Access)**: Admin, Team Leader, and Contact Center Manager - these roles require passwords and can sign into the system
  - **Non-Login Users (No Dashboard)**: HR Manager and Agent - these roles do not require passwords, cannot sign in, and are managed by team leaders/managers
  - **Schema Updates**: Made password field nullable in database to support non-login users
  - **Authentication Logic**: Updated login validation to check both role eligibility and password presence
  - **User Forms**: Password fields now conditionally appear based on role - only shown for login-enabled roles
  - **Organizational Hierarchy Display**: Admin dashboard now shows a comprehensive organogram in the User Access Management table:
    - "Access Type" column displays login access status (Login Access with shield icon vs No Login with user icon)
    - "Reports To" column shows reporting structure and organizational hierarchy
    - Visual indicators clearly distinguish between managers and non-login staff
  - All changes tested and verified to work cohesively across the entire application

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
- **Role-Based Access Control**: 
  - **Login-Enabled Roles (Dashboard Access)**: Admin, Team Leader, Contact Center Manager - these users authenticate with username/password and have access to role-specific dashboards
  - **Non-Login Roles (Managed Users)**: HR Manager, Agent - these users do not have login credentials or dashboards; they are created and managed by administrators and team leaders
  - Password field is optional in database schema to support non-login users
  - Authentication middleware validates both role eligibility and password presence
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