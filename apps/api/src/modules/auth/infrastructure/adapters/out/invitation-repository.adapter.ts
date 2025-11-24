import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db, invitationTokens } from '@personal-assistant-hub/database';

import {
  Invitation,
  InvitationRepository,
} from '../../../domain/ports/out/invitation-repository.port';

@Injectable()
export class InvitationRepositoryAdapter implements InvitationRepository {
  async findByTokenAndEmail(
    token: string,
    email: string
  ): Promise<Invitation | null> {
    const result = await db
      .select()
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.token, token),
          eq(invitationTokens.email, email)
        )
      );

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      token: row.token,
      role: row.role,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }

  async markAsUsed(token: string, email: string): Promise<void> {
    await db
      .update(invitationTokens)
      .set({
        usedAt: new Date(),
      })
      .where(
        and(
          eq(invitationTokens.token, token),
          eq(invitationTokens.email, email)
        )
      );
  }
}
