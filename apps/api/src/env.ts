import { z } from 'zod';

/**
 * Environment is validated once, at boot, and the process refuses to start if
 * anything required is missing. A server that boots with a blank JWT secret and
 * fails on the first login is far worse than one that never boots at all.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_DATABASE_URL: z.string().optional(),

  /* Must be at least 32 bytes of entropy. Generate with:
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  /* Comma-separated list of allowed browser origins. */
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().optional(),

  SMS_PROVIDER: z.enum(['mock', 'msg91']).default('mock'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  /* Order-event WhatsApp messages: new order -> seller, status change -> buyer.
     Mock in dev prints to the log; "meta" sends through the WhatsApp Cloud API
     directly (no BSP in between). */
  WHATSAPP_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
  META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  META_WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  META_WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  META_WHATSAPP_API_VERSION: z.string().default('v21.0'),
  /** Where "you have a new order" alerts go — the seller's own WhatsApp number. */
  SELLER_WHATSAPP_NUMBER: z.string().optional(),
  /* Business-initiated WhatsApp messages must use a template Meta has already
     approved — free-form text is only allowed as a reply inside a 24-hour
     customer-service window, which an automated order update is not. */
  WHATSAPP_TEMPLATE_ORDER_PLACED: z.string().optional(),
  WHATSAPP_TEMPLATE_ORDER_PLACED_LANG: z.string().default('en'),
  WHATSAPP_TEMPLATE_ORDER_STATUS: z.string().optional(),
  WHATSAPP_TEMPLATE_ORDER_STATUS_LANG: z.string().default('en'),

  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('media'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`\nInvalid environment configuration:\n${issues}\n`);
    console.error('Copy .env.example to .env and fill in the missing values.\n');
    process.exit(1);
  }

  const env = parsed.data;

  /* Cross-field rules that a flat schema cannot express. Each of these is a
     failure that would otherwise only surface mid-transaction in production. */
  if (env.SMS_PROVIDER === 'msg91' && !env.MSG91_AUTH_KEY) {
    console.error('\nSMS_PROVIDER is "msg91" but MSG91_AUTH_KEY is not set.\n');
    process.exit(1);
  }
  if (env.WHATSAPP_PROVIDER === 'meta' && !(env.META_WHATSAPP_PHONE_NUMBER_ID && env.META_WHATSAPP_ACCESS_TOKEN)) {
    console.error('\nWHATSAPP_PROVIDER is "meta" but META_WHATSAPP_PHONE_NUMBER_ID / META_WHATSAPP_ACCESS_TOKEN is not set.\n');
    process.exit(1);
  }
  if (env.NODE_ENV === 'production') {
    if (env.DATABASE_URL.startsWith('pglite://')) {
      console.error('\nDATABASE_URL points at a local PGlite file. That is a development-only database and cannot serve production traffic.\n');
      process.exit(1);
    }
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      console.error('\nRazorpay credentials are required in production — checkout cannot work without them.\n');
      process.exit(1);
    }
    if (env.SMS_PROVIDER === 'mock') {
      console.error('\nSMS_PROVIDER is "mock" in production. Every OTP would be 123456.\n');
      process.exit(1);
    }
    /* A warning, not a boot failure: WhatsApp notifications are useful but not
       load-bearing the way OTP and payment are — the store must still be able
       to go live before Meta finishes approving a message template. */
    if (env.WHATSAPP_PROVIDER === 'mock') {
      console.warn('\nWHATSAPP_PROVIDER is "mock" in production. Order-event WhatsApp messages will only be logged, not sent.\n');
    }
  }

  return env;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

/** Razorpay is optional in development so the rest of the app can run without it. */
export const razorpayConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
export const supabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
export const whatsappConfigured = env.WHATSAPP_PROVIDER === 'meta'
  && Boolean(env.META_WHATSAPP_PHONE_NUMBER_ID && env.META_WHATSAPP_ACCESS_TOKEN);
