import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compileContent } from './load.js';
import { renderMarkdown } from './markdown.js';

let root: string;
afterEach(() => root && rmSync(root, { recursive: true, force: true }));

function write(rel: string, content: string) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const UNIT_MD = (titulo: string, extra = '') => `---
titulo: ${titulo}
nivel: básico
duracaoMinutos: 40
objetivos: [Entender a estrutura]
termos:
  - { termo: tag, dica: procure a diferença entre tag e elemento }
  - { termo: atributo, dica: o que fica dentro da tag de abertura }
  - { termo: aninhamento, dica: elementos dentro de elementos }
leituraComplementar:
  - { titulo: Elementos HTML, url: "https://developer.mozilla.org/pt-BR/", fonte: MDN Web Docs }
${extra}---
## Apresentação

Texto de **apresentação** com <script>alert(1)</script>.

## Fundamentação

Fundamentos. [Link](https://exemplo.org) e [perigoso](javascript:alert(1)).

## Demonstração

\`\`\`html arquivo=index.html
<h1>Oi</h1>
\`\`\`

## Experimentação

Altere o título.
`;

const CHALLENGE = `enunciado: Crie um h1.
testes:
  - descricao: Existe um h1
    codigo: verificar(document.querySelector('h1'), 'Falta o h1')
`;

const ASSESSMENT = `questoes:
  - id: q1
    tipo: conceitual
    enunciado: O que é HTML?
    alternativas:
      - { texto: Linguagem de marcação, correta: true, feedback: Isso mesmo. }
      - { texto: Linguagem de programação, feedback: HTML não tem lógica. }
      - { texto: Banco de dados, feedback: Não. }
  - id: q2
    tipo: leitura-de-codigo
    enunciado: Qual tag?
    codigo: { linguagem: html, conteudo: "<p>oi</p>" }
    alternativas:
      - { texto: p, correta: true, feedback: Certo. }
      - { texto: div, feedback: Não. }
      - { texto: span, feedback: Não. }
  - id: q3
    tipo: resolucao-de-problema
    enunciado: Como fazer um link?
    alternativas:
      - { texto: "\`<a>\`", correta: true, feedback: Certo. }
      - { texto: "\`<link>\`", feedback: Esse é para CSS. }
      - { texto: "\`<href>\`", feedback: Não existe. }
`;

function validTrack() {
  root = mkdtempSync(join(tmpdir(), 'tc-content-'));
  write(
    'trilhas/web/trilha.yaml',
    `titulo: Web\ndescricao: Trilha\npublico: Ensino técnico\nnivel: Iniciante\nduracaoEstimada: 4 h\nobjetivos: [Criar páginas]\n`,
  );
  write('trilhas/web/01-html/modulo.yaml', 'titulo: HTML\ndescricao: Fundamentos\n');
  for (const [dir, title] of [
    ['01-estrutura', 'Estrutura'],
    ['02-links', 'Links'],
  ] as const) {
    const base = `trilhas/web/01-html/${dir}`;
    write(`${base}/unidade.md`, UNIT_MD(title));
    write(`${base}/desafio.yaml`, CHALLENGE);
    write(`${base}/avaliacao.yaml`, ASSESSMENT);
    write(`${base}/experimento/index.html`, '<p>experimento</p>');
    write(`${base}/experimento/style.css`, 'p{}');
    write(`${base}/desafio/index.html`, '<!-- seu código -->');
  }
}

