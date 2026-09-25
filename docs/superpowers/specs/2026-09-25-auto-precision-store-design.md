# Auto Precision Store — Design Specification

**Date:** 2026-09-25
**Status:** Approved
**Domain:** Direct-to-consumer + B2B e-commerce for professional pet grooming tables (India)

---

## 1. Purpose

Auto Precision Store sells 10–15 professional pet grooming tables priced ₹9,000–₹1,20,000.
The catalogue is deliberately small, so the site must win on **depth per product**, not breadth.
Every product gets a scroll-driven narrative page rather than a thumbnail in a grid.

Buyers are split between individual groomers (consumer checkout) and salons/pet businesses
(need GST input credit). Both must be served by one flow.

### Success criteria

- A visitor can discover, deeply evaluate, and buy a table end-to-end without contacting anyone.
- A salon buyer can supply a GSTIN and receive a compliant tax invoice.
- A non-technical admin can add a product, banner, and coupon without a deploy.
- The site reads as designed, not templated — it must not look like generic AI-generated e-commerce.
- Lighthouse ≥ 90 performance / ≥ 95 accessibility on the product page.

### Non-goals

- Multi-currency, multi-country, multi-warehouse
- Marketplace / multi-vendor
- Subscriptions or rentals
- Native mobile apps

---

## 2. Architecture

### Topology

```
auto-precision-store/            npm workspaces monorepo
├── apps/web      Next.js 15 (App Router, React 19, TS)   → Vercel
├── apps/api      Express 5 + TypeScript                  → Render
├── packages/shared   Zod schemas + types shared over the wire
└── packages/db       Drizzle ORM schema + migrations + seed → Supabase Postgres
```

**Rationale.** A monorepo keeps request/response contracts in one place; two separate repos
would mean hand-copied DTOs that drift. Collapsing into Next.js route handlers was rejected
because the brief requires a backend on Render.

> Deviation from original design: npm workspaces instead of pnpm + Turborepo, because pnpm's
> corepack shim is broken on the build machine. npm 11 workspaces are natively supported by
> both Vercel and Render. No functional difference at this size.

### Trust boundary

The **API is the only process that touches the database**, using the Supabase service-role key.
The browser never queries Supabase directly; it only reads public image URLs from Supabase
Storage's CDN. Row Level Security remains enabled as defence-in-depth.

This means Supabase Auth is not used. The API owns authentication for both audiences:

| Audience | Credential | Notes |
|---|---|---|
| Customer | Phone + 6-digit OTP | OTP hashed at rest, 5-minute TTL, 5 attempts, rate-limited per phone and per IP |
| Admin | Email + argon2id password | Seeded/invited only; no self-signup |

Both receive a short-lived access JWT (15 min, HS256) plus a rotating refresh token stored as
an httpOnly, SameSite=Lax, Secure cookie. Refresh tokens are hashed in the database and
revoked on rotation, so token theft is detectable.

**Accepted trade-off:** we forgo Supabase Auth's password-reset emails and breach detection.
Acceptable because admin accounts are seeded rather than self-registered, and the customer
OTP flow is custom regardless.

### SMS abstraction

```ts
interface SmsProvider {
  sendOtp(phone: E164, code: string): Promise<{ messageId: string }>;
}
```

`MockSmsProvider` logs the code and accepts `123456` in development.
`Msg91SmsProvider` is the production implementation, selected by `SMS_PROVIDER` env var.
Swapping providers touches exactly one file. MSG91 is chosen over Twilio for TRAI DLT
compliance and ~10× lower per-message cost in India.

---

## 3. Data model

28 tables. Grouped by concern; full column definitions live in `packages/db/src/schema/`.

### Identity
`users`, `otp_codes`, `refresh_tokens`, `addresses`

### Catalogue
`categories`, `products`, `product_variants`, `product_images`, `product_specs`,
`product_features`, `product_faqs`

`product_specs` and `product_features` are deliberately data-driven: the scroll-story sections
on a product page are rendered from rows, so marketing can add a feature block without a deploy.

### Commerce
`carts`, `cart_items`, `wishlists`, `orders`, `order_items`, `order_events`, `payments`,
`coupons`, `coupon_redemptions`

`order_items` snapshots name, SKU, unit price and tax rate at purchase time — order history
must not mutate when a product is later edited.

`order_events` is an append-only timeline (status, note, actor, timestamp).

### Fulfilment
`shipping_zones`, `shipping_rates`, `pincodes`, `stock_notifications`

Rates are weight-slab × zone. These tables weigh 20–50 kg; flat-rate shipping would either
lose money or deter buyers.

### Content & ops
`banners`, `reviews`, `enquiries`, `cms_pages`, `settings`, `audit_log`

### Money representation

All monetary values are stored as **integer paise** (`bigint`), never floats. Display
conversion happens once, at the presentation edge.

---

## 4. Tax (GST)

Seller state: **Karnataka**.

- Each product carries an HSN code (grooming tables → 9403, 18%) and a `tax_rate_bps`.
- Prices are stored and displayed **GST-inclusive**, per Indian retail convention.
- Tax is back-computed at checkout: `tax = inclusive × rate / (10000 + rate)`.
- Buyer state == Karnataka → CGST + SGST, each half the rate. Otherwise → IGST at full rate.
- Optional GSTIN captured at checkout, format-validated (15 chars, checksum).
- A sequentially numbered PDF tax invoice is generated per paid order and stored in Supabase
  Storage. Invoice numbers are gap-free per financial year (April–March).

---

