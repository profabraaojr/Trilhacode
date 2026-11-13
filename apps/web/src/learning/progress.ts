/**
 * Progresso do aluno, guardado no navegador até existir login (Etapa 4, quando
 * será associado à conta). Uma entrada por unidade, com a data de conclusão de
 * cada etapa pedagógica.
 */
import { UNIT_STEP_IDS, type UnitStepId } from '@trilhacode/shared';

export interface UnitProgress {
  steps: Partial<Record<UnitStepId, string>>;
  /** Melhor nota na avaliação (0 a 100) e número de tentativas. */
  bestScore?: number;
  attempts: number;
}

export interface ProgressData {
  version: 1;
  units: Record<string, UnitProgress>;
}

export const PROGRESS_KEY = 'progresso:local';

export const emptyProgress = (): ProgressData => ({ version: 1, units: {} });

export function isProgressData(v: unknown): v is ProgressData {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as ProgressData).version === 1 &&
    typeof (v as ProgressData).units === 'object'
  );
}

export function completedSteps(p: UnitProgress | undefined): number {
  if (!p) return 0;
  return UNIT_STEP_IDS.filter((s) => p.steps[s]).length;
}

export type UnitStatus = 'concluida' | 'em-andamento' | 'disponivel' | 'bloqueada';

export function unitStatus(id: string, requer: string[], progress: ProgressData): UnitStatus {
  const done = completedSteps(progress.units[id]);
  if (done === UNIT_STEP_IDS.length) return 'concluida';
  if (done > 0) return 'em-andamento';
  const pending = requer.some((r) => completedSteps(progress.units[r]) < UNIT_STEP_IDS.length);
  return pending ? 'bloqueada' : 'disponivel';
}

export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  concluida: 'Concluída',
  'em-andamento': 'Em andamento',
  disponivel: 'Disponível',
  bloqueada: 'Bloqueada',
};

/** Percentual de etapas concluídas em um conjunto de unidades. */
export function percent(unitIds: string[], progress: ProgressData): number {
  if (unitIds.length === 0) return 0;
  const total = unitIds.length * UNIT_STEP_IDS.length;
  const done = unitIds.reduce((n, id) => n + completedSteps(progress.units[id]), 0);
  return Math.round((done / total) * 100);
}

/** Primeira etapa ainda não concluída (ou a última, se todas estiverem). */
export function nextStep(p: UnitProgress | undefined): UnitStepId {
  return UNIT_STEP_IDS.find((s) => !p?.steps[s]) ?? UNIT_STEP_IDS[UNIT_STEP_IDS.length - 1]!;
}
