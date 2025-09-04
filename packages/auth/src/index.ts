import { createAuthHooks } from './hooks/useAuth';
import { AuthService, type AuthServiceConfig } from './services/auth.service';
import { createAuthStore } from './store/auth.store';

// Factory function to create the complete auth system
export const createAuth = (config: AuthServiceConfig) => {
  const authService = new AuthService(config);
  const useAuthStore = createAuthStore(authService);
  const hooks = createAuthHooks(useAuthStore);

  return {
    authService,
    useAuthStore,
    ...hooks,
  };
};

// Export individual components for advanced usage
export { AuthService } from './services/auth.service';
export { createAuthStore } from './store/auth.store';
export { createAuthHooks } from './hooks/useAuth';

// Type exports
export type {
  User,
  AuthResult,
  PasskeyCredentials,
  UserInfo,
  RegistrationData,
  AuthService as IAuthService,
  AuthState,
  AuthActions,
  AuthStore,
} from './types/auth';
export type { AuthServiceConfig } from './services/auth.service';
export type { AuthStoreHook } from './store/auth.store';
export type { UseAuthReturn } from './hooks/useAuth';
