import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import type {
  AuthResult,
  PasskeyCredentials,
  PasskeyRegistrationData,
  PasswordCredentials,
  PasswordRegistrationData,
  User,
} from '../../types/auth';
import {
  BaseAuthServiceImpl,
  type AuthServiceConfig,
} from '../base-auth.service';

// Create a concrete implementation for testing
class TestAuthService extends BaseAuthServiceImpl {
  async login(
    credentials: PasswordCredentials | PasskeyCredentials
  ): Promise<AuthResult> {
    const response = await this.makeRequest<AuthResult>('/test/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(response.token);
    return response;
  }

  async register(
    data: PasswordRegistrationData | PasskeyRegistrationData
  ): Promise<AuthResult> {
    const response = await this.makeRequest<AuthResult>('/test/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response;
  }
}

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('BaseAuthServiceImpl', () => {
  let authService: TestAuthService;
  const mockConfig: AuthServiceConfig = {
    apiBaseUrl: 'http://localhost:3001',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    authService = new TestAuthService(mockConfig);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(authService).toBeInstanceOf(BaseAuthServiceImpl);
    });

    it('should load token from localStorage on initialization', () => {
      const mockToken = 'stored-token';
      localStorageMock.getItem.mockReturnValue(mockToken);

      const service = new TestAuthService(mockConfig);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
      expect(service.getToken()).toBe(mockToken);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token is present', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true when token is present', () => {
      localStorageMock.getItem.mockReturnValue('mock-token');
      const service = new TestAuthService(mockConfig);
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('getToken', () => {
    it('should return null when no token is stored', () => {
      expect(authService.getToken()).toBeNull();
    });

    it('should return stored token', () => {
      const mockToken = 'stored-token';
      localStorageMock.getItem.mockReturnValue(mockToken);
      const service = new TestAuthService(mockConfig);
      expect(service.getToken()).toBe(mockToken);
    });
  });

  describe('makeRequest', () => {
    it('should make request without authorization header when no token', async () => {
      const mockResponse = { success: true };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await authService.login({ email: 'test@example.com' });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/test/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });

    it('should include authorization header when token is present', async () => {
      const mockToken = 'auth-token';
      localStorageMock.getItem.mockReturnValue(mockToken);
      const service = new TestAuthService(mockConfig);

      const mockResponse = { user: { id: '1', email: 'test@example.com' } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await service.getCurrentUser();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token',
          }),
        })
      );
    });

    it('should throw error when response is not ok', async () => {
      const errorMessage = 'Unauthorized';
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: errorMessage }),
      } as Response);

      await expect(
        authService.login({ email: 'test@example.com' })
      ).rejects.toThrow(errorMessage);
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
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        hasPassword: false,
        hasPasskeys: true,
      };

      localStorageMock.getItem.mockReturnValue('valid-token');
      const service = new TestAuthService(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      } as Response);

      const result = await service.getCurrentUser();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );

      expect(result).toEqual(mockUser);
    });

    it('should clear token and return null when request fails', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      const service = new TestAuthService(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      } as Response);

      const result = await service.getCurrentUser();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('logout', () => {
    it('should clear token from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      const service = new TestAuthService(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await service.logout();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/logout',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should clear token even if logout request fails', async () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      const service = new TestAuthService(mockConfig);

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await service.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';

      localStorageMock.getItem.mockReturnValue(oldToken);
      const service = new TestAuthService(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: newToken }),
      } as Response);

      const result = await service.refreshToken();

      expect(result).toBe(newToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_token',
        newToken
      );
    });

    it('should throw error and clear token when refresh fails', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      const service = new TestAuthService(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid token' }),
      } as Response);

      await expect(service.refreshToken()).rejects.toThrow('Invalid token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should throw error when no token to refresh', async () => {
      await expect(authService.refreshToken()).rejects.toThrow(
        'No token to refresh'
      );
    });
  });
});
