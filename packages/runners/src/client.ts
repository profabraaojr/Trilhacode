/**
 * Lado da interface: cria o iframe do sandbox, envia os arquivos e recebe
 * o console e os sinais de vida da execução.
 *
 * Cada execução usa um iframe novo, descartado na execução seguinte. O iframe tem
 * sandbox="allow-scripts" sem "allow-same-origin": o código do aluno roda em uma
 * origem opaca e não alcança cookies, localStorage nem o DOM da plataforma.
 */
import {
  DEFAULT_RUN_OPTIONS,
  isSandboxMessage,
  type ConsoleEntry,
  type ProjectFile,
  type RunOptions,
  type RunRequest,
  type TestResult,
  type TestSpec,
} from './protocol.js';

export type RunStatus = 'starting' | 'running' | 'finished' | 'stopped' | 'unavailable';

export interface RunHandlers {
  /** Recebe as mensagens em lotes. */
  onConsole: (entries: ConsoleEntry[]) => void;
  onClear: () => void;
  onStatus: (status: RunStatus) => void;
  /** Resultado dos testes de desafio, quando a execução os incluiu. */
  onTests?: (results: TestResult[]) => void;
}

export interface SandboxSessionOptions {
  sandboxUrl: string;
  /** Prazo para o sandbox responder "pronto". */
  readyTimeoutMs?: number;
  /** Sem sinal de vida por este tempo, a execução é encerrada. */
  heartbeatTimeoutMs?: number;
  runOptions?: RunOptions;
}

export const SANDBOX_IFRAME_PERMISSIONS = 'allow-scripts allow-modals allow-forms';

let counter = 0;
const newRunId = () => `${Date.now().toString(36)}-${(++counter).toString(36)}`;

export class SandboxSession {
  private iframe: HTMLIFrameElement | null = null;
  private runId: string | null = null;
  private handlers: RunHandlers | null = null;
  private lastBeat = 0;
  private timers: number[] = [];
  private readonly onMessage = (event: MessageEvent) => this.handleMessage(event);

  constructor(
    private readonly container: HTMLElement,
    private readonly options: SandboxSessionOptions,
  ) {
    window.addEventListener('message', this.onMessage);
  }

  run(files: ProjectFile[], entry: string, handlers: RunHandlers, tests?: TestSpec[]): void {
    this.teardown();
    this.handlers = handlers;
    const runId = newRunId();
    this.runId = runId;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', SANDBOX_IFRAME_PERMISSIONS);
    iframe.setAttribute('title', 'Resultado da execução');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('allow', '');
    iframe.className = 'sandbox-frame';
    iframe.src = this.options.sandboxUrl;
    this.iframe = iframe;

    const request: RunRequest = {
      type: 'tc:run',
      runId,
      entry,
      files: files.map((f) => ({ name: f.name, content: f.content })),
      options: this.options.runOptions ?? DEFAULT_RUN_OPTIONS,
      ...(tests?.length ? { tests } : {}),
    };
    this.pending = request;

    handlers.onClear();
    handlers.onStatus('starting');
    this.container.replaceChildren(iframe);

    this.timers.push(
      window.setTimeout(() => {
        if (this.runId === runId && this.pending) {
          this.pending = null;
          handlers.onConsole([
            {
              level: 'error',
              origin: 'system',
              text: `O ambiente de execução não respondeu (${this.options.sandboxUrl}). Verifique se o sandbox está em funcionamento.`,
            },
          ]);
          handlers.onStatus('unavailable');
        }
      }, this.options.readyTimeoutMs ?? 8000),
    );
  }

  private pending: RunRequest | null = null;

  /** Encerra a execução atual (remove o iframe). */
  stop(reason?: string): void {
    if (!this.runId) return;
    const handlers = this.handlers;
    this.teardown();
    if (reason) handlers?.onConsole([{ level: 'error', origin: 'system', text: reason }]);
    handlers?.onStatus('stopped');
  }

  dispose(): void {
    this.teardown();
    window.removeEventListener('message', this.onMessage);
  }

  private teardown() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
    this.iframe?.remove();
    this.iframe = null;
    this.runId = null;
    this.pending = null;
    this.handlers = null;
  }

  private startWatchdog(runId: string) {
    const limit = this.options.heartbeatTimeoutMs ?? 4000;
    this.lastBeat = Date.now();
    const tick = () => {
      if (this.runId !== runId) return;
      if (Date.now() - this.lastBeat > limit) {
        this.stop(
          `Execução interrompida: a página do resultado parou de responder por mais de ${limit / 1000} s.`,
        );
        return;
      }
      this.timers.push(window.setTimeout(tick, 1000));
    };
    this.timers.push(window.setTimeout(tick, 1000));
  }

  private handleMessage(event: MessageEvent) {
    // Só aceitamos mensagens do iframe da execução atual. A origem do iframe é opaca
    // ("null"), por isso a verificação é feita pela referência da janela.
    if (!this.iframe || event.source !== this.iframe.contentWindow) return;
    const msg: unknown = event.data;
    if (!isSandboxMessage(msg) || !this.handlers) return;

    if (msg.type === 'tc:ready') {
      if (!this.pending) return;
      this.iframe.contentWindow?.postMessage(this.pending, '*');
      const runId = this.pending.runId;
      this.pending = null;
      this.handlers.onStatus('running');
      this.startWatchdog(runId);
      return;
    }
    if (msg.runId !== this.runId) return;
    this.lastBeat = Date.now();
    switch (msg.type) {
      case 'tc:console':
        this.handlers.onConsole(msg.entries);
        break;
      case 'tc:clear':
        this.handlers.onClear();
        break;
      case 'tc:loaded':
        this.handlers.onStatus('finished');
        break;
      case 'tc:tests':
        this.handlers.onTests?.(msg.results);
        break;
    }
  }
}
