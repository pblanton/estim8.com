import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  publicUrl: required('PUBLIC_URL', 'http://localhost:4000'),
  clientOrigin: required('CLIENT_ORIGIN', 'http://localhost:5173'),

  db: {
    host: required('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required('DB_USER', 'estim8'),
    password: required('DB_PASSWORD', 'estim8'),
    database: required('DB_NAME', 'estim8'),
  },

  cookieSecret: required('COOKIE_SECRET', 'dev-cookie-secret-change-me'),
  verificationTicketSecret: required('VERIFICATION_TICKET_SECRET', 'dev-verification-secret-change-me'),

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    fromAddress: process.env.SMTP_FROM ?? 'estim8 <noreply@estim8.com>',
  },

  uploadRoot: required('UPLOAD_ROOT', './uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 20),
};
