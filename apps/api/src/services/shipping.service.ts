import { and, asc, eq, sql } from 'drizzle-orm';
import { getDb, pincodes, shippingRates, shippingZones } from '@aps/db';
import { formatEta, quoteShipping, type ShippingRate, type ShippingResult } from '@aps/shared';

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
}

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
    };
  }

  /* Unknown pincode. We cannot name the city, but we can still ship — the state
     comes from the address form, so the checkout quote will find a zone. */
  return {
    serviceable: true, city: null, state: null, zoneId: null,
    etaDaysMin: 4, etaDaysMax: 10,
    message: 'We deliver here. Exact timing is confirmed at checkout.',
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
