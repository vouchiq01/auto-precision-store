# Auto Precision Store — working context

Read this before touching anything. It covers what the project is, what the
owner has already decided, what he has pushed back on, and the traps that have
already cost real time. Setup and deployment live in `README.md`; this file is
the things that are not obvious from the code.

---

## What it is

An e-commerce store selling **pet grooming tables, bath tubs, cages and bundles** in India.
30 products across 10 collections (18 tables and accessories, plus a second wave
of fixed tables, tubs, combos and cages — see "The second-wave range" below). Owner: Madan, GitHub `vouchiq01`.
Repo: `github.com/vouchiq01/auto-precision-store` (private).

The business is in **Bengaluru, Karnataka** — this matters, because it decides
the GST split on every order.

```
apps/web        Next.js 15 App Router      -> Vercel
apps/api        Express + TypeScript       -> Render
packages/shared money, GST, coupons, pricing, Zod schemas
packages/db     Drizzle schema (30 tables), migrations, seed
```

---

## Who we are selling to

**Not only professionals.** This was a direct correction from the owner and it
matters more than it sounds.

An early version of the site was written around salons — headlines like
"Engineered for the working groomer" and "Built for salons." He rejected that:
segmenting the headline by buyer type makes everyone else read past it, and
almost nobody grooming a dog thinks of themselves as a segment.

The range runs from an ₹8,900 folding table someone uses at home twice a month
to a ₹1,12,400 flagship. Copy must work for both.

The current hero is **"Stop grooming on the floor."** — it names a problem the
reader already has. Keep that register. The word "salon" has been deliberately
removed from every page and all 18 products; do not reintroduce it.

What he asked for, in his words: *convince them how our products will be helpful
and easy for them, and show them properly.* The story sections still do that,
but they now sit **below the shopping**, not above it. A client looked at the
site and said it was not attractive, and that "to see products we still need to
scroll" — and he wanted a full redesign, not a recolour. The homepage is now
shop-first (see "Shop-first layout" below): a short hero and the bestsellers
all inside the first screen; the lift / turn / hold
story, the demo and the flagship follow for people who want the reason.

---

## The product, as he describes it

Three capabilities carry the sale. Every product page leads with them:

- **Up and down.** Real per-model travel figures, computed from each product's
  own specs, with mechanism-specific copy (powered / foot-pump / hand-set).
- **Rotation.** 360° locking deck. Fitted to all electric and hydraulic models
  plus the whole round Orbit R range. **This fitment is an assumption — confirm
  it with him before launch.** Flagged in `packages/db/src/seed/products.data.ts`.
- **Home use.** Closing block on every product plus an FAQ.

**Round tables are a real part of the range** and he raised them specifically.
The Orbit R collection: ₹27,000 (the one he named), ₹21,400 mini, ₹38,900 LED.

---

## The second-wave range — placeholder products

Fixed tables (×3 sizes), stainless bath tubs (×3), two bundles and four stainless cages were added
because the client pointed at a manufacturer's grooming range and asked for the
same *kinds* of product. They live in `packages/db/src/seed/products.extra.ts`.

- **Everything in it is invented**: names, prices, capacities, warranty, the
  tubs' HSN code (7324 is an assumption — his accountant decides). Nothing was
  copied from the reference site, whose photos carry its own logo and whose
  listing text is theirs; it was read only to learn which product types exist.
  Confirm with the owner which of these he really sells before launch.
- **Their photographs are the client's AI-generated images** (a groomer and a dog on
  a table, in a tub, in a cage), assigned to products in `public/products/<slug>/`
  with an `images.json`. They are placeholders: the same picture serves several
  sizes of a product, and the tables shown are not necessarily the real ones.
  A product with no photograph shows a "Photo coming soon" tile
  (`photo-placeholder.tsx`); the seeder inserts no image rows for it.
- Four collections (`fixed-tables`, `bath-tubs`, `combos`, `cages`) have no
  collection photo; the homepage rail renders a plain ink tile for those.
- Listing counts say "products", not "tables", because tubs and bundles are now
  in the same lists.

### Seeding a database that has orders — read this

`npm run db:seed` **truncates the catalogue with CASCADE**, which also empties
every table that references a product: order lines, carts, reviews. Fine on a
throwaway local database, destructive on one holding real orders — the
"orders are left alone" comment in the seed is true of `orders` but not of what
hangs off a product.

To add the second-wave products to a database that is already live, use the
additive script, which inserts only what is missing (keyed on slug) and deletes
nothing: `DATABASE_URL=<direct url> npm run seed:extra -w @aps/db`. It is safe
to run more than once.

---

## OPEN QUESTION — ask him

**His actual price ceiling.** He said "we sell round only 27k" and the round
table is set to exactly ₹27,000. But the rest of the catalogue still carries
prices derived from a reference site — Apex E9 at ₹1,12,400, Vertex line
₹47k–65k. If his real range tops out nearer ₹30k, **the whole catalogue is
mispriced**. This has been asked several times and is still unanswered. Ask
again before anyone treats the prices as real.

---

## Imagery — read before touching

**The competitor-sourced round-table photos are no longer shown.** They were
taken from Lohas Pets, Sanglepet, Alibaba and Amazon listings — other companies'
copyrighted photography — and one still carried a retailer's logo once images
stopped being cropped. The round range now uses a client-supplied photograph
(`01.jpg`, cropped from his image), and each round product's `images.json`
lists only that file, so the leftover competitor files in those folders
(`02`–`04`, `feature-*`, `*.png`, `spin/`) are ignored by the site. **They are
still on disk and in git history.** Delete them, and rewrite history, before this
repo is ever made public. `spin/frames.json` is emptied so the 360° tab no longer
appears for the round range.

The electric tables (Apex ×2, Vertex ×4) use four client-supplied images: a
table on white, a feature infographic, and a studio photo (`01`–`03`, listed in
each `images.json`). They are AI-generated, the same picture on all six models,
and **the table in them is a scissor lift** while some product copy describes a
single-column or twin-actuator mechanism — confirm against the real products.
Two further showcase images the client sent (a table branded "ProGroom", with
"28–100 cm" and "60–110 cm" printed in them) were deliberately NOT used: the
printed figures and brand contradict our product data.

### Photos uploaded in the admin (the normal way from now on)

