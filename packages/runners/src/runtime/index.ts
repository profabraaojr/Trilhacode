/**
 * Lado do sandbox: roda dentro do iframe isolado. Recebe os arquivos, monta o
 * documento, instrumenta o console e os erros e devolve tudo à interface.
 */
import { formatArgs } from '../format.js';
import { buildDocument } from '../html.js';
import { addLoopGuards, createLoopGuardRuntime, InfiniteLoopError } from '../loopGuard.js';
import {
  CONSOLE_BATCH_SIZE,
  EXTRA_ERROR_ENTRIES,
  isRunRequest,
  MAX_CONSOLE_ENTRIES,
  type ConsoleEntry,
  type ConsoleLevel,
  type ProjectFile,
  type RunRequest,
  type SandboxMessage,
  type SourceLocation,
} from '../protocol.js';

interface TcGlobal {
  s: (id: number) => void;
  c: (id: number, line: number) => void;
  install: () => void;
}

declare global {
  interface Window {
    __tc?: TcGlobal;
  }
}

const RUNTIME_FRAME = '__tcConsole';

const CONSOLE_METHODS: Record<string, ConsoleLevel> = {
  log: 'log',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
  dir: 'log',
  table: 'log',
  trace: 'log',
};

export function startSandboxRuntime(): void {
  const parentWindow = window.parent;
  if (parentWindow === window) {
    document.body.textContent =
      'Este é o ambiente de execução da TrilhaCode. Ele funciona apenas dentro da plataforma.';
    return;
  }

  const onMessage = (event: MessageEvent) => {
    if (event.source !== parentWindow || !isRunRequest(event.data)) return;
    window.removeEventListener('message', onMessage);
    execute(event.data, parentWindow);
  };
  window.addEventListener('message', onMessage);
  parentWindow.postMessage({ type: 'tc:ready' } satisfies SandboxMessage, '*');
}

