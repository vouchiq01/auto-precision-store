export const STORE = {
  name: 'Auto Precision',
  legalName: 'Auto Precision Store',
  tagline: 'Stop grooming on the floor.',
  sellerState: 'Karnataka',
  sellerStateCode: '29',
  supportEmail: 'support@autoprecision.store',
  supportPhone: '+91 80 0000 0000',
  currency: 'INR',
  locale: 'en-IN',
} as const;

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Legal status transitions. Enforced server-side so an admin can't mark a
 * cancelled order as shipped, and so the timeline stays coherent.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['confirmed', 'cancelled', 'refunded'],
  confirmed: ['packed', 'cancelled', 'refunded'],
  packed: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Payment received',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/**
 * Couriers we actually ship with, each with a template for building the
 * tracking URL from just the AWB/tracking number — so the admin only has to
 * type the number once instead of hunting down a tracking link by hand.
 * "Other" always falls back to leaving the URL blank for manual entry.
 */
export const CARRIERS = [
  { id: 'delhivery', name: 'Delhivery', trackingUrl: (awb: string) => `https://www.delhivery.com/track-v2/package/${awb}` },
  { id: 'dtdc', name: 'DTDC', trackingUrl: (awb: string) => `https://www.dtdc.in/tracking/shipment-status?trackingId=${awb}` },
  { id: 'bluedart', name: 'Blue Dart', trackingUrl: (awb: string) => `https://www.bluedart.com/tracking?trackFor=${awb}` },
  { id: 'ekart', name: 'Ekart', trackingUrl: (awb: string) => `https://www.ekartlogistics.com/track/${awb}` },
  { id: 'xpressbees', name: 'XpressBees', trackingUrl: (awb: string) => `https://www.xpressbees.com/track?awb=${awb}` },
  { id: 'shiprocket', name: 'Shiprocket', trackingUrl: (awb: string) => `https://shiprocket.co/tracking/${awb}` },
  { id: 'professional', name: 'Professional Couriers', trackingUrl: () => null },
  { id: 'india_post', name: 'India Post', trackingUrl: (awb: string) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?id=${awb}` },
  { id: 'other', name: 'Other', trackingUrl: () => null },
] as const satisfies ReadonlyArray<{ id: string; name: string; trackingUrl: (awb: string) => string | null }>;
export type CarrierId = (typeof CARRIERS)[number]['id'];

export function carrierTrackingUrl(carrierId: string, trackingNumber: string): string | null {
  const carrier = CARRIERS.find((c) => c.id === carrierId);
  if (!carrier || !trackingNumber.trim()) return null;
  return carrier.trackingUrl(trackingNumber.trim());
}

export const PAYMENT_STATUSES = ['created', 'authorized', 'captured', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const USER_ROLES = ['customer', 'admin', 'superadmin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BANNER_PLACEMENTS = ['hero', 'strip', 'category', 'product'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const ENQUIRY_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

/** Layouts available to data-driven product story blocks. */
export const FEATURE_LAYOUTS = ['media_right', 'media_left', 'media_full', 'stat_row', 'quote'] as const;
export type FeatureLayout = (typeof FEATURE_LAYOUTS)[number];

export const AUTH = {
  otpLength: 6,
  otpTtlSeconds: 300,
  otpMaxAttempts: 5,
  /** Per phone number, per hour. */
  otpMaxRequestsPerHour: 5,
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 30 * 24 * 60 * 60,
  /** Accepted in development only, when SMS_PROVIDER=mock. */
  devOtpCode: '123456',
} as const;

export const CART = {
  maxQuantityPerLine: 10,
  maxLines: 20,
  /** Guest carts are keyed by an opaque cookie token for this long. */
  guestCartTtlDays: 30,
} as const;

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;
export type IndianState = (typeof INDIAN_STATES)[number];
