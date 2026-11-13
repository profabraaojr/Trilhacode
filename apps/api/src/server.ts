import cors from '@fastify/cors';
import type { HealthResponse } from '@trilhacode/shared';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { Database } from './db/client.js';
import type { Auth } from './auth.js';
import type { Mailer } from './mail/mailer.js';
import { accountRoutes } from './routes/account.js';
import { authRoutes } from './routes/auth.js';
import { contentRoutes } from './routes/content.js';
import { API_VERSION } from './version.js';

export interface ServerDeps {
  /** Verifica se o banco responde. Injetado para permitir testes sem banco. */
  checkDatabase: () => Promise<boolean>;
  webOrigin: string;
  logger?: FastifyServerOptions['logger'];
  /** Sem banco (alguns testes), as rotas de conteúdo não são registradas. */
  db?: Database;
  /** Sem auth, as rotas de conta não são registradas. */
  auth?: Auth;
  /** Com o mailer de captura, GET /api/dev/emails lista as mensagens (só para testes). */
  mailer?: Mailer;
}

export async function buildServer(deps: ServerDeps) {
  const app = Fastify({ logger: deps.logger ?? false });

  await app.register(cors, { origin: deps.webOrigin, credentials: true });

  app.get('/api/health', async (_req, reply): Promise<HealthResponse> => {
    const dbUp = await deps.checkDatabase();
    reply.code(dbUp ? 200 : 503);
    return {
      status: dbUp ? 'ok' : 'degraded',
      version: API_VERSION,
      database: dbUp ? 'up' : 'down',
      time: new Date().toISOString(),
    };
  });

  if (deps.db) await app.register(contentRoutes, { db: deps.db, auth: deps.auth });
  if (deps.auth) await app.register(authRoutes, { auth: deps.auth });
  if (deps.auth && deps.db) await app.register(accountRoutes, { auth: deps.auth, db: deps.db });
  const outbox = deps.mailer?.outbox;
  if (outbox) {
    app.get<{ Querystring: { para?: string } }>('/api/dev/emails', async (req) =>
      req.query.para ? outbox.filter((m) => m.to === req.query.para) : outbox,
    );
  }

  return app;
}
