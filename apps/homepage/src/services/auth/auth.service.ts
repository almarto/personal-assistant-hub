import {
  PasskeyAuthServiceProvider,
  PasswordAuthServiceProvider,
} from './providers';
import {
  AuthServiceI,
  User,
  type AuthResult,
  type AuthServiceConfig,
  type PasskeyLoginCredentials,
  type PasskeyRegistrationData,
  type PasswordCredentials,
  type PasswordRegistrationData,
} from './types';

export class AuthService implements AuthServiceI {
  public readonly passwordService: PasswordAuthServiceProvider;
  public readonly passkeyService: PasskeyAuthServiceProvider;

  constructor(config: AuthServiceConfig) {
    this.passwordService = new PasswordAuthServiceProvider(config);
    this.passkeyService = new PasskeyAuthServiceProvider(config);
  }

  loginPasskey(credentials: PasskeyLoginCredentials): Promise<AuthResult> {
    return this.passkeyService.login(credentials);
  }

  registerPasskey(data: PasskeyRegistrationData): Promise<AuthResult> {
    return this.passkeyService.register(data);
  }

  loginPassword(credentials: PasswordCredentials): Promise<AuthResult> {
    return this.passwordService.login(credentials);
  }

  registerPassword(data: PasswordRegistrationData): Promise<AuthResult> {
    return this.passwordService.register(data);
  }

  getCurrentUser(): Promise<User | null> {
    return this.passwordService.getCurrentUser();
  }

  async logout(): Promise<void> {
    await this.passwordService.logout();
  }
}
