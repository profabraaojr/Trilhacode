/**
 * Autenticação com Better Auth: cadastro por e-mail e senha, verificação de e-mail
 * obrigatória, recuperação de senha, sessões em cookie e limite de tentativas.
 * Senhas são guardadas com hash scrypt (padrão do Better Auth).
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Database } from './db/client.js';
import * as schema from './db/schema.js';
import type { Env } from './env.js';
import type { Mailer } from './mail/mailer.js';
import { resetPasswordEmail, verificationEmail } from './mail/templates.js';

export interface AuthDeps {
  db: Database;
  mailer: Mailer;
  env: Pick<Env, 'BETTER_AUTH_SECRET' | 'WEB_ORIGIN' | 'PUBLIC_URL' | 'AUTH_RATE_LIMIT'>;
}

export function createAuth({ db, mailer, env }: AuthDeps) {
  return betterAuth({
    appName: 'TrilhaCode',
    secret: env.BETTER_AUTH_SECRET,
    // A interface e a API ficam na mesma origem (em desenvolvimento, pelo proxy do Vite).
    baseURL: env.PUBLIC_URL ?? env.WEB_ORIGIN,
    basePath: '/api/auth',
    trustedOrigins: [env.WEB_ORIGIN],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    user: {
      additionalFields: {
        // O papel nunca vem do formulário: todo cadastro é de aluno; só um administrador promove.
        role: { type: 'string', required: false, defaultValue: 'aluno', input: false },
        institution: { type: 'string', required: false, input: true },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await mailer.send(resetPasswordEmail(user.email, user.name, url));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.send(verificationEmail(user.email, user.name, url));
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: env.AUTH_RATE_LIMIT,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
        '/send-verification-email': { window: 60, max: 3 },
      },
    },
    advanced: {
      cookiePrefix: 'trilhacode',
      useSecureCookies: (env.PUBLIC_URL ?? env.WEB_ORIGIN).startsWith('https://'),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
