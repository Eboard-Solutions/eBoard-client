# E-Board Management Information System

## 📋 Project Overview

The E-Board Management Information System is a comprehensive enterprise-grade application designed to streamline and digitize board meeting management, document handling, resolution tracking, and organizational governance. This system provides a secure, role-based platform for managing all aspects of electronic board operations.

### Key Features

- **User Management**: Role-based access control with multiple user types
- **Organization Management**: Multi-tenant support for multiple organizations
- **Meeting Management**: Complete meeting lifecycle from scheduling to minutes
- **Document Management**: Secure document storage, versioning, and sharing
- **Resolution & Voting**: Digital voting system with real-time results
- **Notifications**: Real-time notifications for meeting updates and actions
- **Audit Trail**: Complete activity logging and compliance tracking
- **Dashboard & Analytics**: Insights into meeting metrics and board performance

---

## 🚀 Tech Stack

### Backend

- **Framework**: NestJS v10.x (Node.js framework)
- **Language**: TypeScript v5.x
- **Database**: PostgreSQL v15.x
- **ORM**: Prisma v5.x
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI v3
- **Testing**: Jest & Supertest
- **File Storage**: AWS S3 / Local Storage (configurable)

### Frontend

- **Framework**: TanStack Start (React v18.x)
- **Language**: TypeScript v5.x
- **Routing**: TanStack Router
- **State Management**: TanStack Query (React Query)
- **UI Framework**: Tailwind CSS v3.x / shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest & React Testing Library

### DevOps & Tools

- **Version Control**: Git & GitHub
- **Package Manager**: npm / pnpm
- **Code Quality**: ESLint, Prettier
- **API Testing**: Postman / Thunder Client
- **Containerization**: Docker & Docker Compose (optional)

---

## 📁 Project Structure

