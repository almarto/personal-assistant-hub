import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

export const passwordCredentials = pgTable('password_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const passkeyCredentials = pgTable('passkey_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  credentialId: text('credential_id').unique().notNull(),
  publicKey: text('public_key').notNull(),
  counter: bigint('counter', { mode: 'number' }).default(0).notNull(),
  deviceName: varchar('device_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
});

export const invitationTokens = pgTable('invitation_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  usedBy: uuid('used_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sessionToken: text('session_token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  passwordCredentials: many(passwordCredentials),
  passkeyCredentials: many(passkeyCredentials),
  createdInvitations: many(invitationTokens, {
    relationName: 'createdInvitations',
  }),
  usedInvitations: many(invitationTokens, { relationName: 'usedInvitations' }),
  sessions: many(userSessions),
}));

export const passwordCredentialsRelations = relations(
  passwordCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordCredentials.userId],
      references: [users.id],
    }),
  })
);

export const passkeyCredentialsRelations = relations(
  passkeyCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [passkeyCredentials.userId],
      references: [users.id],
    }),
  })
);

export const invitationTokensRelations = relations(
  invitationTokens,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [invitationTokens.createdBy],
      references: [users.id],
      relationName: 'createdInvitations',
    }),
    usedBy: one(users, {
      fields: [invitationTokens.usedBy],
      references: [users.id],
      relationName: 'usedInvitations',
    }),
  })
);

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));
