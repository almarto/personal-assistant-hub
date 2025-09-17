import bcrypt from 'bcryptjs';

import type {
  AuthResult,
  PasswordAuthService,
  PasswordCredentials,
  PasswordRegistrationData,
} from '../types/auth';

import {
  BaseAuthServiceImpl,
  type BaseAuthServiceConfig,
} from './base-auth.service';

export class PasswordAuthServiceImpl
  extends BaseAuthServiceImpl
  implements PasswordAuthService
{
  constructor(config: BaseAuthServiceConfig) {
    super(config);
  }

  async login(credentials: PasswordCredentials): Promise<AuthResult> {
    const response = await this.makeRequest<AuthResult>('/login/password', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    // Store the token
    this.setToken(response.token);

    return response;
  }

  async register(data: PasswordRegistrationData): Promise<AuthResult> {
    // Hash password on client side for additional security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const response = await this.makeRequest<AuthResult>('/register/password', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: hashedPassword,
        invitationToken: data.invitationToken,
      }),
    });

    // Store the token
    this.setToken(response.token);

    return response;
  }

  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // Hash new password on client side
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.makeRequest('/password/change', {
      method: 'POST',
      body: JSON.stringify({
        oldPassword,
        newPassword: hashedNewPassword,
      }),
    });
  }

  // Utility method to validate password strength
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
