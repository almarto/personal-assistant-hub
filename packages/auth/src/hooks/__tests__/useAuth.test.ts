import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthStore } from '../../store/auth.store';
import type { User, AuthResult } from '../../types/auth';
import { createAuthHooks } from '../useAuth';

// Mock the AuthService
vi.mock('../../services/auth.service');

describe('useAuth hooks', () => {
  let mockAuthService: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let useAuthStore: ReturnType<typeof createAuthStore>;
  let authHooks: ReturnType<typeof createAuthHooks>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
    lastLoginAt: new Date(),
    hasPassword: false,
    hasPasskeys: true,
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

    // Create the store and hooks with the mocked service
    useAuthStore = createAuthStore(mockAuthService);
    authHooks = createAuthHooks(useAuthStore);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useAuth', () => {
    it('should return auth state and actions', () => {
      const store = useAuthStore.getState();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(typeof store.login).toBe('function');
      expect(typeof store.register).toBe('function');
      expect(typeof store.logout).toBe('function');
      expect(typeof store.checkAuth).toBe('function');
      expect(typeof store.clearError).toBe('function');
    });

    it('should handle login action', async () => {
      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'mock-token',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResult);

      await useAuthStore.getState().login('test@example.com');
      const state = useAuthStore.getState();

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle register action', async () => {
      const mockAuthResult: AuthResult = {
        user: mockUser,
        token: 'mock-token',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResult);

      await useAuthStore
        .getState()
        .register('test@example.com', 'token123', 'Test Device');
      const state = useAuthStore.getState();

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

    it('should handle logout action', async () => {
      // Set initial authenticated state
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      mockAuthService.logout.mockResolvedValue(undefined);

      await useAuthStore.getState().logout();
      const state = useAuthStore.getState();

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('authHooks', () => {
    it('should provide useIsAuthenticated hook', () => {
      const { useIsAuthenticated } = authHooks;
      expect(typeof useIsAuthenticated).toBe('function');
    });

    it('should provide useCurrentUser hook', () => {
      const { useCurrentUser } = authHooks;
      expect(typeof useCurrentUser).toBe('function');
    });

    it('should provide useAuthError hook', () => {
      const { useAuthError } = authHooks;
      expect(typeof useAuthError).toBe('function');
    });

    it('should provide useAuthLoading hook', () => {
      const { useAuthLoading } = authHooks;
      expect(typeof useAuthLoading).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should handle login errors', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Login failed'));

      try {
        await useAuthStore.getState().login('test@example.com');
      } catch {
        // Expected to throw
      }

      const state = useAuthStore.getState();

      expect(state.error).toBe('Login failed');
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear errors', () => {
      // Set initial error state
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();
      const state = useAuthStore.getState();

      expect(state.error).toBeNull();
    });
  });
});
