import pino from 'pino';
import { env, isDevelopment } from '../env.ts';

/* Pretty output only in development. Production emits newline-delimited JSON so
   Render's log drain can parse it, and tests emit nothing — a transport worker
   would otherwise outlive the test run and hold the process open. */
const prettyTransport = isDevelopment
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
  : undefined;

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: prettyTransport,
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]',
      '*.password', '*.passwordHash', '*.code', '*.codeHash', '*.razorpaySignature',
      '*.token', '*.refreshToken', '*.accessToken',
    ],
    censor: '[redacted]',
  },
});
