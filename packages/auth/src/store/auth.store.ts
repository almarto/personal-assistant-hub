import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthServices } from '../types/auth';
import type { AuthStore } from '../types/auth';

export const createAuthStore = (authServices: AuthServices) =>
  create<AuthStore>()(
    persist(
      set => ({
        // State
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Actions - these are legacy methods for backward compatibility
        login: async (email: string) => {
          set({ isLoading: true, error: null });
          try {
            // Default to passkey login for backward compatibility
            const result = await authServices.passkeyService.login({ email });
            set({
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Login failed';
            set({
              isLoading: false,
              error: errorMessage,
            });
            throw error;
          }
        },

        register: async (
          email: string,
          invitationToken: string,
          deviceName: string
        ) => {
          set({ isLoading: true, error: null });
          try {
            // Default to passkey registration for backward compatibility
            const result = await authServices.passkeyService.register({
              email,
              invitationToken,
              deviceName,
            });
            set({
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Registration failed';
            set({
              isLoading: false,
              error: errorMessage,
            });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true, error: null });
          try {
            await authServices.logout();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Logout failed';
            set({
              isLoading: false,
              error: errorMessage,
            });
            // Even if logout fails, clear the local state
            set({
              user: null,
              isAuthenticated: false,
            });
          }
        },

        checkAuth: async () => {
          set({ isLoading: true, error: null });
          try {
            const user = await authServices.getCurrentUser();
            set({
              user,
              isAuthenticated: !!user,
              isLoading: false,
              error: null,
            });
          } catch {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null, // Don't show error for auth check failures
            });
          }
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state: AuthStore) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  );

// Export types for the store hooks
export type AuthStoreHook = ReturnType<typeof createAuthStore>;
