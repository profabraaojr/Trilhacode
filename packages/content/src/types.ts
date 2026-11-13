/**
 * Formato compilado do conteúdo: o que a API guarda e entrega à interface.
 * Os textos em Markdown já chegam convertidos em HTML seguro (sem HTML bruto do autor).
 */
import type { UnitStepId } from '@trilhacode/shared';

export interface ContentFile {
  name: string;
  content: string;
}

export interface ReadingLink {
  titulo: string;
  url: string;
  fonte: string;
}

export interface GlossaryHint {
  termo: string;
  /** Pista para orientar a pesquisa, sem entregar a definição pronta. */
  dica: string;
}

export interface ChallengeTest {
  descricao: string;
  codigo: string;
}

export type QuestionKind = 'conceitual' | 'leitura-de-codigo' | 'resolucao-de-problema';

/** Questão como a interface recebe: sem indicar a alternativa correta. */
export interface PublicQuestion {
  id: string;
  tipo: QuestionKind;
  enunciadoHtml: string;
  codigo?: { linguagem: string; conteudo: string };
  alternativas: { id: string; textoHtml: string }[];
}

export interface UnitContent {
  etapas: {
    apresentacao: { html: string };
    fundamentacao: { html: string };
    demonstracao: { html: string; arquivos: ContentFile[] };
    experimentacao: { html: string; arquivos: ContentFile[] };
    vocabulario: { html: string; termos: GlossaryHint[] };
    desafio: { html: string; arquivos: ContentFile[]; testes: ChallengeTest[] };
    avaliacao: { notaMinima: number; questoes: PublicQuestion[] };
  };
  leituraComplementar: ReadingLink[];
}

/** Gabarito, guardado só no servidor. */
export interface AnswerKey {
  notaMinima: number;
  questoes: Record<string, { correta: string; feedback: Record<string, string> }>;
}

export interface CompiledUnit {
  id: string;
  titulo: string;
  posicao: number;
  nivel: string;
  duracaoMinutos: number;
  objetivos: string[];
  /** Unidades que devem ser concluídas antes (por padrão, a anterior). */
  requer: string[];
  conteudo: UnitContent;
  gabarito: AnswerKey;
}

export interface CompiledModule {
  id: string;
  titulo: string;
  descricao: string;
  posicao: number;
  unidades: CompiledUnit[];
}

export interface TrackMetadata {
  publico: string;
  nivel: string;
  duracaoEstimada: string;
  objetivos: string[];
  prerequisitos: string[];
  requerTrilhas: string[];
}

export interface CompiledTrack extends TrackMetadata {
  id: string;
  titulo: string;
  descricao: string;
  modulos: CompiledModule[];
}

export type { UnitStepId };

/* ------------------------------------------------------------ Respostas da API */

export interface TrackSummary {
  id: string;
  titulo: string;
  descricao: string;
  publico: string;
  nivel: string;
  duracaoEstimada: string;
  totalUnidades: number;
}

export interface UnitSummary {
  id: string;
  titulo: string;
  posicao: number;
  nivel: string;
  duracaoMinutos: number;
  objetivos: string[];
  requer: string[];
}

export interface TrackDetail extends TrackMetadata {
  id: string;
  titulo: string;
  descricao: string;
  modulos: {
    id: string;
    titulo: string;
    descricao: string;
    posicao: number;
    unidades: UnitSummary[];
  }[];
}

export interface UnitPayload extends UnitSummary {
  moduloId: string;
  moduloTitulo: string;
  trilhaId: string;
  trilhaTitulo: string;
  conteudo: UnitContent;
}

export interface AssessmentResult {
  nota: number;
  notaMinima: number;
  aprovado: boolean;
  acertos: number;
  total: number;
  questoes: { id: string; respondida: boolean; correta: boolean; feedback: string }[];
}