describe('compileContent', () => {
  it('compila uma trilha válida com ids estáveis e pré-requisitos padrão', () => {
    validTrack();
    const { tracks, errors } = compileContent(root);
    expect(errors).toEqual([]);
    const unit = tracks[0]!.modulos[0]!.unidades;
    expect(unit.map((u) => u.id)).toEqual(['web/html/estrutura', 'web/html/links']);
    expect(unit[0]!.requer).toEqual([]);
    expect(unit[1]!.requer).toEqual(['web/html/estrutura']);
  });

  it('separa o gabarito do conteúdo público, coerente com a ordem embaralhada', () => {
    validTrack();
    const u = compileContent(root).tracks[0]!.modulos[0]!.unidades[0]!;
    const q = u.conteudo.etapas.avaliacao.questoes[0]!;
    expect(JSON.stringify(q)).not.toContain('correta');
    expect(q.alternativas.map((a) => a.id)).toEqual(['a', 'b', 'c']);
    const key = u.gabarito.questoes.q1!;
    const correct = q.alternativas.find((a) => a.id === key.correta)!;
    expect(correct.textoHtml).toBe('Linguagem de marcação');
    expect(key.feedback[key.correta]).toBe('Isso mesmo.');
  });

  it('embaralha sempre na mesma ordem e respeita manterOrdem', () => {
    validTrack();
    const a = compileContent(root).tracks[0]!.modulos[0]!.unidades[0]!.conteudo.etapas.avaliacao;
    const b = compileContent(root).tracks[0]!.modulos[0]!.unidades[0]!.conteudo.etapas.avaliacao;
    expect(a).toEqual(b);
    write(
      'trilhas/web/01-html/01-estrutura/avaliacao.yaml',
      ASSESSMENT.replace('tipo: conceitual', 'tipo: conceitual\n    manterOrdem: true'),
    );
    const kept =
      compileContent(root).tracks[0]!.modulos[0]!.unidades[0]!.conteudo.etapas.avaliacao
        .questoes[0]!;
    expect(kept.alternativas.map((x) => x.textoHtml)).toEqual([
      'Linguagem de marcação',
      'Linguagem de programação',
      'Banco de dados',
    ]);
  });

  it('extrai arquivos da demonstração e lê experimento e desafio', () => {
    validTrack();
    const e = compileContent(root).tracks[0]!.modulos[0]!.unidades[0]!.conteudo.etapas;
    expect(e.demonstracao.arquivos).toEqual([{ name: 'index.html', content: '<h1>Oi</h1>\n' }]);
    expect(e.experimentacao.arquivos.map((f) => f.name)).toEqual(['index.html', 'style.css']);
    expect(e.desafio.testes).toHaveLength(1);
  });

  it('escapa HTML bruto e remove links perigosos do Markdown', () => {
    validTrack();
    const e = compileContent(root).tracks[0]!.modulos[0]!.unidades[0]!.conteudo.etapas;
    expect(e.apresentacao.html).toContain('&lt;script&gt;');
    expect(e.apresentacao.html).not.toContain('<script>');
    expect(e.fundamentacao.html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(e.fundamentacao.html).not.toContain('javascript:');
  });

  it('aponta arquivo e campo dos erros', () => {
    validTrack();
    write(
      'trilhas/web/01-html/02-links/avaliacao.yaml',
      ASSESSMENT.replace('{ texto: p, correta: true', '{ texto: p, correta: false'),
    );
    write(
      'trilhas/web/01-html/01-estrutura/unidade.md',
      UNIT_MD('Estrutura').replace('## Experimentação', '## Exercícios'),
    );
    const { errors } = compileContent(root);
    const messages = errors.map((e) => `${e.file} :: ${e.message}`).join('\n');
    expect(messages).toContain(
      '02-links/avaliacao.yaml :: questoes.1.alternativas: cada questão precisa de exatamente uma alternativa correta',
    );
    expect(messages).toContain('seção desconhecida "## Exercícios"');
    expect(messages).toContain('falta a seção "## Experimentação"');
  });

  it('valida pré-requisitos declarados', () => {
    validTrack();
    write(
      'trilhas/web/01-html/02-links/unidade.md',
      UNIT_MD('Links', 'requer: [html/nao-existe]\n'),
    );
    const { errors } = compileContent(root);
    expect(errors.some((e) => e.message.includes('"web/html/nao-existe" não existe'))).toBe(true);
  });

  it('exige index.html no experimento e no desafio', () => {
    validTrack();
    rmSync(join(root, 'trilhas/web/01-html/01-estrutura/desafio'), { recursive: true });
    const { errors } = compileContent(root);
    expect(errors.some((e) => e.file.endsWith('01-estrutura/desafio'))).toBe(true);
  });
});

describe('renderMarkdown', () => {
  it('marca a linguagem dos blocos de código e ignora metadados', () => {
    expect(renderMarkdown('```html arquivo=index.html\n<p>x</p>\n```')).toBe(
      '<pre><code class="language-html">&lt;p&gt;x&lt;/p&gt;</code></pre>\n',
    );
  });
});
