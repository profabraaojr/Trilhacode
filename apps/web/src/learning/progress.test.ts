import { describe, expect, it } from 'vitest';
import {
  completedSteps,
  emptyProgress,
  nextStep,
  percent,
  unitStatus,
  type ProgressData,
} from './progress';

const all = {
  apresentacao: 'x',
  fundamentacao: 'x',
  demonstracao: 'x',
  experimentacao: 'x',
  vocabulario: 'x',
  desafio: 'x',
  avaliacao: 'x',
};

describe('progresso', () => {
  const progress: ProgressData = {
    version: 1,
    units: {
      u1: { steps: all, attempts: 1, bestScore: 100 },
      u2: { steps: { apresentacao: 'x' }, attempts: 0 },
    },
  };

  it('calcula o estado de cada unidade', () => {
    expect(unitStatus('u1', [], progress)).toBe('concluida');
    expect(unitStatus('u2', ['u1'], progress)).toBe('em-andamento');
    expect(unitStatus('u3', ['u2'], progress)).toBe('bloqueada');
    expect(unitStatus('u3', ['u1'], progress)).toBe('disponivel');
    expect(unitStatus('u1', [], emptyProgress())).toBe('disponivel');
  });

  it('calcula percentual e próxima etapa', () => {
    expect(completedSteps(progress.units.u2)).toBe(1);
    expect(percent(['u1', 'u2'], progress)).toBe(Math.round((8 / 14) * 100));
    expect(nextStep(progress.units.u2)).toBe('fundamentacao');
    expect(nextStep(undefined)).toBe('apresentacao');
    expect(nextStep(progress.units.u1)).toBe('avaliacao');
  });
});
