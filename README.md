# Auto Precision Store

Professional pet grooming tables, sold direct. Fifteen products, deep product
pages, phone-OTP customer accounts and a full admin panel.

**Stack** — Next.js 15 on Vercel · Express + TypeScript on Render · Postgres on
Supabase · Razorpay payments · MSG91 for OTP.

---

## Run it locally in three commands

No Postgres server, no Supabase project, no API keys needed:

```bash
npm install
npm run setup
npm run dev
```

`setup` builds the workspace packages, creates a local database and seeds the
catalogue. `dev` starts the API on :4000 and the site on :3000.

- Store — http://localhost:3000
- Admin — http://localhost:3000/admin  (`admin@autoprecision.store` / `ChangeMe!2026`)
- Customer sign-in — any valid Indian mobile; the OTP is printed in the API log,
  and `123456` always works in development.

The local database is PGlite, real PostgreSQL compiled to WebAssembly, stored in
`.localdb/`. Delete that folder and re-run `npm run db:seed` to start clean.

---

## Layout

```
apps/web        Next.js 15, App Router          → Vercel
apps/api        Express 5 + TypeScript          → Render
packages/shared Money, GST, coupons, pricing, Zod schemas — shared over the wire
packages/db     Drizzle schema (30 tables), migrations, seed
```

`packages/shared` holds every rule about money. It is pure, has no I/O, and is
covered by 68 unit tests, because a rounding bug there is a rounding bug on
every invoice.

---

## The rules that matter

**Money is integer paise, everywhere.** Never a float. `formatINR` is the only
thing that turns it into `₹1,12,400` — with Indian lakh grouping, not thousands.

**GST is computed, not stored.** Prices are GST-inclusive per Indian retail
convention, and tax is backed out at checkout. Buyer in Karnataka → CGST + SGST;
anywhere else → IGST. The seller state lives in `settings`.

**The browser is never trusted about price.** Checkout re-prices the whole cart
from the database, then does it again inside the payment transaction.

**The webhook is the source of truth for payment.** Razorpay's browser callback
is treated as a hint that lets us show a confirmation page quickly; an order is
only really paid when the signed `payment.captured` webhook says so. Both paths
converge on one idempotent function.

**Stock is reserved at order creation**, not at payment, so nobody loses the last
table while typing a card number. Abandoned orders release it after 45 minutes.

---

## Commands

| | |
|---|---|
| `npm run dev` | API and web together |
| `npm run build` | Build everything in dependency order |
| `npm test` | 108 tests — 68 unit, 40 integration |
| `npm run db:seed` | Reset the catalogue (leaves users and orders alone) |
| `npm run db:generate` | New migration after a schema change |
| `npm run typecheck` | Across all workspaces |

Integration tests run the real Express app against a real Postgres (PGlite) over
real HTTP. No mocks — that is how they caught four genuine bugs during the build.

> One trap: do not run `next build` while `npm run dev` is running. They share
> `.next` and the build corrupts the dev server's cache. Stop dev first.

---

## Going live

### 1. Supabase

Create a project, then from Settings → Database take **both** connection strings:

- pooled, port **6543** → `DATABASE_URL`
- direct, port **5432** → `DIRECT_DATABASE_URL`

The pooler runs in transaction mode and cannot hold the advisory lock migrations
need, which is why both exist. Then:

```bash
DIRECT_DATABASE_URL="postgresql://…:5432/postgres" npm run db:migrate -w @aps/db
DATABASE_URL="postgresql://…:6543/postgres" npm run db:seed
```

Create a **public** Storage bucket named `media` for admin image uploads.

### 2. Render (API)

Point a Blueprint at this repo; it reads `render.yaml`. Set the secrets marked
`sync: false` in the dashboard. `CORS_ORIGINS` must contain your Vercel domain or
every browser request is blocked.

The API refuses to start in production if Razorpay keys are missing or
`SMS_PROVIDER=mock` — both would fail silently and expensively otherwise.

### 3. Vercel (web)

Import the repo, root `apps/web`. Set:

```
NEXT_PUBLIC_API_URL=https://auto-precision-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
```

### 4. Razorpay

Add a webhook → `https://<api-domain>/webhooks/razorpay`, events
`payment.captured`, `payment.failed`, `order.paid`, `refund.processed`. Put the
signing secret in `RAZORPAY_WEBHOOK_SECRET`.

### 5. MSG91

Register a DLT template containing `##OTP##`, then set `MSG91_AUTH_KEY`,
`MSG91_TEMPLATE_ID` and `MSG91_SENDER_ID`. Swapping providers means writing one
more `SmsProvider` implementation and changing one line in
`services/sms/index.ts`.

### 6. Before you take a real order

- [ ] Change the admin password
- [ ] Put your real GSTIN in `settings` → `store.seller_gstin` (currently a placeholder)
- [ ] **Replace the round-table photography.** `apps/web/public/products/ROUND-PHOTO-CREDITS.txt`
      lists images taken from other companies' retail listings. They are NOT licensed to
      you and must not be published. Shoot the real tables, or get dealer imagery from your
      supplier in writing.
- [ ] Replace the remaining placeholder imagery in `apps/web/public/products/`
      (the rest is Pexels stock — licensed for commercial use, but not photographs of
      your actual products)
- [ ] Check the freight tables in `shipping_rates` against real courier quotes
- [ ] Take one live ₹1 order end to end and confirm the invoice PDF

---

## Design

Near-black canvas, warm bone for contrast sections, one crimson accent taken
from the logo — used for **one thing per screen**. Clash Display for headlines,
Satoshi for body, both self-hosted.

Motion is GSAP ScrollTrigger for scroll-driven sequences, Framer Motion for
components, Lenis for smooth scroll. Only `transform` and `opacity` are
animated. Everything has a `prefers-reduced-motion` fallback that renders the
final state immediately — scroll-hijacking is exactly what that preference
exists to prevent.
