import { Router } from 'express';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { enquiries, getDb, orderItems, orders, productVariants, products, reviews } from '@aps/db';
import type { DashboardStats } from '@aps/shared';
import { asyncHandler } from '../../lib/async-handler.ts';
import { query, validateQuery } from '../../middleware/validate.ts';
import { rowsOf } from '../../lib/rows.ts';

export const adminDashboardRouter: Router = Router();

/**
 * Statuses that represent money actually received.
 * The column is qualified because the top-products query joins `products`,
 * which also has a `status` — an unqualified reference is ambiguous there.
 */
const REVENUE_STATUSES = sql`${orders.status} in ('paid','confirmed','packed','shipped','delivered')`;

function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

adminDashboardRouter.get('/',
  validateQuery(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) })),
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { days } = query<{ days: number }>(req);

    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    // Equal-length preceding window, so the delta compares like with like.
    const previousStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

    const [current] = await db.select({
      revenue: sql<string>`coalesce(sum(grand_total), 0)::text`,
      count: sql<number>`count(*)::int`,
    }).from(orders).where(and(REVENUE_STATUSES, gte(orders.createdAt, periodStart)));

    const [previous] = await db.select({
      revenue: sql<string>`coalesce(sum(grand_total), 0)::text`,
      count: sql<number>`count(*)::int`,
    }).from(orders).where(and(REVENUE_STATUSES, gte(orders.createdAt, previousStart), lt(orders.createdAt, periodStart)));

    const currentRevenue = Number(current?.revenue ?? 0);
    const previousRevenue = Number(previous?.revenue ?? 0);
    const currentOrders = current?.count ?? 0;

    /* generate_series fills days with no orders, so the chart shows a flat line
       rather than silently closing the gap and implying continuous trade. */
    const series = await db.execute<{ date: string; revenue: string; orders: number }>(sql`
      select
        to_char(d.day, 'YYYY-MM-DD') as date,
        coalesce(sum(o.grand_total), 0)::text as revenue,
        count(o.id)::int as orders
      from generate_series(${periodStart}::date, ${now}::date, '1 day') as d(day)
      left join orders o
        on o.created_at::date = d.day
        and o.status in ('paid','confirmed','packed','shipped','delivered')
      group by d.day
      order by d.day
    `);

    const topProducts = await db.select({
      id: products.id, name: products.name, slug: products.slug,
      unitsSold: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<string>`sum(${orderItems.lineTotal} - ${orderItems.discountShare})::text`,
    })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(and(REVENUE_STATUSES, gte(orders.createdAt, periodStart)))
      .groupBy(products.id, products.name, products.slug)
      .orderBy(sql`sum(${orderItems.quantity}) desc`)
      .limit(5);

    const [pending] = await db.select({ count: sql<number>`count(*)::int` })
      .from(orders).where(sql`${orders.status} in ('paid','confirmed','packed')`);
    const [lowStock] = await db.select({ count: sql<number>`count(*)::int` })
      .from(productVariants)
      .where(sql`${productVariants.isActive} = true and ${productVariants.stockQty} <= ${productVariants.lowStockThreshold}`);
    const [pendingReviews] = await db.select({ count: sql<number>`count(*)::int` })
      .from(reviews).where(eq(reviews.status, 'pending'));
    const [newEnquiries] = await db.select({ count: sql<number>`count(*)::int` })
      .from(enquiries).where(eq(enquiries.status, 'new'));

    const stats: DashboardStats = {
      revenue: { total: currentRevenue, delta: percentDelta(currentRevenue, previousRevenue) },
      orders: { total: currentOrders, delta: percentDelta(currentOrders, previous?.count ?? 0) },
      averageOrderValue: currentOrders > 0 ? Math.round(currentRevenue / currentOrders) : 0,
      pendingOrders: pending?.count ?? 0,
      lowStockCount: lowStock?.count ?? 0,
      pendingReviews: pendingReviews?.count ?? 0,
      newEnquiries: newEnquiries?.count ?? 0,
      revenueSeries: rowsOf<{ date: string; revenue: string; orders: number }>(series)
        .map((r) => ({ date: r.date, revenue: Number(r.revenue), orders: r.orders })),
      topProducts: topProducts.map((p) => ({
        id: p.id, name: p.name, slug: p.slug, unitsSold: p.unitsSold, revenue: Number(p.revenue),
      })),
    };

    res.json(stats);
  }),
);
