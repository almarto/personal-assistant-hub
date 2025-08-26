# Personal Assistant Hub API

NestJS backend API for the Personal Assistant Hub monorepo with WebAuthn authentication.

## Features

- **WebAuthn Authentication**: Passwordless authentication using passkeys
- **Invitation System**: Admin-controlled user registration via invitation tokens
- **Role-based Access Control**: Admin and user roles with appropriate permissions
- **PostgreSQL Database**: Using Drizzle ORM for type-safe database operations
- **Swagger Documentation**: Auto-generated API documentation

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database
- pnpm package manager

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/personal_assistant_hub

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# WebAuthn Configuration
WEBAUTHN_RP_NAME=Personal Assistant Hub
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:5173

# Frontend URL for invitation links
FRONTEND_URL=http://localhost:5173

# Server Configuration
PORT=3001
```

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## API Endpoints

### Authentication

- `POST /auth/register/initiate` - Start user registration with invitation token
- `POST /auth/register/complete` - Complete user registration with WebAuthn credential
- `POST /auth/login/initiate` - Start user login
- `POST /auth/login/complete` - Complete user login with WebAuthn credential
- `POST /auth/logout` - Logout user
- `POST /auth/me` - Get current user information

### Users (Admin only)

- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Deactivate user

### Invitations (Admin only)

- `POST /invitations` - Create new invitation
- `GET /invitations` - Get all invitations
- `GET /invitations/:id` - Get invitation by ID
- `PUT /invitations/:id/resend` - Resend invitation
- `DELETE /invitations/:id` - Revoke invitation
- `GET /invitations/validate` - Validate invitation token

## Documentation

API documentation is available at `/api/docs` when the server is running.

## Architecture

The API follows NestJS modular architecture with:

- **Modules**: Feature-based organization (auth, users, invitations)
- **Guards**: JWT authentication and role-based access control
- **Services**: Business logic implementation
- **Controllers**: HTTP request handling
- **DTOs**: Data validation and transformation
