/**
 * Monta o documento que será executado no sandbox a partir dos arquivos do projeto.
 *
 * - <link rel="stylesheet" href="style.css"> e <script src="script.js"> que apontam
 *   para arquivos do projeto passam a apontar para URLs geradas pelo sandbox.
 * - <script> sem src recebe a proteção contra laços infinitos.
 * - O script de instrumentação é inserido logo após <head> (ou no início), na mesma
 *   linha, para que os números de linha do HTML não mudem.
 * - Arquivos não encontrados e arquivos não vinculados geram avisos para o aluno.
 */
import type { ProjectFile } from './protocol.js';

export interface BuildDocumentOptions {
  files: ProjectFile[];
  entry: string;
  /** Marcação inserida no início do documento (uma única linha). */
  bootstrap: string;
  /** URL para um arquivo CSS ou JS do projeto (o JS já deve vir protegido). */
  urlFor: (file: ProjectFile) => string;
  /**
   * Aplica a proteção a um script embutido; devolve o código original se houver erro de sintaxe.
   * startLine é a linha do HTML em que o conteúdo do script começa.
   */
  transformInline: (code: string, startLine: number) => string;
}

export interface BuildDocumentResult {
  html: string;
  warnings: string[];
}

const ATTR_RE = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function parseAttrs(src: string): Map<string, { value: string; start: number; end: number }> {
  const out = new Map<string, { value: string; start: number; end: number }>();
  for (const m of src.matchAll(ATTR_RE)) {
    const name = m[1]!.toLowerCase();
    const raw = m[2] ?? m[3] ?? m[4];
    if (raw === undefined || out.has(name)) continue;
    // posição do valor dentro de src (sem aspas)
    const quoteOffset = m[2] !== undefined || m[3] !== undefined ? 1 : 0;
    const valueStart = m.index! + m[0].length - raw.length - quoteOffset;
    out.set(name, { value: raw, start: valueStart, end: valueStart + raw.length });
  }
  return out;
}

function isExternal(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url.trim());
}

function normalizeRef(url: string): string {
  return url.trim().replace(/^\.\//, '').split(/[?#]/)[0]!;
}

function replaceRange(s: string, start: number, end: number, value: string): string {
  return s.slice(0, start) + value + s.slice(end);
}

export function buildDocument(options: BuildDocumentOptions): BuildDocumentResult {
  const { files, entry, bootstrap, urlFor, transformInline } = options;
  const warnings: string[] = [];
  const byName = new Map(files.map((f) => [f.name, f]));
  const entryFile = byName.get(entry);
  if (!entryFile) {
    return {
      html: `${bootstrap}<p>O arquivo ${entry} não existe no projeto.</p>`,
      warnings: [`O projeto precisa de um arquivo ${entry} para ser executado.`],
    };
  }
  const used = new Set<string>([entry]);
  let html = entryFile.content;

  // <script ...>...</script>
  const original = html;
  html = html.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
    (whole, attrSrc: string, body: string, index: number) => {
      const attrs = parseAttrs(attrSrc);
      const src = attrs.get('src');
      if (src) {
        if (isExternal(src.value)) return whole;
        const name = normalizeRef(src.value);
        const file = byName.get(name);
        if (!file) {
          warnings.push(`${entry}: o script "${src.value}" não foi encontrado no projeto.`);
          return whole;
        }
        used.add(name);
        const newAttrs = replaceRange(attrSrc, src.start, src.end, urlFor(file));
        return `<script${newAttrs}>${body}</script>`;
      }
      const type = attrs.get('type')?.value.toLowerCase();
      if (type && !['text/javascript', 'module', 'application/javascript'].includes(type))
        return whole;
      const startLine = lineAt(original, index + whole.indexOf('>') + 1);
      return `<script${attrSrc}>${transformInline(body, startLine)}</script>`;
    },
  );

  // <link rel="stylesheet" href="...">
  html = html.replace(/<link\b([^>]*)>/gi, (whole, attrSrc: string) => {
    const attrs = parseAttrs(attrSrc);
    const rel = attrs.get('rel')?.value.toLowerCase() ?? '';
    const href = attrs.get('href');
    if (!href || !rel.split(/\s+/).includes('stylesheet') || isExternal(href.value)) return whole;
    const name = normalizeRef(href.value);
    const file = byName.get(name);
    if (!file) {
      warnings.push(`${entry}: a folha de estilo "${href.value}" não foi encontrada no projeto.`);
      return whole;
    }
    used.add(name);
    return `<link${replaceRange(attrSrc, href.start, href.end, urlFor(file))}>`;
  });

  for (const f of files) {
    if (used.has(f.name)) continue;
    if (f.name.endsWith('.css')) {
      warnings.push(
        `${f.name} não está vinculado ao ${entry}. Para usá-lo, coloque no <head>: <link rel="stylesheet" href="${f.name}">`,
      );
    } else if (f.name.endsWith('.js')) {
      warnings.push(
        `${f.name} não está vinculado ao ${entry}. Para usá-lo, coloque antes de </body>: <script src="${f.name}"></script>`,
      );
    }
  }

  // Inserção do bootstrap na mesma linha, logo após <head ...>, <html ...> ou no início.
  const head = /<head\b[^>]*>/i.exec(html);
  const root = /<html\b[^>]*>/i.exec(html);
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  const anchor = head ?? root ?? doctype;
  const at = anchor ? anchor.index + anchor[0].length : 0;
  html = html.slice(0, at) + bootstrap + html.slice(at);

  return { html, warnings };
}

/** Linha (1-based) em que começa o índice informado. */
export function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}
