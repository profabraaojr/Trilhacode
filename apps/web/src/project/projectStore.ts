import { Store } from '../lib/store';
import {
  DEFAULT_FILES,
  ENTRY_FILE,
  templateFor,
  validateFileName,
  type ProjectFile,
} from './files';
import { isValidStoredProject, type RecordStorage } from './storage';

/** Aba especial com a página de boas-vindas. */
export const WELCOME_TAB = 'tc:boas-vindas';

/** Projeto livre do aluno. Unidades usam chaves "unidade:<id>:<etapa>". */
export const DEFAULT_PROJECT = { key: 'local:default', label: 'Meu projeto' } as const;

export type SaveState = 'loading' | 'saved' | 'saving' | 'error' | 'memory';

export interface ProjectState {
  /** Projeto em edição (chave no armazenamento) e nome exibido. */
  projectKey: string;
  projectLabel: string;
  /** Arquivos iniciais do projeto, usados por "Restaurar". */
  initialFiles: ProjectFile[];
  files: ProjectFile[];
  openTabs: string[];
  active: string | null;
  saveState: SaveState;
  /** Aumenta quando o conteúdo muda por fora do editor (ex.: restaurar exemplo). */
  revision: number;
  /** Aumenta quando o usuário abre ou cria um arquivo: o editor vem para o primeiro plano. */
  focusRequest: number;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

const SAVE_DELAY_MS = 400;

export class ProjectStore extends Store<ProjectState> {
  private storage: RecordStorage | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({
      projectKey: DEFAULT_PROJECT.key,
      projectLabel: DEFAULT_PROJECT.label,
      initialFiles: DEFAULT_FILES,
      files: DEFAULT_FILES,
      openTabs: [WELCOME_TAB, 'index.html'],
      active: WELCOME_TAB,
      saveState: 'loading',
      revision: 0,
      focusRequest: 0,
    });
  }

  async init(storage: RecordStorage): Promise<void> {
    this.storage = storage;
    await this.loadInto(DEFAULT_PROJECT.key);
    this.setState({ saveState: storage.persistent ? 'saved' : 'memory' });
  }

  /**
   * Troca o projeto em edição. O atual é gravado antes; o novo é lido do
   * armazenamento ou, na primeira vez, criado com os arquivos iniciais.
   */
  async switchProject(
    key: string,
    label: string,
    initialFiles: ProjectFile[] = DEFAULT_FILES,
  ): Promise<void> {
    if (key === this.state.projectKey) return;
    await this.flush();
    const files = initialFiles.length ? initialFiles : DEFAULT_FILES;
    this.setState({
      projectKey: key,
      projectLabel: label,
      initialFiles: files,
      files,
      openTabs: files.map((f) => f.name),
      active: files[0]?.name ?? null,
      revision: this.state.revision + 1,
    });
    await this.loadInto(key);
  }

  isDefaultProject(): boolean {
    return this.state.projectKey === DEFAULT_PROJECT.key;
  }

  private async loadInto(key: string) {
    let stored: unknown;
    try {
      stored = await this.storage?.get(key);
    } catch {
      stored = undefined;
    }
    if (key !== this.state.projectKey) return; // trocou de novo durante a leitura
    if (isValidStoredProject(stored) && stored.files.some((f) => f.name === ENTRY_FILE)) {
      const names = new Set(stored.files.map((f) => f.name));
      const openTabs = stored.openTabs.filter((t) => t === WELCOME_TAB || names.has(t));
      const active =
        stored.active && openTabs.includes(stored.active) ? stored.active : (openTabs[0] ?? null);
      this.setState({ files: stored.files, openTabs, active, revision: this.state.revision + 1 });
    }
  }

  getFile(name: string): ProjectFile | undefined {
    return this.state.files.find((f) => f.name === name);
  }

  updateContent(name: string, content: string) {
    const files = this.state.files.map((f) => (f.name === name ? { ...f, content } : f));
    this.setState({ files });
    this.scheduleSave();
  }

