import {
  startRegistration,
  startAuthentication,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/browser';

import type {
  AuthResult,
  PasskeyAuthService,
  PasskeyLoginCredentials,
  PasskeyCredential,
  PasskeyRegistrationData,
  AuthServiceConfig,
} from '../types';

import { BaseAuthServiceProvider } from './base-auth.provider';

export class PasskeyAuthServiceProvider
  extends BaseAuthServiceProvider
  implements PasskeyAuthService
{
  constructor(config: AuthServiceConfig) {
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

    return response;
  }

  async login(credentials: PasskeyLoginCredentials): Promise<AuthResult> {
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

    return response;
  }

  //TODO: following methods are using non-implemented endpoints

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
