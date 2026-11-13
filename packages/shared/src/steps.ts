/**
 * As sete etapas pedagógicas de cada unidade de aprendizagem,
 * na ordem em que o aluno as percorre.
 */
export const UNIT_STEPS = [
  { id: 'apresentacao', label: 'Apresentação do conceito' },
  { id: 'fundamentacao', label: 'Fundamentação teórica' },
  { id: 'demonstracao', label: 'Demonstração prática' },
  { id: 'experimentacao', label: 'Experimentação' },
  { id: 'vocabulario', label: 'Vocabulário técnico' },
  { id: 'desafio', label: 'Desafio prático' },
  { id: 'avaliacao', label: 'Avaliação' },
] as const;

export type UnitStepId = (typeof UNIT_STEPS)[number]['id'];
export const UNIT_STEP_IDS = UNIT_STEPS.map((s) => s.id) as [UnitStepId, ...UnitStepId[]];
