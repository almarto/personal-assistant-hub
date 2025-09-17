import type {
  AuthServices,
  PasswordAuthService,
  PasskeyAuthService,
  User,
} from '../types/auth';

import type { BaseAuthServiceConfig } from './base-auth.service';
import { PasskeyAuthServiceImpl } from './passkey-auth.service';
import { PasswordAuthServiceImpl } from './password-auth.service';

export class AuthServicesImpl implements AuthServices {
  public readonly passwordService: PasswordAuthService;
  public readonly passkeyService: PasskeyAuthService;

  constructor(config: BaseAuthServiceConfig) {
    this.passwordService = new PasswordAuthServiceImpl(config);
    this.passkeyService = new PasskeyAuthServiceImpl(config);
  }

  async getCurrentUser(): Promise<User | null> {
    // Try to get user from either service (they should return the same user)
    // Prefer passkey service as it's the primary authentication method
    try {
      return await this.passkeyService.getCurrentUser();
    } catch {
      // Fallback to password service
      try {
        return await this.passwordService.getCurrentUser();
      } catch {
        return null;
      }
    }
  }

  async logout(): Promise<void> {
    // Logout from both services
    await Promise.allSettled([
      this.passwordService.logout(),
      this.passkeyService.logout(),
    ]);
  }
}