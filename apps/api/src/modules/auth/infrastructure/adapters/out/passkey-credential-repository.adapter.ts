import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, passkeyCredentials } from '@personal-assistant-hub/database';

import { PasskeyCredential } from '../../../domain/model/passkey-credential.model';
import { PasskeyCredentialRepository } from '../../../domain/ports/out/passkey-credential-repository.port';

@Injectable()
export class PasskeyCredentialRepositoryAdapter
  implements PasskeyCredentialRepository
{
  async create(data: {
    id: string;
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    deviceName: string;
  }): Promise<void> {
    await db.insert(passkeyCredentials).values({
      id: data.id,
      userId: data.userId,
      credentialId: data.credentialId,
      publicKey: data.publicKey,
      counter: data.counter,
      deviceName: data.deviceName,
    });
  }

  async findByUserId(userId: string): Promise<PasskeyCredential[]> {
    const result = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId));

    return result.map(
      row =>
        new PasskeyCredential(
          row.id,
          row.userId,
          row.credentialId,
          row.publicKey,
          row.counter,
          row.deviceName || '',
          row.createdAt,
          row.lastUsedAt
        )
    );
  }

  async findByCredentialId(
    credentialId: string
  ): Promise<PasskeyCredential | null> {
    const result = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId));

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return new PasskeyCredential(
      row.id,
      row.userId,
      row.credentialId,
      row.publicKey,
      row.counter,
      row.deviceName || '',
      row.createdAt,
      row.lastUsedAt
    );
  }

  async updateCounter(credentialId: string, newCounter: number): Promise<void> {
    await db
      .update(passkeyCredentials)
      .set({
        counter: newCounter,
        lastUsedAt: new Date(),
      })
      .where(eq(passkeyCredentials.credentialId, credentialId));
  }
}
