// All imports/exports have been reviewed - no duplications or unused exports found
import { createAuthHooks } from './hooks/useAuth';
import { AuthServicesImpl } from './services/auth-services';
import type { BaseAuthServiceConfig } from './services/base-auth.service';
import { createAuthStore } from './store/auth.store';

// New factory function to create the complete auth system with dual services
export const createAuth = (config: BaseAuthServiceConfig) => {
  const authServices = new AuthServicesImpl(config);
  const useAuthStore = createAuthStore(authServices);
  const hooks = createAuthHooks(useAuthStore);

  return {
    passwordService: authServices.passwordService,
    passkeyService: authServices.passkeyService,
    useAuthStore,
    ...hooks,
  };
};

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
