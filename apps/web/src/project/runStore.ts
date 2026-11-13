import type { ConsoleEntry, RunStatus } from '@trilhacode/runners';
import { safeStorage } from '../lib/storage';
import { Store } from '../lib/store';

// Acima do limite por execução do sandbox (1000 + folga para erros e avisos da plataforma).
const MAX_ENTRIES = 1200;
const AUTO_RUN_KEY = 'tc:auto-run';

export interface ConsoleItem extends ConsoleEntry {
  id: number;
}

export interface RunState {
  entries: ConsoleItem[];
  /** Mensagens descartadas por excesso (para avisar o aluno). */
  dropped: number;
  status: RunStatus | 'idle';
  /** Cada incremento pede uma nova execução. */
  request: number;
  autoRun: boolean;
}

let nextId = 0;

export class RunStore extends Store<RunState> {
  constructor() {
    super({
      entries: [],
      dropped: 0,
      status: 'idle',
      request: 0,
      autoRun: safeStorage.getItem(AUTO_RUN_KEY) !== 'false',
    });
  }

  requestRun() {
    this.setState({ request: this.state.request + 1 });
  }

  setAutoRun(autoRun: boolean) {
    safeStorage.setItem(AUTO_RUN_KEY, String(autoRun));
    this.setState({ autoRun });
  }

  setStatus(status: RunStatus) {
    this.setState({ status });
  }

  clear() {
    this.setState({ entries: [], dropped: 0 });
  }

  push(...items: ConsoleEntry[]) {
    if (items.length === 0) return;
    const entries = [...this.state.entries, ...items.map((e) => ({ ...e, id: ++nextId }))];
    const overflow = entries.length - MAX_ENTRIES;
    if (overflow > 0) {
      this.setState({ entries: entries.slice(overflow), dropped: this.state.dropped + overflow });
    } else {
      this.setState({ entries });
    }
  }
}
