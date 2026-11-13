/**
 * Livro-razão de pontos (docs/02-arquitetura.md, seção 8).
 *
 * Os pontos não são gravados como um número editável: a cada mudança no progresso,
 * `syncPoints` calcula quanto cada item (etapa, desafio, avaliação, termos de uma
 * unidade, unidade, trilha) vale pelas regras de POINT_RULES e registra só a
 * diferença positiva em relação ao que já foi lançado. Assim o livro-razão nunca
 * diminui, repetir uma ação não dá pontos de novo e melhorar a nota numa nova
 * tentativa acrescenta apenas o que faltava.
 */
import { randomUUID } from 'node:crypto';
import { POINT_RULES, UNIT_STEP_IDS, UNIT_STEPS, type PointKind } from '@trilhacode/shared';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import {
  challengeResult,
  glossaryTerm,
  module,
  pointEvent,
  track,
  unit,
  unitProgress,
  unitScore,
} from '../db/schema.js';

interface Target {
  kind: PointKind;
  ref: string;
  points: number;
  description: string;
}

const STEP_LABEL = Object.fromEntries(UNIT_STEPS.map((s) => [s.id, s.label])) as Record<
  string,
  string
>;

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

async function computeTargets(tx: Tx, userId: string): Promise<Target[]> {
  const units = await tx
    .select({ id: unit.id, title: unit.title, trackId: module.trackId, trackTitle: track.title })
    .from(unit)
    .innerJoin(module, eq(unit.moduleId, module.id))
    .innerJoin(track, eq(module.trackId, track.id));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const title = (id: string) => unitById.get(id)?.title ?? id;

  const targets: Target[] = [];

  const steps = await tx
    .select({ unitId: unitProgress.unitId, step: unitProgress.step })
    .from(unitProgress)
    .where(and(eq(unitProgress.userId, userId), eq(unitProgress.status, 'completed')));
  const stepsByUnit = new Map<string, number>();
  for (const s of steps) {
    stepsByUnit.set(s.unitId, (stepsByUnit.get(s.unitId) ?? 0) + 1);
    targets.push({
      kind: 'etapa',
      ref: `${s.unitId}/${s.step}`,
      points: POINT_RULES.etapa,
      description: `${STEP_LABEL[s.step]} · ${title(s.unitId)}`,
    });
  }

  const completedUnits = new Set(
    [...stepsByUnit].filter(([, n]) => n === UNIT_STEP_IDS.length).map(([id]) => id),
  );
  for (const id of completedUnits)
    targets.push({
      kind: 'unidade',
      ref: id,
      points: POINT_RULES.unidade,
      description: `Unidade concluída · ${title(id)}`,
    });

  const trackUnits = new Map<string, { title: string; ids: string[] }>();
  for (const u of units) {
    const t = trackUnits.get(u.trackId) ?? { title: u.trackTitle, ids: [] };
    t.ids.push(u.id);
    trackUnits.set(u.trackId, t);
  }
  for (const [id, t] of trackUnits)
    if (t.ids.length && t.ids.every((u) => completedUnits.has(u)))
      targets.push({
        kind: 'trilha',
        ref: id,
        points: POINT_RULES.trilha,
        description: `Trilha concluída · ${t.title}`,
      });

  const scores = await tx.select().from(unitScore).where(eq(unitScore.userId, userId));
  for (const s of scores)
    targets.push({
      kind: 'avaliacao',
      ref: s.unitId,
      points: Math.round((POINT_RULES.avaliacao * s.bestScore) / 100),
      description: `Avaliação · ${title(s.unitId)} (melhor nota: ${s.bestScore}%)`,
    });

  const challenges = await tx
    .select()
    .from(challengeResult)
    .where(eq(challengeResult.userId, userId));
  for (const c of challenges)
    targets.push({
      kind: 'desafio',
      ref: c.unitId,
      points: Math.round((POINT_RULES.desafio * c.bestPassed) / c.total),
      description: `Desafio · ${title(c.unitId)} (${c.bestPassed} de ${c.total} testes)`,
    });

  const terms = await tx
    .select({ unitId: glossaryTerm.unitId, n: sql<number>`count(*)::int` })
    .from(glossaryTerm)
    .where(
      and(
        eq(glossaryTerm.userId, userId),
        eq(glossaryTerm.ownWords, true),
        isNotNull(glossaryTerm.unitId),
      ),
    )
    .groupBy(glossaryTerm.unitId);
  for (const t of terms) {
    const n = Math.min(t.n, POINT_RULES.glossarioPorUnidade);
    targets.push({
      kind: 'glossario',
      ref: t.unitId!,
      points: n * POINT_RULES.glossario,
      description: `Glossário · ${title(t.unitId!)} (${n} ${n === 1 ? 'termo' : 'termos'} com explicação própria)`,
    });
  }

  return targets;
}

/** Lança no livro-razão os pontos que ainda faltam; devolve o total do aluno. */
export async function syncPoints(db: Database, userId: string): Promise<number> {
  return db.transaction(async (tx) => {
    // Serializa as sincronizações do mesmo aluno (duas abas, duas requisições).
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const targets = await computeTargets(tx, userId);
    const existing = await tx
      .select({
        kind: pointEvent.kind,
        ref: pointEvent.ref,
        sum: sql<number>`sum(${pointEvent.points})::int`,
      })
      .from(pointEvent)
      .where(eq(pointEvent.userId, userId))
      .groupBy(pointEvent.kind, pointEvent.ref);
    const awarded = new Map(existing.map((e) => [`${e.kind}|${e.ref}`, e.sum]));
    const rows = targets.flatMap((t) => {
      const delta = t.points - (awarded.get(`${t.kind}|${t.ref}`) ?? 0);
      return delta > 0
        ? [
            {
              id: randomUUID(),
              userId,
              kind: t.kind,
              ref: t.ref,
              points: delta,
              description: t.description,
            },
          ]
        : [];
    });
    if (rows.length) await tx.insert(pointEvent).values(rows);
    const total = existing.reduce((n, e) => n + e.sum, 0) + rows.reduce((n, r) => n + r.points, 0);
    return total;
  });
}

/** Total de pontos de vários alunos (painel do professor). */
export async function pointTotals(db: Database, userIds: string[]): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const rows = await db
    .select({ userId: pointEvent.userId, total: sql<number>`sum(${pointEvent.points})::int` })
    .from(pointEvent)
    .where(inArray(pointEvent.userId, userIds))
    .groupBy(pointEvent.userId);
  return new Map(rows.map((r) => [r.userId, r.total]));
}
