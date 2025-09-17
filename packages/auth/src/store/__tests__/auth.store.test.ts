import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthResult, User } from '../../types/auth';
import { createAuthStore } from '../auth.store';

// Mock fetch globally
global.fetch = vi.fn() as unknown as typeof fetch;

describe('AuthStore', () => {
  let mockAuthService: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let store: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    // Create a mock AuthService instance
    mockAuthService = {
      isAuthenticated: vi.fn(),
      getToken: vi.fn(),
      getCurrentUser: vi.fn(),
      initiateRegistration: vi.fn(),
      register: vi.fn(),
      initiateLogin: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
    };

    // Create the store with the mocked service
    const useAuthStore = createAuthStore(mockAuthService);
    store = useAuthStore;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('checkAuth', () => {
    it('should set authenticated state when user is authenticated', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      await store.getState().checkAuth();
      const state = store.getState();

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should return null user when not authenticated', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);

      await store.getState().checkAuth();
      const state = store.getState();

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should handle auth check errors', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getCurrentUser.mockRejectedValue(
        new Error('Auth check failed')
      );

      await store.getState().checkAuth();
      const state = store.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull(); // checkAuth doesn't set error on failure
      expect(state.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'mock-token',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResult);

      await store
        .getState()
        .register('test@example.com', 'token123', 'Test Device');
      const state = store.getState();

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        invitationToken: 'token123',
        deviceName: 'Test Device',
      });
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle registration errors', async () => {
      mockAuthService.register.mockRejectedValue(
        new Error('Registration failed')
      );

      try {
        await store
          .getState()
          .register('test@example.com', 'token123', 'Test Device');
      } catch {
        // Expected to throw
      }

      const state = store.getState();

      expect(state.error).toBe('Registration failed');
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'mock-token',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResult);

      await store.getState().login('test@example.com');
      const state = store.getState();

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle login errors', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Login failed'));

      try {
        await store.getState().login('test@example.com');
      } catch {
        // Expected to throw
      }

      const state = store.getState();

      expect(state.error).toBe('Login failed');
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Set initial authenticated state
      store.setState({
        user: mockUser,
        isAuthenticated: true,
        error: null,
      });

      mockAuthService.logout.mockResolvedValue(undefined);

      await store.getState().logout();
      const state = store.getState();

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle logout errors', async () => {
      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      await store.getState().logout();
      const state = store.getState();

      expect(state.error).toBe('Logout failed');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      // Set error state
      store.setState({ error: 'Some error' });

      store.getState().clearError();
      const state = store.getState();

      expect(state.error).toBeNull();
    });
  });
});
