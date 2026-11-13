import { describe, expect, it } from 'vitest';
import { addLoopGuards, createLoopGuardRuntime, InfiniteLoopError } from './loopGuard.js';

/** Executa o código instrumentado com um runtime de guarda e devolve o resultado. */
function run(code: string, limitMs = 50, now?: () => number) {
  // o corpo vira uma função para permitir "return" no código de teste
  const out = addLoopGuards(`(function () {${code}})()`);
  if (!out.ok) throw new Error(out.error.message);
  const __tc = createLoopGuardRuntime(limitMs, now);
  return new Function('__tc', `return ${out.code}`)(__tc);
}

describe('addLoopGuards', () => {
  it('não altera o número de linhas', () => {
    const code = 'let i = 0;\nwhile (i < 3) i++;\nfor (const x of [1]) {\n  i += x;\n}\n';
    const out = addLoopGuards(code);
    expect(out.ok && out.code.split('\n').length).toBe(code.split('\n').length);
  });

  it('preserva o resultado de laços comuns', () => {
    expect(run('let s = 0; for (let i = 1; i <= 10; i++) s += i; return s;')).toBe(55);
    expect(run('let n = 0; do { n++ } while (n < 5); return n;')).toBe(5);
    expect(run('const r = []; for (const k in {a:1,b:2}) r.push(k); return r.join();')).toBe('a,b');
    expect(run('let t = 0; for (const v of [1,2,3]) if (v > 1) t += v; return t;')).toBe(5);
  });

  it('mantém laços sem chaves dentro de if/else', () => {
    expect(run('let a = 0; if (true) while (a < 3) a++; else a = -1; return a;')).toBe(3);
  });

  it('mantém rótulos com break e continue', () => {
    const code = `
      let hits = 0;
      externo: for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (j === 1) continue externo;
          if (i === 2) break externo;
          hits++;
        }
      }
      return hits;`;
    expect(run(code)).toBe(2);
  });

  it('mantém laços aninhados sem chaves', () => {
    expect(
      run('let c = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c++; return c;'),
    ).toBe(9);
  });

  it('interrompe um laço infinito com a linha correta', () => {
    let t = 0;
    const now = () => (t += 10);
    expect(() => run('let x = 1;\n\nwhile (true) {\n  x++;\n}', 50, now)).toThrowError(
      InfiniteLoopError,
    );
    try {
      t = 0;
      run('let x = 1;\n\nwhile (true) {\n  x++;\n}', 50, now);
    } catch (e) {
      expect((e as InfiniteLoopError).line).toBe(3);
      expect((e as Error).message).toContain('linha 3');
    }
  });

  it('informa arquivo e soma o deslocamento de linhas de scripts no HTML', () => {
    const out = addLoopGuards('\nwhile (true) {}', { file: 'index.html', lineOffset: 10 });
    expect(out.ok).toBe(true);
    let t = 0;
    const __tc = createLoopGuardRuntime(50, () => (t += 10));
    try {
      new Function('__tc', out.ok ? out.code : '')(__tc);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(InfiniteLoopError);
      expect((e as InfiniteLoopError).file).toBe('index.html');
      expect((e as InfiniteLoopError).line).toBe(12);
    }
  });

  it('interrompe "for (;;);" sem corpo', () => {
    let t = 0;
    expect(() => run('for (;;);', 50, () => (t += 10))).toThrowError(
      /Laço interrompido na linha 1/,
    );
  });

  it('relata erro de sintaxe com linha e coluna', () => {
    const out = addLoopGuards('let a = 1;\nlet b = ;');
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.line).toBe(2);
      expect(out.error.message).not.toMatch(/\(\d+:\d+\)$/);
    }
  });

  it('aceita sintaxe moderna (async, classes, opcional)', () => {
    const out = addLoopGuards(
      'class A { #x = 1; get x() { return this.#x ?? 0 } }\nconst f = async () => { for await (const v of []) {} };',
    );
    expect(out.ok).toBe(true);
  });
});
