/**
 * Gestão pedagógica: turmas, professores, matrículas e convites, trilhas atribuídas,
 * painel de acompanhamento, relatório CSV e avaliações complementares.
 *
 * Regras de acesso (sempre verificadas aqui, no servidor):
 * - criar turma: professor ou administrador;
 * - ver e gerenciar uma turma: professores dela (responsável ou coprofessor) e administradores;
 * - excluir a turma e gerenciar coprofessores: responsável e administradores;
 * - alunos: veem as próprias turmas e respondem às avaliações delas.
 */
import { randomUUID } from 'node:crypto';
import {
  addStudentsSchema,
  answersSchema,
  assignmentInputSchema,
  classroomInputSchema,
  customAssessmentInputSchema,
  UNIT_STEP_IDS,
  type AddStudentResult,
  type ClassroomDashboard,
  type ClassroomDetail,
  type ClassroomSummary,
  type CustomAssessmentPublic,
  type CustomAssessmentResult,
  type MyClassroom,
} from '@trilhacode/shared';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Auth } from '../auth.js';
import type { Database } from '../db/client.js';
import {
  assignment,
  classroom,
  classroomTeacher,
  customAssessment,
  customAttempt,
  enrollment,
  invitation,
  module,
  track,
  unit,
  unitProgress,
  unitScore,
  user,
} from '../db/schema.js';
import type { Mailer } from '../mail/mailer.js';
import { inviteEmail } from '../mail/invite.js';
import { requireUser, type SessionUser } from './session.js';

const STEPS = UNIT_STEP_IDS.length;

/**
 * Ordem de exibição das alternativas: embaralhada de forma estável por avaliação e
 * questão, para a posição da correta não seguir a ordem em que o professor digitou.
 * O índice que o aluno envia é o da exibição; a correção converte de volta.
 */
export function displayOrder(n: number, seed: string): number[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  let state = h >>> 0 || 1;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = Math.floor(((state >>> 0) / 0x100000000) * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}
const emailSchema = z.email();

/** Converte convites pendentes em matrículas para este e-mail (chamado ao confirmar o e-mail). */
export async function acceptInvitations(
  db: Database,
  userId: string,
  email: string,
): Promise<number> {
  const pending = await db
    .select()
    .from(invitation)
    .where(eq(invitation.email, email.toLowerCase()));
  for (const inv of pending) {
    await db
      .insert(enrollment)
      .values({ classroomId: inv.classroomId, userId })
      .onConflictDoNothing();
  }
  if (pending.length) await db.delete(invitation).where(eq(invitation.email, email.toLowerCase()));
  return pending.length;
}

export interface ClassroomDeps {
  auth: Auth;
  db: Database;
  mailer: Mailer;
  webOrigin: string;
}

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);
const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
const today = () => new Date().toISOString().slice(0, 10);

