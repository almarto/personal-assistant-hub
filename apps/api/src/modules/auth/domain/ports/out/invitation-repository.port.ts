export const INVITATION_REPOSITORY = 'INVITATION_REPOSITORY';

export interface Invitation {
  id: string;
  email: string;
  token: string;
  role: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface InvitationRepository {
  findByTokenAndEmail(token: string, email: string): Promise<Invitation | null>;
  markAsUsed(token: string, email: string): Promise<void>;
}
