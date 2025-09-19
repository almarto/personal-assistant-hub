import type {
  AuthResult,
  AuthServiceConfig,
  BaseAuthService,
  PasskeyLoginCredentials,
  PasskeyRegistrationData,
  PasswordCredentials,
  PasswordRegistrationData,
  User,
} from '../types';

export abstract class BaseAuthServiceProvider implements BaseAuthService {
  protected apiBaseUrl: string;

  constructor(config: AuthServiceConfig) {
    this.apiBaseUrl = config.apiBaseUrl;
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiBaseUrl}/auth${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Network error',
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint if we have a token
      await this.makeRequest('/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Even if the logout call fails, we should clear the local token
      console.warn('Logout request failed:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      //TODO: /me endpoint is not implemented in auth.controller.ts
      const response = await this.makeRequest<{ user: User }>('/me');
      return response.user;
    } catch {
      // If the token is invalid, clear it
      return null;
    }
  }

  // Abstract methods that must be implemented by subclasses
  abstract login(
    credentials: PasswordCredentials | PasskeyLoginCredentials
  ): Promise<AuthResult>;
  abstract register(
    data: PasswordRegistrationData | PasskeyRegistrationData
  ): Promise<AuthResult>;
}
