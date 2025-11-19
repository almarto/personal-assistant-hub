import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import type {
  invitationTokens,
  passkeyCredentials,
  userSessions,
  users,
} from './schema/users.js';

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type UserUpdate = Partial<Omit<NewUser, 'id' | 'createdAt'>>;

// Passkey credential types
export type PasskeyCredential = InferSelectModel<typeof passkeyCredentials>;
export type NewPasskeyCredential = InferInsertModel<typeof passkeyCredentials>;
export type PasskeyCredentialUpdate = Partial<
  Omit<NewPasskeyCredential, 'id' | 'createdAt'>
>;

// Invitation token types
export type InvitationToken = InferSelectModel<typeof invitationTokens>;
export type NewInvitationToken = InferInsertModel<typeof invitationTokens>;
export type InvitationTokenUpdate = Partial<
  Omit<NewInvitationToken, 'id' | 'createdAt'>
>;

// User session types
export type UserSession = InferSelectModel<typeof userSessions>;
export type NewUserSession = InferInsertModel<typeof userSessions>;
export type UserSessionUpdate = Partial<
  Omit<NewUserSession, 'id' | 'createdAt'>
>;

// Role enum
export type UserRole = 'admin' | 'user';

// Database transaction type
export type DatabaseTransaction = Parameters<
  Parameters<typeof import('./connection.js').db.transaction>[0]
>[0];

export type { Database } from './types/database.js';
