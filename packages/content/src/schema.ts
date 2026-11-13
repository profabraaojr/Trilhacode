/** Formato dos arquivos que os autores escrevem em content/. */
import { z } from 'zod';

const text = z.string().trim().min(1, 'não pode ficar vazio');

export const trackFileSchema = z.object({
  titulo: text,
  descricao: text,
  publico: text,
  nivel: text,
  duracaoEstimada: text,
  objetivos: z.array(text).min(1, 'informe ao menos um objetivo'),
  prerequisitos: z.array(text).default([]),
  requerTrilhas: z.array(text).default([]),
});

export const moduleFileSchema = z.object({
  titulo: text,
  descricao: text,
});

export const readingSchema = z.object({
  titulo: text,
  url: z.url('URL inválida'),
  fonte: text,
});

export const unitFrontmatterSchema = z.object({
  titulo: text,
  nivel: text,
  duracaoMinutos: z.number().int().positive(),
  objetivos: z.array(text).min(1, 'informe ao menos um objetivo'),
  /** Caminhos relativos à trilha (ex.: "fundamentos-html/estrutura-documento"). */
  requer: z.array(text).optional(),
  termos: z
    .array(z.object({ termo: text, dica: text }))
    .min(3, 'proponha ao menos 3 termos para o glossário'),
  leituraComplementar: z.array(readingSchema).default([]),
});

export const challengeFileSchema = z.object({
  enunciado: text,
  testes: z
    .array(z.object({ descricao: text, codigo: text }))
    .min(1, 'o desafio precisa de ao menos um teste'),
});

const alternativeSchema = z.object({
  texto: text,
  correta: z.boolean().default(false),
  feedback: text,
});

export const assessmentFileSchema = z.object({
  notaMinima: z.number().min(0).max(100).default(70),
  questoes: z
    .array(
      z
        .object({
          id: z.string().regex(/^[a-z0-9-]+$/, 'use letras minúsculas, números e hífen'),
          tipo: z.enum(['conceitual', 'leitura-de-codigo', 'resolucao-de-problema']),
          enunciado: text,
          codigo: z.object({ linguagem: text, conteudo: text }).optional(),
          /** Por padrão as alternativas são embaralhadas; use true quando a ordem importar. */
          manterOrdem: z.boolean().default(false),
          alternativas: z.array(alternativeSchema).min(3, 'use ao menos 3 alternativas'),
        })
        .refine((q) => q.alternativas.filter((a) => a.correta).length === 1, {
          message: 'cada questão precisa de exatamente uma alternativa correta',
          path: ['alternativas'],
        }),
    )
    .min(3, 'a avaliação precisa de ao menos 3 questões')
    .refine((qs) => new Set(qs.map((q) => q.id)).size === qs.length, {
      message: 'há questões com o mesmo id',
    }),
});

export const UNIT_SECTIONS = {
  apresentacao: 'Apresentação',
  fundamentacao: 'Fundamentação',
  demonstracao: 'Demonstração',
  experimentacao: 'Experimentação',
  vocabulario: 'Vocabulário',
} as const;
