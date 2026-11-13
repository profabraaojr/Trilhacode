import { checkExplanation, type GlossaryTerm, type GlossaryTermInput } from '@trilhacode/shared';
import type { AccountStore } from '../account/accountStore';
import { glossaryApi } from '../api/client';
import { Store } from '../lib/store';
import type { RecordStorage } from '../project/storage';

export const GLOSSARY_KEY = 'glossario:local';

export interface GlossaryState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  terms: GlossaryTerm[];
  error?: string;
}

const byTerm = (a: GlossaryTerm, b: GlossaryTerm) =>
  a.termo.localeCompare(b.termo, 'pt-BR', { sensitivity: 'base' });

const isTermList = (v: unknown): v is GlossaryTerm[] =>
  Array.isArray(v) && v.every((t) => typeof t === 'object' && t && typeof t.termo === 'string');

const toInput = (t: GlossaryTerm): GlossaryTermInput => ({
  termo: t.termo,
  significado: t.significado,
  explicacao: t.explicacao,
  exemplo: t.exemplo,
  unitId: t.unitId,
});

/**
 * Meu Glossário. Com login, os termos ficam na conta (a verificação da explicação
 * própria e os pontos são decididos no servidor). Sem login, ficam no navegador e
 * são importados para a conta no primeiro login, como o progresso.
 */
export class GlossaryStore extends Store<GlossaryState> {
  private storage: RecordStorage | null = null;
  /** De onde vêm os termos em memória (evita misturar os da conta com os locais). */
  private source: 'local' | 'account' | null = null;

  constructor(private readonly account: AccountStore) {
    super({ status: 'idle', terms: [] });
    let last = account.getState().status;
    account.subscribe(() => {
      const status = account.getState().status;
      if (status === last) return;
      last = status;
      if (status === 'signed-in' || status === 'anonymous') void this.load();
    });
  }

  private signedIn() {
    return this.account.getState().status === 'signed-in';
  }

  async init(storage: RecordStorage) {
    this.storage = storage;
    await this.load();
  }

  private async readLocal(): Promise<GlossaryTerm[]> {
    try {
      const v = await this.storage?.get(GLOSSARY_KEY);
      return isTermList(v) ? v : [];
    } catch {
      return [];
    }
  }

  private async writeLocal(terms: GlossaryTerm[]) {
    await this.storage?.set(GLOSSARY_KEY, terms).catch(() => undefined);
  }

  async load() {
    this.setState({ status: 'loading', error: undefined });
    try {
      if (this.signedIn()) {
        const local = await this.readLocal();
        let terms: GlossaryTerm[];
        if (local.length) {
          terms = await glossaryApi.importTerms(local.map(toInput));
          await this.writeLocal([]);
        } else {
          terms = await glossaryApi.list();
        }
        if (!Array.isArray(terms)) throw new Error('Resposta inesperada do servidor.');
        if (this.signedIn()) {
          this.source = 'account';
          this.setState({ status: 'ready', terms });
        }
      } else {
        // o armazenamento ainda não está pronto: init() carrega em seguida
        if (!this.storage) return this.setState({ status: 'idle' });
        const local = await this.readLocal();
        // termos criados enquanto o carregamento acontecia não se perdem
        const pending =
          this.source === 'local'
            ? this.state.terms.filter((t) => !local.some((l) => l.id === t.id))
            : [];
        const terms = [...local, ...pending].sort(byTerm);
        if (pending.length) await this.writeLocal(terms);
        this.source = 'local';
        if (!this.signedIn()) this.setState({ status: 'ready', terms });
      }
    } catch (e) {
      this.setState({ status: 'error', error: (e as Error).message });
    }
  }

  /** Cria (sem `id`) ou atualiza um termo. `unidade` é o título mostrado sem login. */
  async save(input: GlossaryTermInput, id?: string, unidade: string | null = null) {
    let term: GlossaryTerm;
    if (this.signedIn()) {
      term = id ? await glossaryApi.update(id, input) : await glossaryApi.create(input);
    } else {
      const now = new Date().toISOString();
      const previous = id ? this.state.terms.find((t) => t.id === id) : undefined;
      const significado = input.significado ?? '';
      const explicacao = input.explicacao ?? '';
      term = {
        id: id ?? crypto.randomUUID(),
        termo: input.termo.trim(),
        significado: significado.trim(),
        explicacao: explicacao.trim(),
        exemplo: (input.exemplo ?? '').trim(),
        unitId: input.unitId ?? null,
        unidade: input.unitId ? (unidade ?? previous?.unidade ?? null) : null,
        explicacaoPropria: checkExplanation(significado, explicacao).status === 'propria',
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
    }
    const terms = [...this.state.terms.filter((t) => t.id !== term.id), term].sort(byTerm);
    this.source = this.signedIn() ? 'account' : 'local';
    this.setState({ terms, status: 'ready' });
    if (!this.signedIn()) await this.writeLocal(terms);
    return term;
  }

  async remove(id: string) {
    if (this.signedIn()) await glossaryApi.remove(id);
    const terms = this.state.terms.filter((t) => t.id !== id);
    this.setState({ terms });
    if (!this.signedIn()) await this.writeLocal(terms);
  }
}
