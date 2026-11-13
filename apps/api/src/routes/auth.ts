/**
 * Encaminha /api/auth/* para o Better Auth, convertendo a requisição do Fastify
 * em uma Request da Web API e a Response de volta.
 */
import type { FastifyInstance } from 'fastify';
import type { Auth } from '../auth.js';

export async function authRoutes(app: FastifyInstance, { auth }: { auth: Auth }) {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(req, reply) {
      const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
        else headers.append(key, value);
      }
      const request = new Request(url, {
        method: req.method,
        headers,
        ...(req.body !== undefined && req.method !== 'GET'
          ? { body: JSON.stringify(req.body) }
          : {}),
      });
      const response = await auth.handler(request);
      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        reply.header(key, value);
      });
      // vários cookies precisam ir como cabeçalhos separados
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header('set-cookie', cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });
}