## 5. Payments

Razorpay, online only (no COD, per decision).

1. Client requests checkout → API validates cart, recomputes every price server-side,
   applies coupon, computes shipping and tax, creates a `pending_payment` order.
2. API creates a Razorpay order and returns its id.
3. Client opens Razorpay Checkout.
4. On success the client posts `razorpay_order_id`, `payment_id`, `signature`.
   API verifies `HMAC_SHA256(order_id|payment_id, key_secret) === signature`.
5. The `payment.captured` **webhook is the authoritative source of truth**, verified by its own
   signature and processed idempotently on `razorpay_payment_id`. Client-side confirmation is
   treated as a hint that may arrive first, never as proof.

Never trust a client-supplied price, quantity price, or discount. The cart is re-priced from
the database on every checkout.

---

## 6. Frontend

### Routes

| Route | Purpose |
|---|---|
| `/` | Pinned hero, category rail, featured product story, banners, proof, enquiry CTA |
| `/collections/[slug]` | Filter by price, type, brand, availability |
| `/products/[slug]` | The centrepiece — see below |
| `/compare` | Side-by-side spec comparison |
| `/cart`, `/checkout`, `/order/[number]` | Purchase flow |
| `/account/*` | Orders, addresses, wishlist, profile |
| `/pages/[slug]` | CMS-driven policy pages |
| `/admin/*` | Admin panel, separate layout and auth |

### Product page composition

Sticky media column (Insta360 pattern: product stays pinned while spec copy advances),
spec table grouped by section, data-driven scroll-story feature blocks, dimension diagram,
pincode serviceability check, EMI per-month messaging, comparison strip, FAQ accordion,
reviews, and a sticky add-to-cart bar that appears after the hero scrolls out.

### Design system

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0A0A0B` | Primary canvas |
| `--surface` | `#141416` | Raised panels |
| `--bone` | `#EFEBE7` | Contrast sections, warm off-white from the logo |
| `--crimson` | `#CE2B2B` | Single accent, one emphasis per screen |
| `--steel` | `#8A8F98` | Secondary text, industrial register |

**Type:** Clash Display (oversized headlines, tight tracking) + Satoshi (body), self-hosted
via `next/font/local`. Chosen to avoid the Inter-everywhere default that reads as AI-generated.

**Motion:** GSAP + ScrollTrigger for pinning and scrubbed sequences; Framer Motion for
component enter/exit and layout transitions; Lenis for smooth scroll.

Constraints, non-negotiable:
- Only `transform` and `opacity` are animated. No layout-thrashing properties.
- Every animation has a `prefers-reduced-motion: reduce` fallback that renders the final state.
- Mobile gets a reduced variant; scroll-pinning is disabled below 768px.
- No animation blocks interaction or delays Largest Contentful Paint.

---

## 7. Admin panel

All modules in scope:

- **Products** — variants, spec groups, feature blocks, FAQs, image gallery with drag-reorder, draft/active/archived
- **Banners** — desktop/mobile art, placement, CTA, scheduled start/end windows
- **Coupons** — percent / flat / free-shipping, min cart, max discount, total and per-user caps, date windows, scoped to all/category/product
- **Orders** — status transitions, timeline, invoice download, refund initiation
- **Inventory** — per-variant stock, low-stock thresholds and alerts, back-in-stock capture
- **Customers** — order history, lifetime value
- **Reviews** — moderation queue (pending → approved/rejected)
- **Enquiries** — bulk/dealer lead inbox
- **CMS pages** — rich-text policy pages
- **Dashboard** — revenue, orders, AOV, top products, funnel

Every mutating admin action writes to `audit_log`.

---

## 8. Error handling

- API returns RFC 7807 problem+json: `{ type, title, status, detail, errors? }`.
- All input validated with Zod at the boundary; validation failures return 422 with field paths.
- Domain errors are typed (`OutOfStockError`, `CouponExpiredError`, `PaymentVerificationError`)
  and mapped to status codes in one place.
- Payment and webhook failures are logged with correlation ids and never silently swallowed.
- The frontend distinguishes recoverable (retry) from terminal (contact support) states.

---

## 9. Testing

- **Unit:** pricing engine, GST split, coupon evaluation, shipping rate selection, OTP
  lifecycle, signature verification. These are pure functions and carry the money risk.
- **Integration:** API routes against a real Postgres via Testcontainers/local Supabase.
- **E2E:** Playwright — browse → OTP login → add to cart → coupon → checkout → mock payment →
  order confirmation, plus the admin product-create path.
- Razorpay is stubbed in tests; signature verification is tested against known vectors.

---

## 10. Milestones

| | Scope | Ships |
|---|---|---|
| M0 | Monorepo, design system, schema, migrations, seed, both deploys green | Live skeleton |
| M1 | Home, collections, filters, full product page with motion | Browsable storefront |
| M2 | Phone OTP, account, addresses, wishlist | Login works |
| M3 | Cart, checkout, Razorpay, coupons, GST invoice, shipping, pincode | **Sellable** |
| M4 | Admin panel, all modules | Operable store |
| M5 | Reviews UI, EMI widget, SEO, a11y, performance, polish | Launch-ready |

Each milestone gets its own implementation plan.

---

## 11. Assumptions

- Currency ₹ only; India only; single warehouse
- Seller GST state: Karnataka
- Product seed data mirrors the *structure* of the Aeolus range with original copy and
  placeholder imagery. Reference-site photography and listing text are not copied.
- Real product assets will be supplied later and dropped into the existing image slots.
