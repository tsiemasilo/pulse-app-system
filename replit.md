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
    - **Asset Management**: Centralized filter controls in header for consistent user experience. Features include:
        - **Global Search Filter**: Search by agent name applies across all tabs (Book Out, Book In, Unreturned Assets)
        - **Date Filter**: Applies to all tabs - fetches and displays data for selected date across Book In, Book Out, and Unreturned Assets
        - **Unified Header Layout**: All filters positioned in header alongside Reset Agent button for easy access
        - **Universal Filtering**: All filters (search, date) apply across all three tabs with timezone-safe date handling
        - **Timezone-Safe Implementation**: All date operations use date-fns (parseISO, isSameDay, format) to prevent UTC conversion issues
        - **Smart Cache Invalidation**: Mutations invalidate both current date and selected date cache keys for immediate UI updates
        - **Robust Asset Handling**: Unreturned and lost assets persist across days with daily scheduler for state updates
        - **Historical Date Support**: When filtering to previous dates, the system displays the most recent asset state for each agent/asset combination up to that date. If no exact records exist for the selected date, the API automatically retrieves the last known state before that date. This ensures badges display correctly for historical dates while maintaining data accuracy.
        - **Read-Only Historical Mode**: When viewing dates in the past, Book Out and Book In action buttons are automatically disabled to prevent modifications to historical data. Only current date records can be edited.
    - **Team Leader Functionality**: Data filtering ensures team leaders only view data for their assigned agents. Includes advanced charts for attendance trends, asset usage, and team performance, with export functionality. Multi-team support for team leaders in attendance management.
    - **Transfer Management**: Team-based agent transfer system with unified interface for managing both team transfers and department assignments. Features include:
        - **Unified Table View**: Single table displays both team transfers and department assignments together, eliminating the need to switch between separate views
        - **Type Filtering**: Filter by type (All, Team Transfers, Department Assignments) with clear badge indicators for easy identification
        - **Transfer Actions Dropdown**: Dropdown menu offering three actions:
          - **New Transfer**: Create agent transfers between team leaders
          - **Add Department**: Assign agents to hierarchical department structure (Division → Department → Section)
          - **Remove Department**: Remove agents from department assignments with confirmation
        - **Simplified Filtering**: Single search bar, type filter, status filter (for transfers), and date picker for efficient data retrieval
        - **Team Leader Selection**: Transfer agents from one team leader to another, with automatic team reassignment
        - **Immediate Reassignment**: When a transfer is created, the agent is immediately reassigned to the new team leader (no longer requires approval or completion). Agent is removed from old team and added to new team instantly.
        - **Department Confirmation Dialog**: Before transfer submission, a confirmation dialog allows HR to either keep the agent's current department or update it to a new department during the transfer process
        - **Transfer Types**: Support for both temporary and permanent transfers with configurable start and end dates
        - **Location Tracking**: Captures location information (Thandanani, 16th) for transfer records
        - **Approval Workflow**: Multi-stage approval process (pending → approved → completed) with role-based authorization for record-keeping and audit purposes
        - **Inline Action Buttons**: Each transfer row includes contextual action buttons (Approve, Reject, Complete) based on transfer status and user role, with visual indicators (green for approve, red for reject, blue for complete)
        - **Confirmation Dialogs**: All transfer actions (approve, reject, complete) require explicit confirmation via alert dialogs to prevent accidental changes
        - **Real-time Dashboard Updates**: Comprehensive query invalidation ensures changes reflect immediately across all dashboards (/api/transfers, /api/users, /api/teams, /api/teams/leader, /api/teams/members)
        - **Organogram Sync**: Organogram automatically updates to reflect new reporting relationships when transfers are created
        - **Role-Based Access**: Team leaders can initiate transfers and manage department assignments; managers/admins can approve; admins can complete transfers
        - **Enhanced Status Display**: Status badges with color-coded variants (green for approved, red for rejected, blue for completed, gray for pending)
        - **Duplicate Submission Prevention**: Action buttons are disabled while mutations are pending to prevent duplicate submissions
        - **Audit Trail**: Complete audit log for all transfer actions accessible via eye icon button on each transfer row
    - **Department Hierarchy System**: Three-tier organizational structure for agent assignments:
        - **Divisions**: Top-level organizational units (e.g., RAF - Road Accident Fund)
        - **Departments**: Mid-level units under divisions (e.g., Admin, Outbound, Inbound)
        - **Sections**: Granular units under departments (e.g., admin1, admin2, Language callback, Abandoned Call, Voice mail, claims, litigation, medical, complaints)
        - **Cascading Selection**: UI automatically filters departments by selected division and sections by selected department
        - **Assignment Tracking**: User department assignments persist with audit trail (assignedBy field)
        - **Flexible Structure**: Team leaders can assign agents to any combination of division, department, and section
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
        - **Admin filtering**: Admin users are excluded from organogram display, showing only agent reporting hierarchy
        - **Watermark handling**: GoJS evaluation watermark concealed with CSS overlay for clean visual presentation
        - **Cache invalidation**: Enhanced cache invalidation strategy ensures organogram refreshes after user assignment changes

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