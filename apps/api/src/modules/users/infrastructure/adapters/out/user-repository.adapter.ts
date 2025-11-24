import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, users } from '@personal-assistant-hub/database';

import { User } from '../../../domain/model/user.model';
import { UserRepository } from '../../../domain/ports/out/user-repository.port';

@Injectable()
export class UserRepositoryAdapter implements UserRepository {
  async findAll(): Promise<{ users: User[]; total: number }> {
    const result = await db.select().from(users);

    const domainUsers = result.map(row =>
      User.create(
        row.id,
        row.email,
        row.role,
        row.isActive,
        row.createdAt,
        row.updatedAt,
        row.lastLoginAt
      )
    );

    return {
      users: domainUsers,
      total: domainUsers.length,
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return User.create(
      row.id,
      row.email,
      row.role,
      row.isActive,
      row.createdAt,
      row.updatedAt,
      row.lastLoginAt
    );
  }

  async update(id: string, user: User): Promise<User> {
    const result = await db
      .update(users)
      .set({
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    const row = result[0];
    return User.create(
      row.id,
      row.email,
      row.role,
      row.isActive,
      row.createdAt,
      row.updatedAt,
      row.lastLoginAt
    );
  }

  async deactivate(id: string): Promise<{ message: string }> {
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return { message: 'User deactivated successfully' };
  }
}
