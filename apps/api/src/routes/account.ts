import {
  profileUpdateSchema,
  progressDataSchema,
  roleUpdateSchema,
  UNIT_STEP_IDS,
  type AccountProfile,
  type ProgressDataPayload,
  type UnitStepId,
} from '@trilhacode/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Auth } from '../auth.js';
import type { Database } from '../db/client.js';
import { unit, unitProgress, unitScore, user } from '../db/schema.js';
import { requireUser, type SessionUser } from './session.js';

const toProfile = (u: SessionUser): AccountProfile => ({
  id: u.id,
  name: u.name,
  email: u.email,
  emailVerified: u.emailVerified,
  role: u.role,
  institution: u.institution,
  createdAt: u.createdAt.toISOString(),
});

/** Etapas que o aluno pode marcar; a avaliação só conta quando corrigida no servidor. */
const CLIENT_STEPS = UNIT_STEP_IDS.filter((s) => s !== 'avaliacao') as [
  UnitStepId,
  ...UnitStepId[],
];
const stepSchema = z.object({ unitId: z.string().min(1), step: z.enum(CLIENT_STEPS) });

export async function loadProgress(db: Database, userId: string): Promise<ProgressDataPayload> {
  const steps = await db.select().from(unitProgress).where(eq(unitProgress.userId, userId));
  const scores = await db.select().from(unitScore).where(eq(unitScore.userId, userId));
  const units: ProgressDataPayload['units'] = {};
  for (const s of steps) {
    const entry = (units[s.unitId] ??= { steps: {}, attempts: 0 });
    if (s.status === 'completed')
      entry.steps[s.step] = (s.completedAt ?? s.startedAt).toISOString();
  }
  for (const sc of scores) {
    const entry = (units[sc.unitId] ??= { steps: {}, attempts: 0 });
    entry.bestScore = sc.bestScore;
    entry.attempts = sc.attempts;
  }
  return { version: 1, units };
}

export async function completeStep(
  db: Database,
  userId: string,
  unitId: string,
  step: UnitStepId,
  at = new Date(),
) {
  await db
    .insert(unitProgress)
    .values({ userId, unitId, step, status: 'completed', startedAt: at, completedAt: at })
    .onConflictDoNothing();
}

/** Registra uma tentativa de avaliação corrigida no servidor. */
export async function recordAssessment(
  db: Database,
  userId: string,
  unitId: string,
  score: number,
  passed: boolean,
) {
  await db
    .insert(unitScore)
    .values({ userId, unitId, bestScore: score, attempts: 1 })
    .onConflictDoUpdate({
      target: [unitScore.userId, unitScore.unitId],
      set: {
        bestScore: sql`greatest(${unitScore.bestScore}, ${score})`,
        attempts: sql`${unitScore.attempts} + 1`,
        updatedAt: sql`now()`,
      },
    });
  if (passed) await completeStep(db, userId, unitId, 'avaliacao');
}

export async function accountRoutes(
  app: FastifyInstance,
  { auth, db }: { auth: Auth; db: Database },
) {
  app.get('/api/me', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    return u && toProfile(u);
  });

  app.patch('/api/me', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    const { name, institution } = parsed.data;
    await db
      .update(user)
      .set({ name, institution: institution || null })
      .where(eq(user.id, u.id));
    return toProfile({ ...u, name, institution: institution || null });
  });

  app.get('/api/progresso', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    return u && loadProgress(db, u.id);
  });

  app.post('/api/progresso/etapas', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const parsed = stepSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ erro: 'Envie { "unitId": "...", "step": "..." }.' });
    const [exists] = await db
      .select({ id: unit.id })
      .from(unit)
      .where(eq(unit.id, parsed.data.unitId));
    if (!exists) return reply.code(404).send({ erro: 'Unidade não encontrada.' });
    await completeStep(db, u.id, parsed.data.unitId, parsed.data.step);
    return loadProgress(db, u.id);
  });

  /**
   * Importa o progresso que estava só no navegador (antes do login). Unidades que
   * não existem mais são ignoradas; o que já está na conta é preservado.
   */
  app.post('/api/progresso/importar', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const parsed = progressDataSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: 'Formato de progresso inválido.' });
    const ids = Object.keys(parsed.data.units);
    const valid = ids.length
      ? new Set(
          (await db.select({ id: unit.id }).from(unit).where(inArray(unit.id, ids))).map(
            (r) => r.id,
          ),
        )
      : new Set<string>();
    for (const [unitId, p] of Object.entries(parsed.data.units)) {
      if (!valid.has(unitId)) continue;
      for (const [step, at] of Object.entries(p.steps)) {
        const date = new Date(at);
        await completeStep(
          db,
          u.id,
          unitId,
          step as UnitStepId,
          Number.isNaN(date.getTime()) ? new Date() : date,
        );
      }
      if (p.attempts > 0 || p.bestScore !== undefined) {
        await db
          .insert(unitScore)
          .values({ userId: u.id, unitId, bestScore: p.bestScore ?? 0, attempts: p.attempts })
          .onConflictDoUpdate({
            target: [unitScore.userId, unitScore.unitId],
            set: {
              bestScore: sql`greatest(${unitScore.bestScore}, ${p.bestScore ?? 0})`,
              attempts: sql`greatest(${unitScore.attempts}, ${p.attempts})`,
            },
          });
      }
    }
    return loadProgress(db, u.id);
  });

  /* ------------------------------------------------------------ Administração */

  app.get('/api/admin/usuarios', async (req, reply) => {
    const u = await requireUser(auth, req, reply, ['admin']);
    if (!u) return;
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        institution: user.institution,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(asc(user.name));
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  });

  app.patch<{ Params: { id: string } }>('/api/admin/usuarios/:id/papel', async (req, reply) => {
    const u = await requireUser(auth, req, reply, ['admin']);
    if (!u) return;
    const parsed = roleUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: 'Papel inválido.' });
    if (req.params.id === u.id && parsed.data.role !== 'admin')
      return reply
        .code(400)
        .send({ erro: 'Você não pode remover o próprio papel de administrador.' });
    const updated = await db
      .update(user)
      .set({ role: parsed.data.role })
      .where(and(eq(user.id, req.params.id)))
      .returning({ id: user.id, role: user.role });
    if (!updated.length) return reply.code(404).send({ erro: 'Usuário não encontrado.' });
    return updated[0];
  });
}
