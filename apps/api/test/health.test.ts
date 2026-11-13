import { healthResponseSchema } from '@trilhacode/shared';
import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

const webOrigin = 'http://localhost:5173';

describe('GET /api/health', () => {
  it('responde 200 e status ok quando o banco está disponível', async () => {
    const app = await buildServer({ checkDatabase: async () => true, webOrigin });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = healthResponseSchema.parse(res.json());
    expect(body).toMatchObject({ status: 'ok', database: 'up' });
    await app.close();
  });

  it('responde 503 e status degraded quando o banco não responde', async () => {
    const app = await buildServer({ checkDatabase: async () => false, webOrigin });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(503);
    expect(healthResponseSchema.parse(res.json())).toMatchObject({
      status: 'degraded',
      database: 'down',
    });
    await app.close();
  });

  it('autoriza no CORS apenas a origem da interface, sem refletir outras origens', async () => {
    const app = await buildServer({ checkDatabase: async () => true, webOrigin });
    const ok = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: webOrigin },
    });
    expect(ok.headers['access-control-allow-origin']).toBe(webOrigin);
    const other = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'https://site-estranho.example' },
    });
    // A API sempre anuncia a origem configurada; o navegador bloqueia qualquer outra.
    expect(other.headers['access-control-allow-origin']).toBe(webOrigin);
    await app.close();
  });
});
