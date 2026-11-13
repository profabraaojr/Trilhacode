import { describe, expect, it } from 'vitest';
import { checkExplanation, glossaryTermInputSchema, similarity } from './index.js';

const significado =
  'Elemento semântico do HTML que representa o conteúdo principal do documento, único na página.';

describe('checkExplanation', () => {
  it('aceita uma explicação reescrita com as próprias palavras', () => {
    const r = checkExplanation(
      significado,
      'É a parte da página onde fica o assunto central; só pode existir um por página.',
    );
    expect(r.status).toBe('propria');
  });

  it('trata como cópia o significado colado, mesmo com acentos ou maiúsculas trocados', () => {
    expect(checkExplanation(significado, significado.toUpperCase()).status).toBe('copia');
    expect(
      checkExplanation(
        significado,
        'Elemento semantico do HTML que representa o conteudo principal do documento.',
      ).status,
    ).toBe('copia');
  });

  it('trata como cópia uma troca de poucas palavras', () => {
    const r = checkExplanation(
      significado,
      'Elemento semântico do HTML que mostra o conteúdo principal do documento, único na página.',
    );
    expect(r.status).toBe('copia');
  });

  it('pede uma explicação mais longa e reconhece o campo vazio', () => {
    expect(checkExplanation(significado, 'Parte central.')).toMatchObject({ status: 'curta' });
    expect(checkExplanation(significado, '   ').status).toBe('vazia');
  });

  it('sem significado, só o tamanho conta', () => {
    expect(
      checkExplanation('', 'Uma explicação com mais de quarenta caracteres, escrita.').status,
    ).toBe('propria');
  });

  it('similarity fica entre 0 e 1', () => {
    expect(similarity(significado, significado)).toBe(1);
    expect(similarity(significado, 'nada a ver com isso aqui')).toBe(0);
  });
});

describe('glossaryTermInputSchema', () => {
  it('exige o termo e preenche os campos opcionais', () => {
    expect(glossaryTermInputSchema.safeParse({ termo: '  ' }).success).toBe(false);
    expect(glossaryTermInputSchema.parse({ termo: 'main' })).toEqual({
      termo: 'main',
      significado: '',
      explicacao: '',
      exemplo: '',
      unitId: null,
    });
  });
});
