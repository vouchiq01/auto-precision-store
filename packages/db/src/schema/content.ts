import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { bannerPlacementEnum, enquiryStatusEnum, reviewStatusEnum } from './enums.ts';
import { products } from './catalog.ts';
import { users } from './identity.ts';

export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  eyebrow: text('eyebrow'),
  imageDesktop: text('image_desktop').notNull(),
  imageMobile: text('image_mobile'),
  videoUrl: text('video_url'),
  ctaLabel: text('cta_label'),
  ctaUrl: text('cta_url'),
  placement: bannerPlacementEnum('placement').notNull().default('hero'),
  sortOrder: integer('sort_order').notNull().default(0),
  /* Scheduling window. Both null means "always on". The public query filters on
     these so a festival banner can be queued weeks ahead and expire by itself. */
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('banners_placement_idx').on(table.placement, table.sortOrder)]);

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  rating: smallint('rating').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: reviewStatusEnum('status').notNull().default('pending'),
  /* Set when the reviewer actually bought this product — the badge is the whole
     reason reviews move the needle on a ₹60,000 purchase. */
  isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(false),
  authorName: text('author_name').notNull(),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  moderationNote: text('moderation_note'),
  moderatedBy: uuid('moderated_by').references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: timestamp('moderated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('reviews_product_status_idx').on(table.productId, table.status),
  index('reviews_status_idx').on(table.status),
]);

export const enquiries = pgTable('enquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  quantity: integer('quantity'),
  message: text('message').notNull(),
  businessName: text('business_name'),
  city: text('city'),
  status: enquiryStatusEnum('status').notNull().default('new'),
  internalNote: text('internal_note'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('enquiries_status_idx').on(table.status, table.createdAt)]);

export const cmsPages = pgTable('cms_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  isPublished: boolean('is_published').notNull().default(false),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Key/value store for things an admin tunes without a deploy. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Every mutating admin action lands here. Append-only. */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  diff: jsonb('diff').$type<Record<string, unknown>>(),
  ip: text('ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('audit_entity_idx').on(table.entity, table.entityId, table.createdAt)]);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  product: one(products, { fields: [enquiries.productId], references: [products.id] }),
}));
