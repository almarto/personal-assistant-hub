import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import type {
  AuthResult,
  User,
  RegistrationData,
  PasskeyCredentials,
} from '../../types/auth';
import { AuthService } from '../auth.service';

// Mock the @simplewebauthn/browser module
vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

const mockStartRegistration = vi.mocked(startRegistration);
const mockStartAuthentication = vi.mocked(startAuthentication);

describe('AuthService', () => {
  let authService: AuthService;
  const mockApiBaseUrl = 'http://localhost:3001';

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset all mocks
    vi.clearAllMocks();

    // Reset fetch mock
    vi.mocked(fetch).mockClear();

    // Reset localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockImplementation(() => {});
    vi.mocked(localStorage.removeItem).mockImplementation(() => {});

    // Create fresh AuthService instance after mocks are set up
    authService = new AuthService({ apiBaseUrl: mockApiBaseUrl });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should load token from localStorage on initialization', () => {
      const mockToken = 'mock-jwt-token';
      vi.mocked(localStorage.getItem).mockReturnValue(mockToken);

      const service = new AuthService({ apiBaseUrl: mockApiBaseUrl });
      expect(localStorage.getItem).toHaveBeenCalledWith('auth_token');
      expect(service.getToken()).toBe(mockToken);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token is present', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true when token is present', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('mock-token');
      const service = new AuthService({ apiBaseUrl: mockApiBaseUrl });
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('getToken', () => {
    it('should return null when no token is stored', () => {
      expect(authService.getToken()).toBeNull();
    });

    it('should return stored token', () => {
      const mockToken = 'stored-token';
      vi.mocked(localStorage.getItem).mockReturnValue(mockToken);
      const service = new AuthService({ apiBaseUrl: mockApiBaseUrl });
      expect(service.getToken()).toBe(mockToken);
    });
  });

  describe('initiateRegistration', () => {
    it('should initiate registration process successfully', async () => {
      const mockOptions = {
        challenge: 'mock-challenge',
        rp: { name: 'Test App', id: 'localhost' },
        user: {
          id: 'user-id',
          name: 'test@example.com',
          displayName: 'Test User',
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' as const }],
        timeout: 60000,
        attestation: 'none' as const,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: mockOptions }),
      } as Response);

      const result = await authService.initiateRegistration(
        'test@example.com',
        'invitation-token'
      );

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/auth/register/initiate`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            invitationToken: 'invitation-token',
          }),
        })
      );

      expect(result).toEqual(mockOptions);
    });

    it('should handle registration initiation errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Registration failed' }),
      } as Response);

      await expect(
        authService.initiateRegistration('test@example.com', 'token')
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('register', () => {
    it('should complete registration successfully', async () => {
      const mockOptions = {
        challenge: 'challenge',
        user: {
          id: 'user-id',
          name: 'test@example.com',
          displayName: 'Test User',
        },
      };

      const mockCredential = { id: 'cred-id', response: {} };
      const mockAuthResult: AuthResult = {
        token: 'jwt-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: 'user' as const,
          createdAt: new Date(),
          lastLoginAt: null,
        },
      };

      // Mock initiateRegistration call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: mockOptions }),
      } as Response);

      // Mock startRegistration
      mockStartRegistration.mockResolvedValueOnce(
        mockCredential as unknown as RegistrationResponseJSON
      );

      // Mock register completion
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResult),
      } as Response);

      const registrationData: RegistrationData = {
        email: 'test@example.com',
        invitationToken: 'invitation-token',
        credential: mockCredential as unknown as RegistrationResponseJSON,
        deviceName: 'Test Device',
      };

      const result = await authService.register(registrationData);

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/auth/register/complete`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(registrationData),
        })
      );

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'auth_token',
        'jwt-token'
      );
      expect(result).toEqual(mockAuthResult);
    });
  });

  describe('initiateLogin', () => {
    it('should initiate login process successfully', async () => {
      const mockOptions = {
        challenge: 'auth-challenge',
        allowCredentials: [{ id: 'cred-id', type: 'public-key' as const }],
        timeout: 60000,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: mockOptions }),
      } as Response);

      const result = await authService.initiateLogin('test@example.com');

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/auth/login/initiate`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );

      expect(result).toEqual(mockOptions);
    });
  });

  describe('login', () => {
    it('should authenticate user with passkey', async () => {
      const mockOptions = {
        challenge: 'challenge',
        allowCredentials: [],
      };

      const mockCredential = {
        id: 'credential-id',
        response: {
          clientDataJSON: 'client-data',
          authenticatorData: 'auth-data',
          signature: 'signature',
        },
      };

      const mockAuthResult: AuthResult = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date(),
        },
        token: 'jwt-token',
      };

      // Mock initiateLogin call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: mockOptions }),
      } as Response);

      // Mock startAuthentication
      mockStartAuthentication.mockResolvedValueOnce(
        mockCredential as AuthenticationResponseJSON
      );

      // Mock login completion
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResult),
      } as Response);

      const credentials: PasskeyCredentials = {
        email: 'test@example.com',
        credential: mockCredential as AuthenticationResponseJSON,
      };

      const result = await authService.login(credentials);

      expect(result).toEqual(mockAuthResult);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'auth_token',
        'jwt-token'
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when not authenticated', async () => {
      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
    });

    it('should fetch current user when authenticated', async () => {
      const mockUser: User = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user' as const,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      // Set up authenticated state
      vi.mocked(localStorage.getItem).mockReturnValue('valid-token');
      const authenticatedService = new AuthService({
        apiBaseUrl: mockApiBaseUrl,
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      } as Response);

      const result = await authenticatedService.getCurrentUser();

      expect(fetch).toHaveBeenCalledWith(
        `${mockApiBaseUrl}/auth/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );

      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should clear token from localStorage', () => {
      authService.logout();
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('makeRequest', () => {
    it('should handle network errors in getCurrentUser by returning null', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      // Set a token first so getCurrentUser will attempt the request
      localStorage.setItem('auth_token', 'test-token');
      authService = new AuthService({ apiBaseUrl: 'https://api.example.com' });

      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
      // Token should be cleared after error
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should handle HTTP errors by throwing', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      } as Response);

      await expect(
        authService.initiateLogin('test@example.com')
      ).rejects.toThrow('Bad request');
    });

    it('should include authorization header when token is present', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('auth-token');
      const authenticatedService = new AuthService({
        apiBaseUrl: mockApiBaseUrl,
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await authenticatedService.getCurrentUser();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token',
          }),
        })
      );
    });
  });
});
