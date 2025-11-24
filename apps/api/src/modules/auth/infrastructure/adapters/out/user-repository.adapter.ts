import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, users } from '@personal-assistant-hub/database';

import { User } from '../../../domain/model/user.model';
import { UserRepository } from '../../../domain/ports/out/user-repository.port';

@Injectable()
export class UserRepositoryAdapter implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email));

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return new User(
      row.id,
      row.email,
      row.role,
      row.isActive,
      row.createdAt,
      row.updatedAt,
      row.lastLoginAt
    );
  }

  async create(data: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        id: data.id,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
      })
      .returning();

    const row = result[0];
    return new User(
      row.id,
      row.email,
      row.role,
      row.isActive,
      row.createdAt,
      row.updatedAt,
      row.lastLoginAt
    );
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return new User(
      row.id,
      row.email,
      row.role,
      row.isActive,
      row.createdAt,
      row.updatedAt,
      row.lastLoginAt
    );
  }

  async updateLastLogin(id: string): Promise<User> {
    const result = await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    const row = result[0];
    return new User(
      row.id,
      row.email,
      row.role,
      row.isActive,
      row.createdAt,
      row.updatedAt,
      row.lastLoginAt
    );
  }
}
