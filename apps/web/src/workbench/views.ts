import { BookOpen, Files, Map, Settings, UserRound, type LucideIcon } from 'lucide-react';

export type ViewId = 'trilhas' | 'explorador' | 'glossario' | 'conta' | 'configuracoes';

export interface ViewDef {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  /** Etapa do plano em que a visão ganha funcionamento; ausente = já funciona. */
  stage?: number;
  /** O que a visão fará quando estiver pronta. */
  description: string;
  placement: 'top' | 'bottom';
}

export const VIEWS: ViewDef[] = [
  {
    id: 'trilhas',
    label: 'Trilhas',
    icon: Map,
    stage: 3,
    description: 'Mapa das trilhas de aprendizagem, com módulos, unidades e o seu progresso.',
    placement: 'top',
  },
  {
    id: 'explorador',
    label: 'Explorador',
    icon: Files,
    description: 'Arquivos do seu projeto: criar, renomear, excluir e abrir em abas.',
    placement: 'top',
  },
  {
    id: 'glossario',
    label: 'Meu Glossário',
    icon: BookOpen,
    stage: 6,
    description:
      'Termos que você ainda não conhece, com o significado pesquisado, sua explicação e um exemplo.',
    placement: 'top',
  },
  {
    id: 'conta',
    label: 'Conta',
    icon: UserRound,
    stage: 4,
    description: 'Cadastro, login, dados pessoais e troca de senha.',
    placement: 'bottom',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    description: 'Tema da interface e atalhos de teclado.',
    placement: 'bottom',
  },
];

export function getView(id: ViewId): ViewDef {
  const v = VIEWS.find((x) => x.id === id);
  if (!v) throw new Error(`Visão desconhecida: ${id}`);
  return v;
}