```
e-board-mis/
├── backend/                          # NestJS Backend Application
│   ├── src/
│   │   ├── modules/                  # Feature Modules
│   │   │   ├── auth/                 # Authentication & Authorization
│   │   │   │   ├── guards/          # JWT, Roles Guards
│   │   │   │   ├── strategies/      # Passport Strategies
│   │   │   │   ├── dto/             # Auth DTOs
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.module.ts
│   │   │   │
│   │   │   ├── users/               # User Management
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.module.ts
│   │   │   │
│   │   │   ├── organizations/       # Organization Management
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── organizations.controller.ts
│   │   │   │   ├── organizations.service.ts
│   │   │   │   └── organizations.module.ts
│   │   │   │
│   │   │   ├── meetings/            # Meeting Management
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── meetings.controller.ts
│   │   │   │   ├── meetings.service.ts
│   │   │   │   ├── agendas.controller.ts
│   │   │   │   ├── agendas.service.ts
│   │   │   │   ├── minutes.controller.ts
│   │   │   │   ├── minutes.service.ts
│   │   │   │   └── meetings.module.ts
│   │   │   │
│   │   │   ├── documents/           # Document Management
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── documents.controller.ts
│   │   │   │   ├── documents.service.ts
│   │   │   │   └── documents.module.ts
│   │   │   │
│   │   │   ├── resolutions/         # Resolution & Voting
│   │   │   │   ├── dto/
│   │   │   │   ├── entities/
│   │   │   │   ├── resolutions.controller.ts
│   │   │   │   ├── resolutions.service.ts
│   │   │   │   ├── votes.controller.ts
│   │   │   │   ├── votes.service.ts
│   │   │   │   └── resolutions.module.ts
│   │   │   │
│   │   │   └── notifications/       # Notification System
│   │   │       ├── dto/
│   │   │       ├── entities/
│   │   │       ├── notifications.controller.ts
│   │   │       ├── notifications.service.ts
│   │   │       ├── notifications.gateway.ts
│   │   │       └── notifications.module.ts
│   │   │
│   │   ├── common/                  # Shared Resources
│   │   │   ├── decorators/         # Custom Decorators
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── public.decorator.ts
│   │   │   │
│   │   │   ├── guards/             # Guards
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   │
│   │   │   ├── filters/            # Exception Filters
│   │   │   │   └── http-exception.filter.ts
│   │   │   │
│   │   │   ├── interceptors/       # Interceptors
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   │
│   │   │   └── pipes/              # Custom Pipes
│   │   │       └── validation.pipe.ts
│   │   │
│   │   ├── config/                 # Configuration
│   │   │   ├── database.config.ts
│   │   │   ├── jwt.config.ts
│   │   │   ├── app.config.ts
│   │   │   └── swagger.config.ts
│   │   │
│   │   ├── shared/                 # Shared Types & Interfaces
│   │   │   ├── interfaces/
│   │   │   │   ├── response.interface.ts
│   │   │   │   └── pagination.interface.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── user-roles.type.ts
│   │   │   │   └── meeting-status.type.ts
│   │   │   │
│   │   │   └── constants/
│   │   │       └── app.constants.ts
│   │   │
│   │   ├── app.module.ts           # Root Module
│   │   ├── app.controller.ts       # Root Controller
│   │   ├── app.service.ts          # Root Service
│   │   └── main.ts                 # Application Entry Point
│   │
│   ├── prisma/                     # Prisma ORM
│   │   ├── schema.prisma          # Database Schema
│   │   ├── migrations/            # Migration Files
│   │   └── seed.ts                # Database Seeding
│   │
│   ├── test/                       # Testing
│   │   ├── unit/                  # Unit Tests
│   │   ├── e2e/                   # E2E Tests
│   │   └── jest-e2e.json
│   │
│   ├── .env.example               # Environment Variables Template
│   ├── .eslintrc.js               # ESLint Configuration
│   ├── .prettierrc                # Prettier Configuration
│   ├── nest-cli.json              # NestJS CLI Configuration
│   ├── package.json               # Dependencies
│   ├── tsconfig.json              # TypeScript Configuration
│   ├── tsconfig.build.json        # Build Configuration
│   └── README.md                  # Backend Documentation
│
├── frontend/                       # TanStack Start Frontend
│   ├── app/
│   │   ├── routes/                # Route Components
│   │   │   ├── __root.tsx        # Root Layout
│   │   │   ├── index.tsx         # Home Page
│   │   │   ├── login.tsx         # Login Page
│   │   │   ├── dashboard/
│   │   │   │   └── index.tsx
│   │   │   ├── meetings/
│   │   │   │   ├── index.tsx     # Meetings List
│   │   │   │   ├── $id.tsx       # Meeting Detail
│   │   │   │   └── create.tsx    # Create Meeting
│   │   │   ├── documents/
│   │   │   │   └── index.tsx
│   │   │   ├── resolutions/
│   │   │   │   └── index.tsx
│   │   │   └── profile/
│   │   │       └── index.tsx
│   │   │
│   │   ├── components/            # React Components
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── DataTable.tsx
│   │   │   │
│   │   │   ├── meetings/
│   │   │   │   ├── MeetingCard.tsx
│   │   │   │   ├── MeetingForm.tsx
│   │   │   │   ├── AgendaList.tsx
│   │   │   │   └── MinutesEditor.tsx
│   │   │   │
│   │   │   ├── documents/
│   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   ├── DocumentList.tsx
│   │   │   │   └── DocumentViewer.tsx
│   │   │   │
│   │   │   └── resolutions/
│   │   │       ├── ResolutionCard.tsx
│   │   │       ├── VotingPanel.tsx
│   │   │       └── VoteResults.tsx
│   │   │
│   │   ├── hooks/                 # Custom React Hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useMeetings.ts
│   │   │   ├── useDocuments.ts
│   │   │   └── useNotifications.ts
│   │   │
│   │   ├── services/              # API Services
│   │   │   ├── api.ts            # API Client
│   │   │   ├── auth.service.ts
│   │   │   ├── meetings.service.ts
│   │   │   ├── documents.service.ts
│   │   │   └── resolutions.service.ts
│   │   │
│   │   ├── utils/                 # Utility Functions
│   │   │   ├── formatDate.ts
│   │   │   ├── storage.ts
│   │   │   └── validation.ts
│   │   │
│   │   ├── types/                 # TypeScript Types
│   │   │   ├── user.types.ts
│   │   │   ├── meeting.types.ts
│   │   │   ├── document.types.ts
│   │   │   └── api.types.ts
│   │   │
│   │   ├── styles/                # Global Styles
│   │   │   └── globals.css
│   │   │
│   │   └── router.tsx             # Router Configuration
│   │
│   ├── public/                    # Static Assets
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── icons/
│   │   └── favicon.ico
│   │
│   ├── .env.example              # Environment Variables
│   ├── .eslintrc.js              # ESLint Configuration
│   ├── tailwind.config.ts        # Tailwind Configuration
│   ├── vite.config.ts            # Vite Configuration
│   ├── package.json              # Dependencies
│   ├── tsconfig.json             # TypeScript Configuration
│   └── README.md                 # Frontend Documentation
│
├── shared/                        # Shared Types (Optional)
│   └── types/
│       ├── common.types.ts
│       └── api-contracts.ts
│
├── docker-compose.yml            # Docker Compose Configuration
├── .gitignore                    # Git Ignore
└── README.md                     # Project Documentation (This file)
```

---

## 🛠️ Architecture Overview

### Backend Architecture

The backend follows **NestJS Module-based Architecture** with clean separation of concerns:

