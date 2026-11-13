import { z } from 'zod';

/* ------------------------------------------------------------ Meu Glossário */

export const GLOSSARY_LIMITS = { termo: 120, texto: 2000 } as const;

/** Tamanho mínimo da explicação com as próprias palavras para contar pontos. */
export const OWN_EXPLANATION_MIN = 40;

export const glossaryTermInputSchema = z.object({
  termo: z.string().trim().min(1, 'Informe a palavra ou expressão.').max(GLOSSARY_LIMITS.termo),
  significado: z.string().trim().max(GLOSSARY_LIMITS.texto).default(''),
  explicacao: z.string().trim().max(GLOSSARY_LIMITS.texto).default(''),
  exemplo: z.string().trim().max(GLOSSARY_LIMITS.texto).default(''),
  /** Unidade em que o termo foi registrado (opcional). */
  unitId: z.string().min(1).nullable().default(null),
});
export type GlossaryTermInput = z.input<typeof glossaryTermInputSchema>;

export const glossaryImportSchema = z.object({
  terms: z.array(glossaryTermInputSchema).max(1000),
});

export interface GlossaryTerm {
  id: string;
  termo: string;
  significado: string;
  explicacao: string;
  exemplo: string;
  unitId: string | null;
  /** Título da unidade de origem, quando existe. */
  unidade: string | null;
  /** A explicação foi aceita como escrita com as próprias palavras. */
  explicacaoPropria: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExplanationCheck =
  /** Sem explicação ainda. */
  | { status: 'vazia' }
  /** Explicação curta demais para contar pontos. */
  | { status: 'curta'; faltam: number }
  /** Quase igual ao significado pesquisado. */
  | { status: 'copia'; semelhanca: number }
  | { status: 'propria'; semelhanca: number };

const words = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const pairs = (w: string[]) => (w.length < 2 ? w : w.slice(1).map((x, i) => `${w[i]} ${x}`));

/**
 * Proporção dos pares de palavras da explicação que já aparecem no significado
 * (0 a 1). Copiar o significado e trocar uma ou outra palavra mantém a maioria
 * dos pares; reescrever com as próprias palavras, não.
 */
export function similarity(significado: string, explicacao: string): number {
  const e = pairs(words(explicacao));
  if (e.length === 0) return 0;
  const m = new Set(pairs(words(significado)));
  return e.filter((p) => m.has(p)).length / e.length;
}

/** Limite de semelhança a partir do qual a explicação é tratada como cópia. */
export const COPY_THRESHOLD = 0.5;

/** Verificação simples de que a explicação não é cópia do significado pesquisado. */
export function checkExplanation(significado: string, explicacao: string): ExplanationCheck {
  const text = explicacao.trim();
  if (!text) return { status: 'vazia' };
  const semelhanca = similarity(significado, text);
  if (semelhanca >= COPY_THRESHOLD) return { status: 'copia', semelhanca };
  if (text.length < OWN_EXPLANATION_MIN)
    return { status: 'curta', faltam: OWN_EXPLANATION_MIN - text.length };
  return { status: 'propria', semelhanca };
}
