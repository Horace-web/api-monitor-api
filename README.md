# API Monitor - Backend API

A comprehensive API monitoring platform that tracks the health and availability of external APIs and services in real-time.

## Project Overview

API Monitor is designed to help development teams monitor critical API endpoints, track response times, detect failures, and manage incidents. The system provides a centralized hub for monitoring multiple services and their health checks.

## 🏗️ Architecture

### Technology Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: JWT

### Data Hierarchy

```
User
 └── Service (e.g., "Backend", "Frontend", "Payment API")
      └── Monitor (e.g., "GET /health", "GET /api/status")
           ├── CheckResults (historical check data)
           └── Incidents (failure alerts)
```

### Module Structure

```
src/
├── auth/                 # Authentication & JWT token management
├── users/                # User account management
├── services/             # Service grouping and management
├── monitors/             # Monitor configuration CRUD
├── monitoring/           # Core monitoring engine (scheduler, HTTP checks)
├── check-results/        # Storage and retrieval of check results
├── incidents/            # Incident tracking and alerting
├── prisma/               # Database connection and Prisma service
├── common/               # Shared utilities, guards, interceptors
├── app.module.ts         # Root application module
└── main.ts               # Application entry point
```

## 📋 Module Responsibilities

### `auth`
- User login and registration
- JWT token generation and validation
- Authentication strategies (JWT, local)

### `users`
- User CRUD operations
- User profile management
- Password handling and security

### `services`
- Logical grouping of monitors
- Service ownership and permissions
- Service status aggregation

### `monitors`
- Monitor configuration management
- Enable/disable functionality
- Check frequency settings

### `monitoring` ⭐ (Core)
- **Main Monitoring Engine**
- Task scheduling for periodic checks
- HTTP GET request execution
- Timeout and retry handling
- CheckResult recording
- Incident detection and creation

**MVP Features**:
- GET requests only
- Configurable timeouts (MONITORING_TIMEOUT env var)
- Retry mechanism (MONITORING_RETRIES env var)
- HTTP status code validation (2xx = success)

### `check-results`
- CheckResult storage and retrieval
- Check history with filtering and pagination
- Uptime statistics and analytics
- Historical data cleanup

### `incidents`
- Incident lifecycle management (open/acknowledged/resolved)
- Failure tracking with consecutive count
- Alert notifications (future)
- Escalation policies (future)

### `prisma`
- Centralized database connection
- Prisma Client initialization and management

### `common`
- Shared exception filters
- HTTP interceptors
- Authentication guards
- DTOs and validation pipes
- Utility functions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (or Supabase account)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Run database migrations (when schema is defined)
npm run prisma:migrate
```

### Development

```bash
# Start in watch mode
npm run start:dev

# Run tests
npm test

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

### Production

```bash
# Build
npm run build

# Start
npm run start:prod
```

## 📝 Environment Variables

See `.env.example` for required variables:

- `NODE_ENV` - Application environment (development/production)
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string (from Supabase)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRATION` - Token expiration time
- `MONITORING_TIMEOUT` - HTTP request timeout in ms
- `MONITORING_RETRIES` - Number of retries for failed checks

## 🔄 Data Flow Example

1. **User** creates an account via Auth module
2. **User** creates a **Service** (e.g., "Backend APIs")
3. **User** creates **Monitors** under the Service (e.g., "GET https://api.example.com/health")
4. **Monitoring module** runs on schedule (e.g., every 30 seconds)
   - Makes HTTP GET request to each monitor URL
   - Records result in database via CheckResults module
   - If failed: Incidents module creates/updates an Incident
5. **User** views dashboard to see:
   - Monitor status and history
   - Uptime statistics
   - Active incidents and alerts

## 📚 Next Steps

Before implementing features, the following will be defined:

1. **Prisma Schema** - User, Service, Monitor, CheckResult, Incident models with relations
2. **DTO Definitions** - Request/response validation schemas for each module
3. **API Endpoints** - RESTful routes for CRUD operations
4. **Authentication Guard** - JWT validation for protected routes
5. **Monitoring Logic** - Scheduler implementation and HTTP check execution

## 📄 License

MIT

## 👤 Author

Horace-web

---

**Status**: 🚧 Project initialized - Architecture ready for feature development