1. **Controllers**: Handle HTTP requests and responses
2. **Services**: Business logic layer
3. **Repositories (via Prisma)**: Data access layer
4. **DTOs**: Data Transfer Objects for validation
5. **Guards**: Authentication and authorization
6. **Interceptors**: Cross-cutting concerns (logging, transformation)
7. **Filters**: Exception handling

### Frontend Architecture

The frontend uses **Component-based Architecture** with TanStack Start:

1. **Routes**: File-based routing with TanStack Router
2. **Components**: Reusable UI components
3. **Hooks**: Custom React hooks for business logic
4. **Services**: API communication layer
5. **State Management**: TanStack Query for server state
6. **Types**: TypeScript interfaces and types

### Database Schema

The system uses PostgreSQL with Prisma ORM. Key entities include:

- **User**: System users with role-based access
- **Organization**: Multi-tenant support
- **Meeting**: Board meetings with status tracking
- **Agenda**: Meeting agenda items
- **Minutes**: Meeting minutes and notes
- **Document**: File management with versioning
- **Resolution**: Proposals and resolutions
- **Vote**: Voting records
- **Notification**: System notifications
- **AuditLog**: Activity tracking

---

## 🔐 Authentication & Authorization

### User Roles

1. **Super Admin**: System-wide administration
2. **Admin**: Organization-level administration
3. **Chairperson**: Meeting chair privileges
4. **Board Member**: Standard board member access
5. **Secretary**: Administrative support role
6. **Observer**: Read-only access

### JWT Authentication Flow

```
1. User submits credentials → POST /api/v1/auth/login
2. Backend validates credentials
3. Generate JWT access token (15min) + refresh token (7d)
4. Client stores tokens (localStorage/httpOnly cookie)
5. Client includes token in Authorization header
6. Backend validates token on protected routes
7. Token refresh via /api/v1/auth/refresh
```

### Role-Based Access Control (RBAC)

```typescript
// Example: Only Admin and Chairperson can create meetings
@Post('meetings')
@Roles(UserRole.ADMIN, UserRole.CHAIRPERSON)
@UseGuards(JwtAuthGuard, RolesGuard)
async createMeeting(@Body() dto: CreateMeetingDto) {
  // ...
}
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm** or **pnpm**: Latest version
- **PostgreSQL**: v15.x or higher
- **Git**: Latest version

### Environment Setup

#### Backend Environment Variables

Create `backend/.env` file:

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/eboard_db?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3001

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# AWS S3 (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=eboard-documents

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

#### Frontend Environment Variables

Create `frontend/.env` file:

```env
# API
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_API_TIMEOUT=30000

# Application
VITE_APP_NAME=E-Board MIS
VITE_APP_VERSION=1.0.0

# Authentication
VITE_TOKEN_KEY=eboard_access_token
VITE_REFRESH_TOKEN_KEY=eboard_refresh_token

# File Upload
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx
```

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/e-board-mis.git
cd e-board-mis
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed

# Start development server
npm run start:dev
```

Backend will run on: `http://localhost:3000`
API Documentation: `http://localhost:3000/api/docs`

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:3001`

---

## 📚 API Documentation

### API Versioning

All API endpoints are versioned: `/api/v1/`

### API Endpoints Overview

#### Authentication (`/api/v1/auth`)

- `POST /login` - User login
- `POST /register` - User registration
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout
- `GET /me` - Get current user profile

#### Users (`/api/v1/users`)

- `GET /` - List all users (paginated)
- `GET /:id` - Get user by ID
- `POST /` - Create new user
- `PATCH /:id` - Update user
- `DELETE /:id` - Delete user
- `PATCH /:id/role` - Update user role

#### Organizations (`/api/v1/organizations`)

- `GET /` - List organizations
- `GET /:id` - Get organization details
- `POST /` - Create organization
- `PATCH /:id` - Update organization
- `DELETE /:id` - Delete organization
- `GET /:id/members` - Get organization members

#### Meetings (`/api/v1/meetings`)

- `GET /` - List meetings (with filters)
- `GET /:id` - Get meeting details
- `POST /` - Create meeting
- `PATCH /:id` - Update meeting
- `DELETE /:id` - Delete meeting
- `POST /:id/publish` - Publish meeting
- `POST /:id/cancel` - Cancel meeting
- `GET /:id/agenda` - Get meeting agenda
- `POST /:id/agenda` - Add agenda item
- `GET /:id/minutes` - Get meeting minutes
- `POST /:id/minutes` - Add/update minutes
- `GET /:id/attendees` - Get attendees
- `POST /:id/attendees` - Add attendee

#### Documents (`/api/v1/documents`)

- `GET /` - List documents
- `GET /:id` - Get document details
- `POST /` - Upload document
- `GET /:id/download` - Download document
- `DELETE /:id` - Delete document
- `GET /meeting/:meetingId` - Get meeting documents

#### Resolutions (`/api/v1/resolutions`)

- `GET /` - List resolutions
- `GET /:id` - Get resolution details
- `POST /` - Create resolution
- `PATCH /:id` - Update resolution
- `DELETE /:id` - Delete resolution
- `POST /:id/vote` - Cast vote
- `GET /:id/results` - Get voting results

#### Notifications (`/api/v1/notifications`)

- `GET /` - List user notifications
- `GET /:id` - Get notification details
- `PATCH /:id/read` - Mark as read
- `DELETE /:id` - Delete notification

For detailed API documentation with request/response examples, see:

- **Backend README**: `backend/README.md`
- **Swagger UI**: `http://localhost:3000/api/docs` (when backend is running)

