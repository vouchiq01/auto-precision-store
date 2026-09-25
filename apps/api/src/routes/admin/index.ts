import { Router } from 'express';
import { optionalAuth, requireAdmin } from '../../middleware/auth.ts';
import { adminCommerceRouter } from './commerce.routes.ts';
import { adminDashboardRouter } from './dashboard.routes.ts';
import { adminProductsRouter } from './products.routes.ts';
import { adminUploadRouter } from './upload.routes.ts';

export const adminRouter: Router = Router();

/* One gate for the whole admin surface. Every route below is admin-only —
   there is no per-route opt-in to forget. */
adminRouter.use(optionalAuth, requireAdmin);

adminRouter.use('/dashboard', adminDashboardRouter);
adminRouter.use('/products', adminProductsRouter);
adminRouter.use('/uploads', adminUploadRouter);
adminRouter.use('/', adminCommerceRouter);
