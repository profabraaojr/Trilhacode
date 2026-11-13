/**
 * Etapa 6: Meu Glossário, resultado dos desafios e painel de evolução do aluno.
 */
import { randomUUID } from 'node:crypto';
import type { UnitContent } from '@trilhacode/content/types';
import {
  challengeResultSchema,
  checkExplanation,
  glossaryImportSchema,
  glossaryTermInputSchema,
  POINT_KINDS,
  UNIT_STEP_IDS,
  type AttemptView,
  type Evolution,
  type GlossaryTerm,
  type PointKind,
  type ReviewItem,
} from '@trilhacode/shared';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Auth } from '../auth.js';
import type { Database } from '../db/client.js';
import {
  assessmentAttempt,
  challengeResult,
  classroom,
  customAssessment,
  customAttempt,
  glossaryTerm,
  module,
  pointEvent,
  track,
  unit,
  unitProgress,
  unitScore,
} from '../db/schema.js';
import { syncPoints } from '../evolution/points.js';
import { completeStep, loadProgress } from './account.js';
import { requireUser } from './session.js';

type TermRow = typeof glossaryTerm.$inferSelect;

export function toGlossaryTerm(t: TermRow, unidade: string | null): GlossaryTerm {
  return {
    id: t.id,
    termo: t.term,
    significado: t.meaning,
    explicacao: t.ownExplanation,
    exemplo: t.example,
    unitId: t.unitId,
    unidade,
    explicacaoPropria: t.ownWords,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/** Termos de um aluno, em ordem alfabética, com o título da unidade de origem. */
export async function listGlossary(db: Database, userId: string): Promise<GlossaryTerm[]> {
  const rows = await db
    .select({ t: glossaryTerm, unidade: unit.title })
    .from(glossaryTerm)
    .leftJoin(unit, eq(glossaryTerm.unitId, unit.id))
    .where(eq(glossaryTerm.userId, userId))
    .orderBy(asc(sql`lower(${glossaryTerm.term})`));
  return rows.map((r) => toGlossaryTerm(r.t, r.unidade));
}

const toColumns = (d: ReturnType<typeof glossaryTermInputSchema.parse>) => ({
  term: d.termo,
  meaning: d.significado,
  ownExplanation: d.explicacao,
  example: d.exemplo,
  unitId: d.unitId,
  ownWords: checkExplanation(d.significado, d.explicacao).status === 'propria',
});

async function existingUnits(db: Database, ids: (string | null)[]): Promise<Set<string>> {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Set();
  const rows = await db.select({ id: unit.id }).from(unit).where(inArray(unit.id, list));
  return new Set(rows.map((r) => r.id));
}

export async function evolutionRoutes(
  app: FastifyInstance,
  { auth, db }: { auth: Auth; db: Database },
) {
  /* ------------------------------------------------------------ Glossário */

  app.get('/api/glossario', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    return u && listGlossary(db, u.id);
  });

  app.post('/api/glossario', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const parsed = glossaryTermInputSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    if (parsed.data.unitId && !(await existingUnits(db, [parsed.data.unitId])).size)
      return reply.code(400).send({ erro: 'Unidade não encontrada.' });
    const id = randomUUID();
    await db.insert(glossaryTerm).values({ id, userId: u.id, ...toColumns(parsed.data) });
    await syncPoints(db, u.id);
    return reply.code(201).send((await listGlossary(db, u.id)).find((t) => t.id === id));
  });

  app.put<{ Params: { id: string } }>('/api/glossario/:id', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const parsed = glossaryTermInputSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    if (parsed.data.unitId && !(await existingUnits(db, [parsed.data.unitId])).size)
      return reply.code(400).send({ erro: 'Unidade não encontrada.' });
    const updated = await db
      .update(glossaryTerm)
      .set(toColumns(parsed.data))
      .where(and(eq(glossaryTerm.id, req.params.id), eq(glossaryTerm.userId, u.id)))
      .returning({ id: glossaryTerm.id });
    if (!updated.length) return reply.code(404).send({ erro: 'Termo não encontrado.' });
    await syncPoints(db, u.id);
    return (await listGlossary(db, u.id)).find((t) => t.id === req.params.id);
  });

  app.delete<{ Params: { id: string } }>('/api/glossario/:id', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const removed = await db
      .delete(glossaryTerm)
      .where(and(eq(glossaryTerm.id, req.params.id), eq(glossaryTerm.userId, u.id)))
      .returning({ id: glossaryTerm.id });
    if (!removed.length) return reply.code(404).send({ erro: 'Termo não encontrado.' });
    return reply.code(204).send();
  });

  /** Importa os termos registrados no navegador antes do login. */
  app.post('/api/glossario/importar', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const parsed = glossaryImportSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: 'Formato de glossário inválido.' });
    const valid = await existingUnits(
      db,
      parsed.data.terms.map((t) => t.unitId),
    );
    const rows = parsed.data.terms.map((t) => ({
      id: randomUUID(),
      userId: u.id,
      ...toColumns({ ...t, unitId: t.unitId && valid.has(t.unitId) ? t.unitId : null }),
    }));
    if (rows.length) await db.insert(glossaryTerm).values(rows);
    await syncPoints(db, u.id);
    return listGlossary(db, u.id);
  });

  /* ------------------------------------------------------------ Desafios */

  /**
   * Resultado dos testes do desafio, executados no sandbox do navegador. Guarda o
   * melhor resultado; com todos os testes aprovados, a etapa é concluída.
   */
  app.post('/api/progresso/desafio', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const parsed = challengeResultSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ erro: 'Envie { "unitId", "passed", "total" }.' });
    const { unitId, passed, total } = parsed.data;
    const [row] = await db.select({ content: unit.content }).from(unit).where(eq(unit.id, unitId));
    if (!row?.content) return reply.code(404).send({ erro: 'Unidade não encontrada.' });
    const expected = (row.content as UnitContent).etapas.desafio.testes.length;
    if (total !== expected)
      return reply.code(400).send({ erro: `O desafio desta unidade tem ${expected} testes.` });
    await db
      .insert(challengeResult)
      .values({ userId: u.id, unitId, bestPassed: passed, total })
      .onConflictDoUpdate({
        target: [challengeResult.userId, challengeResult.unitId],
        set: {
          bestPassed: sql`greatest(${challengeResult.bestPassed}, ${passed})`,
          total,
          attempts: sql`${challengeResult.attempts} + 1`,
          updatedAt: sql`now()`,
        },
      });
    if (passed === total) await completeStep(db, u.id, unitId, 'desafio');
    await syncPoints(db, u.id);
    return loadProgress(db, u.id);
  });

  /* ------------------------------------------------------------ Evolução */

  app.get('/api/evolucao', async (req, reply): Promise<Evolution | undefined> => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    await syncPoints(db, u.id);

    const units = await db
      .select({
        id: unit.id,
        title: unit.title,
        trackId: track.id,
        trackTitle: track.title,
        published: track.published,
        answerKey: unit.answerKey,
      })
      .from(unit)
      .innerJoin(module, eq(unit.moduleId, module.id))
      .innerJoin(track, eq(module.trackId, track.id))
      .orderBy(asc(track.title), asc(module.position), asc(unit.position));
    const unitById = new Map(units.map((x) => [x.id, x]));
    const title = (id: string) => unitById.get(id)?.title ?? id;

    // Pontos
    const events = await db
      .select()
      .from(pointEvent)
      .where(eq(pointEvent.userId, u.id))
      .orderBy(desc(pointEvent.createdAt));
    const porTipo = Object.fromEntries(POINT_KINDS.map((k) => [k, 0])) as Record<PointKind, number>;
    for (const e of events) if (e.kind in porTipo) porTipo[e.kind as PointKind] += e.points;

    // Trilhas
    const steps = await db
      .select({ unitId: unitProgress.unitId })
      .from(unitProgress)
      .where(and(eq(unitProgress.userId, u.id), eq(unitProgress.status, 'completed')));
    const stepsByUnit = new Map<string, number>();
    for (const s of steps) stepsByUnit.set(s.unitId, (stepsByUnit.get(s.unitId) ?? 0) + 1);
    const byTrack = new Map<string, { titulo: string; ids: string[] }>();
    for (const x of units) {
      if (!x.published) continue;
      const t = byTrack.get(x.trackId) ?? { titulo: x.trackTitle, ids: [] };
      t.ids.push(x.id);
      byTrack.set(x.trackId, t);
    }
    const N = UNIT_STEP_IDS.length;
    const trilhas = [...byTrack].map(([id, t]) => {
      const done = t.ids.reduce((n, uid) => n + (stepsByUnit.get(uid) ?? 0), 0);
      const unidadesConcluidas = t.ids.filter((uid) => stepsByUnit.get(uid) === N).length;
      return {
        id,
        titulo: t.titulo,
        unidades: t.ids.length,
        unidadesConcluidas,
        percentual: t.ids.length ? Math.round((done / (t.ids.length * N)) * 100) : 0,
        iniciada: done > 0,
        concluida: t.ids.length > 0 && unidadesConcluidas === t.ids.length,
      };
    });

    // Avaliações (unidades e turmas)
    const unitAttempts = await db
      .select()
      .from(assessmentAttempt)
      .where(eq(assessmentAttempt.userId, u.id));
    const classAttempts = await db
      .select({
        a: customAttempt,
        title: customAssessment.title,
        minScore: customAssessment.minScore,
        classroom: classroom.name,
      })
      .from(customAttempt)
      .innerJoin(customAssessment, eq(customAttempt.assessmentId, customAssessment.id))
      .innerJoin(classroom, eq(customAssessment.classroomId, classroom.id))
      .where(eq(customAttempt.userId, u.id));
    const historico: AttemptView[] = [
      ...unitAttempts.map((a) => ({
        origem: 'unidade' as const,
        id: a.unitId,
        titulo: title(a.unitId),
        contexto: unitById.get(a.unitId)?.trackTitle ?? '',
        nota: a.score,
        aprovado: a.passed,
        em: a.createdAt.toISOString(),
      })),
      ...classAttempts.map((c) => ({
        origem: 'turma' as const,
        id: c.a.assessmentId,
        titulo: c.title,
        contexto: c.classroom,
        nota: c.a.score,
        aprovado: c.a.score >= c.minScore,
        em: c.a.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.em.localeCompare(a.em));
    const realizadas = new Set(historico.map((h) => `${h.origem}:${h.id}`));
    const aprovadas = new Set(
      historico.filter((h) => h.aprovado).map((h) => `${h.origem}:${h.id}`),
    );
    // Notas registradas antes do histórico existir (importadas do navegador) também contam.
    const scores = await db.select().from(unitScore).where(eq(unitScore.userId, u.id));
    for (const s of scores) {
      if (s.attempts > 0) realizadas.add(`unidade:${s.unitId}`);
      const min = unitById.get(s.unitId)?.answerKey?.notaMinima ?? 70;
      if (s.bestScore >= min) aprovadas.add(`unidade:${s.unitId}`);
    }

    // Desafios
    const challenges = await db
      .select()
      .from(challengeResult)
      .where(eq(challengeResult.userId, u.id));
    const resultados = challenges.map((c) => ({
      unitId: c.unitId,
      unidade: title(c.unitId),
      aprovados: c.bestPassed,
      total: c.total,
      concluido: c.bestPassed >= c.total,
    }));

    // Glossário
    const terms = await db
      .select({ unitId: glossaryTerm.unitId, ownWords: glossaryTerm.ownWords })
      .from(glossaryTerm)
      .where(eq(glossaryTerm.userId, u.id));

    // Conteúdos a revisar
    const revisar: ReviewItem[] = [];
    for (const s of scores) {
      const min = unitById.get(s.unitId)?.answerKey?.notaMinima ?? 70;
      if (s.bestScore < min)
        revisar.push({
          unitId: s.unitId,
          unidade: title(s.unitId),
          motivo: 'avaliacao-abaixo',
          detalhe: `Melhor nota na avaliação: ${s.bestScore}% (mínimo ${min}%).`,
        });
    }
    for (const c of resultados)
      if (!c.concluido)
        revisar.push({
          unitId: c.unitId,
          unidade: c.unidade,
          motivo: 'desafio-pendente',
          detalhe: `Desafio com ${c.aprovados} de ${c.total} testes aprovados.`,
        });
    const pending = new Map<string, number>();
    for (const t of terms)
      if (!t.ownWords && t.unitId) pending.set(t.unitId, (pending.get(t.unitId) ?? 0) + 1);
    for (const [unitId, n] of pending)
      revisar.push({
        unitId,
        unidade: title(unitId),
        motivo: 'explicacao-pendente',
        detalhe:
          n === 1
            ? '1 termo do glossário ainda sem explicação com as suas palavras.'
            : `${n} termos do glossário ainda sem explicação com as suas palavras.`,
      });

    return {
      pontos: { total: events.reduce((n, e) => n + e.points, 0), porTipo },
      trilhas,
      avaliacoes: { realizadas: realizadas.size, aprovadas: aprovadas.size, historico },
      desafios: { concluidos: resultados.filter((c) => c.concluido).length, resultados },
      glossario: {
        termos: terms.length,
        comExplicacaoPropria: terms.filter((t) => t.ownWords).length,
      },
      revisar,
      eventos: events.slice(0, 100).map((e) => ({
        tipo: e.kind as PointKind,
        pontos: e.points,
        descricao: e.description,
        em: e.createdAt.toISOString(),
      })),
    };
  });
}
