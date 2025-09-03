# Login Credentials for All User Types

## Administrator
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin (Full system access)

## HR Manager  
- **Username**: `hr`
- **Password**: `hr123`
- **Role**: HR (Employee management and reporting)

## Contact Center Manager
- **Username**: `manager`  
- **Password**: `manager123`
- **Role**: Contact Center Manager (Team performance and metrics)

## Team Leaders
- **Username**: `leader` | **Password**: `leader123`
- **Username**: `TL` | **Password**: `TL`
- **Username**: `TL2` | **Password**: `TL2`  
- **Username**: `tl-reset` | **Password**: `tlreset123`
- **Username**: `teaml3` | **Password**: `teaml3`
- **Role**: Team Leader (Team oversight and coordination)

## Agents
- **Username**: `agent` | **Password**: `agent123`
- **Username**: `tsiemasilo` | **Password**: (OIDC authenticated)
- **Username**: `testuser` | **Password**: (varies)
- **Username**: `test` | **Password**: (varies)
- **Username**: `AGENT2` | **Password**: (varies)
- **Username**: `agent3` | **Password**: (varies)
- **Role**: Agent (Personal dashboard and task management)

## Notes
- All passwords are now properly hashed and secure
- OIDC users (like `tsiemasilo`) use Replit authentication
- System supports role-based access control
- Each role has different dashboard views and permissions