`/admin/products/<id>` has a **Photos** card: drop or choose files, they upload to
**Supabase Storage** and appear as tiles; the first tile is the main photo, tiles
can be moved, made main, given alt text and removed; press **Save** to publish. Each
story block on the same form has its own **Upload** button. Code: `PhotoUploader` /
`UploadButton` (`components/admin/photo-uploader.tsx`), `lib/upload.ts` (shrinks
anything over ~2.5 MB or 2400 px before sending), `POST /api/admin/uploads`
(`routes/admin/upload.routes.ts`) and `services/storage.service.ts`.

- **Needs two Render environment variables**, or uploads answer "not set up":
  `SUPABASE_URL` (`https://<project-ref>.supabase.co`) and `SUPABASE_SERVICE_ROLE_KEY`
  (Supabase → Project Settings → API Keys → the **secret / service_role** key).
  **That key is a secret: Render only, never `NEXT_PUBLIC_*`, never in git or chat.**
  The bucket (`media` by default, `SUPABASE_STORAGE_BUCKET`) is created public-read on
  first use; nothing to do in the dashboard.
- The file's type is read from its **bytes**, not the Content-Type header; only JPEG,
  PNG, WebP and AVIF are accepted (no SVG, no video); filenames never become paths;
  12 MB cap. Tests: `journey.test.ts` → "photo upload".
- **Locally with no Supabase variables** (and outside production) uploads fall back to
  `apps/web/public/uploads/` (git-ignored). Keep `SUPABASE_*` commented in `.env`
  unless you mean to write to the live bucket.
- CORS must allow `x-folder` and `x-filename` (it does, in `app.ts`) or the browser's
  pre-flight blocks the upload in production only.
- `next.config.ts` allows `*.supabase.co` public-bucket images as well as the
  configured host, because a product with an uploaded photo would otherwise **throw**
  when `NEXT_PUBLIC_SUPABASE_URL` is missing at build time.
- **`seed:images` leaves any product that has an uploaded photo alone** (it has a
  non-`/products/` URL), so a re-sync can never delete the client's uploads or bring
  back the stand-in photos he replaced. The full seed still wipes everything.
- The storefront caches catalogue pages for **5 minutes** (`CATALOGUE_REVALIDATE`), so a
  saved photo can take up to five minutes to appear. There is no on-demand revalidation
  yet; add a revalidate hook if the delay matters.
- Removing a photo in the admin detaches it from the product but leaves the file in
  the bucket (it is small and harmless); there is no clean-up job.

### Adding photos: `images.json` and `seed:images`

Drop files in `apps/web/public/products/<slug>/` (`01.jpg`…, `feature-1.jpg`…).
An optional `images.json` — `{ "gallery": ["01.jpg"], "features": [] }` — says
exactly which to use, in order, and the site ignores the rest; `features: []`
makes the story sections text-only. Then deploy the web app and run
`DATABASE_URL=<direct url> npm run seed:images -w @aps/db`, which re-syncs only
`product_images` and each story section's media — safe on a database with orders.
Next caches optimised images by path, so `rm -rf apps/web/.next` locally after
replacing a file in place.

The rest is Pexels stock (licensed for commercial use, but still not his tables).

He has corrected image choices twice, and both corrections generalise:

- **Show the product, not the activity.** The first pass used "dog grooming"
  photos — a dog on a sofa, a walk in a field, a food bowl. For a shop selling
  tables, a table must be in frame. Every primary image now has one.
- **It must attract buyers.** Photos are judged *with the hero wash and headline
  applied*, not in isolation.

The 360° viewer reads `spin/frames.json` per product, so real photography drops
in with no code change. **18 shots of a real table, turning it ~20° each time,
would replace all of this** — tell him that; it is the single highest-value
thing he can do.

---

## The palette

The site was near-black until it wasn't. He rejected it twice — first the hero,
then the whole thing — and he was right on the merits: dark-luxury suits a small
glowing gadget, not a large piece of equipment bought on trust, and not the long
spec tables that actually close the sale. Light is also far kinder to a small
catalogue; eighteen products in a dark grid read as empty rather than spare.

So: **warm paper canvas, white cards, and a white header.** The client supplied
his real logo — a red "ap" mark, "Auto" in red and "Precision" in black — and it
is designed for a light background: the black wordmark vanishes on navy. So the
header (both rows, the search field, the mobile menu and the phone tab bar) is
**white**, with crimson as the active/accent colour. Navy "ink" survives only in
the footer (which uses the one-colour `logo-white.png`) and the flagship story
section of the page. The cart drawer and the cart/checkout/account/order title
band (`ListingHero`) are white too.
The first screen of the homepage is a warm cream-to-blush gradient. **Do not put
the full-colour logo on a dark surface and do not redraw it in code** — use
`public/brand/logo.png` / `logo-white.png` through the `Logo` component. The
favicon is `app/icon.png`, the "ap" mark alone. `amber` is for dark bands only.

Semantic token names, all defined in `apps/web/src/app/globals.css`:

| Token | Use |
|---|---|
| `canvas` / `surface` / `sand` | page, cards, warm panels |
| `content` / `muted` / `faint` | text, in descending emphasis |
| `line` / `line-strong` | hairlines, borders |
| `ink` / `ink-raised` / `on-ink` / `on-ink-muted` | the dark bands only — midnight navy, not black |
| `amber` / `amber-deep` | the highlight on dark bands only (headline word, cart count, icons). Fails contrast as text on paper, so never on the canvas |
| `crimson` / `crimson-deep` / `crimson-tint` | the single accent |

Two things to keep straight:

- **Hover deepens, it does not brighten.** On the old dark canvas hover went
  lighter. On paper a lighter red reads as disabled. `hover:text-white` is
  hover-to-invisible — it is gone from the codebase; do not reintroduce it.
- **A dark section needs `.on-ink` AND swapped utilities.** The scope only
  recolours the shared `.eyebrow` / `.lede` classes, which carry their colour in
  CSS. Anything coloured by a utility has to be swapped in the markup too.

`faint` at #7A6F63 is exactly 4.5:1 on canvas — it is the floor for the 11px
eyebrow caps, so do not lighten it.

## The homepage sequence

`table-demo.tsx` is a self-playing sequence of five real photographs: grooming
on a kitchen floor, the table dropped low, raised to working height, the dog
turned, the arm holding it steady. It advances every 3s.

**It was scroll-driven and pinned across 300vh. Do not go back to that either.**
He said it made the page feel like it hung, and he was right: holding the
viewport for three screens of scrolling does not read as an effect on a shop,
it reads as the page having stopped responding. It is one screen tall now and
plays itself. It replaced a three-step text block, because
the real objection is not "how many steps" — it is that someone who has never
used a grooming table cannot picture one working, and no specification fixes
that.

