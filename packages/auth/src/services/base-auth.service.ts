import type { AuthResult, BaseAuthService, PasskeyCredentials, PasskeyRegistrationData, PasswordCredentials, PasswordRegistrationData, User } from '../types/auth';

export interface BaseAuthServiceConfig {
  apiBaseUrl: string;
}

export abstract class BaseAuthServiceImpl implements BaseAuthService {
  protected token: string | null = null;
  protected apiBaseUrl: string;

  constructor(config: BaseAuthServiceConfig) {
    this.apiBaseUrl = config.apiBaseUrl;
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
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

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

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

  protected setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  protected clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint if we have a token
      if (this.token) {
        await this.makeRequest('/logout', {
          method: 'POST',
        });
      }
    } catch (error) {
      // Even if the logout call fails, we should clear the local token
      console.warn('Logout request failed:', error);
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await this.makeRequest<{ user: User }>('/me');
      return response.user;
    } catch {
      // If the token is invalid, clear it
      this.clearToken();
      return null;
    }
  }

  async refreshToken(): Promise<string> {
    if (!this.token) {
      throw new Error('No token to refresh');
    }

    try {
      const response = await this.makeRequest<{ token: string }>('/refresh');
      this.setToken(response.token);
      return response.token;
    } catch (error) {
      this.clearToken();
      throw error;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Abstract methods that must be implemented by subclasses
  abstract login(credentials: PasswordCredentials | PasskeyCredentials): Promise<AuthResult>;
  abstract register(data: PasswordRegistrationData | PasskeyRegistrationData): Promise<AuthResult>;
}