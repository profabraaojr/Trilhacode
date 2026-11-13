/** Execução dos testes de desafio dentro da página do aluno. */
import { TEST_TIMEOUT_MS, type ProjectFile, type TestResult, type TestSpec } from '../protocol.js';

class TestFailure extends Error {}

export async function runChallengeTests(
  tests: TestSpec[],
  files: ProjectFile[],
  win: Window = window,
): Promise<TestResult[]> {
  const arquivos = Object.freeze(Object.fromEntries(files.map((f) => [f.name, f.content])));
  const verificar = (condicao: unknown, mensagem: string) => {
    if (!condicao) throw new TestFailure(mensagem);
  };
  const estilo = (elemento: Element | null, propriedade: string) => {
    if (!elemento) throw new TestFailure('Não encontrei o elemento para verificar o estilo.');
    return win.getComputedStyle(elemento).getPropertyValue(propriedade).trim();
  };

  const results: TestResult[] = [];
  for (const test of tests) {
    try {
      const fn = new Function(
        'verificar',
        'estilo',
        'arquivos',
        'document',
        `"use strict"; return (async () => {\n${test.codigo}\n})();`,
      ) as (...a: unknown[]) => Promise<void>;
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        fn(verificar, estilo, arquivos, win.document),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new TestFailure('A verificação demorou demais para terminar.')),
            TEST_TIMEOUT_MS,
          );
        }),
      ]).finally(() => clearTimeout(timer));
      results.push({ descricao: test.descricao, ok: true });
    } catch (e) {
      const mensagem =
        e instanceof TestFailure
          ? e.message
          : `Não foi possível verificar este item (${(e as Error)?.message ?? String(e)}).`;
      results.push({ descricao: test.descricao, ok: false, mensagem });
    }
  }
  return results;
}
