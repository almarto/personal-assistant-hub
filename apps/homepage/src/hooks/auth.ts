import { useState, useEffect, useCallback } from 'react';

import { auth } from '@/main';
import type { User } from '@/services/auth/types';

import type { UserSessionState } from './types';

export const useUserSession = (): UserSessionState => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  // Get current user
  const getCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get current user'
      );
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await getCurrentUser();
  }, [getCurrentUser]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize user session on mount
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    refreshUser,
    clearError,
  };
};
