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
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
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
