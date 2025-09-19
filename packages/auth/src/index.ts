import { createAuthHooks } from './hooks/useAuth';
import { AuthService } from './services/auth-service';
import { AuthServiceConfig } from './services/base-auth.service';
import { createAuthStore } from './store/auth.store';
import type {
  PasskeyCredentials,
  PasskeyRegistrationData,
  PasswordCredentials,
  PasswordRegistrationData,
  User,
} from './types/auth';

export const createAuth = (config: AuthServiceConfig) => {
  let useAuthStore: ReturnType<typeof createAuthStore> = createAuthStore();

  const onAuthStateChange = (user: User | null, token: string | null) => {
    if (user && token) {
      useAuthStore.setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const authServices = new AuthService({
    ...config,
    onAuthStateChange,
  });

  const hooks = createAuthHooks(useAuthStore);

  const loginPassword = async (credentials: PasswordCredentials) => {
    return authServices.passwordService.login(credentials);
  };

  const loginPasskey = async (credentials: PasskeyCredentials) => {
    return authServices.passkeyService.login(credentials);
  };
  const registerPassword = async (data: PasswordRegistrationData) => {
    return authServices.passwordService.register(data);
  };
  const registerPasskey = async (data: PasskeyRegistrationData) => {
    return authServices.passkeyService.register(data);
  };

  return {
    loginPassword,
    loginPasskey,
    registerPassword,
    registerPasskey,
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
  AuthState,
  AuthActions,
  AuthStore,
} from './types/auth';
export type { AuthStoreType as AuthStoreHook } from './store/auth.store';