function execute(request: RunRequest, parentWindow: Window) {
  const { runId, files, entry, options } = request;
  const post = (msg: SandboxMessage) => parentWindow.postMessage(msg, '*');

  // Mensagens de console vão em lotes e com limite por execução: um laço com
  // console.log poderia gerar dezenas de milhares de mensagens e travar a interface.
  let queue: ConsoleEntry[] = [];
  let accepted = 0;
  let limitReported = false;
  let flushScheduled = false;
  const flush = () => {
    flushScheduled = false;
    if (queue.length === 0) return;
    post({ type: 'tc:console', runId, entries: queue });
    queue = [];
  };
  /** Indica se ainda cabe uma mensagem deste nível (evita trabalho quando não cabe). */
  const hasRoom = (level: ConsoleLevel) =>
    accepted < MAX_CONSOLE_ENTRIES + (level === 'error' ? EXTRA_ERROR_ENTRIES : 0);
  const sendConsole = (entryMsg: ConsoleEntry) => {
    if (!hasRoom(entryMsg.level)) {
      if (!limitReported) {
        limitReported = true;
        queue.push({
          level: 'warn',
          origin: 'system',
          text: `Limite de ${MAX_CONSOLE_ENTRIES} mensagens por execução atingido; as próximas foram omitidas. Um console.log dentro de um laço muito longo costuma causar isso.`,
        });
        flush();
      }
      return;
    }
    accepted++;
    queue.push(entryMsg);
    if (queue.length >= CONSOLE_BATCH_SIZE) flush();
    else if (!flushScheduled) {
      flushScheduled = true;
      setTimeout(flush, 0);
    }
  };

  // Mapa URL gerada -> nome do arquivo, para traduzir a origem dos erros.
  const urlToName = new Map<string, string>();
  const nameToUrl = new Map<string, string>();
  const docUrl = location.href;

  const reportSyntax = (file: string, line: number, message: string) =>
    sendConsole({
      level: 'error',
      origin: 'user',
      text: `Erro de sintaxe: ${message}`,
      location: { file, line },
    });

  const urlFor = (file: ProjectFile): string => {
    const existing = nameToUrl.get(file.name);
    if (existing) return existing;
    let content = file.content;
    let type = 'text/plain';
    if (file.name.endsWith('.css')) type = 'text/css';
    if (file.name.endsWith('.js')) {
      type = 'text/javascript';
      const out = addLoopGuards(content, { file: file.name });
      if (out.ok) content = out.code;
      // Com erro de sintaxe o código segue sem proteção: o navegador recusa e o erro é relatado.
    }
    const url = URL.createObjectURL(new Blob([content], { type }));
    urlToName.set(url, file.name);
    nameToUrl.set(file.name, url);
    return url;
  };

  const transformInline = (code: string, startLine: number) => {
    const out = addLoopGuards(code, { file: entry, lineOffset: startLine - 1 });
    return out.ok ? out.code : code;
  };

  const locate = (
    filename: string | undefined,
    line: number | undefined,
  ): SourceLocation | undefined => {
    if (!filename || !line) return undefined;
    const file =
      urlToName.get(filename) ??
      (filename === docUrl || filename === 'about:srcdoc' ? entry : undefined);
    return file ? { file, line } : undefined;
  };

  /**
   * Encontra, na pilha de chamadas, a primeira linha do código do aluno.
   * Os quadros do próprio runtime são pulados pelo nome __tcConsole (nomes de métodos
   * sobrevivem à minificação, e no build final o runtime fica embutido no documento).
   */
  const callerLocation = (): SourceLocation | undefined => {
    const lines = (new Error().stack ?? '').split('\n');
    const lastOwn = lines.findLastIndex((l) => l.includes(RUNTIME_FRAME));
    for (const raw of lastOwn >= 0 ? lines.slice(lastOwn + 1) : lines) {
      const m = /((?:blob:|https?:)[^\s)]+?):(\d+):\d+\)?\s*$/.exec(raw);
      if (!m) continue;
      const loc = locate(m[1], Number(m[2]));
      if (loc) return loc;
    }
    return undefined;
  };

  const guard = createLoopGuardRuntime(options.loopTimeoutMs);

  const install = () => {
    const original = window.console;
    for (const [method, level] of Object.entries(CONSOLE_METHODS)) {
      const native = (original as unknown as Record<string, (...a: unknown[]) => void>)[method];
      (original as unknown as Record<string, unknown>)[method] = {
        __tcConsole(...args: unknown[]) {
          // Acima do limite, não vale formatar nem ler a pilha: sendConsole só registra o aviso.
          sendConsole(
            hasRoom(level)
              ? { level, origin: 'user', text: formatArgs(args), location: callerLocation() }
              : { level, origin: 'user', text: '' },
          );
          native?.apply(original, args);
        },
      }.__tcConsole;
    }
    const nativeAssert = original.assert;
    original.assert = {
      __tcConsole(condition?: boolean, ...args: unknown[]) {
        if (!condition) {
          sendConsole({
            level: 'error',
            origin: 'user',
            text: `Assertion failed${args.length ? `: ${formatArgs(args)}` : ''}`,
            location: callerLocation(),
          });
        }
        (nativeAssert as (c?: boolean, ...a: unknown[]) => void).call(original, condition, ...args);
      },
    }.__tcConsole;
    const nativeClear = original.clear;
    original.clear = () => {
      queue = [];
      post({ type: 'tc:clear', runId });
      nativeClear.call(original);
    };

    window.addEventListener(
      'error',
      (event) => {
        const target = event.target as (Element & { src?: string; href?: string }) | null;
        if (target && target !== (window as unknown) && target instanceof Element) {
          // Falha ao carregar imagem, script ou folha de estilo.
          const url = target.getAttribute('src') ?? target.getAttribute('href') ?? '';
          sendConsole({
            level: 'error',
            origin: 'user',
            text: `Não foi possível carregar <${target.tagName.toLowerCase()}> "${url}".`,
          });
          return;
        }
        const err = event.error as Error | undefined;
        let location = locate(event.filename, event.lineno);
        let text = event.message.replace(/^Uncaught\s+/, '');
        if (err instanceof InfiniteLoopError) {
          text = err.message;
          location = err.file ? { file: err.file, line: err.line } : location;
        }
        if (err instanceof SyntaxError && location) {
          reportSyntax(location.file, location.line, err.message);
          return;
        }
        sendConsole({ level: 'error', origin: 'user', text, location });
      },
      true,
    );
    window.addEventListener('unhandledrejection', (event) => {
      sendConsole({
        level: 'error',
        origin: 'user',
        text: `Promise rejeitada sem tratamento: ${formatArgs([event.reason])}`,
      });
    });
    window.addEventListener('load', () => post({ type: 'tc:loaded', runId }));
    window.setInterval(() => post({ type: 'tc:heartbeat', runId }), 1000);
  };

  window.__tc = { s: guard.s, c: guard.c, install };

  const { html, warnings } = buildDocument({
    files,
    entry,
    bootstrap: '<script>window.__tc.install()</script>',
    urlFor,
    transformInline,
  });
  for (const w of warnings) sendConsole({ level: 'warn', origin: 'system', text: w });

  document.open();
  document.write(html);
  document.close();
}