---

## 🧪 Testing Strategy

### Backend Testing

```bash
cd backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

**Test Structure:**

- Unit tests for services, controllers, and utilities
- Integration tests for database operations
- E2E tests for complete API flows
- Mock data for consistent testing

### Frontend Testing

```bash
cd frontend

# Run tests
npm run test

# Test coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Structure:**

- Component tests with React Testing Library
- Hook tests
- Integration tests for API services
- E2E tests with Playwright (optional)

---

## 📦 Database Management

### Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (DEV ONLY!)
npx prisma migrate reset

# Open Prisma Studio (Database GUI)
npx prisma studio

# Seed database
npx prisma db seed

# Format schema
npx prisma format
```

### Database Backup

```bash
# Backup
pg_dump -U username -d eboard_db > backup.sql

# Restore
psql -U username -d eboard_db < backup.sql
```

---

## 🔧 Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Code Quality

```bash
# Backend
cd backend
npm run lint              # ESLint
npm run format            # Prettier
npm run lint:fix          # Auto-fix issues

# Frontend
cd frontend
npm run lint              # ESLint
npm run format            # Prettier
npm run type-check        # TypeScript check
```

---

## 🚢 Deployment

### Production Build

#### Backend

```bash
cd backend

# Build
npm run build

# Start production server
npm run start:prod
```

#### Frontend

```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Deployment (Optional)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f
```

### Environment Considerations

**Production Checklist:**

- [ ] Update all environment variables
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Configure file storage (AWS S3)
- [ ] Set up monitoring and logging
- [ ] Enable rate limiting
- [ ] Configure email service
- [ ] Set up CI/CD pipeline

### Hosting Recommendations

**Backend:**

- AWS EC2 / AWS ECS
- DigitalOcean Droplets
- Heroku
- Railway
- Render

**Frontend:**

- Vercel
- Netlify
- AWS Amplify
- Cloudflare Pages

**Database:**

- AWS RDS (PostgreSQL)
- DigitalOcean Managed Database
- Supabase
- Neon

---

## 📊 Monitoring & Logging

### Application Logging

Backend uses Winston logger:

- Error logs
- Request logs
- Audit logs
- Performance logs

### Monitoring Tools (Recommended)

- **Application**: New Relic, DataDog, Sentry
- **Database**: pgAdmin, DataDog
- **Infrastructure**: AWS CloudWatch, Grafana
- **Uptime**: UptimeRobot, Pingdom

---

## 🔒 Security Best Practices

1. **Authentication**

   - Use strong JWT secrets
   - Implement token rotation
   - Secure password hashing (bcrypt)
   - Rate limiting on auth endpoints

2. **Authorization**

   - Role-based access control
   - Resource-level permissions
   - Validate user access on every request

3. **Data Protection**

   - Input validation on all endpoints
   - SQL injection prevention (Prisma ORM)
   - XSS protection
   - CSRF protection
   - Sanitize user input

4. **API Security**

   - HTTPS only in production
   - CORS configuration
   - Rate limiting
   - Request size limits
   - API key management

5. **File Upload Security**
   - File type validation
   - File size limits
   - Virus scanning
   - Secure storage

---

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Write/update tests
6. Submit a pull request

### Code Review Process

- All PRs require review
- Tests must pass
- Code coverage must not decrease
- Follow code style guidelines

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team & Support

### Development Team

- **Backend Lead**: [Name]
- **Frontend Lead**: [Name]
- **Database Architect**: [Name]
- **DevOps Engineer**: [Name]

### Support

- **Documentation**: [Link to detailed docs]
- **Issue Tracker**: GitHub Issues
- **Email**: support@eboard-mis.com

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TanStack Start Documentation](https://tanstack.com/start)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🗺️ Roadmap

### Phase 1 (Current)

- ✅ Core authentication system
- ✅ User management
- ✅ Meeting management
- ✅ Document management

### Phase 2 (Upcoming)

- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Email notifications

### Phase 3 (Future)

- [ ] AI-powered meeting transcription
- [ ] Integration with calendar systems
- [ ] Advanced reporting
- [ ] Multi-language support

---

**Last Updated**: November 2025  
**Version**: 1.0.0
