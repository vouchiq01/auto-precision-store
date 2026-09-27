import { Router } from 'express';
import { z } from 'zod';
import { checkoutQuoteSchema, createOrderSchema, verifyPaymentSchema, uuidSchema } from '@aps/shared';
import { asyncHandler } from '../lib/async-handler.ts';
import { publicKeyId } from '../services/razorpay.service.ts';
import { optionalAuth, requireAuth } from '../middleware/auth.ts';
import { checkoutLimiter } from '../middleware/rate-limit.ts';
import { params, validateBody, validateParams } from '../middleware/validate.ts';
import { placeOrder, quoteCheckout } from '../services/checkout.service.ts';
import { confirmPaymentFromCallback, getOrderByNumber } from '../services/order.service.ts';
import { resolveCart } from './cart.routes.ts';

export const checkoutRouter: Router = Router();
checkoutRouter.use(optionalAuth);

/** Live totals for the checkout page. Commits nothing. */
checkoutRouter.post('/quote', validateBody(checkoutQuoteSchema), asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  const body = req.body as z.infer<typeof checkoutQuoteSchema>;
  res.json(await quoteCheckout({
    cartId: cart.id,
    userId: req.user?.id,
    shippingAddressId: body.shippingAddressId,
    shippingAddress: body.shippingAddress,
    couponCode: body.couponCode,
    gstin: body.gstin,
  }));
}));

/** Create the order and the matching Razorpay order. Reserves stock. */
/* Quoting stays open to guests on purpose — freight and the GST split are
   exactly what someone needs to see BEFORE deciding, and putting a wall in
   front of that is what loses carts. Placing the order is the line: a crate
   worth up to ₹1,12,400 ships against this phone number, and the 12–36 month
   warranty needs a customer behind it, so the number is verified by then.
   Enforced here and not only in the browser, or it is a convention rather
   than a guarantee. */
checkoutRouter.post('/orders', requireAuth, checkoutLimiter, validateBody(createOrderSchema), asyncHandler(async (req, res) => {
  const cart = await resolveCart(req, res);
  const body = req.body as z.infer<typeof createOrderSchema>;

  const result = await placeOrder({
    cartId: cart.id,
    userId: req.user?.id,
    shippingAddressId: body.shippingAddressId,
    shippingAddress: body.shippingAddress,
    billingSameAsShipping: body.billingSameAsShipping,
    billingAddress: body.billingAddress,
    couponCode: body.couponCode,
    gstin: body.gstin,
    notes: body.notes,
  });

  res.status(201).json(result);
}));

/**
 * The browser's post-payment callback.
 *
 * Treated as a hint that lets us show a confirmation page immediately. The
 * signed `payment.captured` webhook remains the authority, and both paths
 * converge on the same idempotent markOrderPaid.
 */
checkoutRouter.post('/orders/:orderId/confirm',
  checkoutLimiter,
  validateParams(z.object({ orderId: uuidSchema })),
  validateBody(verifyPaymentSchema),
  asyncHandler(async (req, res) => {
    const { orderId } = params<{ orderId: string }>(req);
    const body = req.body as z.infer<typeof verifyPaymentSchema>;

    const order = await confirmPaymentFromCallback({
      orderId,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    });

    res.json(order);
  }),
);

/** Guests read their order by number straight after checkout. */
checkoutRouter.get('/orders/:orderNumber', asyncHandler(async (req, res) => {
  const orderNumber = String(req.params.orderNumber);
  res.json(await getOrderByNumber(orderNumber, req.user?.id));
}));

/** Public config the checkout page needs to open Razorpay. */
checkoutRouter.get('/config', (_req, res) => {
  res.json({ razorpayKeyId: publicKeyId(), currency: 'INR' });
});
