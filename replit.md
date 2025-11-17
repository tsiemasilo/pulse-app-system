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

### Technical Implementations
The frontend uses Vite for building and React Hook Form with Zod for form handling and validation. The backend is an Express.js application with TypeScript, utilizing Drizzle ORM for PostgreSQL interactions. Authentication is managed via Replit's OpenID Connect (OIDC) and Passport.js, with session management using Express sessions stored in PostgreSQL. The API follows a RESTful design, incorporating route protection, centralized error handling, and Zod schema validation.

### Feature Specifications
- **Role-Based Access Control**: Implements distinct roles (Admin, Team Leader, Contact Center Manager, HR Manager, Agent) with granular access to features and data, supporting both login-enabled and non-login roles.
- **Attendance System**: Tracks attendance with interactive status dropdowns, integrated with termination processes, and automatic record creation.
- **Terminations System**: Redesigned to integrate with attendance tracking, allowing team leaders to initiate various termination types (AWOL, Suspended, Resignation) with comment requirements.
- **Asset Management**: Provides centralized filter controls (global search, date filter) across all asset tabs (Book Out, Book In, Unreturned Assets), with timezone-safe date handling, smart cache invalidation, robust handling of unreturned/lost assets, historical date support, and a read-only historical mode.
- **Team Leader Functionality**: Filters data to show only assigned agents, includes advanced charts for performance and trends, and supports multi-team management.
- **Contact Center Manager Dashboard**: Features a modern reporting dashboard with sidebar navigation, team leader search, date range filters, enhanced KPI cards, tabbed analytics (Attendance, Assets, Operations, Approvals) with various chart types, null-safe implementation, and responsive design. The Approvals tab allows CC managers to view, approve, reject, and complete agent transfer requests initiated by team leaders, providing full transfer workflow management without requiring admin intervention.
- **Transfer Management**: Unified interface for managing agent transfers and department assignments with type filtering, a transfer actions dropdown (New Transfer, Add/Remove Department), simplified filtering, immediate reassignment upon transfer creation, department confirmation dialogs, temporary/permanent transfer types, location tracking, approval workflow, inline action buttons, confirmation dialogs, real-time dashboard updates, organogram sync, role-based access, enhanced status display, duplicate submission prevention, and an audit trail.
- **Department Hierarchy System**: Implements a three-tier organizational structure (Divisions, Departments, Sections) with cascading selection in the UI and assignment tracking.
- **Organogram Management**: Interactive organizational chart powered by GoJS, offering full-screen layout, light/dark theme support, professional node design, interactive buttons, enhanced tooltips, drag-to-reorganize functionality, tree-level coloring, mouse interactions, context menus, zoom/pan controls, real-time sync with user data, admin filtering, and cache invalidation.

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