  createFile(rawName: string): ActionResult {
    const name = rawName.trim();
    const error = validateFileName(
      name,
      this.state.files.map((f) => f.name),
    );
    if (error) return { ok: false, error };
    this.setState({
      files: [...this.state.files, { name, content: templateFor(name) }],
      openTabs: [...this.state.openTabs, name],
      active: name,
      focusRequest: this.state.focusRequest + 1,
    });
    this.scheduleSave();
    return { ok: true };
  }

  renameFile(from: string, rawTo: string): ActionResult {
    const to = rawTo.trim();
    if (from === ENTRY_FILE)
      return { ok: false, error: `${ENTRY_FILE} é o arquivo de entrada e não pode ser renomeado.` };
    if (from === to) return { ok: true };
    const error = validateFileName(
      to,
      this.state.files.map((f) => f.name),
      from,
    );
    if (error) return { ok: false, error };
    this.setState({
      files: this.state.files.map((f) => (f.name === from ? { ...f, name: to } : f)),
      openTabs: this.state.openTabs.map((t) => (t === from ? to : t)),
      active: this.state.active === from ? to : this.state.active,
    });
    this.scheduleSave();
    return { ok: true };
  }

  deleteFile(name: string): ActionResult {
    if (name === ENTRY_FILE)
      return { ok: false, error: `${ENTRY_FILE} é o arquivo de entrada e não pode ser excluído.` };
    if (!this.getFile(name)) return { ok: false, error: `${name} não existe.` };
    const openTabs = this.state.openTabs.filter((t) => t !== name);
    const active = this.state.active === name ? this.neighbourOf(name) : this.state.active;
    this.setState({
      files: this.state.files.filter((f) => f.name !== name),
      openTabs,
      active: active && openTabs.includes(active) ? active : (openTabs.at(-1) ?? null),
    });
    this.scheduleSave();
    return { ok: true };
  }

  openTab(name: string) {
    const openTabs = this.state.openTabs.includes(name)
      ? this.state.openTabs
      : [...this.state.openTabs, name];
    this.setState({ openTabs, active: name, focusRequest: this.state.focusRequest + 1 });
    this.scheduleSave();
  }

  closeTab(name: string) {
    const openTabs = this.state.openTabs.filter((t) => t !== name);
    const active = this.state.active === name ? this.neighbourOf(name) : this.state.active;
    this.setState({
      openTabs,
      active: active && openTabs.includes(active) ? active : (openTabs.at(-1) ?? null),
    });
    this.scheduleSave();
  }

  setActive(name: string) {
    if (this.state.openTabs.includes(name)) {
      this.setState({ active: name });
      this.scheduleSave();
    }
  }

  /** Volta o projeto atual aos arquivos iniciais (o exemplo, ou os arquivos da unidade). */
  resetToInitial() {
    const files = this.state.initialFiles;
    this.setState({
      files,
      openTabs: files.map((f) => f.name),
      active: files[0]?.name ?? null,
      revision: this.state.revision + 1,
    });
    this.scheduleSave();
  }

  /** Grava imediatamente (ao trocar de projeto ou sair da página). */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      await this.save();
    }
  }

  private neighbourOf(name: string): string | null {
    const tabs = this.state.openTabs;
    const i = tabs.indexOf(name);
    return tabs[i + 1] ?? tabs[i - 1] ?? null;
  }

  private scheduleSave() {
    if (!this.storage) return;
    if (this.state.saveState !== 'memory') this.setState({ saveState: 'saving' });
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.save();
    }, SAVE_DELAY_MS);
  }

  private async save() {
    if (!this.storage) return;
    const { files, openTabs, active, projectKey } = this.state;
    try {
      await this.storage.set(projectKey, {
        files,
        openTabs,
        active,
        updatedAt: new Date().toISOString(),
      });
      if (!this.saveTimer)
        this.setState({ saveState: this.storage.persistent ? 'saved' : 'memory' });
    } catch {
      this.setState({ saveState: 'error' });
    }
  }
}
