/** Integração: Meu Glossário, desafios, livro-razão de pontos, evolução e glossário no painel. */
import type {
  ClassroomDashboard,
  Evolution,
  GlossaryTerm,
  ProgressDataPayload,
  StudentGlossary,
} from '@trilhacode/shared';
import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.js';
import { syncContent } from '../src/content/sync.js';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { pointEvent, track, user } from '../src/db/schema.js';
import { syncPoints } from '../src/evolution/points.js';
import { createCaptureMailer } from '../src/mail/mailer.js';
import { buildServer } from '../src/server.js';

const url = process.env.DATABASE_URL;
const ORIGIN = 'http://localhost:5173';
const DOMAIN = '@evolucao-teste.invalid';
const PASSWORD = 'senha-segura-1';
const TRACK = 'teste-evolucao';
const U1 = `${TRACK}/m/u1`;
const U2 = `${TRACK}/m/u2`;
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

const unitStub = (id: string, pos: number) => ({
  id,
  titulo: `Unidade ${pos}`,
  posicao: pos,
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
      desafio: {
        html: '',
        arquivos: [],
        testes: [
          { descricao: 'a', codigo: 'return true' },
          { descricao: 'b', codigo: 'return true' },
        ],
      },
      avaliacao: { notaMinima: 70, questoes: [] },
    },
    leituraComplementar: [],
  },
  gabarito: {
    notaMinima: 70,
    questoes: {
      q1: { correta: 'a', feedback: { a: 'certo', b: 'errado' } },
      q2: { correta: 'a', feedback: { a: 'certo', b: 'errado' } },
    },
  },
});

const STEPS = ['apresentacao', 'fundamentacao', 'demonstracao', 'experimentacao', 'vocabulario'];
const SIGNIFICADO = 'Elemento que representa o conteúdo principal do documento HTML.';
const OWN = 'É onde fica o assunto central da página; só existe um desses em cada página.';

