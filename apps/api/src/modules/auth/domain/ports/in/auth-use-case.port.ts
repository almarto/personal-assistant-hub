import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';

import { User } from '../../model/user.model';

export const AUTH_USE_CASE = 'AUTH_USE_CASE';

/**
 * Input port for authentication use cases
 */
export interface AuthUseCase {
  /**
   * Initiates user registration process
   */
  initiateRegistration(
    email: string,
    invitationToken: string
  ): Promise<{ options: any }>;

  /**
   * Completes user registration process
   */
  completeRegistration(
    email: string,
    invitationToken: string,
    credential: RegistrationResponseJSON,
    deviceName: string
  ): Promise<{ user: User; token: string }>;

  /**
   * Initiates user login process
   */
  initiateLogin(email: string): Promise<{ options: any }>;

  /**
   * Completes user login process
   */
  completeLogin(
    email: string,
    credential: AuthenticationResponseJSON
  ): Promise<{ user: User; token: string }>;

  /**
   * Logs out a user
   */
  logout(sessionId: string): Promise<void>;

  /**
   * Validates a user by their ID
   */
  validateUser(userId: string): Promise<User | null>;
}
