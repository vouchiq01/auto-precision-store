import { type Paise, applyBps } from '../money.ts';

/**
 * GST for a Karnataka-registered seller.
 *
 * Indian retail convention is to quote GST-inclusive prices, so the tax is
 * back-computed out of the displayed price rather than added on top:
 *
 *   tax  = inclusive × rate / (10000 + rate)
 *   base = inclusive − tax
 *
 * Intra-state (buyer also in Karnataka) splits into CGST + SGST at half rate each.
 * Inter-state charges IGST at the full rate. The total is identical either way —
 * only the split, and who receives it, differs.
 */

export const SELLER_STATE = 'Karnataka' as const;

/** Grooming tables: HSN 9403 (other furniture and parts thereof) → 18%. */
export const DEFAULT_HSN_CODE = '9403';
export const DEFAULT_GST_BPS = 1800;

export interface GstBreakdown {
  /** Price excluding tax. */
  taxableValue: Paise;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
  /** cgst + sgst + igst */
  totalTax: Paise;
  /** taxableValue + totalTax — equals the inclusive price passed in. */
  grossValue: Paise;
  rateBps: number;
  intraState: boolean;
}

export function isIntraState(buyerState: string | null | undefined): boolean {
  if (!buyerState) return false;
  return buyerState.trim().toLowerCase() === SELLER_STATE.toLowerCase();
}

/**
 * Split a GST-inclusive amount into its tax components.
 *
 * The CGST/SGST halves are computed so they always sum exactly to totalTax:
 * CGST takes the floor and SGST absorbs the remainder. Splitting by rounding
 * each half independently can drift by a paisa and fail invoice validation.
 */
export function splitInclusiveGst(
  inclusiveAmount: Paise,
  rateBps: number,
  buyerState: string | null | undefined,
): GstBreakdown {
  const intraState = isIntraState(buyerState);
  const totalTax = Math.round((inclusiveAmount * rateBps) / (10_000 + rateBps));
  const taxableValue = inclusiveAmount - totalTax;

  if (intraState) {
    const cgst = Math.floor(totalTax / 2);
    const sgst = totalTax - cgst;
    return { taxableValue, cgst, sgst, igst: 0, totalTax, grossValue: inclusiveAmount, rateBps, intraState };
  }

  return { taxableValue, cgst: 0, sgst: 0, igst: totalTax, totalTax, grossValue: inclusiveAmount, rateBps, intraState };
}

/** Add GST on top of an exclusive amount — used for shipping, which we quote ex-tax. */
export function addExclusiveGst(
  exclusiveAmount: Paise,
  rateBps: number,
  buyerState: string | null | undefined,
): GstBreakdown {
  const totalTax = applyBps(exclusiveAmount, rateBps);
  const gross = exclusiveAmount + totalTax;
  const intraState = isIntraState(buyerState);

  if (intraState) {
    const cgst = Math.floor(totalTax / 2);
    const sgst = totalTax - cgst;
    return { taxableValue: exclusiveAmount, cgst, sgst, igst: 0, totalTax, grossValue: gross, rateBps, intraState };
  }
  return { taxableValue: exclusiveAmount, cgst: 0, sgst: 0, igst: totalTax, totalTax, grossValue: gross, rateBps, intraState };
}

/**
 * GSTIN format: 2-digit state code, 10-char PAN, entity number, 'Z', checksum.
 * Example: 29ABCDE1234F1Z5 (29 = Karnataka)
 *
 * The final character is a mod-36 checksum; validating it rejects the typos that
 * a regex alone waves through, which matters because a wrong GSTIN on an invoice
 * costs the buyer their input credit.
 */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GSTIN_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGstin(gstin: string): boolean {
  const value = gstin.trim().toUpperCase();
  if (!GSTIN_PATTERN.test(value)) return false;

  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const codePoint = GSTIN_ALPHABET.indexOf(value[i] as string);
    if (codePoint < 0) return false;
    const factor = i % 2 === 0 ? 1 : 2;
    const product = codePoint * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checksum = (36 - (sum % 36)) % 36;
  return GSTIN_ALPHABET[checksum] === value[14];
}

/** Karnataka is state code 29. Used to warn when a GSTIN contradicts the shipping state. */
export function stateCodeFromGstin(gstin: string): string | null {
  const value = gstin.trim();
  return /^[0-9]{2}/.test(value) ? value.slice(0, 2) : null;
}
