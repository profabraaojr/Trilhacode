/**
 * Protocolo de mensagens entre a interface (app) e o sandbox de execução.
 * Toda mensagem leva o prefixo "tc:" e, quando ligada a uma execução, o runId
 * dela, para que mensagens atrasadas de execuções anteriores sejam descartadas.
 */

export interface ProjectFile {
  /** Nome do arquivo, sem pastas (ex.: "index.html", "style.css"). */
  name: string;
  content: string;
}

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface SourceLocation {
  file: string;
  line: number;
}

export interface ConsoleEntry {
  level: ConsoleLevel;
  text: string;
  location?: SourceLocation;
  /** "user": veio do código do aluno; "system": aviso da plataforma. */
  origin: 'user' | 'system';
}

export interface RunOptions {
  /** Tempo máximo que um laço pode executar sem parar, em milissegundos. */
  loopTimeoutMs: number;
}

export interface RunRequest {
  type: 'tc:run';
  runId: string;
  entry: string;
  files: ProjectFile[];
  options: RunOptions;
}

export type SandboxMessage =
  | { type: 'tc:ready' }
  | { type: 'tc:console'; runId: string; entries: ConsoleEntry[] }
  | { type: 'tc:clear'; runId: string }
  | { type: 'tc:loaded'; runId: string }
  | { type: 'tc:heartbeat'; runId: string };

const SANDBOX_TYPES = new Set(['tc:ready', 'tc:console', 'tc:clear', 'tc:loaded', 'tc:heartbeat']);

export function isSandboxMessage(value: unknown): value is SandboxMessage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== 'string' || !SANDBOX_TYPES.has(v.type)) return false;
  if (v.type === 'tc:ready') return true;
  if (typeof v.runId !== 'string') return false;
  if (v.type === 'tc:console') {
    return (
      Array.isArray(v.entries) &&
      v.entries.every(
        (e: unknown) =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as ConsoleEntry).text === 'string' &&
          typeof (e as ConsoleEntry).level === 'string',
      )
    );
  }
  return true;
}

export function isRunRequest(value: unknown): value is RunRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === 'tc:run' &&
    typeof v.runId === 'string' &&
    typeof v.entry === 'string' &&
    Array.isArray(v.files) &&
    v.files.every(
      (f) =>
        typeof f === 'object' &&
        f !== null &&
        typeof (f as ProjectFile).name === 'string' &&
        typeof (f as ProjectFile).content === 'string',
    )
  );
}

export const DEFAULT_RUN_OPTIONS: RunOptions = { loopTimeoutMs: 1000 };

/** Máximo de mensagens de console por execução (erros têm uma folga extra). */
export const MAX_CONSOLE_ENTRIES = 1000;
export const EXTRA_ERROR_ENTRIES = 100;
/** Mensagens são enviadas em lotes deste tamanho, ou quando a execução fica ociosa. */
export const CONSOLE_BATCH_SIZE = 50;