**It was briefly a drawn dog on a drawn table. Do not go back.** He rejected it
twice and he was right: an illustration of a dog reads as an illustration no
matter how much anatomy goes into it, and the entire job of this section is to
make the thing look real. There is no illustration anywhere on the site now.

- **Four of the five beats now use the client's AI-generated salon photos**
  (`banners/demo-low|raised|turn|hold.jpg`, 4:3 crops chosen so the dog, the
  groomer and the table all show). The first beat, "Right now, it happens on the
  floor", still uses a Pexels photo (`banners/demo-floor.jpg`) because no photo of
  grooming on a floor has been supplied — it is the contrast the section exists to
  make. Ask the client for one. The remaining Pexels images are recorded in
  `products/CREDITS.txt`.
  Deliberately NOT the round-table set — that imagery is taken from
  competitors' listings, which is tolerable as a placeholder on a product page
  and not as the animated centrepiece of the homepage.
- **Only the incoming photo animates.** Fading the outgoing one out at the same
  time leaves both at 50%, and two photographs at half opacity read as a double
  exposure rather than a dissolve. Stacked in DOM order, the previous shot stays
  opaque underneath and is simply covered.
- It only advances **while on screen** (IntersectionObserver), so it is not
  three beats into the story before anyone scrolls down to it.
- **It does NOT pause on hover, and there is no pause button.** Both were tried
  and both were wrong. This section fills the viewport on a desktop, so pausing
  on hover meant the pointer was resting on it essentially always and the
  sequence never advanced at all — he saw a play button and a frozen slide and
  asked, reasonably, why the thing he asked to be automatic had a play button.
- The **dots are the stop mechanism**: clicking one takes control and stops the
  advance for good. That is what satisfies WCAG 2.2.2 now the button is gone.
  Focus still pauses, so a keyboard user is not carried off the control they
  are on. Do not reintroduce hover-pause on the section as a whole; if reading
  time becomes the complaint, lengthen the dwell instead.
- **3s shows the headline, not the paragraph.** The headline carries each beat
  and the body is detail. If the copy ever needs to be *read* at speed,
  lengthen the dwell rather than assuming anyone finished it.
- The thing that would genuinely finish this: **six phone photos of one real
  table**, tripod fixed — dog on the floor, stepping on, sitting low, raised,
  turned, arm on. They drop straight into `BEATS` and the section becomes his
  own product instead of stock.

## Pincodes

We deliver everywhere in India, so serviceability is not the question the check
answers — **"is this a real address"** is. Promising delivery to a typo is how a
crate goes out to nowhere and a customer waits a fortnight for it.

Three layers, cheapest first:

1. `isValidPincode` (shared, offline) — six digits, first digit 1–8, and a
   two-digit prefix India Post actually issued. 29, 35, 54, 55, 65, 66 and
   86–89 sit in gaps between circles and are refused with no network call;
   90–99 is Army Postal Service, which no courier will crate to.
2. The `pincodes` table — metros are seeded, and every directory answer is
   written back, so a pincode costs one outbound call in its lifetime.
3. `api.postalpincode.in` — the only thing that can prove a pincode EXISTS.
   `111111` is six digits on a real Delhi prefix and no such post office was
   ever issued; only the directory catches that. 3.5s timeout.

**A directory outage must never lose a sale.** On any error the answer stays
"we deliver", it just cannot name the town. `setPincodeDirectory()` swaps the
lookup so tests never touch the network — always use it when adding cases.

`reason` on the response distinguishes `unknown_pincode` (the shopper's typo,
shown in crimson with `role="alert"`) from `not_serviceable` (not their fault,
amber) from `lookup_unavailable` (ours, muted).

## Checkout identity

**Identity is confirmed at the pay step, not at the door.** There is no login
wall in front of the cart or the address form, and there should not be one:
forcing an account before someone can even see freight is the largest single
cause of abandoned carts, and it lands before they have committed to anything.

But a crate worth up to ₹1,12,400 ships against the phone number on that form,
and the 12–36 month warranty needs a customer behind it. So at "Pay", a guest
gets a 6-digit code to the number they already typed. Verifying creates the
account and attaches the order — framed as *confirm your number*, never as
*sign up*.

- `POST /checkout/orders` is `requireAuth`. Quoting stays open, because freight
  and the GST split are exactly what someone needs in order to decide. The
  browser gate is a convention until the server insists.
- **Signing in must never cost someone their basket.** `getOrCreateCart` keys
  on the user as soon as there is one and stops reading the cookie, so
  `claimGuestCart` hands the guest cart over first. Without it the shopper
  verifies at the pay step and lands on an empty cart — and that was already
  true of signing in from the header mid-shop.
- **Never charge a total that was not on screen.** Claiming merges an abandoned
  cart from a previous visit into this one, which legitimately moves the total.
  Checkout re-prices after verification and stops with a message if it changed,
  rather than placing an order for a figure nobody saw.

## Add to cart from a listing card

> **Update (supersedes the picker described below):** the card now shows a row
> of finish swatches (the chosen one ringed and named) above one full-width
> "Add to cart" button. The first in-stock finish is pre-selected. A "Choose
> finish" button that opened a pop-up was tried and the client found it
> confusing — do not bring it back. The reason for not guessing silently still
> holds: the finish is on screen before the tap and repeated on the cart line,
> so a default is visible, not hidden.

Every in-stock card carries a **cart icon**. He asked for one twice, and the
first attempt gave the eight two-finish tables a swatch icon that linked to
the product page instead — which on a collection page of electric tables meant
not one card had the thing he asked for. Don't do that again.

The real constraint still holds: eight of the eighteen tables come in two
finishes, and adding whichever sorts first to a ₹38,400 order is a wrong
order, not a small annoyance. So the card **asks** rather than guessing or
navigating away:

- One option → the icon adds it straight away.
- More than one → the icon opens a small finish picker on the card, with
  colour swatches, and adds what they pick. One tap, no page change.

`ProductSummary.options` carries `{ id, label, hexColour, inStock }` per
variant so the card can do this. It is named `options`, not `variants`,
because `ProductDetail` already uses that name for the full variant rows.

- The control is **always rendered**, not hover-only: something that appears
  on hover is invisible on a touch screen and unreachable by keyboard.
- The card is a container with a **stretched link** on the title, not one large
  `<a>`. A `<button>` inside an `<a>` is invalid HTML and browsers disagree
  about it. Keep the control above the stretched link's `::after` (`z-20`).
- The card treats `options` as possibly absent (`?? []`). Collection pages are
  ISR-cached, so during a deploy a card can be handed a payload shaped by the
  previous release — that should mean no button, never a white screen.

