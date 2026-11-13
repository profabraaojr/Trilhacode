/** Integração: LGPD (exportação dos dados e exclusão da conta). */
import { eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.js';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { glossaryTerm, pointEvent, user } from '../src/db/schema.js';
import { createCaptureMailer } from '../src/mail/mailer.js';
import { buildServer } from '../src/server.js';

const url = process.env.DATABASE_URL;
const ORIGIN = 'http://localhost:5173';
const DOMAIN = '@lgpd-teste.invalid';
const PASSWORD = 'senha-segura-1';
type App = Awaited<ReturnType<typeof buildServer>>;

function client(app: App) {
  const jar = new Map<string, string>();
  return async (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    payload?: unknown,
  ) => {
    const res = await app.inject({
      method,
      url: path,
      headers: {
        origin: ORIGIN,
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
        ...(payload !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(payload !== undefined ? { payload: JSON.stringify(payload) } : {}),
    });
    const raw = res.headers['set-cookie'];
    for (const c of Array.isArray(raw) ? raw : raw ? [raw] : []) {
      const [pair] = c.split(';');
      const [k, ...v] = pair!.split('=');
      if (v.join('=')) jar.set(k!, v.join('='));
      else jar.delete(k!);
    }
    return res;
  };
}

describe.skipIf(!url)('LGPD (integração)', () => {
  const { db, pool } = createDb(url ?? '');
  const mailer = createCaptureMailer();
  let app: App;

  async function account(tag: string, role: 'aluno' | 'admin' = 'aluno') {
    const email = `${tag}${DOMAIN}`;
    const send = client(app);
    await send('POST', '/api/auth/sign-up/email', { name: tag, email, password: PASSWORD });
    const link = new URL(
      [...mailer.outbox!]
        .reverse()
        .find((m) => m.to === email)!
        .text.match(/https?:\/\/\S+/)![0],
    );
    await send('GET', link.pathname + link.search);
    if (role !== 'aluno') await db.update(user).set({ role }).where(eq(user.email, email));
    await send('POST', '/api/auth/sign-in/email', { email, password: PASSWORD });
    const [row] = await db.select().from(user).where(eq(user.email, email));
    return { send, email, id: row!.id };
  }

  beforeAll(async () => {
    await runMigrations(url!);
    await db.delete(user).where(like(user.email, `%${DOMAIN}`));
    const auth = createAuth({
      db,
      mailer,
      env: { BETTER_AUTH_SECRET: 'l'.repeat(40), WEB_ORIGIN: ORIGIN, AUTH_RATE_LIMIT: false },
    });
    app = await buildServer({
      checkDatabase: async () => true,
      webOrigin: ORIGIN,
      db,
      auth,
      mailer,
    });
  });

  afterAll(async () => {
    await db.delete(user).where(like(user.email, `%${DOMAIN}`));
    await app.close();
    await pool.end();
  });

  it('exporta os dados do próprio usuário, sem dados de outras pessoas', async () => {
    const a = await account('exporta-a');
    const b = await account('exporta-b');
    await a.send('POST', '/api/glossario', { termo: 'termo-de-a', explicacao: 'x' });
    await b.send('POST', '/api/glossario', { termo: 'termo-de-b' });

    const res = await a.send('GET', '/api/me/dados');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const data = res.json<{
      perfil: { email: string };
      glossario: { termo: string }[];
      sessoes: unknown[];
      progresso: Record<string, unknown>;
    }>();
    expect(data.perfil.email).toBe(a.email);
    expect(data.glossario.map((t) => t.termo)).toEqual(['termo-de-a']);
    expect(data.sessoes.length).toBeGreaterThan(0);
    expect(Object.keys(data.progresso)).toEqual(
      expect.arrayContaining(['etapas', 'melhoresNotas', 'tentativasDeAvaliacao', 'desafios']),
    );
    expect(JSON.stringify(data)).not.toContain(b.email);
    expect((await client(app)('GET', '/api/me/dados')).statusCode).toBe(401);
  });

  it('exclui a conta só com a senha correta e apaga os dados em cascata', async () => {
    const a = await account('exclui');
    await a.send('POST', '/api/glossario', { termo: 'vai sumir' });
    await a.send('POST', '/api/progresso/etapas', { unitId: 'inexistente', step: 'apresentacao' });

    const noPassword = await a.send('POST', '/api/auth/delete-user', {});
    expect(noPassword.statusCode).toBe(400);
    const wrong = await a.send('POST', '/api/auth/delete-user', { password: 'senha-errada-1' });
    expect(wrong.statusCode).toBe(400);
    expect(await db.select().from(user).where(eq(user.id, a.id))).toHaveLength(1);

    const ok = await a.send('POST', '/api/auth/delete-user', { password: PASSWORD });
    expect(ok.statusCode).toBe(200);
    expect(await db.select().from(user).where(eq(user.id, a.id))).toEqual([]);
    expect(await db.select().from(glossaryTerm).where(eq(glossaryTerm.userId, a.id))).toEqual([]);
    expect(await db.select().from(pointEvent).where(eq(pointEvent.userId, a.id))).toEqual([]);
    // a sessão deixa de valer e o login falha
    expect((await a.send('GET', '/api/me')).statusCode).toBe(401);
    const login = await client(app)('POST', '/api/auth/sign-in/email', {
      email: a.email,
      password: PASSWORD,
    });
    expect(login.statusCode).toBe(401);
  });

  it('o único administrador não consegue excluir a própria conta', async () => {
    // garante que esta seja a única conta de administrador durante o teste
    const others = await db.select({ id: user.id }).from(user).where(eq(user.role, 'admin'));
    for (const o of others)
      await db.update(user).set({ role: 'professor' }).where(eq(user.id, o.id));
    try {
      const admin = await account('admin-unico', 'admin');
      const res = await admin.send('POST', '/api/auth/delete-user', { password: PASSWORD });
      expect(res.statusCode).toBe(400);
      expect(res.json<{ message: string }>().message).toMatch(/único administrador/);
      expect(await db.select().from(user).where(eq(user.id, admin.id))).toHaveLength(1);
    } finally {
      for (const o of others) await db.update(user).set({ role: 'admin' }).where(eq(user.id, o.id));
    }
  });
});
