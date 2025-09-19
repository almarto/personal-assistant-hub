import type { AuthStoreType } from '../store/auth.store';
import type { User } from '../types/auth';

// Create specific hooks factory
export const createAuthHooks = (useAuthStore: AuthStoreType) => {
  // const {
  //   hydrateFromToken,
  // } = useAuthStore();
  // const token = authServices.getToken()

  // // Hydrate from token on mount
  // useEffect(() => {
  //   async hydratateFromToken() => {
  //     const token = authServices.getToken()
  //     if(token){
  //       const user = await authServices.getCurrentUser();
  //     }
  //   }
  //   hydrateFromToken();
  // }, []);

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
    useIsAuthenticated,
    useCurrentUser,
    useAuthLoading,
    useAuthError,
  };
};