## Addresses: the snapshot and the book are different things

Two separate copies, on purpose, and conflating them breaks one or the other:

- **The order's snapshot** (`orders.shippingAddress`, JSON). Frozen. It must
  never change when someone later edits or deletes an address, or historic
  invoices would quietly rewrite themselves.
- **The address book** (`addresses` table). Editable, soft-deleted, and what
  checkout prefills from.

Only the snapshot existed. The book was written by nothing, so
`/api/account/addresses` returned empty for every customer, "use my saved
address" had nothing to offer, and the account page had no addresses section
because there was nothing to put in it. `rememberAddress` in
`checkout.service.ts` now saves it too — after the transaction commits, so a
rolled-back checkout leaves nothing behind; deduplicated on name + line1 +
pincode so four orders to one house do not make four entries; first one saved
becomes the default; and wrapped so a failure there can never fail an order
that has already been paid for.

The account page states this to the customer, because "Remove" next to an
address they can see on a past order is otherwise alarming.

## apiFetch does not attach tokens

`apiFetch` only sends `Authorization` when a call passes `{ token }`
explicitly. Nothing warns you: the request just goes up as a guest.

This had already cost something real — the checkout page never passed a token,
so **every order was created with a null userId** and no customer ever saw
their orders under "Your orders", signed in or not.

And reading the token out of state immediately after signing in is a race.
`verifyOtp` returns the whole session for exactly this reason: the caller
resumes on a microtask, long before React has committed the new token, so a
closure captured during the pre-sign-in render still holds `null`. Thread the
returned `accessToken` through; do not reach for state or a ref.

One more trap from the same bug: `refreshQuote` clears `error` every time it
runs, and it runs whenever the cart or address changes. A failed order was
being wiped milliseconds after it appeared. Order-path failures go in
`orderError`, which the quote never touches.

## Carrier and tracking

Admin picks a **carrier** from a known list (`CARRIERS` in
`packages/shared/src/constants.ts`) and types the AWB/tracking number; the
tracking URL is built automatically from a per-carrier template
(`carrierTrackingUrl`), with a manual override field for couriers with no
predictable URL shape ("Professional Couriers") or anything not on the list
("Other").

**Marking an order "shipped" without both is refused** — a shipped order with
no carrier and no tracking number is one the customer has no way to follow and
support has no way to answer "where is my table" about. Enforced in
`updateOrderStatus` (`order.service.ts`), deliberately **after** the
legal-transition check, not in the Zod schema: the schema only enforces the
shape-level rule (carrier and tracking number travel together, or neither is
present), because a request that is illegal for an unrelated reason — skipping
a status — must still report as `invalid_transition`, not get masked by a
validation error about tracking fields it was never going to use.

Carrier and tracking number can also be added or corrected outside a status
change, from the same inline form in the admin orders table (`+ Add tracking`
/ click the existing value to edit) — a courier's AWB sometimes needs fixing
after the fact, and that must not require walking the order backward through
the status machine to do it.

## WhatsApp order notifications

New order -> seller's own WhatsApp number. Order status change -> the buyer's.
Same pluggable-provider pattern as `services/sms/` (interface + mock + real
provider + a factory that picks one from env) — see `services/whatsapp/`.
Provider is the WhatsApp Cloud API direct (no BSP), because that is what he
already has connected in Meta Business Manager.

**Every message is a template message, never free text.** WhatsApp only
allows free-form replies inside the 24-hour window after the *customer*
messages first; every notification here is business-initiated, so it has to
use a template Meta has already approved. `order-notifications.service.ts`
sends three positional body params per message — **the exact params are a
starting guess, not a contract**: once there are real approved templates,
line `bodyParams` up with that template's `{{1}}`, `{{2}}`, `{{3}}` in the
same order the template actually uses them, and add a header/button component
to the payload in `meta.provider.ts` if the approved template has one.

Needed in `.env` before this does anything real: `WHATSAPP_PROVIDER=meta`,
`META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN` (**permanent** —
a system-user token, not the short-lived one Meta hands out by default, which
expires and silently stops every notification with no error anywhere obvious),
`SELLER_WHATSAPP_NUMBER`, and the two template names. Until then it runs on
`mock`, which just logs — checkout and admin status changes work identically
either way, because a notification must never be able to block or fail the
operation that triggered it.

**Two correctness traps already found and fixed here:**

- `markOrderPaid` is idempotent by design — both the browser callback and the
  Razorpay webhook call it, and a duplicate webhook delivery is routine, not
  an edge case. The buyer must hear "payment received" once, not once per
  delivery. Do NOT gate the notification on `result.status === 'paid'` — the
  idempotent no-op branch returns the order in whatever status it was already
  in, which is also `'paid'`, so that check fires on every duplicate too. Gate
  it on an explicit flag (`justTransitioned`) set only inside the branch that
  actually performed the update.
- Stored phone numbers are a bare 10-digit Indian mobile (see `phoneSchema` —
  the country code is deliberately stripped at input time). WhatsApp's Cloud
  API needs the country code back on. `toWhatsappNumber()` in
  `order-notifications.service.ts` is the one place that re-adds it; do not
  send a stored phone number to the provider without going through it.

## ALLOW_MOCK_SMS_IN_PRODUCTION — staging-only escape hatch

The API refuses to boot in production with `SMS_PROVIDER=mock`, on purpose —
every OTP being `123456` is an account-takeover hole, not a cosmetic warning.
`ALLOW_MOCK_SMS_IN_PRODUCTION=true` (in `env.ts`) overrides that refusal for a
staging deploy that's reachable over the internet before MSG91/DLT is sorted
out. It logs a loud warning on every boot while it's on. **Never set this on a
deployment real customers can reach** — turn it off (and switch
`SMS_PROVIDER` to `msg91`) the moment MSG91 is configured, before announcing
the store is live.

## Public coupon listing

Coupons are private by default — `coupons.isPublic` (default `false`), admin
opt-in per code from the "Storefront" column on `/admin/coupons`. Existing
coupons stayed hidden when this shipped; nothing becomes visible without the
admin deliberately switching it on.

`GET /api/coupons/public` is the only thing that lists them, and it is the one
coupon code path that is not cart-scoped. `evaluateCoupon()` needs a cart
(`CouponLine[]`) to check scope and minimum-order eligibility, which a
browsing shopper does not have yet — so listing uses a lighter, separate check,
`isCouponCurrentlyLive()` in `packages/shared/src/domain/coupon.ts`: active,
public, within its date window, total usage not exhausted. Minimum order value
and scope are **not** gating conditions here — a ₹25,000-minimum code is still
worth showing, just not applicable to every basket, so `minOrderValue` comes
back in the response for the UI to print ("min ₹25,000") rather than being used
to decide whether the code appears at all.

