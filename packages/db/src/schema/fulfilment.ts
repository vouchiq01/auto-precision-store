import { relations } from 'drizzle-orm';
import { bigint, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { productVariants } from './catalog.ts';
import { users } from './identity.ts';

/**
 * Freight zones. States are listed rather than pincode ranges because Indian
 * courier zoning for heavy goods is effectively state-level, and a 36-entry
 * list is far easier for an admin to reason about than range arithmetic.
 */
export const shippingZones = pgTable('shipping_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  states: jsonb('states').$type<string[]>().notNull().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One row per (zone, weight slab). Slabs should be contiguous and non-overlapping. */
export const shippingRates = pgTable('shipping_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').notNull().references(() => shippingZones.id, { onDelete: 'cascade' }),
  minWeightG: integer('min_weight_g').notNull().default(0),
  /** null means "and above" — the open-ended top slab. */
  maxWeightG: integer('max_weight_g'),
  price: bigint('price', { mode: 'number' }).notNull(),
  etaDaysMin: integer('eta_days_min').notNull().default(3),
  etaDaysMax: integer('eta_days_max').notNull().default(7),
  freeAbove: bigint('free_above', { mode: 'number' }),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => [index('rates_zone_idx').on(table.zoneId, table.minWeightG)]);

/**
 * Serviceability lookup. Seeded with major metros; unknown pincodes fall back to
 * their state's zone rather than being rejected outright, so a gap in this table
 * never silently loses a sale.
 */
export const pincodes = pgTable('pincodes', {
  pincode: text('pincode').primaryKey(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zoneId: uuid('zone_id').references(() => shippingZones.id, { onDelete: 'set null' }),
  isServiceable: boolean('is_serviceable').notNull().default(true),
  etaDaysMin: integer('eta_days_min'),
  etaDaysMax: integer('eta_days_max'),
  isCodAvailable: boolean('is_cod_available').notNull().default(false),
}, (table) => [index('pincodes_state_idx').on(table.state)]);

/** "Notify me when back in stock" capture. */
export const stockNotifications = pgTable('stock_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  phone: text('phone'),
  email: text('email'),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('stock_notify_variant_idx').on(table.variantId),
  // One pending request per contact per variant, so a restock does not send
  // the same person four messages.
  uniqueIndex('stock_notify_unique').on(table.variantId, table.phone, table.email),
]);

export const shippingZonesRelations = relations(shippingZones, ({ many }) => ({
  rates: many(shippingRates),
  pincodes: many(pincodes),
}));

export const shippingRatesRelations = relations(shippingRates, ({ one }) => ({
  zone: one(shippingZones, { fields: [shippingRates.zoneId], references: [shippingZones.id] }),
}));

export const pincodesRelations = relations(pincodes, ({ one }) => ({
  zone: one(shippingZones, { fields: [pincodes.zoneId], references: [shippingZones.id] }),
}));
