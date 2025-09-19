import { AuthServiceI, User } from '../types/auth';

import { type AuthServiceConfig } from './base-auth.service';
import { PasskeyAuthServiceImpl } from './passkey-auth.service';
import { PasswordAuthServiceImpl } from './password-auth.service';

export class AuthService implements AuthServiceI {
  public readonly passwordService: PasswordAuthServiceImpl;
  public readonly passkeyService: PasskeyAuthServiceImpl;

  constructor(config: AuthServiceConfig) {
    this.passwordService = new PasswordAuthServiceImpl(config);
    this.passkeyService = new PasskeyAuthServiceImpl(config);
  }

  getCurrentUser(): Promise<User | null> {
    return this.passwordService.getCurrentUser();
  }

  refreshToken(): Promise<string> {
    return this.passwordService.refreshToken();
  }

  getToken(): string | null {
    return this.passwordService.getToken();
  }

  isAuthenticated(): boolean {
    return this.passwordService.isAuthenticated();
  }

  async logout(): Promise<void> {
    await this.passwordService.logout();
  }
}