The storefront component (`components/cart/available-coupons.tsx`, used in
both the cart page and the drawer) lists each published code as a small ticket
("5% OFF · WELCOME5 · On orders above ₹10,000 · Use"), copies the code to the
clipboard **and** drops it into the coupon field — it does not apply the coupon
itself. Tapping a ticket must never change the cart total on its own; the
shopper still presses Apply (the red button inside the field, disabled while the
field is empty). The stub text and terms line come from `lib/coupon-display.ts`,
shared with the homepage offers strip. In the cart page and the drawer the coupon
is a collapsed "Add a coupon code" row that expands; once applied it shows
"CODE applied / You save ₹X" with a Remove link.

## Shop-first layout, search and the phone tab bar

Do not push the products back below the fold. The first screen of the homepage
is: header (search + collections) → a hero about 300px tall → the four
bestsellers. On a phone the hero drops its photo and the bestsellers
are a two-column grid. Everything that explains or reassures (trust bar, shelves
per collection, the demo, the story) comes after.

- **Product cards** (`product-card.tsx`) are built to be compared: category,
  name, rating, price with the percent saved, EMI line, one button. Every shelf
  — bestsellers, the per-collection rails (`product-rail.tsx`), `/shop`,
  collection pages, "also consider" — renders this one card, two across on a
  phone. The card no longer tilts toward the cursor and no longer shows an
  index numeral.
- **Search** is real. `search-box.tsx` calls `/api/catalog/products?search=`,
  which matches name, tagline, summary, SKU **and the collection's name**
  ("portable" finds the whole Portable collection). On a desktop it is the bar
  in the header; on a phone the header icon and the tab bar open a full-screen
  sheet (`providers/search-provider.tsx`). Enter goes to `/shop?search=`.
- **One collection list per screen — and no pill row at all.** The desktop header's
  second row is the navigation; on a phone or tablet the same list is in the
  hamburger menu. A pill row under the header (`category-pills.tsx`) used to repeat
  it, first on desktop (the client noticed the duplicate) and then on phones, where
  it only added a row of clutter above the products; it was removed everywhere and
  the component is now unused. Do not add a category list to a filter sidebar either.
- **`/shop`** lists every product, with the same sticky search / sort / price
  toolbar as the collection pages (`filter-bar.tsx`). Filters live in the URL.
- **Phone tab bar** (`mobile-tab-bar.tsx`): Home / Shop / Search / Cart /
  Account. It hides on `/products/`, `/checkout` and `/order/` because those
  bring their own fixed bottom bar — never stack two. `<main>` gets `pb-16`
  while it is showing.
- **Header height** is 64px on a phone and 108px on a desktop (two rows). Pages
  reserve `pt-28 md:pt-36` (144px), and hero/listing bands use
  `lg:pt-[8.5rem]`; the sticky toolbar sits at `top-16` / `lg:top-[6.75rem]`. If
  the header changes height, change those together.
- Stay away from DarkOtter's copy, photography and layout — the client's
  reference was for *feel*; their images carry their own logo and are theirs.

## Homepage pictures: tiles, "up and down" sections, flagship

- **Collection tiles** (`category-rail.tsx`) are a 5-column grid (two rows for ten
  collections), not one flex row: ten tiles in a row were slivers that cut every
  dog in half. Their photographs are `public/categories/<slug>.jpg`; the database
  holds the path, so after changing one run `seed:extra` (it now refreshes
  `imageUrl` on existing collections) or the full seed locally.
- The three "goes up and down / rotates / folds away" sections use
  `banners/wid-updown|rotate|fold.jpg`; the flagship story and every electric,
  portable and foldable product page use `feature-1..4.jpg` in the product folder.
  These are 4:3 landscape crops of the client's portrait photos — crop to include
  the dog, the groomer and the table, not the centre of the frame.

## Homepage sections that were removed

The dark "The flagship — Apex E9" story and the "Nobody buys a ₹60,000 table on a
whim" proof section were taken off the homepage at the client's request ("no
need"). `featured-story.tsx`, `proof.tsx` and `category-pills.tsx` are still in
`components/home/` but nothing renders them. Delete them if they are not coming
back.

**Phone product cards are deliberately short** (about 350px, down from ~440):
4:3 photo area, a one-line rating (empty stars only — the "No reviews yet" words and the
"You save" line show from `sm` up), price + % off with the struck M.R.P. under it, no EMI
line, swatches without the finish name, a 36px button. "Only N left" stays on a phone: it is
rare and it matters. Do not give the phone card back its
extra rows without a reason.

## Product images: white stage, whole product

The client showed a competitor's product page — the product alone on white,
nothing cropped — and said he did not like our look. So **every product image
sits on a white stage and is shown whole** (`object-contain` with padding, never
`object-cover`): cards, the product gallery and its thumbnails, the hero tiles,
search results, cart, checkout, account and order thumbnails. Do not put a
cropped lifestyle photo back into those places.

- **The photos themselves are still the old ones.** Only the three round tables
  have a true table-alone-on-white shot (and those are competitors' placeholders —
  see "Imagery"). The other products still show dog-and-groomer photos, now
  letterboxed on white, because they are all we have. The real fix is
  white-background product photography from the client or his supplier; drop
  `01.jpg`… in `public/products/<slug>/` and re-seed, no code change.
