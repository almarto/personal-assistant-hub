# @personal-assistant-hub/auth

Authentication package for Personal Assistant Hub that provides complete WebAuthn/passkeys support.

## Features

- ✅ WebAuthn/passkeys authentication
- ✅ User registration with invitation tokens
- ✅ JWT session management
- ✅ Zustand store for state management
- ✅ React hooks for easy integration
- ✅ Full TypeScript support
- ✅ SSR/Next.js support

## Installation

```bash
pnpm add @personal-assistant-hub/auth
```

## Basic Usage

### 1. Initialize the Auth System

First, create the auth system with your API configuration:

```tsx
import { createAuth } from '@personal-assistant-hub/auth';

// Create the auth system with your API base URL
const auth = createAuth({
  apiBaseUrl: 'http://localhost:3001', // or your API URL
});

// Extract the hooks and service
const { useAuth, authService } = auth;
```

### 2. Use the Authentication Hook

```tsx
function LoginComponent() {
  const { login, register, logout, user, isAuthenticated, isLoading, error } =
    useAuth();

  const handleLogin = async (email: string) => {
    try {
      await login(email);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleRegister = async (
    email: string,
    invitationToken: string,
    deviceName: string
  ) => {
    try {
      await register(email, invitationToken, deviceName);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.email}!</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={() => handleLogin('user@example.com')}>Login</button>
        </div>
      )}
    </div>
  );
}
```

### 3. Use the Service Directly

```tsx
// Using the authService from the created auth system
const isAuth = authService.isAuthenticated();

// Get the current token
const token = authService.getToken();

// Get current user information
const user = await authService.getCurrentUser();
```

### 4. Specific Hooks

```tsx
// Extract specific hooks from the auth system
const { useIsAuthenticated, useCurrentUser, useAuthLoading, useAuthError } =
  auth;

function UserProfile() {
  const isAuthenticated = useIsAuthenticated();
  const user = useCurrentUser();
  const isLoading = useAuthLoading();
  const error = useAuthError();

  if (!isAuthenticated) return <div>Not authenticated</div>;
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>Hello, {user?.email}!</div>;
}
```

## Configuration

The package requires you to provide the API base URL when creating the auth system:

```tsx
const auth = createAuth({
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
});
```

This approach makes the package framework-agnostic and doesn't tie it to specific environment variable conventions.

## TypeScript Types

The package includes complete TypeScript types:

```tsx
import type {
  User,
  AuthResult,
  PasskeyCredentials,
  RegistrationData,
  AuthStore,
  AuthServiceConfig,
} from '@personal-assistant-hub/auth';
```

## Architecture

- **AuthService**: Main service that handles API calls
- **AuthStore**: Zustand store for global authentication state
- **Hooks**: React hooks for easy component integration
- **Types**: TypeScript interfaces for type safety

## Testing

The package includes comprehensive tests covering all functionality:

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

- **AuthService Tests**: Complete API interaction testing with mocked fetch
- **Auth Store Tests**: Zustand store state management and persistence
- **React Hooks Tests**: All authentication hooks without React DOM dependencies
- **Integration Tests**: End-to-end authentication flows and error handling

### Test Environment

- **Framework**: Vitest with jsdom environment
- **Mocking**: Fetch API and WebAuthn browser APIs
- **No React DOM**: Tests run without requiring React DOM for better performance

## Security

- Uses WebAuthn for passwordless authentication
- JWT tokens for session management
- Secure localStorage storage
- Invitation token validation
- Multi-device support per user
