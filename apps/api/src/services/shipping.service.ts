import { and, asc, eq, sql } from 'drizzle-orm';
import { getDb, pincodes, shippingRates, shippingZones } from '@aps/db';
import { formatEta, quoteShipping, type ShippingRate, type ShippingResult } from '@aps/shared';
import { logger } from '../lib/logger.ts';

/**
 * Serviceability and freight.
 *
 * An unknown pincode is not a refusal: we fall back to the zone that owns the
 * state, because a gap in the pincode table should never lose a sale. Only an
 * explicit `is_serviceable = false` row blocks an order.
 */

export interface ServiceabilityResult {
  serviceable: boolean;
  city: string | null;
  state: string | null;
  zoneId: string | null;
  etaDaysMin: number | null;
  etaDaysMax: number | null;
  message: string;
  /** Lets the storefront distinguish "we don't go there" from "that isn't a
      real pincode" from "we couldn't check just now". */
  reason: 'serviceable' | 'not_serviceable' | 'unknown_pincode' | 'lookup_unavailable';
}

/**
 * The India Post directory.
 *
 * Structural validation cannot prove a pincode exists — "111111" is six digits
 * with a real Delhi prefix, and there is no such post office. We deliver
 * everywhere in India, so the question this answers is not "will we come here"
 * but "is this a real address": promising delivery to a typo is how a parcel
 * goes out to nowhere and a customer waits a fortnight for it.
 *
 * Every answer is written back into the pincodes table, so any given pincode
 * costs one outbound call in its lifetime and the table fills in with real
 * traffic instead of needing all 19,000 seeded up front.
 */
interface RemotePincode { city: string; state: string }

async function lookupIndiaPost(pincode: string): Promise<RemotePincode | null> {
  /* Short timeout on purpose: this sits in front of an Add to cart, and a slow
     third party must never be the reason someone cannot buy. */
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
    signal: AbortSignal.timeout(3500),
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`India Post responded ${response.status}`);

  const payload = (await response.json()) as Array<{
    Status?: string;
    PostOffice?: Array<{ Name?: string; District?: string; State?: string; DeliveryStatus?: string }> | null;
  }>;

  const entry = payload?.[0];
  if (entry?.Status !== 'Success' || !entry.PostOffice?.length) return null;

  /* Prefer an office that actually delivers; a pincode can list non-delivery
     (counter-only) branches first. */
  const office = entry.PostOffice.find((o) => o.DeliveryStatus === 'Delivery') ?? entry.PostOffice[0];
  const city = (office?.District ?? office?.Name ?? '').trim();
  const state = (office?.State ?? '').trim();
  return city && state ? { city, state } : null;
}

/* Swappable so tests never reach the network, and so an outage can be
   simulated rather than waited for. */
let remoteLookup: (pincode: string) => Promise<RemotePincode | null> = lookupIndiaPost;
export function setPincodeDirectory(fn: typeof remoteLookup): void { remoteLookup = fn; }

