/** Integração: sincronização do conteúdo e rotas públicas (exige DATABASE_URL). */
import type {
  AssessmentResult,
  CompiledTrack,
  TrackDetail,
  TrackSummary,
  UnitPayload,
} from '@trilhacode/content';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { syncContent } from '../src/content/sync.js';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { buildServer } from '../src/server.js';
import { track } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const url = process.env.DATABASE_URL;

const unitFixture = (id: string, posicao: number, requer: string[]) => ({
  id,
  titulo: `Unidade ${posicao}`,
  posicao,
  nivel: 'básico',
  duracaoMinutos: 30,
  objetivos: ['Aprender'],
  requer,
  conteudo: {
    etapas: {
      apresentacao: { html: '<p>Oi</p>' },
      fundamentacao: { html: '' },
      demonstracao: { html: '', arquivos: [] },
      experimentacao: { html: '', arquivos: [{ name: 'index.html', content: '' }] },
      vocabulario: { html: '', termos: [] },
      desafio: { html: '', arquivos: [], testes: [] },
      avaliacao: {
        notaMinima: 70,
        questoes: [
          {
            id: 'q1',
            tipo: 'conceitual' as const,
            enunciadoHtml: '',
            alternativas: [
              { id: 'a', textoHtml: 'A' },
              { id: 'b', textoHtml: 'B' },
            ],
          },
          {
            id: 'q2',
            tipo: 'conceitual' as const,
            enunciadoHtml: '',
            alternativas: [
              { id: 'a', textoHtml: 'A' },
              { id: 'b', textoHtml: 'B' },
            ],
          },
        ],
      },
    },
    leituraComplementar: [],
  },
  gabarito: {
    notaMinima: 70,
    questoes: {
      q1: { correta: 'a', feedback: { a: 'Certo, porque…', b: 'Reveja…' } },
      q2: { correta: 'b', feedback: { a: 'Não, pois…', b: 'Isso.' } },
    },
  },
});

const fixture = (withSecond = true): CompiledTrack[] => [
  {
    id: 'teste-api',
    titulo: 'Trilha de teste',
    descricao: 'Descrição',
    publico: 'Ensino técnico',
    nivel: 'Iniciante',
    duracaoEstimada: '1 h',
    objetivos: ['Testar'],
    prerequisitos: [],
    requerTrilhas: [],
    modulos: [
      {
        id: 'teste-api/m',
        titulo: 'Módulo',
        descricao: 'Desc',
        posicao: 1,
        unidades: [
          unitFixture('teste-api/m/u1', 1, []),
          ...(withSecond ? [unitFixture('teste-api/m/u2', 2, ['teste-api/m/u1'])] : []),
        ],
      },
    ],
  },
];

describe.skipIf(!url)('conteúdo (integração)', () => {
  const { db, pool } = createDb(url ?? '');
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    await runMigrations(url!);
    app = await buildServer({
      checkDatabase: async () => true,
      webOrigin: 'http://localhost:5173',
      db,
    });
  });

  afterAll(async () => {
    await db.delete(track).where(eq(track.id, 'teste-api')); // remove só a trilha de teste
    await app.close();
    await pool.end();
  });

  it('sincroniza e lista as trilhas com o total de unidades', async () => {
    const summary = await syncContent(db, fixture());
    expect(summary).toMatchObject({ tracks: 1, modules: 1, units: 2 });
    const res = await app.inject({ url: '/api/trilhas' });
    const list = res.json<TrackSummary[]>();
    expect(list.find((t) => t.id === 'teste-api')).toMatchObject({
      totalUnidades: 2,
      publico: 'Ensino técnico',
    });
  });

  it('entrega o mapa da trilha com módulos, unidades e pré-requisitos', async () => {
    await syncContent(db, fixture());
    const t = (await app.inject({ url: '/api/trilhas/teste-api' })).json<TrackDetail>();
    expect(t.objetivos).toEqual(['Testar']);
    expect(t.modulos[0]!.unidades.map((u) => u.id)).toEqual(['teste-api/m/u1', 'teste-api/m/u2']);
    expect(t.modulos[0]!.unidades[1]!.requer).toEqual(['teste-api/m/u1']);
  });

  it('entrega a unidade sem o gabarito', async () => {
    await syncContent(db, fixture());
    const res = await app.inject({ url: '/api/unidades/teste-api/m/u1' });
    expect(res.statusCode).toBe(200);
    const u = res.json<UnitPayload>();
    expect(u).toMatchObject({ trilhaId: 'teste-api', moduloTitulo: 'Módulo' });
    expect(res.body).not.toContain('gabarito');
    expect(res.body).not.toContain('Certo, porque');
    expect((await app.inject({ url: '/api/unidades/nao/existe' })).statusCode).toBe(404);
  });

  it('corrige a avaliação no servidor com feedback por questão', async () => {
    await syncContent(db, fixture());
    const res = await app.inject({
      method: 'POST',
      url: '/api/avaliacoes/teste-api/m/u1',
      payload: { respostas: { q1: 'a' } },
    });
    const r = res.json<AssessmentResult>();
    expect(r).toMatchObject({ nota: 50, aprovado: false, acertos: 1, total: 2 });
    expect(r.questoes).toEqual([
      { id: 'q1', respondida: true, correta: true, feedback: 'Certo, porque…' },
      { id: 'q2', respondida: false, correta: false, feedback: 'Questão sem resposta.' },
    ]);
    const ok = (
      await app.inject({
        method: 'POST',
        url: '/api/avaliacoes/teste-api/m/u1',
        payload: { respostas: { q1: 'a', q2: 'b' } },
      })
    ).json<AssessmentResult>();
    expect(ok).toMatchObject({ nota: 100, aprovado: true });
  });

  it('rejeita corpo inválido na avaliação', async () => {
    await syncContent(db, fixture());
    const res = await app.inject({
      method: 'POST',
      url: '/api/avaliacoes/teste-api/m/u1',
      payload: { x: 1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('não remove trilhas fora da lista sem pruneTracks', async () => {
    await syncContent(db, fixture());
    await syncContent(db, []);
    expect((await app.inject({ url: '/api/trilhas/teste-api' })).statusCode).toBe(200);
  });

  it('remove unidades que saíram do conteúdo', async () => {
    await syncContent(db, fixture());
    const s = await syncContent(db, fixture(false));
    expect(s.removedUnits).toBe(1);
    expect((await app.inject({ url: '/api/unidades/teste-api/m/u2' })).statusCode).toBe(404);
  });
});
