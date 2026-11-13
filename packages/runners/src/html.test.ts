import { describe, expect, it } from 'vitest';
import { buildDocument, lineAt } from './html.js';
import type { ProjectFile } from './protocol.js';

const base = (files: ProjectFile[]) =>
  buildDocument({
    files,
    entry: 'index.html',
    bootstrap: '<script>BOOT</script>',
    urlFor: (f) => `blob:${f.name}`,
    transformInline: (code, line) => `/*g${line}*/${code}`,
  });

describe('buildDocument', () => {
  const html = `<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Oi</h1>
  <script src="./script.js"></script>
  <script>console.log(1)</script>
</body>
</html>`;

  it('troca referências a arquivos do projeto pelas URLs do sandbox', () => {
    const { html: out, warnings } = base([
      { name: 'index.html', content: html },
      { name: 'style.css', content: 'h1{}' },
      { name: 'script.js', content: '' },
    ]);
    expect(out).toContain('href="blob:style.css"');
    expect(out).toContain('src="blob:script.js"');
    expect(out).toContain('<script>/*g9*/console.log(1)</script>');
    expect(warnings).toEqual([]);
  });

  it('insere o bootstrap logo após <head> sem mudar as linhas', () => {
    const { html: out } = base([{ name: 'index.html', content: html }]);
    expect(out).toContain('<head><script>BOOT</script>');
    expect(out.split('\n').length).toBe(html.split('\n').length);
    expect(lineAt(out, out.indexOf('<h1>'))).toBe(7);
  });

  it('insere o bootstrap no início quando o HTML é só um trecho', () => {
    const { html: out } = base([{ name: 'index.html', content: '<p>trecho</p>' }]);
    expect(out.startsWith('<script>BOOT</script><p>')).toBe(true);
  });

  it('avisa sobre arquivos referenciados que não existem', () => {
    const { warnings } = base([
      {
        name: 'index.html',
        content: '<link rel="stylesheet" href="falta.css"><script src="x.js"></script>',
      },
    ]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('x.js');
    expect(warnings[1]).toContain('falta.css');
  });

  it('avisa sobre CSS e JS do projeto que não estão vinculados', () => {
    const { warnings } = base([
      { name: 'index.html', content: '<p>oi</p>' },
      { name: 'estilo.css', content: '' },
      { name: 'app.js', content: '' },
    ]);
    expect(warnings.join('\n')).toContain('<link rel="stylesheet" href="estilo.css">');
    expect(warnings.join('\n')).toContain('<script src="app.js"></script>');
  });

  it('não mexe em URLs externas nem em scripts que não são JavaScript', () => {
    const content =
      '<link rel="stylesheet" href="https://cdn.example/x.css"><script src="https://cdn.example/a.js"></script><script type="text/template"><b></b></script>';
    const { html: out, warnings } = base([{ name: 'index.html', content }]);
    expect(out).toContain('https://cdn.example/x.css');
    expect(out).toContain('https://cdn.example/a.js');
    expect(out).toContain('<script type="text/template"><b></b></script>');
    expect(warnings).toEqual([]);
  });

  it('explica quando falta o arquivo de entrada', () => {
    const { warnings } = base([{ name: 'outro.html', content: '' }]);
    expect(warnings[0]).toContain('index.html');
  });
});
