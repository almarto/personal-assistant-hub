import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { InvitationUseCase } from '../domain/ports/in/invitation-use-case.port';
import {
  CONFIG_SERVICE,
  ConfigService,
} from '../domain/ports/out/config-service.port';
import {
  INVITATION_REPOSITORY,
  InvitationRepository,
} from '../domain/ports/out/invitation-repository.port';

@Injectable()
export class InvitationService implements InvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
    @Inject(CONFIG_SERVICE)
    private readonly configService: ConfigService
  ) {}

  async create(
    email: string,
    createdById: string,
    expirationHours: number = 24,
    role: 'admin' | 'user' = 'user'
  ) {
    // Check if user already exists
    const userExists =
      await this.invitationRepository.existsUserWithEmail(email);
    if (userExists) {
      throw new Error('User with this email already exists');
    }

    // Check if a pending invitation already exists for this email
    const pendingInvitationExists =
      await this.invitationRepository.existsPendingInvitationForEmail(email);
    if (pendingInvitationExists) {
      throw new Error('There is already a pending invitation for this email');
    }

    // Generate unique token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Create invitation
    const invitation = await this.invitationRepository.create(
      token,
      email,
      createdById,
      expiresAt,
      role
    );

    // Generate invitation link
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const invitationLink = `${frontendUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;

    return {
      invitationLink,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    };
  }

  async findAll() {
    const invitations = await this.invitationRepository.findAll();

    return {
      invitations: invitations.map(invitation =>
        Object.assign(invitation, {
          isExpired: invitation.isExpired(),
          isUsed: invitation.isUsed(),
        })
      ),
      total: invitations.length,
    };
  }

  async findOne(id: string) {
    const invitation = await this.invitationRepository.findById(id);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    return Object.assign(invitation, {
      isExpired: invitation.isExpired(),
      isUsed: invitation.isUsed(),
    });
  }

  async validateToken(token: string, email: string) {
    const invitation = await this.invitationRepository.findByTokenAndEmail(
      token,
      email
    );

    if (!invitation) {
      return { valid: false, reason: 'Invalid invitation token' };
    }

    if (invitation.isUsed()) {
      return { valid: false, reason: 'Invitation token already used' };
    }

    if (invitation.isExpired()) {
      return { valid: false, reason: 'Invitation token expired' };
    }

    return { valid: true, invitation };
  }

  async revoke(id: string) {
    const invitation = await this.invitationRepository.findById(id);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.isUsed()) {
      throw new Error('Cannot revoke an already used invitation');
    }

    // Revoke invitation (set expiration to now)
    const revokedInvitation = invitation.revoke();
    await this.invitationRepository.update(revokedInvitation);

    return { message: 'Invitation revoked successfully' };
  }

  async resend(id: string, expirationHours: number = 24) {
    const invitation = await this.invitationRepository.findById(id);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.isUsed()) {
      throw new Error('Cannot resend an already used invitation');
    }

    // Extend expiration time
    const extendedInvitation = invitation.extendExpiration(expirationHours);
    await this.invitationRepository.update(extendedInvitation);

    // Generate invitation link
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const invitationLink = `${frontendUrl}/register?token=${invitation.token}&email=${encodeURIComponent(invitation.email)}`;

    return {
      invitationLink,
      token: invitation.token,
      expiresAt: extendedInvitation.expiresAt,
    };
  }
}
