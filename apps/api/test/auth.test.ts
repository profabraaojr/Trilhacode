/** Integração: cadastro, verificação, login, senha, perfil, progresso e papéis (exige DATABASE_URL). */
import type { AccountProfile, ProgressDataPayload } from '@trilhacode/shared';
import { eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.js';
import { syncContent } from '../src/content/sync.js';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { track, user } from '../src/db/schema.js';
import { createCaptureMailer } from '../src/mail/mailer.js';
import { buildServer } from '../src/server.js';

const url = process.env.DATABASE_URL;
const ORIGIN = 'http://localhost:5173';
const DOMAIN = '@auth-teste.invalid';

type App = Awaited<ReturnType<typeof buildServer>>;

/** Cliente mínimo que guarda os cookies entre as requisições, como um navegador. */
function client(app: App) {
  const jar = new Map<string, string>();
  const send = async (method: 'GET' | 'POST' | 'PATCH', path: string, payload?: unknown) => {
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
      const value = v.join('=');
      if (value) jar.set(k!, value);
      else jar.delete(k!);
    }
    return res;
  };
  return { send, jar };
}

describe.skipIf(!url)('contas (integração)', () => {
  const { db, pool } = createDb(url ?? '');
  const mailer = createCaptureMailer();
  let app: App;

  const lastLink = (to: string) => {
    const m = [...mailer.outbox!].reverse().find((x) => x.to === to);
    const link = m?.text.match(/https?:\/\/\S+/)?.[0];
    if (!link) throw new Error(`nenhum link enviado para ${to}`);
    return new URL(link);
  };

  async function signUpAndVerify(email: string, password = 'senha-segura-1') {
    const c = client(app);
    const res = await c.send('POST', '/api/auth/sign-up/email', {
      name: 'Pessoa Teste',
      email,
      password,
      institution: 'Escola Técnica',
      callbackURL: `${ORIGIN}/?conta=verificado`,
    });
    expect(res.statusCode).toBe(200);
    const link = lastLink(email);
    const verified = await c.send('GET', link.pathname + link.search);
    expect([200, 302]).toContain(verified.statusCode);
    return c;
  }

  beforeAll(async () => {
    await runMigrations(url!);
    await db.delete(user).where(like(user.email, `%${DOMAIN}`));
    const auth = createAuth({
      db,
      mailer,
      env: { BETTER_AUTH_SECRET: 'x'.repeat(40), WEB_ORIGIN: ORIGIN, AUTH_RATE_LIMIT: false },
    });
    app = await buildServer({
      checkDatabase: async () => true,
      webOrigin: ORIGIN,
      db,
      auth,
      mailer,
    });
    await syncContent(db, [
      {
        id: 'teste-auth',
        titulo: 'T',
        descricao: 'D',
        publico: 'p',
        nivel: 'n',
        duracaoEstimada: '1 h',
        objetivos: ['o'],
        prerequisitos: [],
        requerTrilhas: [],
        modulos: [
          {
            id: 'teste-auth/m',
            titulo: 'M',
            descricao: 'D',
            posicao: 1,
            unidades: [
              {
                id: 'teste-auth/m/u',
                titulo: 'U',
                posicao: 1,
                nivel: 'b',
                duracaoMinutos: 10,
                objetivos: ['o'],
                requer: [],
                conteudo: {
                  etapas: {
                    apresentacao: { html: '' },
                    fundamentacao: { html: '' },
                    demonstracao: { html: '', arquivos: [] },
                    experimentacao: { html: '', arquivos: [] },
                    vocabulario: { html: '', termos: [] },
                    desafio: { html: '', arquivos: [], testes: [] },
                    avaliacao: { notaMinima: 70, questoes: [] },
                  },
                  leituraComplementar: [],
                },
                gabarito: {
                  notaMinima: 70,
                  questoes: { q1: { correta: 'a', feedback: { a: 'ok', b: 'não' } } },
                },
              },
            ],
          },
        ],
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(like(user.email, `%${DOMAIN}`));
    await db.delete(track).where(eq(track.id, 'teste-auth'));
    await app.close();
    await pool.end();
  });

  it('cadastra sempre como aluno, mesmo se o formulário tentar outro papel', async () => {
    const email = `papel${DOMAIN}`;
    const c = client(app);
    const res = await c.send('POST', '/api/auth/sign-up/email', {
      name: 'Tentativa',
      email,
      password: 'senha-segura-1',
      role: 'admin',
    });
    // O Better Auth recusa campos que não são de entrada ou os ignora; em nenhum caso vira admin.
    const [row] = await db.select().from(user).where(eq(user.email, email));
    if (res.statusCode === 200) expect(row?.role).toBe('aluno');
    else expect(row).toBeUndefined();
  });

  it('não deixa entrar antes de confirmar o e-mail', async () => {
    const email = `nao-verificado${DOMAIN}`;
    const c = client(app);
    await c.send('POST', '/api/auth/sign-up/email', {
      name: 'Ana',
      email,
      password: 'senha-segura-1',
    });
    expect(mailer.outbox!.some((m) => m.to === email && m.subject.includes('Confirme'))).toBe(true);
    const res = await c.send('POST', '/api/auth/sign-in/email', {
      email,
      password: 'senha-segura-1',
    });
    expect(res.statusCode).toBe(403);
    expect((await c.send('GET', '/api/me')).statusCode).toBe(401);
  });

  it('confirma o e-mail pelo link, entra, lê e edita o perfil e sai', async () => {
    const email = `fluxo${DOMAIN}`;
    const c = await signUpAndVerify(email);
    const login = await c.send('POST', '/api/auth/sign-in/email', {
      email,
      password: 'senha-segura-1',
    });
    expect(login.statusCode).toBe(200);
    const me = (await c.send('GET', '/api/me')).json<AccountProfile>();
    expect(me).toMatchObject({
      email,
      emailVerified: true,
      role: 'aluno',
      institution: 'Escola Técnica',
    });

    const patched = await c.send('PATCH', '/api/me', {
      name: 'Ana Souza',
      institution: 'IF Exemplo',
    });
    expect(patched.json<AccountProfile>()).toMatchObject({
      name: 'Ana Souza',
      institution: 'IF Exemplo',
    });
    expect((await c.send('PATCH', '/api/me', { name: 'A', institution: null })).statusCode).toBe(
      400,
    );

    await c.send('POST', '/api/auth/sign-out', {});
    expect((await c.send('GET', '/api/me')).statusCode).toBe(401);
  });

  it('recusa senha curta e senha errada', async () => {
    const c = client(app);
    const short = await c.send('POST', '/api/auth/sign-up/email', {
      name: 'B',
      email: `curta${DOMAIN}`,
      password: '123',
    });
    expect(short.statusCode).toBe(400);
    const email = `errada${DOMAIN}`;
    const v = await signUpAndVerify(email);
    const res = await v.send('POST', '/api/auth/sign-in/email', {
      email,
      password: 'outra-senha-1',
    });
    expect(res.statusCode).toBe(401);
  });

  it('redefine a senha pelo link do e-mail', async () => {
    const email = `reset${DOMAIN}`;
    const c = await signUpAndVerify(email);
    await c.send('POST', '/api/auth/request-password-reset', {
      email,
      redirectTo: `${ORIGIN}/?conta=redefinir`,
    });
    const link = lastLink(email);
    const redirect = await c.send('GET', link.pathname + link.search);
    expect(redirect.statusCode).toBe(302);
    const token = new URL(redirect.headers.location as string).searchParams.get('token');
    expect(token).toBeTruthy();
    const reset = await c.send('POST', '/api/auth/reset-password', {
      token,
      newPassword: 'nova-senha-123',
    });
    expect(reset.statusCode).toBe(200);
    expect(
      (await c.send('POST', '/api/auth/sign-in/email', { email, password: 'senha-segura-1' }))
        .statusCode,
    ).toBe(401);
    expect(
      (await c.send('POST', '/api/auth/sign-in/email', { email, password: 'nova-senha-123' }))
        .statusCode,
    ).toBe(200);
  });

  it('guarda o progresso na conta, importa o do navegador e registra a avaliação corrigida', async () => {
    const email = `progresso${DOMAIN}`;
    const c = await signUpAndVerify(email);
    await c.send('POST', '/api/auth/sign-in/email', { email, password: 'senha-segura-1' });

    const local: ProgressDataPayload = {
      version: 1,
      units: {
        'teste-auth/m/u': { steps: { apresentacao: '2026-11-01T10:00:00.000Z' }, attempts: 0 },
        'unidade/que/nao/existe': {
          steps: { apresentacao: '2026-11-01T10:00:00.000Z' },
          attempts: 0,
        },
      },
    };
    const imported = (
      await c.send('POST', '/api/progresso/importar', local)
    ).json<ProgressDataPayload>();
    expect(Object.keys(imported.units)).toEqual(['teste-auth/m/u']);

    await c.send('POST', '/api/progresso/etapas', {
      unitId: 'teste-auth/m/u',
      step: 'fundamentacao',
    });
    expect(
      (
        await c.send('POST', '/api/progresso/etapas', {
          unitId: 'teste-auth/m/u',
          step: 'avaliacao',
        })
      ).statusCode,
    ).toBe(400);

    await c.send('POST', '/api/avaliacoes/teste-auth/m/u', { respostas: { q1: 'b' } });
    await c.send('POST', '/api/avaliacoes/teste-auth/m/u', { respostas: { q1: 'a' } });
    const p = (await c.send('GET', '/api/progresso')).json<ProgressDataPayload>();
    const u = p.units['teste-auth/m/u']!;
    expect(Object.keys(u.steps).sort()).toEqual(['apresentacao', 'avaliacao', 'fundamentacao']);
    expect(u).toMatchObject({ bestScore: 100, attempts: 2 });
  });

  it('só administradores listam usuários e mudam papéis, e um admin não se rebaixa', async () => {
    const alunoEmail = `aluno${DOMAIN}`;
    const adminEmail = `admin${DOMAIN}`;
    const aluno = await signUpAndVerify(alunoEmail);
    await aluno.send('POST', '/api/auth/sign-in/email', {
      email: alunoEmail,
      password: 'senha-segura-1',
    });
    expect((await aluno.send('GET', '/api/admin/usuarios')).statusCode).toBe(403);

    const admin = await signUpAndVerify(adminEmail);
    await db.update(user).set({ role: 'admin' }).where(eq(user.email, adminEmail));
    await admin.send('POST', '/api/auth/sign-in/email', {
      email: adminEmail,
      password: 'senha-segura-1',
    });
    const list = (await admin.send('GET', '/api/admin/usuarios')).json<
      { id: string; email: string }[]
    >();
    const alunoId = list.find((x) => x.email === alunoEmail)!.id;
    const adminId = list.find((x) => x.email === adminEmail)!.id;

    const promoted = await admin.send('PATCH', `/api/admin/usuarios/${alunoId}/papel`, {
      role: 'professor',
    });
    expect(promoted.json()).toMatchObject({ role: 'professor' });
    expect((await aluno.send('GET', '/api/me')).json<AccountProfile>().role).toBe('professor');

    const self = await admin.send('PATCH', `/api/admin/usuarios/${adminId}/papel`, {
      role: 'aluno',
    });
    expect(self.statusCode).toBe(400);
  });

  it('não expõe a caixa de e-mails de teste quando o mailer é o SMTP', async () => {
    const plain = await buildServer({ checkDatabase: async () => true, webOrigin: ORIGIN });
    expect((await plain.inject({ url: '/api/dev/emails' })).statusCode).toBe(404);
    await plain.close();
  });
});
