import type { Paise } from './money.ts';
import type { BannerPlacement, EnquiryStatus, FeatureLayout, OrderStatus, ProductStatus, ReviewStatus, UserRole } from './constants.ts';

/** Response shapes the API returns and the web app consumes. One definition, both sides. */

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  productCount?: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  variantId: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  optionName: string;
  optionValue: string;
  price: Paise;
  compareAtPrice: Paise | null;
  stockQty: number;
  inStock: boolean;
  isLowStock: boolean;
  weightG: number;
  hexColour: string | null;
}

export interface ProductSpec {
  id: string;
  group: string;
  label: string;
  value: string;
  sortOrder: number;
}

export interface ProductFeature {
  id: string;
  eyebrow: string | null;
  title: string;
  body: string | null;
  mediaUrl: string | null;
  mediaAlt: string | null;
  layout: FeatureLayout;
  stats: { value: string; label: string }[];
  sortOrder: number;
}

export interface ProductFaq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  sku: string;
  name: string;
  tagline: string | null;
  summary: string | null;
  brand: string;
  status: ProductStatus;
  price: Paise;
  compareAtPrice: Paise | null;
  discountPercent: number | null;
  primaryImage: ProductImage | null;
  category: Pick<Category, 'id' | 'slug' | 'name'>;
  badges: string[];
  inStock: boolean;
  isFeatured: boolean;
  rating: { average: number; count: number } | null;
  /** Lowest monthly instalment, pre-formatted. Null below the EMI threshold. */
  emiTeaser: string | null;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  hsnCode: string;
  taxRateBps: number;
  weightG: number;
  dimensions: {
    lengthMm: number | null;
    widthMm: number | null;
    heightMinMm: number | null;
    heightMaxMm: number | null;
    loadCapacityKg: number | null;
  };
  warrantyMonths: number;
  images: ProductImage[];
  variants: ProductVariant[];
  specs: ProductSpec[];
  features: ProductFeature[];
  faqs: ProductFaq[];
  metaTitle: string | null;
  metaDescription: string | null;
  related: ProductSummary[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  imageDesktop: string;
  imageMobile: string | null;
  videoUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  placement: BannerPlacement;
  sortOrder: number;
}

export interface CartLine {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: Paise;
  lineTotal: Paise;
  product: Pick<ProductSummary, 'id' | 'slug' | 'name' | 'brand'> & { image: ProductImage | null };
  variant: Pick<ProductVariant, 'optionName' | 'optionValue' | 'stockQty' | 'inStock'>;
  /** Set when the requested quantity exceeds available stock. */
  stockWarning: string | null;
}

export interface CartSummary {
  id: string;
  lines: CartLine[];
  itemCount: number;
  subtotal: Paise;
  discountTotal: Paise;
  couponCode: string | null;
  couponMessage: string | null;
  estimatedTotal: Paise;
  totalWeightG: number;
}

export interface CheckoutQuote {
  subtotal: Paise;
  discountTotal: Paise;
  couponCode: string | null;
  shippingTotal: Paise;
  shippingIsFree: boolean;
  shippingEta: string | null;
  taxableValue: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  taxTotal: Paise;
  grandTotal: Paise;
  intraState: boolean;
  serviceable: boolean;
}

export interface OrderLine {
  id: string;
  productId: string;
  productSlug: string;
  variantId: string;
  name: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: Paise;
  lineTotal: Paise;
  taxAmount: Paise;
}

export interface OrderEvent {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  lines: OrderLine[];
  events: OrderEvent[];
  subtotal: Paise;
  discountTotal: Paise;
  shippingTotal: Paise;
  taxableValue: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  taxTotal: Paise;
  grandTotal: Paise;
  couponCode: string | null;
  gstin: string | null;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  trackingNumber: string | null;
  trackingUrl: string | null;
  invoiceUrl: string | null;
  placedAt: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  authorName: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  productId: string | null;
  productName: string | null;
  quantity: number | null;
  message: string;
  businessName: string | null;
  city: string | null;
  status: EnquiryStatus;
  internalNote: string | null;
  createdAt: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  body: string;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
  fullName: string | null;
  role: UserRole;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/** RFC 7807 problem+json — the only error shape the API emits. */
export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  /** Field-level validation failures, keyed by dotted path. */
  errors?: Record<string, string[]>;
  requestId?: string;
}

export interface DashboardStats {
  revenue: { total: Paise; delta: number };
  orders: { total: number; delta: number };
  averageOrderValue: Paise;
  pendingOrders: number;
  lowStockCount: number;
  pendingReviews: number;
  newEnquiries: number;
  revenueSeries: { date: string; revenue: Paise; orders: number }[];
  topProducts: { id: string; name: string; slug: string; unitsSold: number; revenue: Paise }[];
}
