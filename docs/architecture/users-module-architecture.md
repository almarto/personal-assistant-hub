# Users Module - Hexagonal Architecture

## Overview

This document defines the hexagonal architecture implementation for the users module, ensuring
proper separation of concerns and dependency inversion.

## Architecture Layers

### Domain Layer (`domain/`)

#### Entities (`domain/entities/`)

- **User**: Core business entity representing a user
- **Properties**: id, email, role, isActive, createdAt, updatedAt, lastLoginAt
- **Business Rules**: Email uniqueness, role validation, active status management

#### Ports (`domain/ports/`)

##### Input Ports (`domain/ports/in/`)

- **UserUseCase**: Interface defining user operations
  - `findAll()`: Retrieve all users
  - `findOne(id)`: Retrieve user by ID
  - `update(id, data)`: Update user information
  - `remove(id)`: Deactivate user (soft delete)

##### Output Ports (`domain/ports/out/`)

- **UserRepository**: Interface for data persistence
  - `findAll()`: Database query for all users
  - `findById(id)`: Database query by ID
  - `update(id, data)`: Database update operation
  - `deactivate(id)`: Database soft delete operation

### Application Layer (`application/`)

#### Services (`application/`)

- **UserService**: Implementation of UserUseCase
  - Orchestrates business logic
  - Implements authorization checks
  - Coordinates with repository through UserRepository port
  - Handles business rule validation

### Infrastructure Layer (`infrastructure/`)

#### Input Adapters (`infrastructure/adapters/in/`)

- **UsersController**: HTTP adapter
  - Handles REST API requests
  - Maps HTTP requests to use case calls
  - Implements authentication and authorization
  - Uses DTOs for request/response mapping

#### Output Adapters (`infrastructure/adapters/out/`)

- **UserRepositoryAdapter**: Database adapter
  - Implements UserRepository interface
  - Uses Drizzle ORM for database operations
  - Maps between domain entities and database entities
  - Handles database-specific logic

#### Database Entities (`infrastructure/entities/`)

- **UserEntity**: Drizzle schema representation
  - Maps to `users` table in database
  - Uses existing schema from `packages/database`

## Data Flow

```
HTTP Request → Controller → UseCase → Repository → Database
                    ↓         ↓         ↓
                   DTO → Domain Entity → DB Entity
```

## Dependency Direction

```
Infrastructure → Application → Domain
     ↑              ↑
  Adapters    Use Cases    ← Ports (Interfaces)
```

## Key Principles

1. **Dependency Inversion**: Infrastructure depends on domain, not vice versa
2. **Interface Segregation**: Small, focused interfaces (ports)
3. **Single Responsibility**: Each layer has a clear purpose
4. **Testability**: Business logic isolated from external concerns

## Database Integration

### Using Drizzle ORM

- Import schema from `packages/database/src/schema/users`
- Use existing `users` table definition
- Leverage Drizzle's type safety and query builder
- No need for separate entity definitions

### Repository Implementation

```typescript
// Use existing Drizzle schema
import { users } from '@repo/database/schema';
import { db } from '@repo/database';

// Repository adapter implements domain port
export class UserRepositoryAdapter implements UserRepository {
  async findAll(): Promise<User[]> {
    const dbUsers = await db.select().from(users);
    return dbUsers.map(this.toDomainEntity);
  }
}
```

## Module Configuration

### Dependency Injection

- Use NestJS providers to wire dependencies
- Bind interfaces to implementations
- Use tokens for port/adapter binding

### Provider Configuration

```typescript
{
  provide: 'USER_USE_CASE',
  useClass: UserService,
},
{
  provide: 'USER_REPOSITORY',
  useClass: UserRepositoryAdapter,
}
```

## Migration Notes

### From Old Structure

- Replace direct service injection with use case ports
- Move business logic from controller to service
- Implement repository pattern for data access
- Maintain backward compatibility during transition

### Database Schema

- ✅ Use existing Drizzle schema from `packages/database`
- ❌ Do NOT create new TypeORM entities
- ✅ Import and reuse existing table definitions
- ✅ Leverage existing relationships and constraints
