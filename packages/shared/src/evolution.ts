import type { GlossaryTerm } from './glossary.js';

/* ------------------------------------------------------------ Pontuação */

/**
 * Regras de pontuação (docs/02-arquitetura.md, seção 8). Os pontos são eventos de
 * um livro-razão; nenhuma regra considera a velocidade.
 */
export const POINT_RULES = {
  /** Cada etapa pedagógica concluída. */
  etapa: 5,
  /** Desafio: proporcional à melhor proporção de testes aprovados. */
  desafio: 30,
  /** Avaliação da unidade: proporcional à melhor nota. */
  avaliacao: 50,
  /** Termo do glossário com explicação própria, ligado a uma unidade. */
  glossario: 5,
  /** Máximo de termos pontuados por unidade. */
  glossarioPorUnidade: 5,
  /** Unidade com as sete etapas concluídas. */
  unidade: 20,
  /** Trilha com todas as unidades concluídas. */
  trilha: 100,
} as const;

export const POINT_KINDS = [
  'etapa',
  'desafio',
  'avaliacao',
  'glossario',
  'unidade',
  'trilha',
] as const;
export type PointKind = (typeof POINT_KINDS)[number];

export const POINT_KIND_LABEL: Record<PointKind, string> = {
  etapa: 'Etapas concluídas',
  desafio: 'Desafios',
  avaliacao: 'Avaliações',
  glossario: 'Glossário',
  unidade: 'Unidades concluídas',
  trilha: 'Trilhas concluídas',
};

export interface PointEventView {
  tipo: PointKind;
  pontos: number;
  descricao: string;
  em: string;
}

/* ------------------------------------------------------------ Evolução */

export interface TrackEvolution {
  id: string;
  titulo: string;
  unidades: number;
  unidadesConcluidas: number;
  /** Percentual de etapas concluídas na trilha. */
  percentual: number;
  iniciada: boolean;
  concluida: boolean;
}

export interface AttemptView {
  origem: 'unidade' | 'turma';
  /** Id da unidade ou da avaliação da turma. */
  id: string;
  titulo: string;
  /** Trilha da unidade ou nome da turma. */
  contexto: string;
  nota: number;
  aprovado: boolean;
  em: string;
}

export interface ChallengeView {
  unitId: string;
  unidade: string;
  aprovados: number;
  total: number;
  concluido: boolean;
}

export type ReviewReason = 'avaliacao-abaixo' | 'desafio-pendente' | 'explicacao-pendente';

export interface ReviewItem {
  unitId: string;
  unidade: string;
  motivo: ReviewReason;
  detalhe: string;
}

/** GET /api/evolucao: indicadores do próprio aluno. */
export interface Evolution {
  pontos: { total: number; porTipo: Record<PointKind, number> };
  trilhas: TrackEvolution[];
  avaliacoes: { realizadas: number; aprovadas: number; historico: AttemptView[] };
  desafios: { concluidos: number; resultados: ChallengeView[] };
  glossario: { termos: number; comExplicacaoPropria: number };
  revisar: ReviewItem[];
  eventos: PointEventView[];
}

/** Glossário de um aluno visto pelo professor. */
export interface StudentGlossary {
  aluno: { id: string; name: string; email: string };
  termos: GlossaryTerm[];
}
