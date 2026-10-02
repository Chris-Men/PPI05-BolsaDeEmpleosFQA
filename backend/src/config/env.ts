import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  RESET_PASSWORD_URL: z.string().url().optional(),
  MAIL_OUTBOX_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/).optional(),
}).superRefine((values, context) => {
  if (Boolean(values.SMTP_USER) !== Boolean(values.SMTP_PASS)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'SMTP_USER y SMTP_PASS deben configurarse juntos.' });
  }
  if (values.NODE_ENV === 'test') return;
  for (const key of ['SMTP_HOST', 'SMTP_FROM', 'RESET_PASSWORD_URL', 'MAIL_OUTBOX_KEY'] as const) {
    if (!values[key]) context.addIssue({
      code: z.ZodIssueCode.custom, path: [key], message: 'Configuración de correo obligatoria.',
    });
  }
  if (values.NODE_ENV === 'production' && values.RESET_PASSWORD_URL &&
      !values.RESET_PASSWORD_URL.startsWith('https://')) {
    context.addIssue({
      code: z.ZodIssueCode.custom, path: ['RESET_PASSWORD_URL'],
      message: 'El enlace de recuperación de producción debe usar HTTPS.',
    });
  }
});

/** Validated runtime configuration sourced from environment variables. */
export const env = envSchema.parse(process.env);
