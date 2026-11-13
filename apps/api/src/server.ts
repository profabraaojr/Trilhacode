import cors from '@fastify/cors';
import type { HealthResponse } from '@trilhacode/shared';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { API_VERSION } from './version.js';

export interface ServerDeps {
  /** Verifica se o banco responde. Injetado para permitir testes sem banco. */
  checkDatabase: () => Promise<boolean>;
  webOrigin: string;
  logger?: FastifyServerOptions['logger'];
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

  return app;
}
