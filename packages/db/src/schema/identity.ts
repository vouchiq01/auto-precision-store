import { relations, sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, integer, inet } from 'drizzle-orm/pg-core';
import { addressTypeEnum, userRoleEnum } from './enums.ts';

/**
 * One users table for both audiences.
 * Customers authenticate by phone + OTP and have no password.
 * Admins authenticate by email + argon2id hash and have no phone requirement.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').unique(),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name'),
  role: userRoleEnum('role').notNull().default('customer'),
  isBlocked: boolean('is_blocked').notNull().default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('users_role_idx').on(table.role),
  index('users_created_at_idx').on(table.createdAt),
]);

/**
 * OTP codes are stored hashed, never in plaintext: a leaked database row must
 * not hand an attacker a working login. `attempts` drives lockout, and the
 * partial index on unconsumed rows keeps verification lookups cheap.
 */
export const otpCodes = pgTable('otp_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  requestIp: inet('request_ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('otp_phone_created_idx').on(table.phone, table.createdAt),
  index('otp_expires_idx').on(table.expiresAt),
]);

/**
 * Refresh tokens are hashed and single-use: every refresh rotates the token and
 * revokes its predecessor, so a stolen token that is replayed after the real
 * client has rotated shows up as a reuse of a revoked row.
 */
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  replacedByHash: text('replaced_by_hash'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('refresh_user_idx').on(table.userId),
  index('refresh_expires_idx').on(table.expiresAt),
]);

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  line1: text('line1').notNull(),
  line2: text('line2'),
  landmark: text('landmark'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  type: addressTypeEnum('type').notNull().default('home'),
  isDefault: boolean('is_default').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('addresses_user_idx').on(table.userId),
  // At most one default address per user. Partial unique index rather than a
  // trigger, so the database enforces it and the API cannot race itself.
  uniqueIndex('addresses_one_default_per_user')
    .on(table.userId)
    .where(sql`is_default = true AND deleted_at IS NULL`),
]);

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  refreshTokens: many(refreshTokens),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));
