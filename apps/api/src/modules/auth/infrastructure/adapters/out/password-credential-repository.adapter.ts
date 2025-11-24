import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, passwordCredentials } from '@personal-assistant-hub/database';

import { PasswordCredential } from '../../../domain/model/password-credential.model';
import { PasswordCredentialRepository } from '../../../domain/ports/out/password-credential-repository.port';

@Injectable()
export class PasswordCredentialRepositoryAdapter
  implements PasswordCredentialRepository
{
  async create(data: {
    id: string;
    userId: string;
    passwordHash: string;
  }): Promise<void> {
    await db.insert(passwordCredentials).values({
      id: data.id,
      userId: data.userId,
      passwordHash: data.passwordHash,
    });
  }

  async findByUserId(userId: string): Promise<PasswordCredential | null> {
    const result = await db
      .select()
      .from(passwordCredentials)
      .where(eq(passwordCredentials.userId, userId));

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return new PasswordCredential(
      row.id,
      row.userId,
      row.passwordHash,
      row.createdAt,
      row.updatedAt
    );
  }

  async updateByUserId(
    userId: string,
    data: { passwordHash: string }
  ): Promise<void> {
    await db
      .update(passwordCredentials)
      .set({
        passwordHash: data.passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(passwordCredentials.userId, userId));
  }
}
