# Pulse - Workforce Management System

## Overview
Pulse is a comprehensive workforce management system for contact centers, offering role-based dashboards and functionalities for various user types (administrators, HR, contact center managers, team leaders, and agents). Its primary purpose is to streamline contact center operations, enhance workforce efficiency, and provide robust management tools, including user management, attendance tracking, and asset management. The system is a full-stack web application.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The system utilizes React with TypeScript, Wouter for routing, and TanStack Query for state management. The UI is built with `shadcn/ui` based on Radix UI and styled using Tailwind CSS, ensuring a consistent and intuitive experience with a mobile-first responsive design. Key elements include unified navigation styling, consistent color schemes, smooth animations, and standardized test IDs across components. The Organogram uses GoJS for interactive organizational charts with professional styling, theme management, and drag-to-reorganize functionality.

**Navigation Consistency (November 2025)**: Both Team Leader and Contact Center Manager dashboards now feature identical navigation styling and structure. This includes custom sidebar implementations (replacing Shadcn Sidebar), matching header layouts with notification/logout buttons, unified search functionality, and consistent mobile menu overlays. The "Leader Details" section has been removed from the CC Manager dashboard to streamline the interface.

**Date Controls Update (November 2025)**: The CC Manager dashboard now uses button-based date controls matching the Team Leader Reports page style. The layout has been reorganized to place the Team Leader Selection card above the date range controls. Date preset buttons (Last 7 Days, Last 30 Days, This Month, Last Month) now use active visual states (default vs outline variants) to indicate the current selection, with custom date range inputs positioned on the right side for flexibility.

**Admin Dashboard Redesign (November 2025)**: The admin dashboard has been completely redesigned to use shadcn Sidebar primitives, replacing the previous top navbar. The new sidebar navigation includes 6 main sections: System Admin, HR Management, Contact Center, Team Leaders, Departments, and Organogram. Each section provides comprehensive management tools with consistent styling, responsive design, and mobile-first approach. The Departments section allows administrators to assign users to divisions, departments, and sections with full CRUD operations, search, and filtering capabilities.

### Technical Implementations
The frontend uses Vite for building and React Hook Form with Zod for form handling and validation. The backend is an Express.js application with TypeScript, utilizing Drizzle ORM for PostgreSQL interactions. Authentication is managed via Replit's OpenID Connect (OIDC) and Passport.js, with session management using Express sessions stored in PostgreSQL. The API follows a RESTful design, incorporating route protection, centralized error handling, and Zod schema validation.

### Feature Specifications
- **Role-Based Access Control**: Implements distinct roles (Admin, Team Leader, Contact Center Manager, HR Manager, Agent) with granular access to features and data, supporting both login-enabled and non-login roles.
- **Attendance System**: Tracks attendance with interactive status dropdowns, integrated with termination processes, and automatic record creation.
- **Terminations System**: Redesigned to integrate with attendance tracking, allowing team leaders to initiate various termination types (AWOL, Suspended, Resignation) with comment requirements.
- **Asset Management**: Provides centralized filter controls (global search, date filter) across all asset tabs (Book Out, Book In, Unreturned Assets), with timezone-safe date handling, smart cache invalidation, robust handling of unreturned/lost assets, historical date support, and a read-only historical mode.
- **Team Leader Functionality**: Filters data to show only assigned agents, includes advanced charts for performance and trends, and supports multi-team management.
- **Contact Center Manager Dashboard**: Features a modern reporting dashboard with sidebar navigation, team leader search, date range filters, enhanced KPI cards, tabbed analytics (Attendance, Assets, Operations, Approvals) with various chart types, null-safe implementation, and responsive design. The Approvals tab allows CC managers to view, approve, reject, and complete agent transfer requests initiated by team leaders, providing full transfer workflow management without requiring admin intervention.
- **Transfer Management**: Unified interface for managing agent transfers and department assignments with type filtering, a transfer actions dropdown (New Transfer, Add/Remove Department), simplified filtering, immediate reassignment upon transfer creation, department confirmation dialogs, temporary/permanent transfer types, location tracking, approval workflow, inline action buttons, confirmation dialogs, real-time dashboard updates, organogram sync, role-based access, enhanced status display, duplicate submission prevention, and an audit trail. **(November 2025 Fix)**: Transfer approval and completion now correctly update the `user_department_assignments` table, ensuring department data displays properly in My Team, Transfers, and Admin Dashboard views. Section assignments are preserved when departments don't change.
- **Department Hierarchy System**: Implements a three-tier organizational structure (Divisions, Departments, Sections) with cascading selection in the UI and assignment tracking.
- **Admin Dashboard**: Features a comprehensive sidebar navigation system (using shadcn Sidebar primitives) with 6 main sections: System Admin (user management, stats), HR Management (attendance, transfers, onboarding), Contact Center (operations overview, team leaders), Team Leaders (directory with search and stats), Departments (user assignments to divisions/departments/sections), and Organogram (organizational chart). The dashboard provides role-based access control, responsive design, mobile-friendly navigation, and consistent styling across all sections. The Departments section includes full CRUD operations for managing user-department assignments with advanced search and filtering.
- **Organogram Management**: Interactive organizational chart powered by GoJS, offering full-screen layout, light/dark theme support, professional node design, interactive buttons, enhanced tooltips, drag-to-reorganize functionality, tree-level coloring, mouse interactions, context menus, zoom/pan controls, real-time sync with user data, admin filtering, and cache invalidation.
- **Notification System (December 2025)**: Comprehensive event-driven notification system with hierarchy-based routing. Notifications are sent to team leaders, managers, HR users, and admins based on organizational hierarchy. Key features include:
  - **Transfer Notifications**: Alerts for transfer requests (pending approval), approvals, and rejections with severity levels and action URLs
  - **Termination Notifications**: Alerts for termination events (AWOL marked as urgent, others as warning) to the full management hierarchy
  - **Asset Notifications**: Urgent alerts for lost assets and warning alerts for unreturned assets
  - **Notification Bell Component**: Real-time unread count badge with 30-second polling, expandable notification panel with full message details, metadata display (agent name, transfer type, status), action buttons that redirect to relevant sections, optimistic UI updates for mark-as-read functionality
  - **Expandable Notifications (December 2025)**: Clicking a notification now expands to show full message details, metadata, and an explicit action button (e.g., "Review Transfer Request", "View Terminations", "Review Asset Status") that redirects to the relevant dashboard section
  - **URL Parameter Navigation**: Team Leader and Contact Center dashboards read URL parameters to automatically navigate to the correct tab/section when clicking notification action buttons
  - **API Routes**: GET /api/notifications (paginated), GET /api/notifications/unread-count, PATCH /api/notifications/:id/read, PATCH /api/notifications/read-all

## External Dependencies

### Authentication Services
- Replit OIDC
- Passport.js

### Database Services
- Neon Database (PostgreSQL)

### UI and Styling
- Radix UI
- Tailwind CSS
- Lucide React
- shadcn/ui

### Development Tools
- TypeScript
- Vite
- ESBuild

### Additional Libraries
- date-fns
- clsx
- nanoid
- GoJS
- gojs-react