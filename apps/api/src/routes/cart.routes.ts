import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { addToCartSchema, applyCouponSchema, CART, updateCartItemSchema, uuidSchema } from '@aps/shared';
import { asyncHandler } from '../lib/async-handler.ts';
import { isProduction } from '../env.ts';
import { optionalAuth } from '../middleware/auth.ts';
import { params, validateBody, validateParams } from '../middleware/validate.ts';
import {
  addItem, clearCart, getCartSummary, getOrCreateCart, newSessionToken, removeItem, setCoupon, updateItem,
} from '../services/cart.service.ts';

export const CART_COOKIE = 'aps_cart';

export const cartRouter: Router = Router();
cartRouter.use(optionalAuth);

/**
 * Resolve the caller's cart, creating one if needed.
 *
 * Guests are identified by an opaque cookie. Signed-in users are identified by
 * their id, and their cookie is ignored — the merge already happened at login.
 */
async function resolveCart(req: Request, res: Response) {
  const cookies = (req.cookies ?? {}) as Record<string, string>;
  const sessionToken = cookies[CART_COOKIE];

  const cart = await getOrCreateCart({
    userId: req.user?.id,
    sessionToken: req.user ? undefined : sessionToken,
  });

  if (!req.user && cart.sessionToken && cart.sessionToken !== sessionToken) {
    res.cookie(CART_COOKIE, cart.sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: CART.guestCartTtlDays * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  return cart;
}

cartRouter.get('/', asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  res.json(await getCartSummary(cart.id, req.user?.id));
}));

cartRouter.post('/items', validateBody(addToCartSchema), asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  const { variantId, quantity } = req.body as { variantId: string; quantity: number };
  await addItem(cart.id, variantId, quantity);
  res.status(201).json(await getCartSummary(cart.id, req.user?.id));
}));

cartRouter.patch('/items/:itemId',
  validateParams(z.object({ itemId: uuidSchema })),
  validateBody(updateCartItemSchema),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    const { itemId } = params<{ itemId: string }>(req);
    await updateItem(cart.id, itemId, (req.body as { quantity: number }).quantity);
    res.json(await getCartSummary(cart.id, req.user?.id));
  }),
);

cartRouter.delete('/items/:itemId',
  validateParams(z.object({ itemId: uuidSchema })),
  asyncHandler(async (req, res) => {
    const cart = await resolveCart(req, res);
    await removeItem(cart.id, params<{ itemId: string }>(req).itemId);
    res.json(await getCartSummary(cart.id, req.user?.id));
  }),
);

cartRouter.post('/coupon', validateBody(applyCouponSchema), asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  await setCoupon(cart.id, (req.body as { code: string }).code);
  /* The summary reports whether the code actually applies and why not, rather
     than this route deciding — one place owns that explanation. */
  res.json(await getCartSummary(cart.id, req.user?.id));
}));

cartRouter.delete('/coupon', asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  await setCoupon(cart.id, null);
  res.json(await getCartSummary(cart.id, req.user?.id));
}));

cartRouter.delete('/', asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  await clearCart(cart.id);
  res.json(await getCartSummary(cart.id, req.user?.id));
}));

export { resolveCart, newSessionToken };
