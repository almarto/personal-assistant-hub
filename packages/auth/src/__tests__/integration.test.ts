import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { createAuth } from '../index';
import type { User, AuthResult } from '../types/auth';

// Mock @simplewebauthn/browser
vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('Auth Integration Tests', () => {
  let auth: ReturnType<typeof createAuth>;
  const apiBaseUrl = 'https://api.example.com';

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset all mocks
    vi.clearAllMocks();

    // Create auth instance
    auth = createAuth({ apiBaseUrl });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Registration Flow', () => {
    it('should complete full registration flow successfully', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: null,
      };

      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      // Mock registration initiation response
      const mockRegistrationOptions = {
        challenge: 'mock-challenge',
        rp: { name: 'Test App', id: 'localhost' },
        user: {
          id: 'user-123',
          name: 'test@example.com',
          displayName: 'Test User',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        timeout: 60000,
        attestation: 'none',
      };

      // Mock registration completion response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRegistrationOptions),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResult),
        });

      // Mock WebAuthn registration
      const { startRegistration } = await import('@simplewebauthn/browser');
      const mockCredential = {
        id: 'credential-id',
        rawId: 'credential-id',
        response: {
          clientDataJSON: 'mock-client-data',
          attestationObject: 'mock-attestation',
        },
        type: 'public-key',
      };
      vi.mocked(startRegistration).mockResolvedValue(
        mockCredential as RegistrationResponseJSON
      );

      // Test registration flow
      const store = auth.useAuthStore.getState();
      await store.register(
        'test@example.com',
        'invitation-token',
        'Test Device'
      );

      const finalState = auth.useAuthStore.getState();

      expect(finalState.user).toEqual(mockUser);
      expect(finalState.isAuthenticated).toBe(true);
      expect(finalState.error).toBeNull();
      expect(finalState.isLoading).toBe(false);
    });

    it('should handle registration errors', async () => {
      // Mock failed registration initiation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid invitation token' }),
      });

      const store = auth.useAuthStore.getState();

      try {
        await store.register(
          'test@example.com',
          'invalid-token',
          'Test Device'
        );
      } catch {
        // Expected to throw
      }

      const finalState = auth.useAuthStore.getState();

      expect(finalState.user).toBeNull();
      expect(finalState.isAuthenticated).toBe(false);
      expect(finalState.error).toBe('Invalid invitation token');
      expect(finalState.isLoading).toBe(false);
    });
  });

  describe('Complete Login Flow', () => {
    it('should complete full login flow successfully', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
      };

      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      // Mock login initiation response
      const mockLoginOptions = {
        challenge: 'mock-challenge',
        timeout: 60000,
        rpId: 'localhost',
        allowCredentials: [
          {
            id: 'credential-id',
            type: 'public-key',
          },
        ],
      };

      // Mock login completion response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLoginOptions),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResult),
        });

      // Mock WebAuthn authentication
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const mockCredential = {
        id: 'credential-id',
        rawId: 'credential-id',
        response: {
          clientDataJSON: 'mock-client-data',
          authenticatorData: 'mock-auth-data',
          signature: 'mock-signature',
        },
        type: 'public-key',
      };
      vi.mocked(startAuthentication).mockResolvedValue(
        mockCredential as AuthenticationResponseJSON
      );

      // Test login flow
      const store = auth.useAuthStore.getState();
      await store.login('test@example.com');

      const finalState = auth.useAuthStore.getState();

      expect(finalState.user).toEqual(mockUser);
      expect(finalState.isAuthenticated).toBe(true);
      expect(finalState.error).toBeNull();
      expect(finalState.isLoading).toBe(false);
    });

    it('should handle login errors', async () => {
      // Mock failed login initiation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'User not found' }),
      });

      const store = auth.useAuthStore.getState();

      try {
        await store.login('nonexistent@example.com');
      } catch {
        // Expected to throw
      }

      const finalState = auth.useAuthStore.getState();

      expect(finalState.user).toBeNull();
      expect(finalState.isAuthenticated).toBe(false);
      expect(finalState.error).toBe('User not found');
      expect(finalState.isLoading).toBe(false);
    });
  });

  describe('Authentication State Management', () => {
    it('should manage authentication state correctly', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
      };

      // Set authenticated state
      auth.useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      // Check if state is set correctly
      const state = auth.useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle logout correctly', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
      };

      // Set initial authenticated state
      auth.useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      // Mock logout response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      // Test logout
      const store = auth.useAuthStore.getState();
      await store.logout();

      const finalState = auth.useAuthStore.getState();

      expect(finalState.user).toBeNull();
      expect(finalState.isAuthenticated).toBe(false);
      expect(finalState.error).toBeNull();
      expect(finalState.isLoading).toBe(false);
    });

    it('should check authentication status when no token exists', async () => {
      // Ensure no token exists
      localStorage.removeItem('auth_token');

      // Test checkAuth
      const store = auth.useAuthStore.getState();
      await store.checkAuth();

      const finalState = auth.useAuthStore.getState();

      expect(finalState.user).toBeNull();
      expect(finalState.isAuthenticated).toBe(false);
      expect(finalState.error).toBeNull();
      expect(finalState.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when requested', () => {
      // Set initial error state
      auth.useAuthStore.setState({ error: 'Some error occurred' });

      // Clear error
      const store = auth.useAuthStore.getState();
      store.clearError();

      const finalState = auth.useAuthStore.getState();
      expect(finalState.error).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const store = auth.useAuthStore.getState();

      try {
        await store.login('test@example.com');
      } catch {
        // Expected to throw
      }

      const finalState = auth.useAuthStore.getState();

      expect(finalState.error).toBe('Network error');
      expect(finalState.isLoading).toBe(false);
    });
  });

  describe('Service Integration', () => {
    it('should integrate AuthService with store correctly', () => {
      expect(auth.authService).toBeDefined();
      expect(auth.useAuthStore).toBeDefined();
      expect(auth.useAuth).toBeDefined();
    });

    it('should provide all required hooks', () => {
      expect(typeof auth.useIsAuthenticated).toBe('function');
      expect(typeof auth.useCurrentUser).toBe('function');
      expect(typeof auth.useAuthLoading).toBe('function');
      expect(typeof auth.useAuthError).toBe('function');
    });
  });
});
