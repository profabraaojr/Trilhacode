/** Integração: turmas, convites, permissões, painel, relatório e avaliações complementares. */
import type {
  AddStudentResult,
  ClassroomDashboard,
  ClassroomDetail,
  ClassroomSummary,
  CustomAssessmentPublic,
  CustomAssessmentResult,
  MyClassroom,
} from '@trilhacode/shared';
import { eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.js';
import { syncContent } from '../src/content/sync.js';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { track, unitProgress, unitScore, user } from '../src/db/schema.js';
import { createCaptureMailer } from '../src/mail/mailer.js';
import { buildServer } from '../src/server.js';

const url = process.env.DATABASE_URL;
const ORIGIN = 'http://localhost:5173';
const DOMAIN = '@turmas-teste.invalid';
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
      desafio: { html: '', arquivos: [], testes: [] },
      avaliacao: { notaMinima: 70, questoes: [] },
    },
    leituraComplementar: [],
  },
  gabarito: { notaMinima: 70, questoes: {} },
});

describe.skipIf(!url)('turmas (integração)', () => {
  const { db, pool } = createDb(url ?? '');
  const mailer = createCaptureMailer();
  let app: App;

  async function account(
    tag: string,
    role: 'aluno' | 'professor' | 'admin' = 'aluno',
    verify = true,
  ) {
    const email = `${tag}${DOMAIN}`;
    const send = client(app);
    await send('POST', '/api/auth/sign-up/email', { name: tag, email, password: PASSWORD });
    if (verify) {
      const link = new URL(
        [...mailer.outbox!]
          .reverse()
          .find((m) => m.to === email)!
          .text.match(/https?:\/\/\S+/)![0],
      );
      await send('GET', link.pathname + link.search);
    }
    if (role !== 'aluno') await db.update(user).set({ role }).where(eq(user.email, email));
    if (verify) await send('POST', '/api/auth/sign-in/email', { email, password: PASSWORD });
    const [row] = await db.select().from(user).where(eq(user.email, email));
    return { send, email, id: row!.id };
  }

  beforeAll(async () => {
    await runMigrations(url!);
    await db.delete(user).where(like(user.email, `%${DOMAIN}`));
    const auth = createAuth({
      db,
      mailer,
      env: { BETTER_AUTH_SECRET: 'y'.repeat(40), WEB_ORIGIN: ORIGIN, AUTH_RATE_LIMIT: false },
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
        id: 'teste-turmas',
        titulo: 'Trilha de turma',
        descricao: 'D',
        publico: 'p',
        nivel: 'n',
        duracaoEstimada: '1 h',
        objetivos: ['o'],
        prerequisitos: [],
        requerTrilhas: [],
        modulos: [
          {
            id: 'teste-turmas/m',
            titulo: 'M',
            descricao: 'D',
            posicao: 1,
            unidades: [unitStub('teste-turmas/m/u1', 1), unitStub('teste-turmas/m/u2', 2)],
          },
        ],
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(user).where(like(user.email, `%${DOMAIN}`));
    await db.delete(track).where(eq(track.id, 'teste-turmas'));
    await app.close();
    await pool.end();
  });

  it('fluxo completo: turma, convites, matrícula ao confirmar, trilha, painel, relatório e avaliação', async () => {
    const prof = await account('prof', 'professor');
    const existing = await account('aluno-existente');

    // aluno não cria turma; professor cria
    expect((await existing.send('POST', '/api/turmas', { name: 'Não pode' })).statusCode).toBe(403);
    const created = await prof.send('POST', '/api/turmas', {
      name: '2º A Informática',
      period: '2026',
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json<{ id: string }>();

    // matrícula: conta existente entra na hora; e-mail novo recebe convite; erros por linha
    const added = (
      await prof.send('POST', `/api/turmas/${id}/alunos`, {
        students: [
          { email: existing.email, row: 2 },
          { email: `novo${DOMAIN}`, name: 'Novo', row: 3 },
          { email: 'isto-nao-e-email', row: 4 },
          { email: `NOVO${DOMAIN}`, row: 5 },
        ],
      })
    ).json<AddStudentResult[]>();
    expect(added.map((r) => [r.row, r.status])).toEqual([
      [2, 'matriculado'],
      [3, 'convidado'],
      [4, 'invalido'],
      [5, 'invalido'],
    ]);
    expect(
      mailer.outbox!.some(
        (m) => m.to === `novo${DOMAIN}` && m.subject.includes('2º A Informática'),
      ),
    ).toBe(true);
    const again = (
      await prof.send('POST', `/api/turmas/${id}/alunos`, {
        students: [{ email: existing.email }, { email: `novo${DOMAIN}` }],
      })
    ).json<AddStudentResult[]>();
    expect(again.map((r) => r.status)).toEqual(['ja-na-turma', 'ja-convidado']);

    // o convidado cria a conta; ao confirmar o e-mail, entra na turma
    const novo = await account('novo');
    let detail = (await prof.send('GET', `/api/turmas/${id}`)).json<ClassroomDetail>();
    expect(detail.enrolled.map((e) => e.email).sort()).toEqual([existing.email, novo.email].sort());
    expect(detail.invitations).toEqual([]);

    // trilha atribuída com prazo vencido
    expect(
      (
        await prof.send('PUT', `/api/turmas/${id}/trilhas`, {
          trackId: 'teste-turmas',
          dueDate: '2020-01-31',
        })
      ).statusCode,
    ).toBe(200);
    detail = (await prof.send('GET', `/api/turmas/${id}`)).json<ClassroomDetail>();
    expect(detail.assignments).toEqual([
      { trackId: 'teste-turmas', trackTitle: 'Trilha de turma', dueDate: '2020-01-31', units: 2 },
    ]);

    // progresso: o aluno existente conclui a unidade 1 e tira 50 na avaliação da unidade 2
    for (const step of [
      'apresentacao',
      'fundamentacao',
      'demonstracao',
      'experimentacao',
      'vocabulario',
      'desafio',
      'avaliacao',
    ] as const) {
      await db.insert(unitProgress).values({
        userId: existing.id,
        unitId: 'teste-turmas/m/u1',
        step,
        status: 'completed',
        completedAt: new Date(),
      });
    }
    await db
      .insert(unitScore)
      .values({ userId: existing.id, unitId: 'teste-turmas/m/u2', bestScore: 50, attempts: 3 });

    const dash = (await prof.send('GET', `/api/turmas/${id}/painel`)).json<ClassroomDashboard>();
    const s = dash.students.find((x) => x.email === existing.email)!;
    expect(s).toMatchObject({
      progress: 50,
      unitsCompleted: 1,
      averageScore: 50,
      overdue: ['Trilha de turma'],
    });
    expect(dash.students.find((x) => x.email === novo.email)).toMatchObject({
      progress: 0,
      lastActivity: null,
    });
    const u2 = dash.units.find((x) => x.id === 'teste-turmas/m/u2')!;
    expect(u2).toMatchObject({
      completedPct: 0,
      averageScore: 50,
      averageAttempts: 3,
      struggling: 1,
    });
    expect(dash.units.find((x) => x.id === 'teste-turmas/m/u1')!.completedPct).toBe(50);

    // avaliação complementar
    const bad = await prof.send('POST', `/api/turmas/${id}/avaliacoes`, {
      title: 'Revisão',
      dueDate: null,
      questions: [
        {
          enunciado: 'Qual tag?',
          alternativas: [
            { texto: 'a', correta: false, feedback: 'x' },
            { texto: 'b', correta: false, feedback: 'y' },
          ],
        },
      ],
    });
    expect(bad.json<{ erro: string }>().erro).toContain('Questão 1');
    const ca = (
      await prof.send('POST', `/api/turmas/${id}/avaliacoes`, {
        title: 'Revisão de HTML',
        description: 'Antes da prova',
        dueDate: '2030-12-01',
        minScore: 60,
        questions: [
          {
            enunciado: 'Qual tag cria um parágrafo?',
            alternativas: [
              { texto: '<p>', correta: true, feedback: 'Certo.' },
              { texto: '<a>', correta: false, feedback: 'Isso é link.' },
            ],
          },
          {
            enunciado: 'Qual atributo dá o destino do link?',
            alternativas: [
              { texto: 'src', correta: false, feedback: 'É de imagem.' },
              { texto: 'href', correta: true, feedback: 'Isso.' },
            ],
          },
        ],
      })
    ).json<{ id: string }>();
    const pub = (
      await existing.send('GET', `/api/avaliacoes-turma/${ca.id}`)
    ).json<CustomAssessmentPublic>();
    expect(JSON.stringify(pub)).not.toContain('correta');
    // as alternativas aparecem embaralhadas; o aluno responde pelo índice exibido
    expect([...pub.questions[0]!.alternativas].sort()).toEqual(['<a>', '<p>']);
    const idx = (qi: number, text: string) => pub.questions[qi]!.alternativas.indexOf(text);
    const r = (
      await existing.send('POST', `/api/avaliacoes-turma/${ca.id}/respostas`, {
        respostas: { '0': idx(0, '<p>'), '1': idx(1, 'src') },
      })
    ).json<CustomAssessmentResult>();
    expect(r).toMatchObject({ nota: 50, aprovado: false });
    expect(r.questoes[1]).toEqual({ respondida: true, correta: false, feedback: 'É de imagem.' });
    await existing.send('POST', `/api/avaliacoes-turma/${ca.id}/respostas`, {
      respostas: { '0': idx(0, '<p>'), '1': idx(1, 'href') },
    });

    const mine = (await existing.send('GET', '/api/minhas-turmas')).json<MyClassroom[]>();
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ name: '2º A Informática', teachers: ['prof'] });
    expect(mine[0]!.assessments[0]).toMatchObject({ title: 'Revisão de HTML', myBestScore: 100 });

    // relatório CSV com BOM e ponto e vírgula
    const csv = await prof.send('GET', `/api/turmas/${id}/relatorio.csv`);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.body.startsWith('﻿Nome;E-mail;Progresso (%)')).toBe(true);
    expect(csv.body).toContain(`aluno-existente;${existing.email};50;1;50;`);
    expect(csv.body).toContain('Avaliação: Revisão de HTML');
  });

  it('isola as turmas: outro professor e alunos de fora não acessam', async () => {
    const dono = await account('dono', 'professor');
    const outro = await account('outro-prof', 'professor');
    const intruso = await account('intruso');
    const { id } = (await dono.send('POST', '/api/turmas', { name: 'Turma fechada' })).json<{
      id: string;
    }>();
    const ca = (
      await dono.send('POST', `/api/turmas/${id}/avaliacoes`, {
        title: 'Só da turma',
        dueDate: null,
        questions: [
          {
            enunciado: 'Pergunta?',
            alternativas: [
              { texto: 'a', correta: true, feedback: 'x' },
              { texto: 'b', correta: false, feedback: 'y' },
            ],
          },
        ],
      })
    ).json<{ id: string }>();

    expect((await outro.send('GET', `/api/turmas/${id}`)).statusCode).toBe(403);
    expect((await outro.send('GET', `/api/turmas/${id}/painel`)).statusCode).toBe(403);
    expect(
      (
        await outro.send('POST', `/api/turmas/${id}/alunos`, {
          students: [{ email: intruso.email }],
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await outro.send('GET', '/api/turmas')).json<ClassroomSummary[]>().some((c) => c.id === id),
    ).toBe(false);
    expect((await intruso.send('GET', `/api/avaliacoes-turma/${ca.id}`)).statusCode).toBe(403);
    expect(
      (await intruso.send('POST', `/api/avaliacoes-turma/${ca.id}/respostas`, { respostas: {} }))
        .statusCode,
    ).toBe(403);
    expect((await intruso.send('GET', `/api/turmas/${id}/relatorio.csv`)).statusCode).toBe(403);
    expect((await intruso.send('GET', '/api/turmas/nao-existe')).statusCode).toBe(404);
  });

  it('coprofessores: só professores entram, têm acesso e não excluem a turma', async () => {
    const dono = await account('dono2', 'professor');
    const co = await account('coprof', 'professor');
    const aluno = await account('aluno-nao-prof');
    const { id } = (await dono.send('POST', '/api/turmas', { name: 'Compartilhada' })).json<{
      id: string;
    }>();

    expect(
      (await dono.send('POST', `/api/turmas/${id}/professores`, { email: aluno.email })).statusCode,
    ).toBe(400);
    expect(
      (await dono.send('POST', `/api/turmas/${id}/professores`, { email: co.email })).statusCode,
    ).toBe(200);
    const list = (await co.send('GET', '/api/turmas')).json<ClassroomSummary[]>();
    expect(list.find((c) => c.id === id)?.myRole).toBe('coprofessor');
    expect((await co.send('GET', `/api/turmas/${id}/painel`)).statusCode).toBe(200);
    expect(
      (await co.send('POST', `/api/turmas/${id}/professores`, { email: dono.email })).statusCode,
    ).toBe(403);
    expect((await co.send('DELETE', `/api/turmas/${id}`)).statusCode).toBe(403);
    expect((await dono.send('DELETE', `/api/turmas/${id}`)).statusCode).toBe(200);
  });

  it('embaralha as alternativas sempre na mesma ordem para a mesma avaliação', async () => {
    const { displayOrder } = await import('../src/routes/classrooms.js');
    expect(displayOrder(4, 'a#0')).toEqual(displayOrder(4, 'a#0'));
    expect([...displayOrder(4, 'a#0')].sort()).toEqual([0, 1, 2, 3]);
    const firsts = new Set(Array.from({ length: 20 }, (_, i) => displayOrder(3, `x#${i}`)[0]));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('administradores veem todas as turmas', async () => {
    const dono = await account('dono3', 'professor');
    const admin = await account('adm', 'admin');
    const { id } = (await dono.send('POST', '/api/turmas', { name: 'Vista pelo admin' })).json<{
      id: string;
    }>();
    expect(
      (await admin.send('GET', '/api/turmas')).json<ClassroomSummary[]>().some((c) => c.id === id),
    ).toBe(true);
    expect((await admin.send('GET', `/api/turmas/${id}/painel`)).statusCode).toBe(200);
  });
});
