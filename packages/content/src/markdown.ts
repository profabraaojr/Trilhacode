/**
 * Markdown -> HTML seguro. O HTML bruto escrito pelo autor é escapado (aparece como
 * texto), links externos abrem em nova aba e blocos de código recebem a classe da
 * linguagem. Assim o resultado pode ser inserido na página sem sanitização posterior.
 */
import { Marked, type Tokens } from 'marked';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SAFE_URL = /^(https?:|mailto:|#|\/(?!\/))/i;

const marked = new Marked({
  gfm: true,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }: Tokens.Link) {
      const inner = this.parser.parseInline(tokens);
      if (!SAFE_URL.test(href)) return inner;
      const external = /^https?:/i.test(href);
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      const target = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(href)}"${t}${target}>${inner}</a>`;
    },
    image({ text }: Tokens.Image) {
      // imagens externas não são permitidas no conteúdo nesta versão
      return escapeHtml(text);
    },
    code({ text, lang }: Tokens.Code) {
      const language = (lang ?? '').split(/\s+/)[0] ?? '';
      const cls = language ? ` class="language-${escapeHtml(language)}"` : '';
      return `<pre><code${cls}>${escapeHtml(text)}</code></pre>\n`;
    },
  },
});

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

export function renderInline(md: string): string {
  return marked.parseInline(md, { async: false }) as string;
}

export interface FencedFile {
  name: string;
  content: string;
}

/** Blocos ```html arquivo=index.html viram arquivos que podem ser abertos no editor. */
export function extractFencedFiles(md: string): FencedFile[] {
  const files: FencedFile[] = [];
  const re = /^```[\w-]*[^\n]*\barquivo=([\w.-]+)[^\n]*\n([\s\S]*?)^```/gm;
  for (const m of md.matchAll(re)) {
    const name = m[1]!;
    const content = m[2]!;
    const existing = files.find((f) => f.name === name);
    if (existing) existing.content = content;
    else files.push({ name, content });
  }
  return files;
}
