import { useUserSession } from '@/hooks/auth';

import { AuthService } from './auth.service';
import type { AuthServiceConfig } from './types';

export const createAuth = (config: AuthServiceConfig) => {
  const authServices = new AuthService(config);

  return {
    useUserSession,
    loginPassword: authServices.loginPassword,
    loginPasskey: authServices.loginPasskey,
    registerPassword: authServices.registerPassword,
    registerPasskey: authServices.registerPasskey,
    getCurrentUser: authServices.getCurrentUser,
    logout: authServices.logout,
  };
};