describe.skipIf(!url)('evolução (integração)', () => {
  const { db, pool } = createDb(url ?? '');
  const mailer = createCaptureMailer();
  let app: App;

  async function account(tag: string, role: 'aluno' | 'professor' = 'aluno') {
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

  const evolution = async (send: ReturnType<typeof client>) =>
    (await send('GET', '/api/evolucao')).json<Evolution>();

  beforeAll(async () => {
    await runMigrations(url!);
    await db.delete(user).where(like(user.email, `%${DOMAIN}`));
    const auth = createAuth({
      db,
      mailer,
      env: { BETTER_AUTH_SECRET: 'z'.repeat(40), WEB_ORIGIN: ORIGIN, AUTH_RATE_LIMIT: false },
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
        id: TRACK,
        titulo: 'Trilha de evolução',
        descricao: 'D',
        publico: 'p',
        nivel: 'n',
        duracaoEstimada: '1 h',
        objetivos: ['o'],
        prerequisitos: [],
        requerTrilhas: [],
        modulos: [
          {
            id: `${TRACK}/m`,
            titulo: 'M',
            descricao: 'D',
            posicao: 1,
            unidades: [unitStub(U1, 1), unitStub(U2, 2)],
          },
        ],
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(like(user.email, `%${DOMAIN}`));
    await db.delete(track).where(eq(track.id, TRACK));
    await app.close();
    await pool.end();
  });

  it('glossário: cria, verifica cópia, edita, isola entre alunos e exclui', async () => {
    const a = await account('glossario-a');
    const b = await account('glossario-b');

    expect((await a.send('POST', '/api/glossario', { termo: '' })).statusCode).toBe(400);
    expect(
      (await a.send('POST', '/api/glossario', { termo: 'x', unitId: 'nao/existe' })).statusCode,
    ).toBe(400);

    const copied = await a.send('POST', '/api/glossario', {
      termo: 'main',
      significado: SIGNIFICADO,
      explicacao: SIGNIFICADO,
      exemplo: '<main>...</main>',
      unitId: U1,
    });
    expect(copied.statusCode).toBe(201);
    const term = copied.json<GlossaryTerm>();
    expect(term).toMatchObject({ termo: 'main', unidade: 'Unidade 1', explicacaoPropria: false });

    const edited = await a.send('PUT', `/api/glossario/${term.id}`, {
      termo: 'main',
      significado: SIGNIFICADO,
      explicacao: OWN,
      exemplo: '<main>...</main>',
      unitId: U1,
    });
    expect(edited.json<GlossaryTerm>().explicacaoPropria).toBe(true);

    // outro aluno não vê, não edita e não exclui
    expect((await b.send('GET', '/api/glossario')).json<GlossaryTerm[]>()).toEqual([]);
    expect(
      (await b.send('PUT', `/api/glossario/${term.id}`, { termo: 'invadido' })).statusCode,
    ).toBe(404);
    expect((await b.send('DELETE', `/api/glossario/${term.id}`)).statusCode).toBe(404);

    const list = (await a.send('GET', '/api/glossario')).json<GlossaryTerm[]>();
    expect(list.map((t) => t.termo)).toEqual(['main']);
    expect((await a.send('DELETE', `/api/glossario/${term.id}`)).statusCode).toBe(204);
    expect((await a.send('GET', '/api/glossario')).json<GlossaryTerm[]>()).toEqual([]);
    // sem sessão
    expect((await client(app)('GET', '/api/glossario')).statusCode).toBe(401);
  });

  it('pontos: etapas, desafio, avaliação (melhor tentativa), glossário com limite, unidade e trilha', async () => {
    const s = await account('pontos');

    for (const step of STEPS) await s.send('POST', '/api/progresso/etapas', { unitId: U1, step });
    // repetir uma etapa não dá pontos de novo
    await s.send('POST', '/api/progresso/etapas', { unitId: U1, step: 'apresentacao' });
    expect((await evolution(s.send)).pontos.total).toBe(25);

    // desafio: o total de testes precisa bater com a unidade
    expect(
      (await s.send('POST', '/api/progresso/desafio', { unitId: U1, passed: 1, total: 3 }))
        .statusCode,
    ).toBe(400);
    let progress = (
      await s.send('POST', '/api/progresso/desafio', { unitId: U1, passed: 1, total: 2 })
    ).json<ProgressDataPayload>();
    expect(progress.units[U1]!.challenge).toEqual({ passed: 1, total: 2 });
    expect(progress.units[U1]!.steps.desafio).toBeUndefined();
    progress = (
      await s.send('POST', '/api/progresso/desafio', { unitId: U1, passed: 2, total: 2 })
    ).json<ProgressDataPayload>();
    expect(progress.units[U1]!.steps.desafio).toBeDefined();
    // um resultado pior depois não reduz o melhor
    await s.send('POST', '/api/progresso/desafio', { unitId: U1, passed: 0, total: 2 });
    // 25 + 5 (etapa desafio) + 30 (2 de 2 testes)
    expect((await evolution(s.send)).pontos.total).toBe(60);

    // avaliação: 50% (não aprova) e depois 100%
    await s.send('POST', `/api/avaliacoes/${U1}`, { respostas: { q1: 'a', q2: 'b' } });
    let evo = await evolution(s.send);
    expect(evo.pontos.porTipo.avaliacao).toBe(25);
    expect(evo.revisar.map((r) => r.motivo)).toContain('avaliacao-abaixo');
    await s.send('POST', `/api/avaliacoes/${U1}`, { respostas: { q1: 'a', q2: 'a' } });
    evo = await evolution(s.send);
    // 60 + 50 (avaliação) + 5 (etapa avaliação) + 20 (unidade concluída)
    expect(evo.pontos.porTipo).toMatchObject({ avaliacao: 50, unidade: 20, trilha: 0 });
    expect(evo.pontos.total).toBe(135);
    expect(evo.avaliacoes).toMatchObject({ realizadas: 1, aprovadas: 1 });
    expect(evo.avaliacoes.historico.map((h) => h.nota)).toEqual([100, 50]);
    expect(evo.desafios.concluidos).toBe(1);
    expect(evo.revisar).toEqual([]);

    // glossário: só termos com explicação própria contam, até 5 por unidade
    await s.send('POST', '/api/glossario', {
      termo: 'copiado',
      significado: SIGNIFICADO,
      explicacao: SIGNIFICADO,
      unitId: U1,
    });
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await s.send('POST', '/api/glossario', {
        termo: `termo ${i}`,
        significado: SIGNIFICADO,
        explicacao: `${OWN} (${i})`,
        unitId: U1,
      });
      ids.push(r.json<GlossaryTerm>().id);
    }
    evo = await evolution(s.send);
    expect(evo.pontos.porTipo.glossario).toBe(25);
    expect(evo.glossario).toEqual({ termos: 8, comExplicacaoPropria: 7 });
    expect(evo.revisar).toEqual([
      expect.objectContaining({ unitId: U1, motivo: 'explicacao-pendente' }),
    ]);
    // excluir e recriar não gera pontos extras; o livro-razão não diminui
    for (const id of ids) await s.send('DELETE', `/api/glossario/${id}`);
    await s.send('POST', '/api/glossario', {
      termo: 'de novo',
      significado: SIGNIFICADO,
      explicacao: OWN,
      unitId: U1,
    });
    expect((await evolution(s.send)).pontos.porTipo.glossario).toBe(25);

    // segunda unidade completa: unidade + trilha
    for (const step of STEPS) await s.send('POST', '/api/progresso/etapas', { unitId: U2, step });
    await s.send('POST', '/api/progresso/desafio', { unitId: U2, passed: 2, total: 2 });
    await s.send('POST', `/api/avaliacoes/${U2}`, { respostas: { q1: 'a', q2: 'a' } });
    evo = await evolution(s.send);
    expect(evo.pontos.porTipo.trilha).toBe(100);
    const trilha = evo.trilhas.find((t) => t.id === TRACK)!;
    expect(trilha).toMatchObject({ unidadesConcluidas: 2, percentual: 100, concluida: true });
    expect(evo.pontos.total).toBe(135 + 25 + 135 + 100);
    expect(evo.eventos[0]).toMatchObject({ tipo: expect.any(String), pontos: expect.any(Number) });

    // sincronizar de novo não altera nada
    const before = await db.select().from(pointEvent).where(eq(pointEvent.userId, s.id));
    expect(await syncPoints(db, s.id)).toBe(evo.pontos.total);
    const after = await db.select().from(pointEvent).where(eq(pointEvent.userId, s.id));
    expect(after).toHaveLength(before.length);
  });

  it('sincronizações simultâneas não lançam pontos em dobro', async () => {
    const s = await account('concorrencia');
    for (const step of STEPS) await s.send('POST', '/api/progresso/etapas', { unitId: U1, step });
    await Promise.all([syncPoints(db, s.id), syncPoints(db, s.id), syncPoints(db, s.id)]);
    const rows = await db
      .select()
      .from(pointEvent)
      .where(and(eq(pointEvent.userId, s.id), eq(pointEvent.kind, 'etapa')));
    expect(rows).toHaveLength(STEPS.length);
  });

  it('importação do navegador: progresso com desafio e termos do glossário', async () => {
    const s = await account('importacao');
    const progress = (
      await s.send('POST', '/api/progresso/importar', {
        version: 1,
        units: {
          [U1]: {
            steps: { apresentacao: '2026-01-01T00:00:00.000Z' },
            attempts: 0,
            challenge: { passed: 1, total: 2 },
          },
        },
      })
    ).json<ProgressDataPayload>();
    expect(progress.units[U1]!.challenge).toEqual({ passed: 1, total: 2 });
    const terms = (
      await s.send('POST', '/api/glossario/importar', {
        terms: [
          { termo: 'local', significado: SIGNIFICADO, explicacao: OWN, unitId: U1 },
          { termo: 'órfão', unitId: 'unidade/removida' },
        ],
      })
    ).json<GlossaryTerm[]>();
    expect(terms.map((t) => [t.termo, t.unitId, t.explicacaoPropria])).toEqual([
      ['local', U1, true],
      ['órfão', null, false],
    ]);
    const evo = await evolution(s.send);
    // 5 (etapa) + 15 (1 de 2 testes) + 5 (termo)
    expect(evo.pontos.total).toBe(25);
  });

  it('professor lê o glossário dos alunos da própria turma e vê os pontos no painel', async () => {
    const prof = await account('prof-glossario', 'professor');
    const other = await account('outro-prof', 'professor');
    const aluno = await account('aluno-glossario');
    const fora = await account('fora-da-turma');
    await aluno.send('POST', '/api/glossario', {
      termo: 'seletor',
      significado: 'Padrão que escolhe elementos.',
      explicacao: 'É o jeito de dizer ao CSS em quais partes da página a regra vale.',
      unitId: U1,
    });
    await aluno.send('POST', '/api/progresso/etapas', { unitId: U1, step: 'apresentacao' });

    const { id } = (await prof.send('POST', '/api/turmas', { name: 'Turma G' })).json<{
      id: string;
    }>();
    await prof.send('POST', `/api/turmas/${id}/alunos`, { students: [{ email: aluno.email }] });
    await prof.send('PUT', `/api/turmas/${id}/trilhas`, { trackId: TRACK, dueDate: null });

    const g = await prof.send('GET', `/api/turmas/${id}/alunos/${aluno.id}/glossario`);
    expect(g.statusCode).toBe(200);
    const data = g.json<StudentGlossary>();
    expect(data.aluno.email).toBe(aluno.email);
    expect(data.termos.map((t) => [t.termo, t.explicacaoPropria, t.unidade])).toEqual([
      ['seletor', true, 'Unidade 1'],
    ]);

    // aluno de fora da turma, outro professor e o próprio aluno não acessam por esta rota
    expect(
      (await prof.send('GET', `/api/turmas/${id}/alunos/${fora.id}/glossario`)).statusCode,
    ).toBe(404);
    expect(
      (await other.send('GET', `/api/turmas/${id}/alunos/${aluno.id}/glossario`)).statusCode,
    ).toBe(403);
    expect(
      (await aluno.send('GET', `/api/turmas/${id}/alunos/${aluno.id}/glossario`)).statusCode,
    ).toBe(403);

    const dash = (await prof.send('GET', `/api/turmas/${id}/painel`)).json<ClassroomDashboard>();
    expect(dash.students[0]).toMatchObject({ points: 10, glossaryTerms: 1, glossaryOwn: 1 });
    const csv = (await prof.send('GET', `/api/turmas/${id}/relatorio.csv`)).body;
    expect(csv).toContain('Pontos;Termos no glossário;Termos com explicação própria');
  });
});
