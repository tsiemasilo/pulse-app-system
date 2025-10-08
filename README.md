# Pulse Workforce Management System

<div align="center">
  <h3>Enterprise Contact Center Workforce Management Platform</h3>
  <p>A comprehensive, role-based workforce management system built for contact center operations</p>
</div>

## 🌟 Overview

Pulse is a modern, full-stack workforce management system designed specifically for contact center environments. It provides real-time attendance tracking, asset management, team coordination, and comprehensive reporting capabilities across multiple organizational roles.

## ✨ Key Features

### 👥 Role-Based Access Control
- **Admin Dashboard** - Complete system oversight and configuration
- **HR Management** - Employee lifecycle and compliance tracking
- **Contact Center Ops Manager** - Multi-team operational control
- **Team Leader Portal** - Direct team management and performance tracking
- **Agent Interface** - Self-service attendance and asset booking

### 📊 Core Functionality
- **Real-Time Attendance Tracking** - Live status updates with clock-in/out monitoring
- **Asset Management** - Track laptops, headsets, and equipment assignments
- **Team Performance Analytics** - Comprehensive reporting and insights
- **Transfer & Termination Management** - Streamlined HR workflows
- **Onboarding System** - Automated employee onboarding process
- **Historical Reporting** - Trend analysis and compliance reporting

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL database (Neon recommended)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tsiemasilo/pulse-app-system.git
   cd pulse-app-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database credentials:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   NETLIFY_DATABASE_URL=your_production_database_url
   ```

4. **Initialize database schema**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Application will be available at `http://localhost:5000`

## 🔐 Default Login Credentials

### Administrative Access
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `password123` |
| HR Manager | `hr` | `hr123` |
| Contact Center Manager | `manager` | `manager123` |

### Operational Access
| Role | Username | Password |
|------|----------|----------|
| Team Leader | `leader` | `leader123` |
| Agent | `agent` | `agent123` |

> **Note:** Change default passwords in production environments

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **TanStack Query** - Powerful data synchronization
- **Wouter** - Lightweight routing

### Backend
- **Express.js** - Fast, minimalist web framework
- **TypeScript** - Type-safe server code
- **Drizzle ORM** - Lightweight TypeScript ORM
- **PostgreSQL** - Robust relational database
- **Passport.js** - Authentication middleware

### DevOps & Deployment
- **Netlify Functions** - Serverless deployment
- **Playwright** - End-to-end testing
- **Drizzle Kit** - Database migrations

## 📁 Project Structure

```
pulse-app-system/
├── client/               # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utility functions
├── server/              # Express backend API
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Data access layer
│   └── scheduler.ts     # Background jobs
├── shared/              # Shared TypeScript types
│   └── schema.ts        # Database schema & types
└── netlify/             # Serverless functions
```

## 📊 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Sync database schema
npm run test         # Run Playwright tests
npm run test:ui      # Run tests with UI
npm run check        # TypeScript type checking
```

## 🔄 Database Schema

The system uses Drizzle ORM with PostgreSQL. Key entities include:

- **Users** - Employee accounts with role-based permissions
- **Teams** - Organizational team structure
- **Attendance** - Daily attendance records with status tracking
- **Assets** - Equipment inventory and assignments
- **Transfers** - Employee transfer requests and approvals
- **Terminations** - Termination workflows and records

Run `npm run db:push` to sync your database with the latest schema.

## 🚢 Deployment

### Netlify Deployment
1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add environment variables in Netlify dashboard
4. Deploy!

### Manual Deployment
```bash
npm run build
npm run start
```

## 🧪 Testing

Run end-to-end tests with Playwright:

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run in headed mode
npm run test:headed
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🔗 Links

- [GitHub Repository](https://github.com/tsiemasilo/pulse-app-system)
- [Documentation](./setup-database.md)
- [Login Credentials](./LOGIN_CREDENTIALS.md)

## 💡 Support

For issues and questions, please create an issue in the GitHub repository.

---

<div align="center">
  Built with ❤️ by Alteram Solutions
</div>
