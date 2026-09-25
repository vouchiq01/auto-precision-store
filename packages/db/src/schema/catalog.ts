import { relations } from 'drizzle-orm';
import {
  bigint, boolean, index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';
import { featureLayoutEnum, productStatusEnum } from './enums.ts';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  summary: text('summary'),
  description: text('description'),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  brand: text('brand').notNull().default('Auto Precision'),

  /* Money is integer paise throughout. bigint because ₹1,10,200 is 11,020,000
     paise today and nothing stops a future product from being far larger. */
  basePrice: bigint('base_price', { mode: 'number' }).notNull(),
  compareAtPrice: bigint('compare_at_price', { mode: 'number' }),

  status: productStatusEnum('status').notNull().default('draft'),

  /* Tax. HSN 9403 (furniture) at 18% for grooming tables. */
  hsnCode: text('hsn_code').notNull().default('9403'),
  taxRateBps: integer('tax_rate_bps').notNull().default(1800),

  /* Physical properties drive freight banding and the dimension diagram. */
  weightG: integer('weight_g').notNull().default(0),
  lengthMm: integer('length_mm'),
  widthMm: integer('width_mm'),
  heightMinMm: integer('height_min_mm'),
  heightMaxMm: integer('height_max_mm'),
  loadCapacityKg: integer('load_capacity_kg'),
  warrantyMonths: integer('warranty_months').notNull().default(12),

  badges: jsonb('badges').$type<string[]>().notNull().default([]),
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),

  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('products_category_idx').on(table.categoryId),
  index('products_status_idx').on(table.status),
  index('products_featured_idx').on(table.isFeatured),
  index('products_price_idx').on(table.basePrice),
]);

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull().unique(),
  optionName: text('option_name').notNull().default('Variant'),
  optionValue: text('option_value').notNull(),
  /** Signed: a smaller variant may be cheaper than the product's base price. */
  priceDelta: bigint('price_delta', { mode: 'number' }).notNull().default(0),
  stockQty: integer('stock_qty').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(2),
  weightG: integer('weight_g').notNull().default(0),
  hexColour: text('hex_colour'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('variants_product_idx').on(table.productId)]);

export const productImages = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  /** Non-null when the image belongs to one colourway rather than the product. */
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  url: text('url').notNull(),
  alt: text('alt').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
}, (table) => [index('images_product_idx').on(table.productId, table.sortOrder)]);

/** Rows render the grouped specification table. Grouping is by free-text `group`. */
export const productSpecs = pgTable('product_specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  group: text('group').notNull().default('General'),
  label: text('label').notNull(),
  value: text('value').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => [index('specs_product_idx').on(table.productId, table.sortOrder)]);

/**
 * The scroll-story blocks on a product page.
 * Data-driven on purpose: a new feature section is a row, not a deploy.
 */
export const productFeatures = pgTable('product_features', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  eyebrow: text('eyebrow'),
  title: text('title').notNull(),
  body: text('body'),
  mediaUrl: text('media_url'),
  mediaAlt: text('media_alt'),
  layout: featureLayoutEnum('layout').notNull().default('media_right'),
  stats: jsonb('stats').$type<{ value: string; label: string }[]>().notNull().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => [index('features_product_idx').on(table.productId, table.sortOrder)]);

export const productFaqs = pgTable('product_faqs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => [index('faqs_product_idx').on(table.productId, table.sortOrder)]);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  images: many(productImages),
  specs: many(productSpecs),
  features: many(productFeatures),
  faqs: many(productFaqs),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [productImages.variantId], references: [productVariants.id] }),
}));

export const productSpecsRelations = relations(productSpecs, ({ one }) => ({
  product: one(products, { fields: [productSpecs.productId], references: [products.id] }),
}));

export const productFeaturesRelations = relations(productFeatures, ({ one }) => ({
  product: one(products, { fields: [productFeatures.productId], references: [products.id] }),
}));

export const productFaqsRelations = relations(productFaqs, ({ one }) => ({
  product: one(products, { fields: [productFaqs.productId], references: [products.id] }),
}));
