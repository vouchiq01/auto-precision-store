import { sql } from 'drizzle-orm';
import type { Database } from '@aps/db';
import { rowsOf } from './rows.ts';

/**
 * Indian financial year runs April–March. FY 2026-27 is rendered "2627".
 * Both order and invoice numbering reset at the year boundary.
 */
export function financialYear(date = new Date()): string {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? year : year - 1; // month 3 = April
  return `${String(startYear).slice(-2)}${String(startYear + 1).slice(-2)}`;
}

/** Stable 32-bit key for pg_advisory_xact_lock, which takes a bigint. */
function lockKey(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Next order number, e.g. APS-2627-00042.
 *
 * Gaps are acceptable here — an abandoned payment leaves a pending order that
 * keeps its number — so this only needs to be unique, not contiguous.
 * MUST be called inside a transaction; the advisory lock is transaction-scoped.
 */
export async function nextOrderNumber(tx: Database, prefix = 'APS'): Promise<string> {
  const fy = financialYear();
  await tx.execute(sql`select pg_advisory_xact_lock(${lockKey(`order:${fy}`)})`);

  const result = await tx.execute<{ next: number }>(sql`
    select coalesce(max((regexp_match(order_number, '([0-9]+)$'))[1]::int), 0) + 1 as next
    from orders
    where order_number like ${`${prefix}-${fy}-%`}
  `);

  const next = Number(rowsOf<{ next: number }>(result)[0]?.next ?? 1);
  return `${prefix}-${fy}-${String(next).padStart(5, '0')}`;
}

/**
 * Next tax invoice number, e.g. APS/2627/00042.
 *
 * GST requires invoice numbers to be consecutive with no gaps within a
 * financial year, which is why this is issued at payment capture rather than at
 * order creation: an order that never gets paid must not burn a number.
 * MUST be called inside a transaction.
 */
export async function nextInvoiceNumber(tx: Database, prefix = 'APS'): Promise<string> {
  const fy = financialYear();
  await tx.execute(sql`select pg_advisory_xact_lock(${lockKey(`invoice:${fy}`)})`);

  const result = await tx.execute<{ next: number }>(sql`
    select coalesce(max((regexp_match(invoice_number, '([0-9]+)$'))[1]::int), 0) + 1 as next
    from orders
    where invoice_number like ${`${prefix}/${fy}/%`}
  `);

  const next = Number(rowsOf<{ next: number }>(result)[0]?.next ?? 1);
  return `${prefix}/${fy}/${String(next).padStart(5, '0')}`;
}
