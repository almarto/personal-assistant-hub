import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  invitationTokens,
  users,
} from '@personal-assistant-hub/database/dist/schema/index.js';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { DATABASE_CONNECTION } from '../database/database.module';

import { CreateInvitationDto } from './dto/invitations.dto';

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: any,
    private readonly configService: ConfigService
  ) {}

  async create(createInvitationDto: CreateInvitationDto, createdById: string) {
    const { email, expirationHours = 24 } = createInvitationDto;

    // Check if user already exists
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Check if there's already a pending invitation for this email
    const [existingInvitation] = await this.db
      .select()
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.email, email),
          eq(invitationTokens.usedAt, null)
        )
      );

    if (existingInvitation && new Date() < existingInvitation.expiresAt) {
      throw new BadRequestException(
        'There is already a pending invitation for this email'
      );
    }

    // Generate unique token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const [invitation] = await this.db
      .insert(invitationTokens)
      .values({
        token,
        email,
        createdBy: createdById,
        expiresAt,
        createdAt: new Date(),
      })
      .returning();

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const invitationLink = `${frontendUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;

    return {
      invitationLink,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    };
  }

  async findAll() {
    const allInvitations = await this.db
      .select({
        id: invitationTokens.id,
        token: invitationTokens.token,
        email: invitationTokens.email,
        createdBy: invitationTokens.createdBy,
        expiresAt: invitationTokens.expiresAt,
        usedAt: invitationTokens.usedAt,
        usedBy: invitationTokens.usedBy,
        createdAt: invitationTokens.createdAt,
      })
      .from(invitationTokens);

    const now = new Date();

    return {
      invitations: allInvitations.map(invitation => ({
        ...invitation,
        isExpired: now > invitation.expiresAt,
        isUsed: !!invitation.usedAt,
      })),
      total: allInvitations.length,
    };
  }

  async findOne(id: string) {
    const [invitation] = await this.db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.id, id));

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const now = new Date();

    return {
      ...invitation,
      isExpired: now > invitation.expiresAt,
      isUsed: !!invitation.usedAt,
    };
  }

  async validateToken(token: string, email: string) {
    const [invitation] = await this.db
      .select()
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.token, token),
          eq(invitationTokens.email, email)
        )
      );

    if (!invitation) {
      return { valid: false, reason: 'Invalid invitation token' };
    }

    if (invitation.usedAt) {
      return { valid: false, reason: 'Invitation token already used' };
    }

    if (new Date() > invitation.expiresAt) {
      return { valid: false, reason: 'Invitation token expired' };
    }

    return { valid: true, invitation };
  }

  async revoke(id: string) {
    const [invitation] = await this.db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.id, id));

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('Cannot revoke an already used invitation');
    }

    // Set expiration to now to effectively revoke it
    await this.db
      .update(invitationTokens)
      .set({ expiresAt: new Date() })
      .where(eq(invitationTokens.id, id));

    return { message: 'Invitation revoked successfully' };
  }

  async resend(id: string, expirationHours: number = 24) {
    const [invitation] = await this.db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.id, id));

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('Cannot resend an already used invitation');
    }

    // Extend expiration time
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + expirationHours);

    await this.db
      .update(invitationTokens)
      .set({ expiresAt: newExpiresAt })
      .where(eq(invitationTokens.id, id));

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const invitationLink = `${frontendUrl}/register?token=${invitation.token}&email=${encodeURIComponent(invitation.email)}`;

    return {
      invitationLink,
      token: invitation.token,
      expiresAt: newExpiresAt,
    };
  }
}
