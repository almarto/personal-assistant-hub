import { and, eq, gt, isNull, lt } from 'drizzle-orm';

import { db } from '../connection.js';
import {
  invitationTokens,
  passkeyCredentials,
  userSessions,
  users,
} from '../schema/index.js';
import type {
  InvitationToken,
  NewInvitationToken,
  NewPasskeyCredential,
  NewUser,
  NewUserSession,
  PasskeyCredential,
  User,
  UserSession,
  UserUpdate,
} from '../types.js';

// User queries
export const userQueries = {
  async findById(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0];
  },

  async create(userData: NewUser): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  },

  async update(id: string, userData: UserUpdate): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.length > 0;
  },

  async findAll(): Promise<User[]> {
    return await db.select().from(users);
  },

  async findActiveUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  },
};

// Passkey credential queries
export const passkeyQueries = {
  async findByCredentialId(
    credentialId: string
  ): Promise<PasskeyCredential | undefined> {
    const result = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId))
      .limit(1);
    return result[0];
  },

  async findByUserId(userId: string): Promise<PasskeyCredential[]> {
    return await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId));
  },

  async create(
    credentialData: NewPasskeyCredential
  ): Promise<PasskeyCredential> {
    const result = await db
      .insert(passkeyCredentials)
      .values(credentialData)
      .returning();
    return result[0];
  },

  async updateCounter(
    credentialId: string,
    counter: number
  ): Promise<PasskeyCredential | undefined> {
    const result = await db
      .update(passkeyCredentials)
      .set({
        counter,
        lastUsedAt: new Date(),
      })
      .where(eq(passkeyCredentials.credentialId, credentialId))
      .returning();
    return result[0];
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(passkeyCredentials)
      .where(eq(passkeyCredentials.id, id));
    return result.length > 0;
  },
};

// Invitation token queries
export const invitationQueries = {
  async findByToken(token: string): Promise<InvitationToken | undefined> {
    const result = await db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.token, token))
      .limit(1);
    return result[0];
  },

  async findValidByToken(token: string): Promise<InvitationToken | undefined> {
    const result = await db
      .select()
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.token, token),
          gt(invitationTokens.expiresAt, new Date()),
          isNull(invitationTokens.usedAt)
        )
      )
      .limit(1);
    return result[0];
  },

  async create(invitationData: NewInvitationToken): Promise<InvitationToken> {
    const result = await db
      .insert(invitationTokens)
      .values(invitationData)
      .returning();
    return result[0];
  },

  async markAsUsed(
    token: string,
    usedBy: string
  ): Promise<InvitationToken | undefined> {
    const result = await db
      .update(invitationTokens)
      .set({
        usedAt: new Date(),
        usedBy,
      })
      .where(eq(invitationTokens.token, token))
      .returning();
    return result[0];
  },

  async findByCreatedBy(createdBy: string): Promise<InvitationToken[]> {
    return await db
      .select()
      .from(invitationTokens)
      .where(eq(invitationTokens.createdBy, createdBy));
  },

  async findPendingInvitations(): Promise<InvitationToken[]> {
    return await db
      .select()
      .from(invitationTokens)
      .where(
        and(
          gt(invitationTokens.expiresAt, new Date()),
          isNull(invitationTokens.usedAt)
        )
      );
  },
};

// User session queries
export const sessionQueries = {
  async findByToken(sessionToken: string): Promise<UserSession | undefined> {
    const result = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken))
      .limit(1);
    return result[0];
  },

  async findValidByToken(
    sessionToken: string
  ): Promise<UserSession | undefined> {
    const result = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.sessionToken, sessionToken),
          gt(userSessions.expiresAt, new Date())
        )
      )
      .limit(1);
    return result[0];
  },

  async create(sessionData: NewUserSession): Promise<UserSession> {
    const result = await db
      .insert(userSessions)
      .values(sessionData)
      .returning();
    return result[0];
  },

  async updateLastAccessed(
    sessionToken: string
  ): Promise<UserSession | undefined> {
    const result = await db
      .update(userSessions)
      .set({
        lastAccessedAt: new Date(),
      })
      .where(eq(userSessions.sessionToken, sessionToken))
      .returning();
    return result[0];
  },

  async delete(sessionToken: string): Promise<boolean> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));
    return result.length > 0;
  },

  async deleteByUserId(userId: string): Promise<number> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.userId, userId));
    return result.length;
  },

  async deleteExpired(): Promise<number> {
    const result = await db
      .delete(userSessions)
      .where(lt(userSessions.expiresAt, new Date()));
    return result.length;
  },

  async findByUserId(userId: string): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId));
  },
};
