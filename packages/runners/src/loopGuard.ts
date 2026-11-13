/**
 * Proteção contra laços infinitos.
 *
 * Reescreve o código do aluno inserindo uma verificação de tempo em cada laço
 * (for, for...in, for...of, while, do...while). Se um laço passar do limite sem
 * terminar, a verificação lança um erro com a linha do laço, e a página continua
 * respondendo. As inserções nunca adicionam quebras de linha, então os números
 * de linha dos erros continuam batendo com o código que o aluno escreveu.
 *
 *   while (x) faca();
 *   =>  {__tc.s(1,"a.js");while (x) {__tc.c(1,1,"a.js");faca();}}
 */
import { parse, type Node } from 'acorn';
import { ancestor } from 'acorn-walk';

export interface LoopGuardResult {
  code: string;
  loops: number;
}

export interface LoopGuardSyntaxError {
  message: string;
  line: number;
  column: number;
}

export type TransformOutcome =
  ({ ok: true } & LoopGuardResult) | { ok: false; error: LoopGuardSyntaxError };

interface Insertion {
  pos: number;
  text: string;
  closer: boolean;
  depth: number;
}

type LoopNode = Node & {
  body: Node & { type: string };
  loc?: { start: { line: number } };
};

const LOOP_TYPES = [
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
] as const;

export interface LoopGuardOptions {
  guard?: string;
  module?: boolean;
  /** Nome do arquivo, informado no erro de laço infinito. */
  file?: string;
  /** Linhas antes do início do código (para scripts dentro do HTML). */
  lineOffset?: number;
}

export function addLoopGuards(code: string, options: LoopGuardOptions = {}): TransformOutcome {
  const guard = options.guard ?? '__tc';
  const offset = options.lineOffset ?? 0;
  const fileArg = JSON.stringify(options.file ?? '');
  let ast: Node;
  try {
    ast = parse(code, {
      ecmaVersion: 'latest',
      sourceType: options.module ? 'module' : 'script',
      locations: true,
      allowHashBang: true,
    });
  } catch (err) {
    const e = err as SyntaxError & { loc?: { line: number; column: number } };
    return {
      ok: false,
      error: {
        message: e.message.replace(/\s*\(\d+:\d+\)$/, ''),
        line: (e.loc?.line ?? 1) + offset,
        column: (e.loc?.column ?? 0) + 1,
      },
    };
  }

  const insertions: Insertion[] = [];
  let nextId = 0;

  const visitor = Object.fromEntries(
    LOOP_TYPES.map((type) => [
      type,
      (node: Node, _state: unknown, ancestors: Node[]) => {
        const loop = node as LoopNode;
        const id = ++nextId;
        const line = (loop.loc?.start.line ?? 1) + offset;
        // Um laço com rótulo ("externo: for ...") é envolvido junto com o rótulo,
        // senão "continue externo" deixaria de ser válido.
        let target: Node = loop;
        for (let i = ancestors.length - 2; i >= 0; i--) {
          const a = ancestors[i]!;
          if (a.type === 'LabeledStatement') target = a;
          else break;
        }
        const depth = ancestors.length;
        insertions.push({
          pos: target.start,
          text: `{${guard}.s(${id},${fileArg});`,
          closer: false,
          depth,
        });
        insertions.push({ pos: target.end, text: '}', closer: true, depth });

        const check = `${guard}.c(${id},${line},${fileArg});`;
        const body = loop.body;
        if (body.type === 'BlockStatement') {
          insertions.push({ pos: body.start + 1, text: check, closer: false, depth: depth + 1 });
        } else {
          insertions.push({ pos: body.start, text: `{${check}`, closer: false, depth: depth + 1 });
          insertions.push({ pos: body.end, text: '}', closer: true, depth: depth + 1 });
        }
      },
    ]),
  );

  ancestor(ast, visitor);

  // Na mesma posição: fechamentos antes de aberturas; aberturas de fora para dentro;
  // fechamentos de dentro para fora.
  insertions.sort((a, b) => {
    if (a.pos !== b.pos) return a.pos - b.pos;
    if (a.closer !== b.closer) return a.closer ? -1 : 1;
    return a.closer ? b.depth - a.depth : a.depth - b.depth;
  });

  let out = '';
  let last = 0;
  for (const ins of insertions) {
    out += code.slice(last, ins.pos) + ins.text;
    last = ins.pos;
  }
  out += code.slice(last);
  return { ok: true, code: out, loops: nextId };
}

export class InfiniteLoopError extends Error {
  constructor(
    readonly line: number,
    limitMs: number,
    readonly file: string = '',
  ) {
    super(
      `Laço interrompido na linha ${line}: ficou executando por mais de ${limitMs / 1000} s sem terminar. ` +
        'Verifique se a condição de parada do laço chega a ser atingida.',
    );
    this.name = 'Laço infinito';
  }
}

/** Funções chamadas pelo código instrumentado (s = início do laço, c = verificação). */
export function createLoopGuardRuntime(
  limitMs: number,
  now: () => number = () => performance.now(),
) {
  const starts = new Map<string, number>();
  return {
    s(id: number, file = '') {
      starts.set(`${file}:${id}`, now());
    },
    c(id: number, line: number, file = '') {
      const start = starts.get(`${file}:${id}`);
      if (start !== undefined && now() - start > limitMs) {
        throw new InfiniteLoopError(line, limitMs, file);
      }
    },
  };
}
