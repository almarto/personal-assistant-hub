import { useCallback, useEffect } from 'react';

import type { AuthStoreHook } from '../store/auth.store';
import type { User } from '../types/auth';

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string) => Promise<void>;
  register: (
    email: string,
    invitationToken: string,
    deviceName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const createUseAuth =
  (useAuthStore: AuthStoreHook) => (): UseAuthReturn => {
    const {
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      register,
      logout,
      checkAuth,
      clearError,
    } = useAuthStore();

    // Check authentication status on mount
    useEffect(() => {
      checkAuth();
    }, [checkAuth]);

    const handleLogin = useCallback(
      async (email: string) => {
        await login(email);
      },
      [login]
    );

    const handleRegister = useCallback(
      async (email: string, invitationToken: string, deviceName: string) => {
        await register(email, invitationToken, deviceName);
      },
      [register]
    );

    const handleLogout = useCallback(async () => {
      await logout();
    }, [logout]);

    const handleCheckAuth = useCallback(async () => {
      await checkAuth();
    }, [checkAuth]);

    return {
      user,
      isAuthenticated,
      isLoading,
      error,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      checkAuth: handleCheckAuth,
      clearError,
    };
  };

// Create specific hooks factory
export const createAuthHooks = (useAuthStore: AuthStoreHook) => {
  const useAuth = createUseAuth(useAuthStore);

  // Hook for checking if user is authenticated (without triggering auth check)
  const useIsAuthenticated = (): boolean => {
    return useAuthStore(state => state.isAuthenticated);
  };

  // Hook for getting current user (without triggering auth check)
  const useCurrentUser = (): User | null => {
    return useAuthStore(state => state.user);
  };

  // Hook for getting auth loading state
  const useAuthLoading = (): boolean => {
    return useAuthStore(state => state.isLoading);
  };

  // Hook for getting auth error
  const useAuthError = (): string | null => {
    return useAuthStore(state => state.error);
  };

  return {
    useAuth,
    useIsAuthenticated,
    useCurrentUser,
    useAuthLoading,
    useAuthError,
  };
};
