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
  PasskeyAuthService,
  PasskeyCredentials,
  PasskeyCredential,
  PasskeyRegistrationData,
} from '../types/auth';

import {
  BaseAuthServiceImpl,
  type BaseAuthServiceConfig,
} from './base-auth.service';

// Legacy interface for backward compatibility
interface AuthServiceConfig {
  apiBaseUrl: string;
}

// New PasskeyAuthService implementation
export class PasskeyAuthServiceImpl
  extends BaseAuthServiceImpl
  implements PasskeyAuthService
{
  constructor(config: BaseAuthServiceConfig) {
    super(config);
  }

  private async initiateRegistration(
    email: string,
    invitationToken: string
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const response = await this.makeRequest<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>('/passkey/register/initiate', {
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
    }>('/passkey/login/initiate', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return response.options;
  }

  async register(data: PasskeyRegistrationData): Promise<AuthResult> {
    // First, initiate registration to get options
    const options = await this.initiateRegistration(
      data.email,
      data.invitationToken
    );

    // Start WebAuthn registration
    const credential: RegistrationResponseJSON = await startRegistration({
      optionsJSON: options,
    });

    // Complete registration with the backend
    const response = await this.makeRequest<AuthResult>(
      '/passkey/register/complete',
      {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          invitationToken: data.invitationToken,
          credential,
          deviceName: data.deviceName,
        }),
      }
    );

    // Store the token
    this.setToken(response.token);

    return response;
  }

  async login(credentials: PasskeyCredentials): Promise<AuthResult> {
    // First, initiate login to get options
    const options = await this.initiateLogin(credentials.email);

    // Start WebAuthn authentication
    const credential = await startAuthentication({ optionsJSON: options });

    // Complete login with the backend
    const response = await this.makeRequest<AuthResult>(
      '/passkey/login/complete',
      {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          credential,
        }),
      }
    );

    // Store the token
    this.setToken(response.token);

    return response;
  }

  async getAvailableCredentials(): Promise<PasskeyCredential[]> {
    const response = await this.makeRequest<{
      credentials: PasskeyCredential[];
    }>('/passkey/credentials');
    return response.credentials;
  }

  async getPasskeys(): Promise<PasskeyCredential[]> {
    const response = await this.makeRequest<{ passkeys: PasskeyCredential[] }>(
      '/passkey/list'
    );
    return response.passkeys;
  }

  async deletePasskey(passkeyId: string): Promise<void> {
    await this.makeRequest(`/passkey/${passkeyId}`, {
      method: 'DELETE',
    });
  }
}

// TODO: remove legacy implementation
// Legacy AuthService class for backward compatibility
export class AuthService extends PasskeyAuthServiceImpl {
  constructor(config: AuthServiceConfig) {
    super(config);
  }

  // Legacy method signature for backward compatibility - overload to support both
  async login(
    emailOrCredentials: string | PasskeyCredentials
  ): Promise<AuthResult> {
    if (typeof emailOrCredentials === 'string') {
      return super.login({ email: emailOrCredentials });
    }
    return super.login(emailOrCredentials);
  }
}

// Export classes for instantiation
export type { AuthServiceConfig };
