/**
 * Schema do banco de dados (PostgreSQL + Drizzle).
 *
 * Convenção: identificadores de código e de banco em inglês; textos da interface em português.
 * As tabelas user, session, account e verification seguem o formato esperado pelo Better Auth,
 * que será integrado na Etapa 4. Não renomeie suas colunas sem ajustar a configuração dele.
 */
import { USER_ROLES, UNIT_STEP_IDS } from '@trilhacode/shared';
import type { AnswerKey, TrackMetadata, UnitContent } from '@trilhacode/content/types';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const userRole = pgEnum('user_role', USER_ROLES);
export const unitStep = pgEnum('unit_step', UNIT_STEP_IDS);
export const progressStatus = pgEnum('progress_status', ['in_progress', 'completed']);

/* ---------------------------------------------------------------- Autenticação */

export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  role: userRole().notNull().default('aluno'),
  /** Escola ou instituição informada no cadastro. */
  institution: text(),
  ...timestamps,
});

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    /** Hash da senha (nunca a senha em texto). */
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
);

/* ---------------------------------------------------------------- Trilhas */

/**
 * Os ids de trilha, módulo e unidade são caminhos estáveis vindos de content/
 * (ex.: "html-css", "html-css/estrutura", "html-css/estrutura/tags"), para que o
 * progresso dos alunos sobreviva a revisões do texto.
 */
export const track = pgTable('track', {
  id: text().primaryKey(),
  title: text().notNull(),
  description: text().notNull().default(''),
  published: boolean().notNull().default(false),
  metadata: jsonb().$type<TrackMetadata>(),
  ...timestamps,
});

export const trackPrerequisite = pgTable(
  'track_prerequisite',
  {
    trackId: text()
      .notNull()
      .references(() => track.id, { onDelete: 'cascade' }),
    requiresTrackId: text()
      .notNull()
      .references(() => track.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.trackId, t.requiresTrackId] })],
);

export const module = pgTable(
  'module',
  {
    id: text().primaryKey(),
    trackId: text()
      .notNull()
      .references(() => track.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    description: text().notNull().default(''),
    position: integer().notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.trackId)],
);

export const unit = pgTable(
  'unit',
  {
    id: text().primaryKey(),
    moduleId: text()
      .notNull()
      .references(() => module.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    position: integer().notNull(),
    level: text().notNull().default(''),
    durationMinutes: integer().notNull().default(0),
    objectives: jsonb().$type<string[]>().notNull().default([]),
    /** Ids das unidades que devem ser concluídas antes. */
    requires: jsonb().$type<string[]>().notNull().default([]),
    /** Conteúdo público (etapas, desafio, questões sem gabarito). */
    content: jsonb().$type<UnitContent>(),
    /** Gabarito da avaliação; nunca é enviado à interface. */
    answerKey: jsonb().$type<AnswerKey>(),
    ...timestamps,
  },
  (t) => [index().on(t.moduleId)],
);

/* ---------------------------------------------------------------- Progresso */

/** Melhor nota e número de tentativas na avaliação de cada unidade (corrigida no servidor). */
export const unitScore = pgTable(
  'unit_score',
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    unitId: text()
      .notNull()
      .references(() => unit.id, { onDelete: 'cascade' }),
    bestScore: integer().notNull().default(0),
    attempts: integer().notNull().default(0),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.unitId] })],
);

/** Uma linha por aluno, unidade e etapa pedagógica. */
export const unitProgress = pgTable(
  'unit_progress',
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    unitId: text()
      .notNull()
      .references(() => unit.id, { onDelete: 'cascade' }),
    step: unitStep().notNull(),
    status: progressStatus().notNull().default('in_progress'),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.unitId, t.step] }), index().on(t.unitId)],
);

/* ---------------------------------------------------------------- Turmas */

export const classroomRole = pgEnum('classroom_role', ['responsavel', 'coprofessor']);

export const classroom = pgTable('classroom', {
  id: text().primaryKey(),
  name: text().notNull(),
  institution: text(),
  period: text(),
  archived: boolean().notNull().default(false),
  ...timestamps,
});