export async function classroomRoutes(app: FastifyInstance, deps: ClassroomDeps) {
  const { auth, db, mailer } = deps;

  /** Papel do usuário na turma; administradores contam como responsáveis. */
  async function teacherRole(u: SessionUser, classroomId: string) {
    const [c] = await db
      .select({ id: classroom.id })
      .from(classroom)
      .where(eq(classroom.id, classroomId));
    if (!c) return { exists: false as const, role: null };
    if (u.role === 'admin') return { exists: true as const, role: 'responsavel' as const };
    const [t] = await db
      .select({ role: classroomTeacher.role })
      .from(classroomTeacher)
      .where(and(eq(classroomTeacher.classroomId, classroomId), eq(classroomTeacher.userId, u.id)));
    return { exists: true as const, role: t?.role ?? null };
  }

  /** Exige ser professor da turma (ou responsável, se `owner`). Responde 404/403 quando falha. */
  async function requireTeacher(
    u: SessionUser,
    classroomId: string,
    reply: FastifyReply,
    owner = false,
  ) {
    const r = await teacherRole(u, classroomId);
    if (!r.exists) {
      await reply.code(404).send({ erro: 'Turma não encontrada.' });
      return null;
    }
    if (!r.role || (owner && r.role !== 'responsavel')) {
      await reply.code(403).send({ erro: 'Você não tem permissão para esta turma.' });
      return null;
    }
    return r.role;
  }

  async function summaries(
    ids: string[],
    roles: Map<string, ClassroomSummary['myRole']>,
  ): Promise<ClassroomSummary[]> {
    if (!ids.length) return [];
    const rows = await db
      .select()
      .from(classroom)
      .where(inArray(classroom.id, ids))
      .orderBy(asc(classroom.name));
    const students = await db
      .select({ id: enrollment.classroomId, n: count() })
      .from(enrollment)
      .where(inArray(enrollment.classroomId, ids))
      .groupBy(enrollment.classroomId);
    const tracks = await db
      .select({ id: assignment.classroomId, n: count() })
      .from(assignment)
      .where(inArray(assignment.classroomId, ids))
      .groupBy(assignment.classroomId);
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      institution: c.institution,
      period: c.period,
      myRole: roles.get(c.id) ?? 'aluno',
      students: students.find((s) => s.id === c.id)?.n ?? 0,
      tracks: tracks.find((t) => t.id === c.id)?.n ?? 0,
    }));
  }

  /* ------------------------------------------------------------ Turmas */

  app.get('/api/turmas', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const roles = new Map<string, ClassroomSummary['myRole']>();
    if (u.role === 'admin') {
      for (const c of await db.select({ id: classroom.id }).from(classroom))
        roles.set(c.id, 'responsavel');
    } else {
      const teaching = await db
        .select()
        .from(classroomTeacher)
        .where(eq(classroomTeacher.userId, u.id));
      for (const t of teaching) roles.set(t.classroomId, t.role);
    }
    return summaries([...roles.keys()], roles);
  });

  app.post('/api/turmas', async (req, reply) => {
    const u = await requireUser(auth, req, reply, ['professor', 'admin']);
    if (!u) return;
    const parsed = classroomInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: parsed.error.issues[0]?.message });
    const id = randomUUID();
    await db.insert(classroom).values({
      id,
      name: parsed.data.name,
      institution: parsed.data.institution || null,
      period: parsed.data.period || null,
    });
    await db
      .insert(classroomTeacher)
      .values({ classroomId: id, userId: u.id, role: 'responsavel' });
    return reply.code(201).send({ id });
  });

  app.get<{ Params: { id: string } }>(
    '/api/turmas/:id',
    async (req, reply): Promise<ClassroomDetail | void> => {
      const u = await requireUser(auth, req, reply);
      if (!u) return;
      const role = await requireTeacher(u, req.params.id, reply);
      if (!role) return;
      const id = req.params.id;
      const [summary] = await summaries([id], new Map([[id, role]]));
      const teachers = await db
        .select({ id: user.id, name: user.name, email: user.email, role: classroomTeacher.role })
        .from(classroomTeacher)
        .innerJoin(user, eq(user.id, classroomTeacher.userId))
        .where(eq(classroomTeacher.classroomId, id))
        .orderBy(asc(classroomTeacher.role), asc(user.name));
      const enrolled = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          enrolledAt: enrollment.createdAt,
        })
        .from(enrollment)
        .innerJoin(user, eq(user.id, enrollment.userId))
        .where(eq(enrollment.classroomId, id))
        .orderBy(asc(user.name));
      const invitations = await db
        .select()
        .from(invitation)
        .where(eq(invitation.classroomId, id))
        .orderBy(asc(invitation.email));
      const assignments = await db
        .select({
          trackId: assignment.trackId,
          trackTitle: track.title,
          dueDate: assignment.dueDate,
        })
        .from(assignment)
        .innerJoin(track, eq(track.id, assignment.trackId))
        .where(eq(assignment.classroomId, id))
        .orderBy(asc(track.title));
      const unitCounts = assignments.length
        ? await db
            .select({ trackId: module.trackId, n: count() })
            .from(unit)
            .innerJoin(module, eq(module.id, unit.moduleId))
            .where(
              inArray(
                module.trackId,
                assignments.map((a) => a.trackId),
              ),
            )
            .groupBy(module.trackId)
        : [];
      const assessments = await db
        .select()
        .from(customAssessment)
        .where(eq(customAssessment.classroomId, id))
        .orderBy(desc(customAssessment.createdAt));
      return {
        ...summary!,
        teachers,
        enrolled: enrolled.map((e) => ({ ...e, enrolledAt: e.enrolledAt.toISOString() })),
        invitations: invitations.map((i) => ({
          id: i.id,
          email: i.email,
          name: i.name,
          createdAt: i.createdAt.toISOString(),
        })),
        assignments: assignments.map((a) => ({
          ...a,
          units: unitCounts.find((c) => c.trackId === a.trackId)?.n ?? 0,
        })),
        assessments: assessments.map((a) => ({
          id: a.id,
          title: a.title,
          dueDate: a.dueDate,
          questions: a.questions.length,
        })),
      };
    },
  );

  app.patch<{ Params: { id: string } }>('/api/turmas/:id', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
    const parsed = classroomInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: parsed.error.issues[0]?.message });
    await db
      .update(classroom)
      .set({
        name: parsed.data.name,
        institution: parsed.data.institution || null,
        period: parsed.data.period || null,
      })
      .where(eq(classroom.id, req.params.id));
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/turmas/:id', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u || !(await requireTeacher(u, req.params.id, reply, true))) return;
    await db.delete(classroom).where(eq(classroom.id, req.params.id));
    return { ok: true };
  });

  /* ------------------------------------------------------------ Professores */

  app.post<{ Params: { id: string } }>('/api/turmas/:id/professores', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u || !(await requireTeacher(u, req.params.id, reply, true))) return;
    const email = z.object({ email: emailSchema }).safeParse(req.body);
    if (!email.success) return reply.code(400).send({ erro: 'Informe um e-mail válido.' });
    const [teacher] = await db
      .select()
      .from(user)
      .where(eq(user.email, email.data.email.toLowerCase()));
    if (!teacher) return reply.code(404).send({ erro: 'Não há conta com este e-mail.' });
    if (teacher.role === 'aluno')
      return reply.code(400).send({
        erro: 'Esta conta é de aluno. Peça a um administrador para promovê-la a professor.',
      });
    await db
      .insert(classroomTeacher)
      .values({ classroomId: req.params.id, userId: teacher.id, role: 'coprofessor' })
      .onConflictDoNothing();
    return { ok: true };
  });

  app.delete<{ Params: { id: string; userId: string } }>(
    '/api/turmas/:id/professores/:userId',
    async (req, reply) => {
      const u = await requireUser(auth, req, reply);
      if (!u || !(await requireTeacher(u, req.params.id, reply, true))) return;
      await db
        .delete(classroomTeacher)
        .where(
          and(
            eq(classroomTeacher.classroomId, req.params.id),
            eq(classroomTeacher.userId, req.params.userId),
            eq(classroomTeacher.role, 'coprofessor'),
          ),
        );
      return { ok: true };
    },
  );

  /* ------------------------------------------------------------ Alunos */

  app.post<{ Params: { id: string } }>('/api/turmas/:id/alunos', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
    const parsed = addStudentsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ erro: 'Envie de 1 a 500 alunos por vez.' });
    const [c] = await db.select().from(classroom).where(eq(classroom.id, req.params.id));
    const results: AddStudentResult[] = [];
    const seen = new Set<string>();

    for (const row of parsed.data.students) {
      const email = row.email.trim().toLowerCase();
      const base = { email: row.email.trim(), ...(row.row ? { row: row.row } : {}) };
      if (!emailSchema.safeParse(email).success) {
        results.push({ ...base, status: 'invalido', message: 'E-mail inválido.' });
        continue;
      }
      if (seen.has(email)) {
        results.push({ ...base, status: 'invalido', message: 'E-mail repetido nesta lista.' });
        continue;
      }
      seen.add(email);
      const [existing] = await db.select().from(user).where(eq(user.email, email));
      if (existing?.emailVerified) {
        const inserted = await db
          .insert(enrollment)
          .values({ classroomId: req.params.id, userId: existing.id })
          .onConflictDoNothing()
          .returning();
        results.push({ ...base, status: inserted.length ? 'matriculado' : 'ja-na-turma' });
        continue;
      }
      const inv = await db
        .insert(invitation)
        .values({
          id: randomUUID(),
          classroomId: req.params.id,
          email,
          name: row.name || null,
          invitedBy: u.id,
        })
        .onConflictDoNothing()
        .returning();
      if (!inv.length) {
        results.push({ ...base, status: 'ja-convidado' });
        continue;
      }
      // Quem já tem conta (sem e-mail confirmado) entra na turma ao confirmar; os demais recebem o convite.
      if (!existing) {
        const url = `${deps.webOrigin}/?conta=cadastro&email=${encodeURIComponent(email)}`;
        await mailer.send(inviteEmail(email, c!.name, u.name, url)).catch(() => undefined);
      }
      results.push({ ...base, status: 'convidado' });
    }
    return results;
  });

  app.delete<{ Params: { id: string; userId: string } }>(
    '/api/turmas/:id/alunos/:userId',
    async (req, reply) => {
      const u = await requireUser(auth, req, reply);
      if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
      await db
        .delete(enrollment)
        .where(
          and(eq(enrollment.classroomId, req.params.id), eq(enrollment.userId, req.params.userId)),
        );
      return { ok: true };
    },
  );

  app.delete<{ Params: { id: string; inviteId: string } }>(
    '/api/turmas/:id/convites/:inviteId',
    async (req, reply) => {
      const u = await requireUser(auth, req, reply);
      if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
      await db
        .delete(invitation)
        .where(
          and(eq(invitation.classroomId, req.params.id), eq(invitation.id, req.params.inviteId)),
        );
      return { ok: true };
    },
  );

  /* ------------------------------------------------------------ Trilhas atribuídas */

  app.put<{ Params: { id: string } }>('/api/turmas/:id/trilhas', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
    const parsed = assignmentInputSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ erro: 'Escolha uma trilha e uma data válida (ou sem prazo).' });
    const [t] = await db
      .select({ id: track.id })
      .from(track)
      .where(eq(track.id, parsed.data.trackId));
    if (!t) return reply.code(404).send({ erro: 'Trilha não encontrada.' });
    await db
      .insert(assignment)
      .values({ classroomId: req.params.id, trackId: t.id, dueDate: parsed.data.dueDate })
      .onConflictDoUpdate({
        target: [assignment.classroomId, assignment.trackId],
        set: { dueDate: parsed.data.dueDate },
      });
    return { ok: true };
  });

  app.delete<{ Params: { id: string; trackId: string } }>(
    '/api/turmas/:id/trilhas/:trackId',
    async (req, reply) => {
      const u = await requireUser(auth, req, reply);
      if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
      await db
        .delete(assignment)
        .where(
          and(
            eq(assignment.classroomId, req.params.id),
            eq(assignment.trackId, req.params.trackId),
          ),
        );
      return { ok: true };
    },
  );

  /* ------------------------------------------------------------ Painel */

  async function buildDashboard(classroomId: string): Promise<ClassroomDashboard> {
    const students = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(enrollment)
      .innerJoin(user, eq(user.id, enrollment.userId))
      .where(eq(enrollment.classroomId, classroomId))
      .orderBy(asc(user.name));
    const assigned = await db
      .select({ trackId: assignment.trackId, dueDate: assignment.dueDate, trackTitle: track.title })
      .from(assignment)
      .innerJoin(track, eq(track.id, assignment.trackId))
      .where(eq(assignment.classroomId, classroomId));
    const units = assigned.length
      ? await db
          .select({
            id: unit.id,
            title: unit.title,
            trackId: module.trackId,
            modulePos: module.position,
            pos: unit.position,
            key: unit.answerKey,
          })
          .from(unit)
          .innerJoin(module, eq(module.id, unit.moduleId))
          .where(
            inArray(
              module.trackId,
              assigned.map((a) => a.trackId),
            ),
          )
          .orderBy(asc(module.trackId), asc(module.position), asc(unit.position))
      : [];
    const studentIds = students.map((s) => s.id);
    const unitIds = units.map((x) => x.id);
    const steps =
      studentIds.length && unitIds.length
        ? await db
            .select()
            .from(unitProgress)
            .where(
              and(
                inArray(unitProgress.userId, studentIds),
                inArray(unitProgress.unitId, unitIds),
                eq(unitProgress.status, 'completed'),
              ),
            )
        : [];
    const scores =
      studentIds.length && unitIds.length
        ? await db
            .select()
            .from(unitScore)
            .where(and(inArray(unitScore.userId, studentIds), inArray(unitScore.unitId, unitIds)))
        : [];
    const assessments = await db
      .select({ id: customAssessment.id, title: customAssessment.title })
      .from(customAssessment)
      .where(eq(customAssessment.classroomId, classroomId))
      .orderBy(asc(customAssessment.createdAt));
    const attempts =
      studentIds.length && assessments.length
        ? await db
            .select({
              assessmentId: customAttempt.assessmentId,
              userId: customAttempt.userId,
              best: sql<number>`max(${customAttempt.score})`.mapWith(Number),
              last: sql<Date>`max(${customAttempt.createdAt})`.mapWith(
                (v) => new Date(v as string),
              ),
            })
            .from(customAttempt)
            .where(
              and(
                inArray(
                  customAttempt.assessmentId,
                  assessments.map((a) => a.id),
                ),
                inArray(customAttempt.userId, studentIds),
              ),
            )
            .groupBy(customAttempt.assessmentId, customAttempt.userId)
        : [];

    const stepCount = new Map<string, number>(); // `${user}|${unit}`
    const lastActivity = new Map<string, number>();
    const bump = (userId: string, d: Date | null) => {
      if (!d) return;
      lastActivity.set(userId, Math.max(lastActivity.get(userId) ?? 0, d.getTime()));
    };
    for (const s of steps) {
      const k = `${s.userId}|${s.unitId}`;
      stepCount.set(k, (stepCount.get(k) ?? 0) + 1);
      bump(s.userId, s.completedAt);
    }
    for (const s of scores) bump(s.userId, s.updatedAt);
    for (const a of attempts) bump(a.userId, a.last);
    const done = (userId: string, unitId: string) =>
      (stepCount.get(`${userId}|${unitId}`) ?? 0) >= STEPS;

    const now = today();
    const dashStudents = students.map((s) => {
      const totalSteps = units.reduce(
        (n, x) => n + Math.min(stepCount.get(`${s.id}|${x.id}`) ?? 0, STEPS),
        0,
      );
      const best = scores
        .filter((sc) => sc.userId === s.id && sc.attempts > 0)
        .map((sc) => sc.bestScore);
      const overdue = assigned
        .filter((a) => a.dueDate && a.dueDate < now)
        .filter((a) => units.filter((x) => x.trackId === a.trackId).some((x) => !done(s.id, x.id)))
        .map((a) => a.trackTitle);
      const last = lastActivity.get(s.id);
      return {
        ...s,
        progress: pct(totalSteps, units.length * STEPS),
        unitsCompleted: units.filter((x) => done(s.id, x.id)).length,
        averageScore: avg(best),
        lastActivity: last ? new Date(last).toISOString() : null,
        overdue,
        customScores: Object.fromEntries(
          assessments.map((a) => [
            a.id,
            attempts.find((t) => t.assessmentId === a.id && t.userId === s.id)?.best ?? null,
          ]),
        ),
      };
    });

    const trackTitle = new Map(assigned.map((a) => [a.trackId, a.trackTitle]));
    const dashUnits = units.map((x) => {
      const unitScores = scores.filter((sc) => sc.unitId === x.id && sc.attempts > 0);
      const min = x.key?.notaMinima ?? 70;
      return {
        id: x.id,
        title: x.title,
        trackTitle: trackTitle.get(x.trackId) ?? '',
        completedPct: pct(students.filter((s) => done(s.id, x.id)).length, students.length),
        averageScore: avg(unitScores.map((sc) => sc.bestScore)),
        averageAttempts: unitScores.length
          ? Math.round(
              (unitScores.reduce((n, sc) => n + sc.attempts, 0) / unitScores.length) * 10,
            ) / 10
          : null,
        struggling: unitScores.filter((sc) => sc.bestScore < min).length,
      };
    });

    return {
      students: dashStudents,
      units: dashUnits,
      assessments,
      overall: {
        students: students.length,
        progress: avg(dashStudents.map((s) => s.progress)) ?? 0,
        averageScore: avg(
          dashStudents.flatMap((s) => (s.averageScore === null ? [] : [s.averageScore])),
        ),
      },
    };
  }

  app.get<{ Params: { id: string } }>('/api/turmas/:id/painel', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
    return buildDashboard(req.params.id);
  });

  app.get<{ Params: { id: string } }>('/api/turmas/:id/relatorio.csv', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
    const [c] = await db.select().from(classroom).where(eq(classroom.id, req.params.id));
    const d = await buildDashboard(req.params.id);
    // Ponto e vírgula e BOM: abre corretamente no Excel e no LibreOffice em português.
    const cell = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      'Nome',
      'E-mail',
      'Progresso (%)',
      'Unidades concluídas',
      'Média nas avaliações das unidades',
      'Última atividade',
      'Trilhas com prazo vencido',
      ...d.assessments.map((a) => `Avaliação: ${a.title}`),
    ];
    const rows = d.students.map((s) => [
      s.name,
      s.email,
      s.progress,
      s.unitsCompleted,
      s.averageScore ?? '',
      s.lastActivity ? s.lastActivity.slice(0, 10) : '',
      s.overdue.join(', '),
      ...d.assessments.map((a) => s.customScores[a.id] ?? ''),
    ]);
    const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
    const slug = c!.name
      .normalize('NFD')
      .replace(/[^\w-]+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', `attachment; filename="relatorio-${slug}-${today()}.csv"`);
    return csv;
  });

  /* ------------------------------------------------------------ Avaliações complementares */

  app.post<{ Params: { id: string } }>('/api/turmas/:id/avaliacoes', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u || !(await requireTeacher(u, req.params.id, reply))) return;
    const parsed = customAssessmentInputSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where =
        issue?.path[0] === 'questions' && typeof issue.path[1] === 'number'
          ? `Questão ${issue.path[1] + 1}: `
          : '';
      return reply.code(400).send({ erro: `${where}${issue?.message ?? 'Dados inválidos.'}` });
    }
    const id = randomUUID();
    await db
      .insert(customAssessment)
      .values({ id, classroomId: req.params.id, createdBy: u.id, ...parsed.data });
    return reply.code(201).send({ id });
  });

  app.delete<{ Params: { id: string } }>('/api/avaliacoes-turma/:id', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const [a] = await db
      .select()
      .from(customAssessment)
      .where(eq(customAssessment.id, req.params.id));
    if (!a) return reply.code(404).send({ erro: 'Avaliação não encontrada.' });
    if (!(await requireTeacher(u, a.classroomId, reply))) return;
    await db.delete(customAssessment).where(eq(customAssessment.id, a.id));
    return { ok: true };
  });

  async function isEnrolled(userId: string, classroomId: string) {
    const [e] = await db
      .select()
      .from(enrollment)
      .where(and(eq(enrollment.userId, userId), eq(enrollment.classroomId, classroomId)));
    return !!e;
  }

  async function bestScore(userId: string, assessmentId: string) {
    const [r] = await db
      .select({ best: sql<number | null>`max(${customAttempt.score})` })
      .from(customAttempt)
      .where(and(eq(customAttempt.userId, userId), eq(customAttempt.assessmentId, assessmentId)));
    return r?.best === null || r?.best === undefined ? null : Number(r.best);
  }

  app.get<{ Params: { id: string } }>(
    '/api/avaliacoes-turma/:id',
    async (req, reply): Promise<CustomAssessmentPublic | void> => {
      const u = await requireUser(auth, req, reply);
      if (!u) return;
      const [a] = await db
        .select()
        .from(customAssessment)
        .where(eq(customAssessment.id, req.params.id));
      if (!a) return reply.code(404).send({ erro: 'Avaliação não encontrada.' });
      const teacher = (await teacherRole(u, a.classroomId)).role;
      if (!teacher && !(await isEnrolled(u.id, a.classroomId)))
        return reply
          .code(403)
          .send({ erro: 'Esta avaliação é de uma turma da qual você não participa.' });
      return {
        id: a.id,
        classroomId: a.classroomId,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        minScore: a.minScore,
        questions: a.questions.map((q, qi) => ({
          enunciado: q.enunciado,
          alternativas: displayOrder(q.alternativas.length, `${a.id}#${qi}`).map(
            (orig) => q.alternativas[orig]!.texto,
          ),
        })),
        myBestScore: teacher ? null : await bestScore(u.id, a.id),
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/avaliacoes-turma/:id/respostas',
    async (req, reply): Promise<CustomAssessmentResult | void> => {
      const u = await requireUser(auth, req, reply);
      if (!u) return;
      const [a] = await db
        .select()
        .from(customAssessment)
        .where(eq(customAssessment.id, req.params.id));
      if (!a) return reply.code(404).send({ erro: 'Avaliação não encontrada.' });
      if (!(await isEnrolled(u.id, a.classroomId)))
        return reply.code(403).send({ erro: 'Só alunos da turma respondem a esta avaliação.' });
      const parsed = answersSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ erro: 'Envie { "respostas": { "0": 1, ... } }.' });
      const questoes = a.questions.map((q, i) => {
        // o aluno responde pelo índice exibido; convertemos para a ordem original
        const shown = parsed.data.respostas[String(i)];
        const orig =
          shown === undefined
            ? undefined
            : displayOrder(q.alternativas.length, `${a.id}#${i}`)[shown];
        const alt = orig === undefined ? undefined : q.alternativas[orig];
        return {
          respondida: !!alt,
          correta: !!alt?.correta,
          feedback: alt ? alt.feedback : 'Questão sem resposta.',
        };
      });
      const nota = pct(questoes.filter((q) => q.correta).length, questoes.length);
      await db.insert(customAttempt).values({
        id: randomUUID(),
        assessmentId: a.id,
        userId: u.id,
        answers: parsed.data.respostas,
        score: nota,
      });
      return { nota, aprovado: nota >= a.minScore, minScore: a.minScore, questoes };
    },
  );

  /* ------------------------------------------------------------ Visão do aluno */

  app.get('/api/minhas-turmas', async (req, reply): Promise<MyClassroom[] | void> => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    const mine = await db
      .select({ id: enrollment.classroomId })
      .from(enrollment)
      .where(eq(enrollment.userId, u.id));
    const ids = mine.map((m) => m.id);
    const base = await summaries(ids, new Map(ids.map((id) => [id, 'aluno' as const])));
    const out: MyClassroom[] = [];
    for (const c of base) {
      const teachers = await db
        .select({ name: user.name })
        .from(classroomTeacher)
        .innerJoin(user, eq(user.id, classroomTeacher.userId))
        .where(eq(classroomTeacher.classroomId, c.id))
        .orderBy(asc(classroomTeacher.role));
      const assignments = await db
        .select({
          trackId: assignment.trackId,
          trackTitle: track.title,
          dueDate: assignment.dueDate,
        })
        .from(assignment)
        .innerJoin(track, eq(track.id, assignment.trackId))
        .where(eq(assignment.classroomId, c.id));
      const assessments = await db
        .select({
          id: customAssessment.id,
          title: customAssessment.title,
          dueDate: customAssessment.dueDate,
        })
        .from(customAssessment)
        .where(eq(customAssessment.classroomId, c.id))
        .orderBy(desc(customAssessment.createdAt));
      out.push({
        ...c,
        teachers: teachers.map((t) => t.name),
        assignments,
        assessments: await Promise.all(
          assessments.map(async (a) => ({ ...a, myBestScore: await bestScore(u.id, a.id) })),
        ),
      });
    }
    return out;
  });
}
