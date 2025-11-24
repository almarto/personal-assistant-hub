import { Invitation } from '../../model/invitation.model';

export const INVITATION_REPOSITORY = 'INVITATION_REPOSITORY';

export interface InvitationRepository {
  create(
    token: string,
    email: string,
    createdById: string,
    expiresAt: Date,
    role: 'admin' | 'user'
  ): Promise<Invitation>;
  findAll(): Promise<Invitation[]>;
  findById(id: string): Promise<Invitation | null>;
  findByTokenAndEmail(token: string, email: string): Promise<Invitation | null>;
  update(invitation: Invitation): Promise<void>;
  existsUserWithEmail(email: string): Promise<boolean>;
  existsPendingInvitationForEmail(email: string): Promise<boolean>;
}
