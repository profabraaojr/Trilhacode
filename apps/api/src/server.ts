import cors from '@fastify/cors';
import type { HealthResponse } from '@trilhacode/shared';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { Database } from './db/client.js';
import type { Auth } from './auth.js';
import type { Mailer } from './mail/mailer.js';
import { accountRoutes } from './routes/account.js';
import { classroomRoutes } from './routes/classrooms.js';
import { evolutionRoutes } from './routes/evolution.js';
import { privacyRoutes } from './routes/privacy.js';
import { authRoutes } from './routes/auth.js';
import { contentRoutes } from './routes/content.js';
import { API_VERSION } from './version.js';

/** Remove tokens e segredos da URL antes de ir para o log (ASVS V7.1.1). */
export function redactUrl(url: string): string {
  return url
    .replace(/(\/reset-password\/)[^/?#]+/i, '$1[removido]')
    .replace(/([?&](?:token|code|password|secret)=)[^&#]*/gi, '$1[removido]');
}

/** Configuração de log da API: sem cabeçalhos (cookies) e sem tokens nas URLs. */
export const LOG_OPTIONS = {
  level: 'info',
  serializers: {
    req: (req: { method: string; url: string }) => ({
      method: req.method,
      url: redactUrl(req.url),
    }),
  },
} as const;

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

  // Cabeçalhos de segurança em todas as respostas da API (ASVS V14.4).
  app.addHook('onSend', async (_req, reply) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'strict-origin-when-cross-origin');
    reply.header('x-frame-options', 'DENY');
    reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
    reply.header('cross-origin-resource-policy', 'same-origin');
    if (!reply.hasHeader('cache-control')) reply.header('cache-control', 'no-store');
  });

  // Defesa contra CSRF além do cookie SameSite=Lax: requisições que alteram dados vindas
  // de outra origem são recusadas. Sem cabeçalho Origin (ferramentas de linha de comando,
  // testes), a sessão em cookie continua sendo exigida pelas rotas.
  app.addHook('onRequest', async (req, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
    const origin = req.headers.origin;
    if (origin && origin !== deps.webOrigin)
      return reply.code(403).send({ erro: 'Origem não autorizada.' });
  });

  // Erros internos não expõem detalhes ao cliente; o log guarda a causa (ASVS V7.4).
  app.setErrorHandler((error: { statusCode?: number }, req, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      req.log.error(error);
      return reply.code(status).send({ erro: 'Erro interno no servidor. Tente novamente.' });
    }
    return reply
      .code(status)
      .send({ erro: status === 413 ? 'Envio grande demais.' : 'Requisição inválida.' });
  });

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
  if (deps.auth && deps.db) {
    await app.register(accountRoutes, { auth: deps.auth, db: deps.db });
    await app.register(evolutionRoutes, { auth: deps.auth, db: deps.db });
    await app.register(privacyRoutes, { auth: deps.auth, db: deps.db });
  }
  if (deps.auth && deps.db && deps.mailer)
    await app.register(classroomRoutes, {
      auth: deps.auth,
      db: deps.db,
      mailer: deps.mailer,
      webOrigin: deps.webOrigin,
    });
  const outbox = deps.mailer?.outbox;
  if (outbox) {
    app.get<{ Querystring: { para?: string } }>('/api/dev/emails', async (req) =>
      req.query.para ? outbox.filter((m) => m.to === req.query.para) : outbox,
    );
  }

  return app;
}
