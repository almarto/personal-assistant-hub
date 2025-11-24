import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { db, invitationTokens, users } from '@personal-assistant-hub/database';
import { v4 as uuidv4 } from 'uuid';

import { Invitation } from '../../../domain/model/invitation.model';
import { InvitationRepository } from '../../../domain/ports/out/invitation-repository.port';

@Injectable()
export class InvitationRepositoryAdapter implements InvitationRepository {
  async create(
    token: string,
    email: string,
    createdById: string,
    expiresAt: Date,
    role: 'admin' | 'user'
  ): Promise<Invitation> {
    const id = uuidv4();
    const result = await db
      .insert(invitationTokens)
      .values({
        id,
        token,
        email,
        createdBy: createdById,
        expiresAt,
        role,
      })
      .returning();

    const row = result[0];
    return new Invitation(
      row.id,
      row.token,
      row.email,
      row.createdBy,
      row.expiresAt,
      row.createdAt,
      row.role as 'admin' | 'user',
      row.usedAt,
      row.usedBy
    );
  }

  async findAll(): Promise<Invitation[]> {
    const result = await db.select().from(invitationTokens);

    return result.map(
      row =>
        new Invitation(
          row.id,
          row.token,
          row.email,
          row.createdBy,
          row.expiresAt,
          row.createdAt,
          row.role as 'admin' | 'user',
          row.usedAt,
          row.usedBy
        )
    );
  }

  async findById(id: string): Promise<Invitation | null> {
    const result = await db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.id, id));

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return new Invitation(
      row.id,
      row.token,
      row.email,
      row.createdBy,
      row.expiresAt,
      row.createdAt,
      row.role as 'admin' | 'user',
      row.usedAt,
      row.usedBy
    );
  }

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
    return new Invitation(
      row.id,
      row.token,
      row.email,
      row.createdBy,
      row.expiresAt,
      row.createdAt,
      row.role as 'admin' | 'user',
      row.usedAt,
      row.usedBy
    );
  }

  async update(invitation: Invitation): Promise<void> {
    await db
      .update(invitationTokens)
      .set({
        expiresAt: invitation.expiresAt,
        usedAt: invitation.usedAt,
        usedBy: invitation.usedBy,
      })
      .where(eq(invitationTokens.id, invitation.id));
  }

  async existsUserWithEmail(email: string): Promise<boolean> {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    return result.length > 0;
  }

  async existsPendingInvitationForEmail(email: string): Promise<boolean> {
    const now = new Date();
    const result = await db
      .select({ id: invitationTokens.id })
      .from(invitationTokens)
      .where(
        and(eq(invitationTokens.email, email), isNull(invitationTokens.usedAt))
      );

    // Filter in memory for expiration check
    const pendingInvitations = result.filter(row => {
      // We need to fetch the full row to check expiration
      return true; // This is a simplification; ideally we'd check expiresAt > now in the query
    });

    if (pendingInvitations.length === 0) {
      return false;
    }

    // Fetch full rows to check expiration
    const fullResult = await db
      .select()
      .from(invitationTokens)
      .where(
        and(eq(invitationTokens.email, email), isNull(invitationTokens.usedAt))
      );

    return fullResult.some(row => row.expiresAt > now);
  }
}
