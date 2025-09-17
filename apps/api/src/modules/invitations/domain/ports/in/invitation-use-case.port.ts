import { Invitation } from '../../model/invitation.model';

export const INVITATION_USE_CASE = 'INVITATION_USE_CASE';

/**
 * Puerto de entrada para los casos de uso de invitaciones
 */
export interface InvitationUseCase {
  /**
   * Creates a new invitation
   */
  create(
    email: string,
    createdById: string,
    expirationHours?: number,
    role?: 'admin' | 'user'
  ): Promise<{
    invitationLink: string;
    token: string;
    expiresAt: Date;
  }>;

  /**
   * Obtiene todas las invitaciones
   */
  findAll(): Promise<{
    invitations: Array<Invitation & { isExpired: boolean; isUsed: boolean }>;
    total: number;
  }>;

  /**
   * Gets an invitation by its ID
   */
  findOne(
    id: string
  ): Promise<Invitation & { isExpired: boolean; isUsed: boolean }>;

  /**
   * Validates an invitation token
   */
  validateToken(
    token: string,
    email: string
  ): Promise<{
    valid: boolean;
    reason?: string;
    invitation?: Invitation;
  }>;

  /**
   * Revokes an invitation
   */
  revoke(id: string): Promise<{ message: string }>;

  /**
   * Resends an invitation
   */
  resend(
    id: string,
    expirationHours?: number
  ): Promise<{
    invitationLink: string;
    token: string;
    expiresAt: Date;
  }>;
}