- **The hero is light, not navy** (client: the dark background "is not looking
  attractive"). It is a warm cream-to-blush gradient with the header still navy
  above it, the client-supplied photograph of a groomer, a dog and a round
  table (`public/banners/hero-round-table.jpg`, cropped from his image — the
  crop also drops a corner watermark) on the right, and one price card for the
  Orbit R round table under it. This supersedes the "keep the first screen dark"
  line in "The palette": the client has now rejected the dark hero too. The
  photo is shot on white, so its edges are feathered with nested masks and a
  white glow sits behind it. **Do not use `mix-blend-mode` there** — a mask
  isolates its layer so the blend has nothing to blend with — and **do not
  combine two mask layers with `mask-composite`**; nest two single-gradient masks.
  **On a phone** the photo sits beside the headline (a two-column grid, with a
  "From ₹8,900" tag in place of the price card) and the facts become **three small
  two-line tiles in one row** — "Easy EMI / at checkout", "12–36 months / warranty",
  "Free freight / ₹25,000+ · Karnataka" — with the GST chip dropped. The Karnataka
  qualifier must stay on the freight tile (the claim is only true there). From `sm`
  up they are the longer one-line chips. Keep the hero to about 400px there so the products stay on the first screen; an earlier
  stacked version (headline, subtitle, two buttons, a sideways-scrolling chip
  row, no photo) was called messy by the client.
- Four chips of checkable facts sit under the buttons (EMI, 12–36 month
  warranty, Karnataka free-freight threshold, GST invoice). Every chip must stay
  true to the data — see "Claims must match the data". Never print a discount
  that is not the real compare-at price: the second-wave "was" prices are
  placeholders set to ~20–25% like the rest of the catalogue, because an invented
  40% "was" price is a misleading claim.
- The browser pane does not paint nested masks; verify masked/blended imagery in
  real Chromium (Playwright) before trusting a blank screenshot.

## Listing pages: slim header, one toolbar

The shop and all nine collections open with `ListingHeader`
(`components/collection/listing-header.tsx`): a white strip with the breadcrumb,
the title, a quiet "26 products" count and one line of description — about 150px
under the site header. A tall gradient "cover" with a best-seller tile and two
chips was built first and the client rejected it twice ("so much space"); do not
rebuild it. Cart, checkout, account and order use `ListingHero`, the same light
strip with an optional action and a node for a description.

Under it is **one toolbar** (`filter-bar.tsx`): a Price menu, an "In stock"
toggle, and a Sort menu on the right; "Clear all" and a "N results" count appear
only while a filter is on.

- **There is no search box on the page.** The site header already searches the
  whole catalogue; a second field did the same job and the client asked why there
  were two. A live search shows as a dismissable `“term” ✕` pill in the toolbar.
- The Price and Sort controls are small menus (`Menu` / `MenuOption`), not
  native `<select>`s. Filters live in the URL, so a filtered view is shareable.

### The cart drawer and cart page, redesigned

The drawer (opened from the header Cart button; it no longer opens on add) has a
white title bar with a count badge, the free-freight bar, each line as a white card
on the warm canvas (photo, name, finish, a trash icon top-right, the quantity
stepper and the line total side by side), and a footer with a one-row "Add a
coupon code" that expands, the totals, a "Checkout · ₹X" button and "View full
cart". The empty state is a soft circle, a short line, a Shop button and four
collection links. The cart page shares every one of those pieces
(`components/cart/*`, `compact` for the drawer), so change a line once.

## The guest cart token: phones block the cart cookie

**Symptom on a phone, fine on a laptop:** add one table, add another, and the first
is gone; apply a coupon and the cart empties. **Cause:** the shop (Vercel) and the
API (Render) are different sites, so the `aps_cart` cookie the API set was a
*third-party* cookie, which Safari/iOS and several Android browsers block — every
request arrived with no cookie and the server made a fresh empty cart. Laptops that
allow third-party cookies never showed it, so it shipped.

**Fix:** the guest-cart token also travels as a header. The server returns
`x-cart-token` on every guest-cart response (`CART_HEADER` / `guestCartToken` in
`cart.routes.ts`; it wins over the cookie), `lib/api.ts` keeps it in localStorage
and sends it on `/api/cart`, `/api/checkout` and `/api/auth` calls, and sign-in
answers `x-cart-token: none` once the cart is handed to the account so the client
forgets it. CORS exposes and allows the header and caches the pre-flight (`maxAge`).
The cookie is still set for browsers that accept it. Do not "simplify" this back to
cookie-only; `journey.test.ts` has a cookie-less phone suite that fails if you do.

**Still cookie-only:** the sign-in *refresh* cookie (`aps_rt`) has the same
third-party problem, so on a phone a signed-in customer may look signed out after a
reload. Not fixed — it is an auth change and deserves its own care (a same-site
proxy or a first-party API domain such as `api.<store domain>` is the proper cure,
and the same-site API domain would also remove the need for the header).

**Adding feels slow on a phone** because the API is a second or more per add (about
ten sequential database round trips from Render to Supabase). So the add is
**optimistic**: the photo flies, the card says "Added ✓" and the header count rises
at once (`pendingAdds` in `cart-provider.tsx`); on failure the count drops back and
`showCartMessage` says why. The real cure is a faster API: put Render and Supabase
in the same region and cut the sequential queries in `addItem`/`getCartSummary`.

## Adding to the cart: the photo flies, the drawer stays shut

Adding to the cart no longer slides the cart drawer open. The confirmation is
`lib/fly-to-cart.ts`: a copy of the product photograph lifts off, curves to the
header's Cart button (`data-cart-target`, visible at every screen size), shrinks
into it and the button bounces; the card button reads "Added ✓" for a moment.
The drawer opens only when Cart is tapped. `addItem` in `cart-provider.tsx`
deliberately does not call `setIsOpen`.

- Three places add: the product card, the product page's `buy-box.tsx`, and
  `sticky-bar.tsx`. All fly **after** the add succeeds; a failure shows a short
  message (`showCartMessage`) instead — success needs none.
- The flight starts from the photo (`photoRef` on a card, `[data-fly-source]` on
  the gallery). If that is scrolled off screen it starts from the pressed button.
- Plain DOM and the Web Animations API on purpose: a one-shot effect that must not
  re-render React. It does nothing under `prefers-reduced-motion`.
- If a new place adds to the cart, give it the same two lines (fly on success,
  message on failure) and do not reopen the drawer.

## Database security: row-level security must be ON

Supabase exposes the `public` schema through its **Data API**, callable by anyone
who has the project's public (anon / publishable) key — which sits in
`NEXT_PUBLIC_SUPABASE_*` and was pasted in chat. With RLS off that key could read
(and change) every user, address, order, payment, sign-in code and session; this was
found on 2026-10-09 (all 30 tables "UNRESTRICTED") and fixed the same day by enabling
RLS on every table with **no policies**. The public roles now see nothing; the store
is unaffected because the API connects as `postgres`, which bypasses RLS.

- **A table added by a later migration is NOT protected** until you run
  `DATABASE_URL=<direct url> npm run db:secure -w @aps/db` (idempotent) — do it after
  every migration that creates a table, and check the Supabase Table Editor shows no
  "UNRESTRICTED" badge. A new product-style table with no policy is the safe default.
- Do not add policies to let the browser read tables directly; the API is the only door.
- Do not give the public key to anything that does not need it, and never put the
  **service-role / secret key** (or the database password) in a `NEXT_PUBLIC_*`
  variable, the repo, or chat.

## Cart, checkout and account pages

Rebuilt to match the light shop-first look (white `ListingHero` band, white cards
on a warm canvas, sticky summary). The logic did not change; only layout did. Things that are not
obvious from the markup:

- **One set of cart components serves both the page and the drawer** —
  `components/cart/{cart-line,qty-stepper,freight-progress,coupon-box,cart-totals}.tsx`,
  each with a `compact` prop for the drawer. Change a line item once, not twice.
- **The freight nudge is Karnataka-only on purpose.** `KARNATAKA_FREE_FREIGHT`
  in `lib/store.ts` (₹25,000) is the only threshold the site advertises. The
  database holds higher ones for other zones, but we do not know the shopper's
  zone until the pincode, so the copy says "in Karnataka" rather than promising
  something a Chennai buyer will not get. It compares the **post-discount**
  total, like the server does.
- **`/cart`, `/checkout` and `/order/` hide the phone tab bar**
  (`HIDDEN_ON` in `mobile-tab-bar.tsx`). The cart page pins its own total and
  Checkout button to the bottom, and two fixed bars would stack.
- **Checkout keeps its payment logic untouched** — OTP at the pay step,
  re-price after verification, `orderError` separate from the quote's `error`,
  the token threaded from `verifyOtp`. The stepper (Cart ✓ → Delivery → Pay) is
  decoration; the form is still one `<form>`, and the OTP block is deliberately
  not a nested form.
- **`OrderProgress`** (`components/order/order-progress.tsx`) is the shared
  placed → packed → shipped → delivered track, used on the account page and the
  order page. Cancelled and refunded orders get a plain note instead of a
  half-lit track; unpaid orders say the stock is being held.
- **Signed-out `/account` has a real Sign in button** (`useSignIn().openSignIn`).
  It used to link to `/`, which left someone on the homepage with no hint of
  what to do next.

## Wishlist, card details, banner carousel and the phone search screen

- **Wishlist.** A heart on every card and on the product photo (`wishlist-button.tsx`),
  state in `providers/wishlist-provider.tsx`, page at `/wishlist`, count on the
  header heart. A **guest who taps it gets the sign-in dialog**, and the product
  is saved the moment they finish signing in (`pending` ref in the provider) — they
  do not have to tap again. API: `GET /api/account/wishlist/ids` (cheap, for the
  hearts) next to the existing list/add/remove. `/api/catalog/products?ids=a,b`
  (max 48 uuids) returns just those products, for the wishlist page.
- **Card details.** Five-star row (only when real approved reviews exist), price,
  green "N% off", struck-through M.R.P., then ONE line: "Only N left" if the
  selected finish is genuinely at or under its low-stock threshold
  (`ProductOption.stockLeft`, null otherwise), else "You save ₹X". **Never add
  invented ratings, "limited offer" timers or fake scarcity** — the compare-at
  price is real catalogue data and low stock is real stock.
- **(Superseded — see "The homepage top is a carousel")** Banner carousel, under the
  bestsellers so products stay on the first screen. Native scroll-snap; autoplay
  only while visible, paused on hover/focus, stopped for good by any arrow, dot or
  swipe, off under reduced motion. Slides are 4:3 crops in `public/banners/slide-*.jpg`
  (AI placeholders for the real range). Desktop puts the words on navy beside the
  photo so the subject is never under text.
- **Phone search screen** (`layout/search-home.tsx`, shown by `search-provider.tsx`
  until two characters are typed): recent searches, collection photo tiles, "Popular
  picks" (the featured list) and recently viewed. Recent searches and recently
  viewed live in this browser's localStorage only (`lib/recent.ts`; viewed items
  are recorded by `RecentlyViewedTracker` on product pages). "Trending" is not
  claimed — there is no analytics behind it, so it is called Popular picks.

