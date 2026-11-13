/**
 * Estado real das etapas de desenvolvimento, exibido na tela de boas-vindas.
 * Atualize este arquivo ao concluir cada etapa (fonte: docs/03-plano-etapas.md).
 */
export type StageStatus = 'concluida' | 'em-validacao' | 'planejada';

export interface Stage {
  number: number;
  title: string;
  status: StageStatus;
}

export const STAGES: Stage[] = [
  { number: 1, title: 'Fundação e identidade visual', status: 'concluida' },
  { number: 2, title: 'Editor e execução de código', status: 'concluida' },
  { number: 3, title: 'Trilhas e conteúdo', status: 'concluida' },
  { number: 4, title: 'Cadastro e perfis', status: 'concluida' },
  { number: 5, title: 'Gestão pedagógica', status: 'concluida' },
  { number: 6, title: 'Avaliação e evolução', status: 'em-validacao' },
  { number: 7, title: 'Qualidade e publicação', status: 'planejada' },
];

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  concluida: 'Concluída',
  'em-validacao': 'Em validação',
  planejada: 'Planejada',
};
