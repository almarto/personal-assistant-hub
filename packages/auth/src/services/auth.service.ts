import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';

import type {
  AuthResult,
  AuthService as IAuthService,
  RegistrationData,
  User,
} from '../types/auth';

interface AuthServiceConfig {
  apiBaseUrl: string;
}

class AuthService implements IAuthService {
  private token: string | null = null;
  private apiBaseUrl: string;

  constructor(config: AuthServiceConfig) {
    this.apiBaseUrl = config.apiBaseUrl;
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async makeRequest<T>(
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

  private setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async initiateRegistration(
    email: string,
    invitationToken: string
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const response = await this.makeRequest<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>('/register/initiate', {
      method: 'POST',
      body: JSON.stringify({ email, invitationToken }),
    });

    return response.options;
  }

  private async initiateLogin(
    email: string
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const response = await this.makeRequest<{
      options: PublicKeyCredentialRequestOptionsJSON;
    }>('/login/initiate', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return response.options;
  }

  async register(data: RegistrationData): Promise<AuthResult> {
    // First, initiate registration to get options
    const options = await this.initiateRegistration(
      data.email,
      data.invitationToken
    );
    console.log('🚀 TCL ~ AuthService ~ register ~ options:', options);

    // Start WebAuthn registration
    const credential: RegistrationResponseJSON = await startRegistration({
      optionsJSON: options,
    });
    console.log('🚀 TCL ~ AuthService ~ register ~ credential:', credential);

    // Complete registration with the backend
    const response = await this.makeRequest<AuthResult>('/register/complete', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        invitationToken: data.invitationToken,
        credential,
        deviceName: data.deviceName,
      }),
    });
    console.log('🚀 TCL ~ AuthService ~ register ~ response:', response);

    // Store the token
    this.setToken(response.token);

    return response;
  }

  async login(email: string): Promise<AuthResult> {
    // First, initiate login to get options
    const options = await this.initiateLogin(email);

    // Start WebAuthn authentication
    const credential = await startAuthentication({ optionsJSON: options });

    // Complete login with the backend
    const response = await this.makeRequest<AuthResult>('/login/complete', {
      method: 'POST',
      body: JSON.stringify({
        email,
        credential,
      }),
    });

    // Store the token
    this.setToken(response.token);

    return response;
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
}

// Export class for instantiation
export { AuthService };
export type { AuthServiceConfig };
