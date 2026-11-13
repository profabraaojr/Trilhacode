import { z } from 'zod';
import { USER_ROLES } from './roles.js';
import { UNIT_STEP_IDS } from './steps.js';

/** Perfil devolvido por GET /api/me. */
export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: (typeof USER_ROLES)[number];
  institution: string | null;
  createdAt: string;
}

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.').max(120),
  institution: z.string().trim().max(160).nullable(),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

const unitProgressSchema = z.object({
  steps: z.partialRecord(z.enum(UNIT_STEP_IDS), z.string()),
  bestScore: z.number().int().min(0).max(100).optional(),
  attempts: z.number().int().min(0),
});

/** Progresso do aluno (mesmo formato no navegador e na API). */
export const progressDataSchema = z.object({
  version: z.literal(1),
  units: z.record(z.string(), unitProgressSchema),
});
export type ProgressDataPayload = z.infer<typeof progressDataSchema>;

export const roleUpdateSchema = z.object({ role: z.enum(USER_ROLES) });
