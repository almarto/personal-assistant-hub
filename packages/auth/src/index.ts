//TODO: check imports/exports for duplications or unused ones
import { createAuthHooks } from './hooks/useAuth';
import { AuthServicesImpl } from './services/auth-services';
import type { BaseAuthServiceConfig } from './services/base-auth.service';
import {
  AuthService,
  type AuthServiceConfig,
} from './services/passkey-auth.service';
import { createAuthStore } from './store/auth.store';

// New factory function to create the complete auth system with dual services
export const createAuth = (config: BaseAuthServiceConfig) => {
  const authServices = new AuthServicesImpl(config);
  // Create a legacy-compatible service for the store (using passkey service as default)
  const legacyAuthService = new AuthService(config);
  const useAuthStore = createAuthStore(legacyAuthService);
  const hooks = createAuthHooks(useAuthStore);

  return {
    passwordService: authServices.passwordService,
    passkeyService: authServices.passkeyService,
    useAuthStore,
    ...hooks,
  };
};

// Legacy factory function for backward compatibility
export const createLegacyAuth = (config: AuthServiceConfig) => {
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
export {
  AuthService,
  PasskeyAuthServiceImpl,
} from './services/passkey-auth.service';
export { PasswordAuthServiceImpl } from './services/password-auth.service';
export { AuthServicesImpl } from './services/auth-services';
export { BaseAuthServiceImpl } from './services/base-auth.service';
export { createAuthStore } from './store/auth.store';
export { createAuthHooks } from './hooks/useAuth';

// Type exports
export type {
  User,
  AuthResult,
  PasskeyCredentials,
  PasswordCredentials,
  UserInfo,
  PasskeyRegistrationData as RegistrationData,
  PasswordRegistrationData,
  PasskeyCredential,
  BaseAuthService,
  PasswordAuthService,
  PasskeyAuthService,
  AuthServices,
  AuthService as IAuthService,
  AuthState,
  AuthActions,
  AuthStore,
} from './types/auth';
export type { AuthServiceConfig } from './services/passkey-auth.service';
export type { BaseAuthServiceConfig } from './services/base-auth.service';
export type { AuthStoreHook } from './store/auth.store';
export type { UseAuthReturn } from './hooks/useAuth';
