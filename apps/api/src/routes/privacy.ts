/**
 * LGPD: exportação dos dados do próprio usuário. A exclusão da conta é feita pelo
 * Better Auth (POST /api/auth/delete-user, com a senha; ver auth.ts).
 */
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Auth } from '../auth.js';
import type { Database } from '../db/client.js';
import {
  assessmentAttempt,
  challengeResult,
  classroom,
  classroomTeacher,
  customAssessment,
  customAttempt,
  enrollment,
  pointEvent,
  session,
  unitProgress,
  unitScore,
  user,
} from '../db/schema.js';
import { listGlossary } from './evolution.js';
import { requireUser } from './session.js';

export async function exportUserData(db: Database, userId: string) {
  const [profile] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      institution: user.institution,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId));
  const turmasComoAluno = await db
    .select({
      turma: classroom.name,
      periodo: classroom.period,
      matriculadoEm: enrollment.createdAt,
    })
    .from(enrollment)
    .innerJoin(classroom, eq(enrollment.classroomId, classroom.id))
    .where(eq(enrollment.userId, userId));
  const turmasComoProfessor = await db
    .select({ turma: classroom.name, periodo: classroom.period, papel: classroomTeacher.role })
    .from(classroomTeacher)
    .innerJoin(classroom, eq(classroomTeacher.classroomId, classroom.id))
    .where(eq(classroomTeacher.userId, userId));
  const avaliacoesDeTurma = await db
    .select({
      avaliacao: customAssessment.title,
      nota: customAttempt.score,
      respostas: customAttempt.answers,
      em: customAttempt.createdAt,
    })
    .from(customAttempt)
    .innerJoin(customAssessment, eq(customAttempt.assessmentId, customAssessment.id))
    .where(eq(customAttempt.userId, userId));
  const sessoes = await db
    .select({
      criadaEm: session.createdAt,
      expiraEm: session.expiresAt,
      ip: session.ipAddress,
      navegador: session.userAgent,
    })
    .from(session)
    .where(eq(session.userId, userId));

  return {
    formato: 'trilhacode-dados-pessoais',
    versao: 1,
    geradoEm: new Date().toISOString(),
    perfil: profile,
    turmasComoAluno,
    turmasComoProfessor,
    progresso: {
      etapas: await db.select().from(unitProgress).where(eq(unitProgress.userId, userId)),
      melhoresNotas: await db.select().from(unitScore).where(eq(unitScore.userId, userId)),
      tentativasDeAvaliacao: await db
        .select()
        .from(assessmentAttempt)
        .where(eq(assessmentAttempt.userId, userId)),
      desafios: await db.select().from(challengeResult).where(eq(challengeResult.userId, userId)),
      avaliacoesDeTurma,
    },
    glossario: await listGlossary(db, userId),
    pontos: await db.select().from(pointEvent).where(eq(pointEvent.userId, userId)),
    sessoes,
  };
}

export async function privacyRoutes(
  app: FastifyInstance,
  { auth, db }: { auth: Auth; db: Database },
) {
  app.get('/api/me/dados', async (req, reply) => {
    const u = await requireUser(auth, req, reply);
    if (!u) return;
    reply.header('content-disposition', `attachment; filename="trilhacode-meus-dados.json"`);
    reply.header('cache-control', 'no-store');
    return exportUserData(db, u.id);
  });
}
