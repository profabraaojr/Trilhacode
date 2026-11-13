// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { runChallengeTests } from './tests.js';

describe('runChallengeTests', () => {
  it('aprova, reprova com a mensagem do autor e trata erros inesperados', async () => {
    document.body.innerHTML = '<h1 style="color: rgb(1, 2, 3)">Oi</h1>';
    const results = await runChallengeTests(
      [
        { descricao: 'tem h1', codigo: "verificar(document.querySelector('h1'), 'falta h1')" },
        {
          descricao: 'tem p',
          codigo: "verificar(document.querySelector('p'), 'Falta um parágrafo.')",
        },
        {
          descricao: 'cor',
          codigo:
            "verificar(estilo(document.querySelector('h1'), 'color') === 'rgb(1, 2, 3)', 'cor')",
        },
        {
          descricao: 'fonte',
          codigo: "verificar(arquivos['index.html'].includes('h1'), 'sem h1 no fonte')",
        },
        { descricao: 'quebra', codigo: 'null.x' },
      ],
      [{ name: 'index.html', content: '<h1>Oi</h1>' }],
    );
    expect(results.map((r) => r.ok)).toEqual([true, false, true, true, false]);
    expect(results[1]!.mensagem).toBe('Falta um parágrafo.');
    expect(results[4]!.mensagem).toMatch(/^Não foi possível verificar este item/);
  });
});
