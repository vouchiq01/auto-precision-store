import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsOrigins, isProduction } from './env.ts';
import { logger } from './lib/logger.ts';
import { errorHandler, notFoundHandler } from './middleware/error-handler.ts';
import { generalLimiter } from './middleware/rate-limit.ts';
import { requestId } from './middleware/request-id.ts';
import { apiRouter } from './routes/index.ts';
import { webhookRouter } from './routes/webhook.routes.ts';

export function createApp(): Express {
  const app = express();

  /* Render terminates TLS at its proxy, so req.ip and secure-cookie detection
     both depend on trusting exactly one hop of X-Forwarded-For. Trusting all
     proxies would let a client spoof its own IP past the rate limiter. */
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet({
    // The API serves JSON and PDFs, never HTML, so CSP here would only ever
    // constrain error pages. The frontend sets its own.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin(origin, callback) {
      // Same-origin and server-to-server requests arrive without an Origin header.
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      logger.warn({ origin }, 'blocked a cross-origin request');
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['x-request-id'],
  }));

  app.use(pinoHttp({
    logger,
    genReqId: (req) => (req as express.Request).id,
    autoLogging: { ignore: (req) => req.url === '/health' },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }));

  /* Webhooks mount BEFORE the JSON body parser: the Razorpay signature covers
     the raw bytes, and a parsed-then-reserialised body never matches. */
  app.use('/webhooks', webhookRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(compression());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), env: isProduction ? 'production' : 'development' });
  });

  app.use('/api', generalLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
