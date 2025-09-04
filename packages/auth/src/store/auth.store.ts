import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthService } from '../services/auth.service';
import type { AuthStore } from '../types/auth';

export const createAuthStore = (authService: AuthService) =>
  create<AuthStore>()(
    persist(
      set => ({
        // State
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Actions
        login: async (email: string) => {
          set({ isLoading: true, error: null });
          try {
            const result = await authService.login({
              email,
              credential: null!,
            });
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
            const result = await authService.register({
              email,
              invitationToken,
              credential: null!, // This will be handled by the service
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
            await authService.logout();
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
            const user = await authService.getCurrentUser();
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

// Export type for the store hook
export type AuthStoreHook = ReturnType<typeof createAuthStore>;
