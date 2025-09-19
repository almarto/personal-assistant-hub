import {
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';

import { User } from '../../model/user.model';

export const AUTH_USE_CASE = 'AUTH_USE_CASE';

/**
 * Input port for authentication use cases
 */
export interface AuthUseCase {
  /**
   * Initiates user registration process with passkeys
   */
  initiateRegistration(
    email: string,
    invitationToken: string
  ): Promise<{ options: PublicKeyCredentialCreationOptionsJSON }>;

  /**
   * Completes user registration process with passkeys
   */
  completeRegistration(
    email: string,
    invitationToken: string,
    credential: RegistrationResponseJSON,
    deviceName: string
  ): Promise<{ user: User }>;

  /**
   * Registers user with password
   */
  registerWithPassword(
    email: string,
    password: string,
    invitationToken: string
  ): Promise<{ user: User }>;

  /**
   * Initiates user login process with passkeys
   */
  initiateLogin(
    email: string
  ): Promise<{ options: PublicKeyCredentialRequestOptionsJSON }>;

  /**
   * Completes user login process with passkeys
   */
  completeLogin(
    email: string,
    credential: AuthenticationResponseJSON
  ): Promise<{ user: User }>;

  /**
   * Logs in user with password
   */
  loginWithPassword(email: string, password: string): Promise<{ user: User }>;

  /**
   * Changes user password
   */
  changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void>;

  /**
   * Logs out a user
   */
  logout(sessionId: string): Promise<void>;

  /**
   * Validates a user by their ID
   */
  validateUser(userId: string): Promise<User | null>;
}