### The homepage top is a carousel of finished banner artwork, run from Admin → Banners

**Supersedes** the earlier "Banner carousel" bullet (it sat under the bestsellers) and the
version where the coded hero was slide 1 with photo slides after it.

- The client supplied eight finished banner designs (headline, button, feature tiles and
  all — "Stop grooming on the floor" first). They are `public/banners/banner-1…8-*.jpg`
  and are ordinary `hero` banners (`/api/catalog/banners?placement=hero`), so Admin →
  Banners edits, hides/shows, reorders (↑↓ rewrites `sortOrder`), schedules, uploads
  and adds slides. Nothing is overlaid on the artwork: the picture is the slide, the whole
  picture links to `ctaUrl`, and `title` is its alt text.
- `components/home/banner-carousel.tsx`. **Every slide is the same size (1.9:1,
  `BANNER_ASPECT` in `lib/banner-art.ts`), cropped.** History, so it is not repeated: the client
  rejected `object-contain` over a blurred copy, and pre-padding to one shape ("not fitting",
  blurry bands), then rejected a frame that changed shape per picture ("the carousel will change
  shape — crop it and make it the same size"). The supplied artwork is three shapes (2.19, 2.74,
  1.79), so the eight files in `public/banners/banner-N-*.jpg` were **cropped by hand to 1.9:1**:
  the 16:9 ones lose a few px top and bottom (starting 26px down so the small eyebrow line and
  the bottom captions both survive), banner 1 loses its right-hand tile captions, banner 2
  loses its right tiles and half its "100 KG" badge (both anchored left, where the headline and
  button are). An uploaded picture of another shape is cropped by `object-cover`.
- **The "Shop now" button drawn in each picture is covered by a real link**
  (`BANNER_BUTTONS`: its box as % of the CROPPED picture, found by colour-detecting the button and
  checked by eye). It is focusable, lifts and glows on hover, and has a thumb-sized hit area; the
  rest of the picture is also a link (`ctaUrl`). Uploaded banners have no entry, so the whole
  picture is the link. **Re-measure an entry whenever its image is re-exported or re-cropped.**
- Layout: full width on a phone (so its small print is small — upload a phone version per banner
  if that matters); from `sm` up it sits in the page content width with rounded corners (about
  650px tall at 1360px wide). Arrows sit in the page gutter beside it and the dots under it, so
  nothing is drawn over the artwork.
- The carousel starts below the fixed header (`pt-16 lg:pt-[6.75rem]`). If it has no
  slides the built-in `Hero` renders instead (its text is the old coded fallback), so the
  top of the page is never empty. `hero.tsx` is therefore still used, only as that fallback.
- Autoplay: only while on screen, paused on hover/focus, stopped for good by any arrow,
  dot or swipe, off under reduced motion. `priority` and `loading` cannot be mixed on a
  Next `Image`: only slide 0 is priority; its neighbours load eagerly, the rest lazily.
