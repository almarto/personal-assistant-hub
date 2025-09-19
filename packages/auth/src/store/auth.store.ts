import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { User } from '../types/auth';
import type { AuthStore } from '../types/auth';

export const createAuthStore = () =>
  create<AuthStore>()(
    persist(
      set => ({
        // State
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Internal method to hydrate store from token
        // hydrateFromToken: async (token: string | null) => {
        //   // Only hydrate if no user in store but there might be a token
        //   const currentState = get();
        //   if (currentState.user || currentState.isLoading) {
        //     return;
        //   }

        //   if (!token) {
        //     set({
        //       user: null,
        //       isAuthenticated: false,
        //       isLoading: false,
        //       error: null,
        //     });
        //     return;
        //   }

        //   // If there's a token, try to get the user
        //   set({ isLoading: true, error: null });
        //   try {
        //     const user = await authServices.getCurrentUser();
        //     if (user) {
        //       set({
        //         user,
        //         isAuthenticated: true,
        //         isLoading: false,
        //         error: null,
        //       });
        //     } else {
        //       set({
        //         user: null,
        //         isAuthenticated: false,
        //         isLoading: false,
        //         error: null,
        //       });
        //     }
        //   } catch {
        //     set({
        //       user: null,
        //       isAuthenticated: false,
        //       isLoading: false,
        //       error: null,
        //     });
        //   }
        // },

        // Internal method to set auth state
        setAuthState: (
          user: User | null,
          isAuthenticated: boolean,
          isLoading: boolean,
          error: string | null
        ) => {
          set({ user, isAuthenticated, isLoading, error });
        },

        // Internal method to clear error
        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'auth-storage',
        //storage: createJSONStorage(() => sessionStorage),
        partialize: (state: AuthStore) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        // onRehydrateStorage: () => (state) => {
        //   // After hydrating from localStorage, check the token
        //   if (state) {
        //     state.hydrateFromToken();
        //   }
        // },
      }
    )
  );

// Export types for the store hooks
export type AuthStoreType = ReturnType<typeof createAuthStore>;
