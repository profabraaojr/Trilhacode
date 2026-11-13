import { describe, expect, it } from 'vitest';
import { healthResponseSchema, UNIT_STEP_IDS } from './index.js';

describe('healthResponseSchema', () => {
  it('aceita uma resposta válida', () => {
    const r = healthResponseSchema.safeParse({
      status: 'ok',
      version: '0.1.0',
      database: 'up',
      time: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
  });

  it('rejeita estado desconhecido do banco', () => {
    const r = healthResponseSchema.safeParse({
      status: 'ok',
      version: '0.1.0',
      database: 'talvez',
      time: new Date().toISOString(),
    });
    expect(r.success).toBe(false);
  });
});

describe('UNIT_STEP_IDS', () => {
  it('tem as sete etapas pedagógicas, sem repetição', () => {
    expect(UNIT_STEP_IDS).toHaveLength(7);
    expect(new Set(UNIT_STEP_IDS).size).toBe(7);
  });
});
