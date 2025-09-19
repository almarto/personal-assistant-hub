import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthStore } from '../../store/auth.store';
import type { User } from '../../types/auth';
import { createAuthHooks } from '../useAuth';

// Mock the AuthService
vi.mock('../../services/auth.service');

describe('useAuth hooks', () => {
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
    // Create the store and hooks with the mocked services
    useAuthStore = createAuthStore();
    authHooks = createAuthHooks(useAuthStore);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('AuthStore', () => {
    it('should have correct initial state', () => {
      const store = useAuthStore.getState();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      // expect(typeof store.hydrateFromToken).toBe('function');
      expect(typeof store.setAuthState).toBe('function');
      expect(typeof store.clearError).toBe('function');
    });

    it('should handle setAuthState correctly', () => {
      const store = useAuthStore.getState();

      store.setAuthState(mockUser, true, false, null);
      const state = useAuthStore.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear errors', () => {
      // Set initial error state
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();
      const state = useAuthStore.getState();

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

  // describe('hydrateFromToken', () => {
  //   it('should not hydrate if user already exists', async () => {
  //     // Set initial authenticated state
  //     useAuthStore.setState({ user: mockUser, isAuthenticated: true });

  //     await useAuthStore.getState().hydrateFromToken();

  //     expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
  //   });

  //   it('should not hydrate if already loading', async () => {
  //     // Set loading state
  //     useAuthStore.setState({ isLoading: true });

  //     await useAuthStore.getState().hydrateFromToken();

  //     expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
  //   });

  //   it('should clear state if no token exists', async () => {
  //     mockAuthService.passwordService.getToken.mockReturnValue(null);
  //     mockAuthService.passkeyService.getToken.mockReturnValue(null);

  //     await useAuthStore.getState().hydrateFromToken();

  //     const state = useAuthStore.getState();
  //     expect(state.user).toBeNull();
  //     expect(state.isAuthenticated).toBe(false);
  //     expect(state.isLoading).toBe(false);
  //     expect(state.error).toBeNull();
  //   });

  //   it('should hydrate user if token exists and is valid', async () => {
  //     mockAuthService.passwordService.getToken.mockReturnValue('valid-token');
  //     mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

  //     await useAuthStore.getState().hydrateFromToken();

  //     const state = useAuthStore.getState();
  //     expect(state.user).toEqual(mockUser);
  //     expect(state.isAuthenticated).toBe(true);
  //     expect(state.isLoading).toBe(false);
  //     expect(state.error).toBeNull();
  //   });

  //   it('should clear state if token is invalid', async () => {
  //     mockAuthService.passwordService.getToken.mockReturnValue('invalid-token');
  //     mockAuthService.getCurrentUser.mockRejectedValue(new Error('Invalid token'));

  //     await useAuthStore.getState().hydrateFromToken();

  //     const state = useAuthStore.getState();
  //     expect(state.user).toBeNull();
  //     expect(state.isAuthenticated).toBe(false);
  //     expect(state.isLoading).toBe(false);
  //     expect(state.error).toBeNull();
  //   });
  // });
});