export async function checkPincode(pincode: string): Promise<ServiceabilityResult> {
  const db = getDb();

  const [row] = await db.select({
    pincode: pincodes, zone: shippingZones,
  })
    .from(pincodes)
    .leftJoin(shippingZones, eq(pincodes.zoneId, shippingZones.id))
    .where(eq(pincodes.pincode, pincode))
    .limit(1);

  if (row) {
    if (!row.pincode.isServiceable) {
      return {
        serviceable: false, city: row.pincode.city, state: row.pincode.state, zoneId: null,
        etaDaysMin: null, etaDaysMax: null,
        message: `We do not deliver to ${row.pincode.city} yet. Please contact us and we will try to arrange freight.`,
        reason: 'not_serviceable',
      };
    }

    const [rate] = await db.select().from(shippingRates)
      .where(and(eq(shippingRates.zoneId, row.pincode.zoneId ?? ''), eq(shippingRates.isActive, true)))
      .orderBy(asc(shippingRates.minWeightG)).limit(1);

    const etaMin = row.pincode.etaDaysMin ?? rate?.etaDaysMin ?? 4;
    const etaMax = row.pincode.etaDaysMax ?? rate?.etaDaysMax ?? 8;

    return {
      serviceable: true, city: row.pincode.city, state: row.pincode.state,
      zoneId: row.pincode.zoneId, etaDaysMin: etaMin, etaDaysMax: etaMax,
      message: `Delivers to ${row.pincode.city} in ${formatEta(etaMin, etaMax)}.`,
      reason: 'serviceable',
    };
  }

  /* Not in our table. Ask the directory whether it is a real pincode at all. */
  let remote: RemotePincode | null;
  try {
    remote = await remoteLookup(pincode);
  } catch (error) {
    /* The directory is down or slow. We deliver across India, so the honest
       answer is still yes — we just cannot name the town. Never turn a third
       party's outage into a lost sale. */
    logger.warn({ pincode, err: error }, 'pincode directory unavailable');
    return {
      serviceable: true, city: null, state: null, zoneId: null,
      etaDaysMin: 4, etaDaysMax: 10,
      message: 'We deliver across India. We could not confirm this pincode just now — delivery timing is confirmed at checkout.',
      reason: 'lookup_unavailable',
    };
  }

  if (!remote) {
    return {
      serviceable: false, city: null, state: null, zoneId: null,
      etaDaysMin: null, etaDaysMax: null,
      message: 'No such pincode. Please check the six digits and try again.',
      reason: 'unknown_pincode',
    };
  }

  /* Real pincode, and we ship everywhere — so it is serviceable. Resolve its
     zone from the state so freight is right, and cache the row so this pincode
     never costs another outbound call. */
  const zoneId = await zoneForState(remote.state);
  const [rate] = zoneId
    ? await db.select().from(shippingRates)
      .where(and(eq(shippingRates.zoneId, zoneId), eq(shippingRates.isActive, true)))
      .orderBy(asc(shippingRates.minWeightG)).limit(1)
    : [];

  const etaMin = rate?.etaDaysMin ?? 4;
  const etaMax = rate?.etaDaysMax ?? 10;

  await db.insert(pincodes)
    .values({ pincode, city: remote.city, state: remote.state, zoneId, isServiceable: true })
    .onConflictDoNothing();

  return {
    serviceable: true, city: remote.city, state: remote.state, zoneId,
    etaDaysMin: etaMin, etaDaysMax: etaMax,
    message: `Delivers to ${remote.city}, ${remote.state} in ${formatEta(etaMin, etaMax)}.`,
    reason: 'serviceable',
  };
}

/** Find the zone that covers a state, for addresses whose pincode we do not know. */
export async function zoneForState(state: string): Promise<string | null> {
  const db = getDb();
  const [zone] = await db.select({ id: shippingZones.id })
    .from(shippingZones)
    .where(and(eq(shippingZones.isActive, true), sql`${shippingZones.states} @> ${JSON.stringify([state])}::jsonb`))
    .limit(1);
  return zone?.id ?? null;
}

export async function quoteForAddress(params: {
  pincode: string; state: string; totalWeightG: number; subtotal: number; couponFreeShipping?: boolean;
}): Promise<ShippingResult> {
  const db = getDb();
  const serviceability = await checkPincode(params.pincode);

  if (!serviceability.serviceable) {
    return { ok: false, reason: 'not_serviceable', message: serviceability.message };
  }

  const zoneId = serviceability.zoneId ?? (await zoneForState(params.state));
  if (!zoneId) {
    return { ok: false, reason: 'no_rate', message: 'We could not work out freight to that address. Please contact us.' };
  }

  const rows = await db.select().from(shippingRates)
    .where(and(eq(shippingRates.zoneId, zoneId), eq(shippingRates.isActive, true)));

  const rates: ShippingRate[] = rows.map((r) => ({
    id: r.id, zoneId: r.zoneId, minWeightG: r.minWeightG, maxWeightG: r.maxWeightG,
    price: r.price, etaDaysMin: r.etaDaysMin, etaDaysMax: r.etaDaysMax, freeAbove: r.freeAbove,
  }));

  return quoteShipping({
    rates,
    totalWeightG: params.totalWeightG,
    subtotal: params.subtotal,
    isServiceable: true,
    couponFreeShipping: params.couponFreeShipping ?? false,
  });
}
