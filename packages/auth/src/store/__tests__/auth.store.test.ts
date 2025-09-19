import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '../../types/auth';
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
    hasPassword: false,
    hasPasskeys: true,
  };

  beforeEach(() => {
    // Create mock services for the new dual authentication system
    const mockPasswordService = {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      refreshToken: vi.fn(),
      getToken: vi.fn(),
      isAuthenticated: vi.fn(),
      changePassword: vi.fn(),
    };

    const mockPasskeyService = {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      refreshToken: vi.fn(),
      getToken: vi.fn(),
      isAuthenticated: vi.fn(),
      getAvailableCredentials: vi.fn(),
    };

    // Create a mock AuthServices instance
    mockAuthService = {
      passwordService: mockPasswordService,
      passkeyService: mockPasskeyService,
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
    };

    // Create the store with the mocked services
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
      // expect(typeof state.hydrateFromToken).toBe('function');
      expect(typeof state.setAuthState).toBe('function');
      expect(typeof state.clearError).toBe('function');
    });
  });

  describe('setAuthState', () => {
    it('should set auth state correctly', () => {
      const state = store.getState();

      state.setAuthState(mockUser, true, false, null);
      const newState = store.getState();

      expect(newState.user).toEqual(mockUser);
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.isLoading).toBe(false);
      expect(newState.error).toBeNull();
    });

    it('should set error state correctly', () => {
      const state = store.getState();

      state.setAuthState(null, false, false, 'Some error');
      const newState = store.getState();

      expect(newState.user).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.isLoading).toBe(false);
      expect(newState.error).toBe('Some error');
    });

    it('should set loading state correctly', () => {
      const state = store.getState();

      state.setAuthState(null, false, true, null);
      const newState = store.getState();

      expect(newState.user).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
      expect(newState.isLoading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  // describe('hydrateFromToken', () => {
  //   it('should not hydrate if user already exists', async () => {
  //     // Set initial authenticated state
  //     store.setState({ user: mockUser, isAuthenticated: true });

  //     await store.getState().hydrateFromToken();

  //     expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
  //   });

  //   it('should not hydrate if already loading', async () => {
  //     // Set loading state
  //     store.setState({ isLoading: true });

  //     await store.getState().hydrateFromToken();

  //     expect(mockAuthService.getCurrentUser).not.toHaveBeenCalled();
  //   });

  //   it('should clear state if no token exists', async () => {
  //     mockAuthService.passwordService.getToken.mockReturnValue(null);
  //     mockAuthService.passkeyService.getToken.mockReturnValue(null);

  //     await store.getState().hydrateFromToken();

  //     const state = store.getState();
  //     expect(state.user).toBeNull();
  //     expect(state.isAuthenticated).toBe(false);
  //     expect(state.isLoading).toBe(false);
  //     expect(state.error).toBeNull();
  //   });

  //   it('should hydrate user if token exists and is valid', async () => {
  //     mockAuthService.passwordService.getToken.mockReturnValue('valid-token');
  //     mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

  //     await store.getState().hydrateFromToken();

  //     const state = store.getState();
  //     expect(state.user).toEqual(mockUser);
  //     expect(state.isAuthenticated).toBe(true);
  //     expect(state.isLoading).toBe(false);
  //     expect(state.error).toBeNull();
  //   });

  //   it('should clear state if token is invalid', async () => {
  //     mockAuthService.passwordService.getToken.mockReturnValue('invalid-token');
  //     mockAuthService.getCurrentUser.mockRejectedValue(new Error('Invalid token'));

  //     await store.getState().hydrateFromToken();

  //     const state = store.getState();
  //     expect(state.user).toBeNull();
  //     expect(state.isAuthenticated).toBe(false);
  //     expect(state.isLoading).toBe(false);
  //     expect(state.error).toBeNull();
  //   });
  // });

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