export const classroomTeacher = pgTable(
  'classroom_teacher',
  {
    classroomId: text()
      .notNull()
      .references(() => classroom.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: classroomRole().notNull().default('coprofessor'),
  },
  (t) => [primaryKey({ columns: [t.classroomId, t.userId] }), index().on(t.userId)],
);

export const enrollment = pgTable(
  'enrollment',
  {
    classroomId: text()
      .notNull()
      .references(() => classroom.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.classroomId, t.userId] }), index().on(t.userId)],
);

/** Convite para quem ainda não tem conta: vira matrícula quando o e-mail é confirmado. */
export const invitation = pgTable(
  'invitation',
  {
    id: text().primaryKey(),
    classroomId: text()
      .notNull()
      .references(() => classroom.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    name: text(),
    invitedBy: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.classroomId, t.email), index().on(t.email)],
);

export const assignment = pgTable(
  'assignment',
  {
    classroomId: text()
      .notNull()
      .references(() => classroom.id, { onDelete: 'cascade' }),
    trackId: text()
      .notNull()
      .references(() => track.id, { onDelete: 'cascade' }),
    /** Data limite (AAAA-MM-DD) ou null. */
    dueDate: date({ mode: 'string' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.classroomId, t.trackId] })],
);

export interface CustomQuestion {
  enunciado: string;
  alternativas: { texto: string; correta: boolean; feedback: string }[];
}

/** Avaliação complementar criada pelo professor para uma turma (com gabarito). */
export const customAssessment = pgTable('custom_assessment', {
  id: text().primaryKey(),
  classroomId: text()
    .notNull()
    .references(() => classroom.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  description: text().notNull().default(''),
  dueDate: date({ mode: 'string' }),
  minScore: integer().notNull().default(70),
  questions: jsonb().$type<CustomQuestion[]>().notNull(),
  createdBy: text().references(() => user.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const customAttempt = pgTable(
  'custom_attempt',
  {
    id: text().primaryKey(),
    assessmentId: text()
      .notNull()
      .references(() => customAssessment.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    answers: jsonb().$type<Record<string, number>>().notNull(),
    score: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.assessmentId, t.userId)],
);

/* ---------------------------------------------------------------- Avaliação e evolução */

/** Cada tentativa de avaliação de unidade (histórico de desempenho). */
export const assessmentAttempt = pgTable(
  'assessment_attempt',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    unitId: text()
      .notNull()
      .references(() => unit.id, { onDelete: 'cascade' }),
    score: integer().notNull(),
    passed: boolean().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.createdAt)],
);

/** Melhor resultado do aluno no desafio de cada unidade (testes do sandbox). */
export const challengeResult = pgTable(
  'challenge_result',
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    unitId: text()
      .notNull()
      .references(() => unit.id, { onDelete: 'cascade' }),
    bestPassed: integer().notNull(),
    total: integer().notNull(),
    attempts: integer().notNull().default(1),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.unitId] })],
);

/** Termos do Meu Glossário. */
export const glossaryTerm = pgTable(
  'glossary_term',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    term: text().notNull(),
    meaning: text().notNull().default(''),
    ownExplanation: text().notNull().default(''),
    example: text().notNull().default(''),
    /** Explicação aceita como escrita com as próprias palavras (verificada no servidor). */
    ownWords: boolean().notNull().default(false),
    unitId: text().references(() => unit.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index().on(t.userId), index().on(t.unitId)],
);

/**
 * Livro-razão de pontos: eventos imutáveis. O total do aluno é a soma; um evento
 * nunca é editado nem apagado (exceto com a exclusão da conta). `ref` identifica o
 * item pontuado (unidade, unidade/etapa, trilha) e não tem chave estrangeira, para
 * o histórico sobreviver a revisões do conteúdo.
 */
export const pointEvent = pgTable(
  'point_event',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text().notNull(),
    ref: text().notNull(),
    points: integer().notNull(),
    description: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId, t.kind, t.ref), index().on(t.userId, t.createdAt)],
);
