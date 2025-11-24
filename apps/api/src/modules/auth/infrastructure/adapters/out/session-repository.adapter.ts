import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, userSessions } from '@personal-assistant-hub/database';

import { SessionRepository } from '../../../domain/ports/out/session-repository.port';

@Injectable()
export class SessionRepositoryAdapter implements SessionRepository {
  async create(data: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    await db.insert(userSessions).values({
      id: data.id,
      userId: data.userId,
      sessionToken: data.token,
      expiresAt: data.expiresAt,
    });
  }

  async invalidate(sessionId: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.id, sessionId));
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
  }
}
