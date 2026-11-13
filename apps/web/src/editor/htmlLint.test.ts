import { describe, expect, it } from 'vitest';
import { DEFAULT_FILES } from '../project/files';
import { lintHtml } from './htmlLint';

describe('lintHtml', () => {
  it('não acusa nada no exemplo inicial', () => {
    expect(lintHtml(DEFAULT_FILES[0]!.content)).toEqual([]);
  });

  it('aponta tag aberta e não fechada, com linha e coluna', () => {
    const p = lintHtml('<main>\n  <section>\n    <h1>Oi</h1>\n</main>');
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ line: 2, column: 3, severity: 'error' });
    expect(p[0]!.message).toContain('<section>');
  });

  it('aponta fechamento sem abertura', () => {
    const p = lintHtml('<p>texto</p></div>');
    expect(p[0]!.message).toContain('</div> fecha uma tag que não foi aberta');
  });

  it('aceita elementos vazios, autofechados e fechamentos opcionais', () => {
    expect(lintHtml('<ul><li>a<li>b</ul><img src="a.png"><br><input /><p>sem fechar')).toEqual([]);
  });

  it('ignora o conteúdo de <script> e <style>', () => {
    expect(lintHtml('<script>if (a < b) { x = "<div>" }</script><style>a > b {}</style>')).toEqual(
      [],
    );
  });

  it('avisa sobre fechamento de elemento vazio', () => {
    const p = lintHtml('<br></br>');
    expect(p[0]).toMatchObject({ severity: 'warning' });
  });

  it('acusa comentário não fechado', () => {
    expect(lintHtml('<!-- oi')[0]!.message).toContain('Comentário');
  });
});
