/** Segurança da API (Etapa 7): cabeçalhos, origem em requisições que alteram dados e erros. */
import { describe, expect, it } from 'vitest';
import { buildServer, redactUrl } from '../src/server.js';

const webOrigin = 'http://localhost:5173';

describe('segurança da API', () => {
  it('envia cabeçalhos de segurança e não guarda respostas em cache', async () => {
    const app = await buildServer({ checkDatabase: async () => true, webOrigin });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'cache-control': 'no-store',
    });
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    await app.close();
  });

  it('recusa requisições que alteram dados vindas de outra origem', async () => {
    const app = await buildServer({ checkDatabase: async () => true, webOrigin });
    app.post('/api/teste-origem', async () => ({ ok: true }));
    const other = await app.inject({
      method: 'POST',
      url: '/api/teste-origem',
      headers: { origin: 'https://site-estranho.example' },
    });
    expect(other.statusCode).toBe(403);
    const same = await app.inject({
      method: 'POST',
      url: '/api/teste-origem',
      headers: { origin: webOrigin },
    });
    expect(same.statusCode).toBe(200);
    await app.close();
  });

  it('não expõe detalhes de erros internos', async () => {
    const app = await buildServer({ checkDatabase: async () => true, webOrigin });
    app.get('/api/teste-erro', async () => {
      throw new Error('detalhe interno: senha do banco = xyz');
    });
    const res = await app.inject({ method: 'GET', url: '/api/teste-erro' });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('xyz');
    expect(res.json()).toEqual({ erro: 'Erro interno no servidor. Tente novamente.' });

    const bad = await app.inject({
      method: 'POST',
      url: '/api/teste-erro',
      headers: { 'content-type': 'application/json' },
      payload: '{ inválido',
    });
    expect(bad.statusCode).toBeLessThan(500);
    await app.close();
  });

  it('remove tokens das URLs registradas no log', () => {
    expect(redactUrl('/api/auth/verify-email?token=abc.def&callbackURL=%2F')).toBe(
      '/api/auth/verify-email?token=[removido]&callbackURL=%2F',
    );
    expect(redactUrl('/api/auth/reset-password/x?a=1&token=segredo')).toBe(
      '/api/auth/reset-password/[removido]?a=1&token=[removido]',
    );
    expect(redactUrl('/api/auth/reset-password/tok123?callbackURL=%2F')).toBe(
      '/api/auth/reset-password/[removido]?callbackURL=%2F',
    );
    expect(redactUrl('/api/trilhas')).toBe('/api/trilhas');
  });
});
