import type {
  AuthResult,
  PasswordAuthService,
  PasswordCredentials,
  PasswordRegistrationData,
  AuthServiceConfig,
} from '../types';

import { BaseAuthServiceProvider } from './base-auth.provider';

export class PasswordAuthServiceProvider
  extends BaseAuthServiceProvider
  implements PasswordAuthService
{
  constructor(config: AuthServiceConfig) {
    super(config);
  }

  async login(credentials: PasswordCredentials): Promise<AuthResult> {
    const response = await this.makeRequest<AuthResult>('/password/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    return response;
  }

  async register(data: PasswordRegistrationData): Promise<AuthResult> {
    const response = await this.makeRequest<AuthResult>('/password/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        invitationToken: data.invitationToken,
      }),
    });

    return response;
  }

  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    await this.makeRequest('/password/change', {
      method: 'POST',
      body: JSON.stringify({
        oldPassword,
        newPassword,
      }),
    });
  }
}
