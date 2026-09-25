import { Router } from 'express';
import { accountRouter } from './account.routes.ts';
import { adminRouter } from './admin/index.ts';
import { authRouter } from './auth.routes.ts';
import { cartRouter } from './cart.routes.ts';
import { catalogRouter } from './catalog.routes.ts';
import { checkoutRouter } from './checkout.routes.ts';
import { publicRouter } from './public.routes.ts';

export const apiRouter: Router = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/cart', cartRouter);
apiRouter.use('/checkout', checkoutRouter);
apiRouter.use('/account', accountRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/', publicRouter);