- Seeding: `packages/db/src/seed/slides.data.ts`. The full seed inserts them; `seed:extra`
  installs them **once** (marker: a hero banner whose image starts `/banners/banner-`) and
  switches any older hero banner OFF (not deleted). Run `seed:extra` once on production to
  get them. Deleting a slide in admin never brings it back.
- `getBanners` caches for 60s, and the dev server also caches that fetch in memory — restart
  `next dev` after changing banners directly in the database.
- **The artwork prints claims** ("100 KG load capacity", "304 stainless steel", "rust proof",
  "sound-dampening", "luxury & safety") that nobody has checked against the products. They
  are AI-generated marketing creative; confirm them before launch.

### Reviews and ratings: the owner can add, hide and delete them

Admin → Reviews has Waiting / Published / Hidden / All tabs, **Add a review** (enter feedback
a real customer gave by WhatsApp, phone or a marketplace; goes live at once and is never
marked "verified purchase"), Hide, Publish and Delete. Customer-written reviews still wait
for approval. Card and product-page stars are the average of **published** reviews only
(`catalog.service.ts`), so hiding a review changes the average. The admin page says plainly
that reviews must be real; do not add a way to generate or bulk-import ratings.

### Product page: stars line and the "why buy" grid

`stars.tsx` is the one star row (cards and product page). With no published reviews it shows
five **empty** stars and "No reviews yet" — it never shows a made-up rating. The product page
puts stars, average, "(N reviews)" (links to `#reviews`) and the In stock dot under the title,
and a 3×2 grid under the pincode check: Direct from manufacturer, Easy returns policy
(`/pages/returns`), Secure payment, Pan India shipping (`/pages/shipping`), the product's own
warranty months, Expert support (`/enquiry`). "Direct from manufacturer" is the owner's own
statement about his business. A competitor's "Limited time offer — expires soon" line was
shown to us as a reference and deliberately NOT copied: there is no real deadline behind it.

## Claims must match the data

The old marquee (now the cards in `trust-cards.tsx`) said "36-month frame warranty". Two of the eighteen products have
36 months; ten have 24 and four have 12. It now states the real range. Before
putting a number on the homepage, check it against `products.data.ts` — a flat
claim that is true of two SKUs is a misleading one.

## Rules that must not be broken

**Money is integer paise. Never floats.** `formatINR` is the only thing that
turns it into `₹1,12,400` — with Indian lakh grouping.

**GST is computed, not stored.** Prices are GST-inclusive per Indian retail
convention; tax is backed out at checkout. Buyer in Karnataka → CGST + SGST.
Anywhere else → IGST.

**The browser is never trusted about price.** Checkout re-prices the cart from
the database, then again inside the payment transaction.

**The webhook is the truth for payment.** Razorpay's browser callback is a hint
that lets the confirmation page appear quickly. Both paths converge on one
idempotent handler.

**Stock is reserved at order creation**, not at payment. Abandoned orders
release it after 45 minutes.

---

## Traps that have already cost time

- **Never run `next build` while `npm run dev` is running.** They share `.next`
  and the build corrupts the dev server's cache. Stop dev first.
- **PGlite is single-connection.** Stop the API before seeding or the seed
  blocks. Never call `getDb()` inside a `db.transaction()` — it checks out a
  second connection, reads outside the transaction's snapshot, and deadlocks.
- **Tailwind v4 dropped `[--var]`.** `bg-[--color-crimson]` compiles to invalid
  CSS and is silently dropped. Use the named tokens from `@theme` (below).
  The important modifier is trailing: `text-crimson!`.
- **Tailwind v4 also dropped the default `cursor: pointer` on `<button>`.**
  It is restored once in the Button base; anything hand-rolled needs it.
- **`@keyframes` must be top level in `globals.css`.** Inside `@layer` Tailwind
  v4 drops them: no build error, no console warning, the animation just resolves
  to nothing and the element never moves. `animationName` still reads back
  correctly in devtools, which makes it a genuinely nasty one to spot.
- **`useReducedMotion()` starts `true` on purpose**, so the first render is the
  still version. That means a component with a motion branch and a reduced
  branch renders the REDUCED one first — any effect that grabs a ref belonging
  to the motion branch must list `reduced` in its dependencies, or it runs once
  against `null` and never again. Cost an hour on the carousel: no error
  anywhere, the sequence simply never advanced.
- **Drizzle renders `${table.col}` unqualified.** Inside a correlated subquery it
  binds to the *inner* table and the predicate silently never matches — six
  queries returned 0 before this was found. Always alias the inner table and
  qualify the outer reference by name.
- **`db.execute()` row shape differs by driver.** Use `rowsOf()` in
  `apps/api/src/lib/rows.ts`.
- **PGlite tolerates raw `Date` objects inside a `sql` template that
  Postgres's real driver (`postgres` npm package) does not.** The admin
  dashboard's `generate_series(${periodStart}::date, ${now}::date, ...)`
  passed JS `Date`s straight through — every test and every local dev session
  runs on PGlite, so this shipped clean and then threw `TypeError
  [ERR_INVALID_ARG_TYPE] ... Received an instance of Date` the first time it
  ever ran against the real Supabase Postgres. Call `.toISOString()` before
  interpolating a `Date` next to an explicit `::date`/`::timestamp` cast in a
  raw `sql` template. Found by reproducing the deployed 500 locally with
  `DATABASE_URL` pointed at the production database — the production error
  response is deliberately opaque, but the server's own log line has the real
  stack trace.
- **`@aps/shared` resolves to `dist/`, not source.** Editing a shared package
  and restarting the API changes nothing until `npm run build -w @aps/shared` —
  the dev server happily serves the stale build. The tests compile from source
  and will pass while the running app is still on old code, which is the worst
  possible combination. If a shared change "has no effect", build it first.
- **Next caches optimised images by path.** Replacing a file in place serves the
  stale one — `rm -rf apps/web/.next` after swapping imagery.
- **The browser pane does not composite everything.** `will-change: transform`
  layers can screenshot black, and `backdrop-filter` (the sticky header's
  background) often does not appear at all. Both have already been chased once.
  Verify with `javascript_tool` — read the computed style — before believing a
  screenshot that shows missing chrome.

---

## Verifying

`npm test` — 139 tests: 74 unit over pricing and tax, 65 integration running the
real Express app against a real database over real HTTP. No mocks; they have
caught several genuine bugs.

Always run the tests, `npm run typecheck`, and a production build before
claiming something works.
