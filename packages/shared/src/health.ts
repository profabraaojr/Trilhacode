import { z } from 'zod';

/** Resposta de GET /api/health. A interface usa este schema para validar o que recebe. */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  database: z.enum(['up', 'down']),
  time: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
