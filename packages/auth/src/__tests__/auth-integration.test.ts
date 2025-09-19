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
  const apiBaseUrl = 'https://api.example.com';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Auth instance will be created in each test
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Registration Flow', () => {
    it('should complete passkey registration and return correct result', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: null,
        hasPassword: false,
        hasPasskeys: true,
      };

      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      const auth = createAuth({ apiBaseUrl });

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
          json: () => Promise.resolve({ options: mockRegistrationOptions }),
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
      const result = await auth.registerPasskey({
        email: 'test@example.com',
        invitationToken: 'invitation-token',
        deviceName: 'Test Device',
      });

      expect(result).toEqual(mockAuthResult);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should complete password registration and return correct result', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: null,
        hasPassword: true,
        hasPasskeys: false,
      };

      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      const auth = createAuth({ apiBaseUrl });

      // Mock password registration response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResult),
      });

      // Test password registration flow
      const result = await auth.registerPassword({
        email: 'test@example.com',
        password: 'securePassword123!',
        invitationToken: 'invitation-token',
      });

      expect(result).toEqual(mockAuthResult);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/register/password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'securePassword123!',
            invitationToken: 'invitation-token',
          }),
        })
      );
    });
  });

  describe('Login Flow', () => {
    it('should complete passkey login and return correct result', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
        hasPassword: false,
        hasPasskeys: true,
      };

      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      const auth = createAuth({ apiBaseUrl });

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
          json: () => Promise.resolve({ options: mockLoginOptions }),
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

      // Test passkey login flow
      const result = await auth.loginPasskey({
        email: 'test@example.com',
      });

      expect(result).toEqual(mockAuthResult);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should complete password login and return correct result', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
        hasPassword: true,
        hasPasskeys: false,
      };

      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      const auth = createAuth({ apiBaseUrl });

      // Mock password login response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResult),
      });

      // Test password login flow
      const result = await auth.loginPassword({
        email: 'test@example.com',
        password: 'securePassword123!',
      });

      expect(result).toEqual(mockAuthResult);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/login/password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'securePassword123!',
          }),
        })
      );
    });
  });

  describe('API Integration', () => {
    it('should provide all authentication methods', () => {
      const auth = createAuth({ apiBaseUrl });

      expect(typeof auth.loginPassword).toBe('function');
      expect(typeof auth.loginPasskey).toBe('function');
      expect(typeof auth.registerPassword).toBe('function');
      expect(typeof auth.registerPasskey).toBe('function');
    });

    it('should provide all required hooks', () => {
      const auth = createAuth({ apiBaseUrl });

      expect(typeof auth.useIsAuthenticated).toBe('function');
      expect(typeof auth.useCurrentUser).toBe('function');
      expect(typeof auth.useAuthLoading).toBe('function');
      expect(typeof auth.useAuthError).toBe('function');
    });
  });
});
