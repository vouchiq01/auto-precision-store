import { relations, sql } from 'drizzle-orm';
import {
  bigint, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';
import { couponScopeEnum, couponTypeEnum, orderStatusEnum, paymentStatusEnum } from './enums.ts';
import { products, productVariants } from './catalog.ts';
import { users } from './identity.ts';

/**
 * Carts belong to a user once they sign in, and to an opaque cookie token before
 * that. Merging the guest cart into the user cart happens at login.
 */
export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').unique(),
  couponCode: text('coupon_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('carts_user_idx').on(table.userId)]);

export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  /* Snapshot so the cart can flag "price changed since you added this".
     It is never trusted at checkout — pricing is always rebuilt from products. */
  priceSnapshot: bigint('price_snapshot', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // One line per variant per cart; adding again increments quantity instead.
  uniqueIndex('cart_items_unique_variant').on(table.cartId, table.variantId),
]);

export const wishlists = pgTable('wishlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('wishlist_unique').on(table.userId, table.productId)]);

export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  description: text('description'),
  type: couponTypeEnum('type').notNull(),
  /** Basis points for percent, paise for flat, unused for free_shipping. */
  value: bigint('value', { mode: 'number' }).notNull().default(0),
  minOrderValue: bigint('min_order_value', { mode: 'number' }),
  maxDiscount: bigint('max_discount', { mode: 'number' }),
  usageLimitTotal: integer('usage_limit_total'),
  usageLimitPerUser: integer('usage_limit_per_user'),
  /** Denormalised counter, incremented inside the checkout transaction. */
  timesUsed: integer('times_used').notNull().default(0),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  scope: couponScopeEnum('scope').notNull().default('all'),
  targetIds: jsonb('target_ids').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('coupons_active_idx').on(table.isActive)]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Human-facing, e.g. APS-2627-00042. Unique and gap-free per financial year. */
  orderNumber: text('order_number').notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  status: orderStatusEnum('status').notNull().default('pending_payment'),

  subtotal: bigint('subtotal', { mode: 'number' }).notNull(),
  discountTotal: bigint('discount_total', { mode: 'number' }).notNull().default(0),
  shippingTotal: bigint('shipping_total', { mode: 'number' }).notNull().default(0),
  taxableValue: bigint('taxable_value', { mode: 'number' }).notNull().default(0),
  cgst: bigint('cgst', { mode: 'number' }).notNull().default(0),
  sgst: bigint('sgst', { mode: 'number' }).notNull().default(0),
  igst: bigint('igst', { mode: 'number' }).notNull().default(0),
  taxTotal: bigint('tax_total', { mode: 'number' }).notNull().default(0),
  grandTotal: bigint('grand_total', { mode: 'number' }).notNull(),

  couponCode: text('coupon_code'),
  gstin: text('gstin'),

  /* Addresses are copied in, not referenced: editing a saved address must not
     rewrite the address an order already shipped to. */
  shippingAddress: jsonb('shipping_address').$type<Record<string, unknown>>().notNull(),
  billingAddress: jsonb('billing_address').$type<Record<string, unknown>>().notNull(),

  totalWeightG: integer('total_weight_g').notNull().default(0),
  notes: text('notes'),
  /** Name of the courier doing the delivery — "Delhivery", "DTDC", etc. Free
      text rather than an enum: new couriers get added without a migration. */
  carrier: text('carrier'),
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  invoiceNumber: text('invoice_number').unique(),
  invoiceUrl: text('invoice_url'),

  placedAt: timestamp('placed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('orders_user_idx').on(table.userId),
  index('orders_status_idx').on(table.status),
  index('orders_placed_at_idx').on(table.placedAt),
]);

/**
 * Every line snapshots name, SKU, price and tax rate at purchase time.
 * An order must read the same in three years even if the product was renamed,
 * repriced, or deleted outright.
 */
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  productSlug: text('product_slug').notNull(),
  name: text('name').notNull(),
  variantLabel: text('variant_label').notNull().default(''),
  sku: text('sku').notNull(),
  imageUrl: text('image_url'),
  hsnCode: text('hsn_code').notNull().default('9403'),
  quantity: integer('quantity').notNull(),
  unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
  lineTotal: bigint('line_total', { mode: 'number' }).notNull(),
  discountShare: bigint('discount_share', { mode: 'number' }).notNull().default(0),
  taxRateBps: integer('tax_rate_bps').notNull(),
  taxableValue: bigint('taxable_value', { mode: 'number' }).notNull().default(0),
  taxAmount: bigint('tax_amount', { mode: 'number' }).notNull().default(0),
  weightG: integer('weight_g').notNull().default(0),
}, (table) => [index('order_items_order_idx').on(table.orderId)]);

/** Append-only status timeline. Nothing in here is ever updated or deleted. */
export const orderEvents = pgTable('order_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: orderStatusEnum('status').notNull(),
  note: text('note'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  isCustomerVisible: boolean('is_customer_visible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('order_events_order_idx').on(table.orderId, table.createdAt)]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('razorpay'),
  razorpayOrderId: text('razorpay_order_id'),
  /* Unique so the payment.captured webhook is naturally idempotent: a duplicate
     delivery collides on this key instead of double-crediting the order. */
  razorpayPaymentId: text('razorpay_payment_id').unique(),
  razorpaySignature: text('razorpay_signature'),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('INR'),
  status: paymentStatusEnum('status').notNull().default('created'),
  method: text('method'),
  errorCode: text('error_code'),
  errorDescription: text('error_description'),
  refundedAmount: bigint('refunded_amount', { mode: 'number' }).notNull().default(0),
  raw: jsonb('raw').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('payments_order_idx').on(table.orderId),
  index('payments_rzp_order_idx').on(table.razorpayOrderId),
]);

export const couponRedemptions = pgTable('coupon_redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('redemptions_coupon_user_idx').on(table.couponId, table.userId),
  uniqueIndex('redemptions_one_per_order').on(table.couponId, table.orderId),
]);

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  redemptions: many(couponRedemptions),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  product: one(products, { fields: [wishlists.productId], references: [products.id] }),
}));
