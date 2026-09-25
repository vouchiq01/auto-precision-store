import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Enum values mirror the const arrays in @aps/shared/constants.
 * They are duplicated here rather than imported because drizzle-kit reads this
 * file statically to generate migrations and cannot follow a workspace import.
 * The shared test suite asserts the two stay in step.
 */
export const userRoleEnum = pgEnum('user_role', ['customer', 'admin', 'superadmin']);
export const addressTypeEnum = pgEnum('address_type', ['home', 'work', 'other']);
export const productStatusEnum = pgEnum('product_status', ['draft', 'active', 'archived']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment', 'paid', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded',
]);
export const paymentStatusEnum = pgEnum('payment_status', ['created', 'authorized', 'captured', 'failed', 'refunded']);
export const couponTypeEnum = pgEnum('coupon_type', ['percent', 'flat', 'free_shipping']);
export const couponScopeEnum = pgEnum('coupon_scope', ['all', 'category', 'product']);
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected']);
export const bannerPlacementEnum = pgEnum('banner_placement', ['hero', 'strip', 'category', 'product']);
export const enquiryStatusEnum = pgEnum('enquiry_status', ['new', 'contacted', 'quoted', 'won', 'lost']);
export const featureLayoutEnum = pgEnum('feature_layout', ['media_right', 'media_left', 'media_full', 'stat_row', 'quote']);
