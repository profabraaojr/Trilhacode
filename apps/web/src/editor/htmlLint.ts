/**
 * Verificação simples de HTML para iniciantes: tags fechadas sem abertura,
 * tags abertas que nunca foram fechadas e fechamento fora de ordem.
 * O editor Monaco não traz diagnósticos de HTML; este verificador cobre os erros
 * mais comuns de quem está começando. Ele não substitui um validador completo.
 */

export interface HtmlProblem {
  message: string;
  line: number;
  column: number;
  endColumn: number;
  severity: 'error' | 'warning';
}

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
/** Elementos cujo fechamento o HTML permite omitir. */
const OPTIONAL_CLOSE = new Set([
  'html',
  'head',
  'body',
  'p',
  'li',
  'dt',
  'dd',
  'option',
  'optgroup',
  'tr',
  'td',
  'th',
  'thead',
  'tbody',
  'tfoot',
  'colgroup',
  'rt',
  'rp',
]);
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);

interface Open {
  name: string;
  line: number;
  column: number;
  length: number;
}

function position(text: string, index: number): { line: number; column: number } {
  let line = 1;
  let last = -1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      last = i;
    }
  }
  return { line, column: index - last };
}

export function lintHtml(text: string): HtmlProblem[] {
  const problems: HtmlProblem[] = [];
  const stack: Open[] = [];
  const tagRe =
    /<!--[\s\S]*?(?:-->|$)|<!doctype[^>]*>|<\/?([A-Za-z][\w-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(text))) {
    const whole = m[0];
    if (whole.startsWith('<!')) {
      if (whole.startsWith('<!--') && !whole.endsWith('-->')) {
        const p = position(text, m.index);
        problems.push({
          message: 'Comentário aberto com <!-- e nunca fechado com -->.',
          ...p,
          endColumn: p.column + 4,
          severity: 'error',
        });
      }
      continue;
    }
    const name = m[1]!.toLowerCase();
    const closing = whole.startsWith('</');
    const selfClosing = /\/\s*>$/.test(whole);
    const p = position(text, m.index);

    if (!closing) {
      if (VOID.has(name) || selfClosing) continue;
      stack.push({ name, line: p.line, column: p.column, length: whole.length });
      if (RAW_TEXT.has(name)) {
        // pula o conteúdo até o fechamento correspondente
        const end = new RegExp(`</${name}\\s*>`, 'gi');
        end.lastIndex = tagRe.lastIndex;
        const e = end.exec(text);
        if (!e) continue;
        tagRe.lastIndex = e.index;
      }
      continue;
    }

    if (VOID.has(name)) {
      problems.push({
        message: `<${name}> não tem tag de fechamento; remova </${name}>.`,
        ...p,
        endColumn: p.column + whole.length,
        severity: 'warning',
      });
      continue;
    }
    const idx = stack.map((s) => s.name).lastIndexOf(name);
    if (idx === -1) {
      problems.push({
        message: `</${name}> fecha uma tag que não foi aberta.`,
        ...p,
        endColumn: p.column + whole.length,
        severity: 'error',
      });
      continue;
    }
    // tudo que estava aberto depois dela ficou sem fechamento
    for (const open of stack.splice(idx + 1)) {
      if (OPTIONAL_CLOSE.has(open.name)) continue;
      problems.push({
        message: `<${open.name}> foi aberta aqui e não foi fechada antes de </${name}>.`,
        line: open.line,
        column: open.column,
        endColumn: open.column + open.length,
        severity: 'error',
      });
    }
    stack.pop();
  }

  for (const open of stack) {
    if (OPTIONAL_CLOSE.has(open.name)) continue;
    problems.push({
      message: `<${open.name}> foi aberta e não foi fechada.`,
      line: open.line,
      column: open.column,
      endColumn: open.column + open.length,
      severity: 'error',
    });
  }
  return problems.sort((a, b) => a.line - b.line || a.column - b.column);
}
