import type { GlossaryTerm } from '@trilhacode/shared';
import { BookOpen, Check, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { TermForm } from './TermForm';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Visão "Meu Glossário" da barra lateral: busca, criação, edição e exclusão de termos. */
export function GlossaryView() {
  const { glossary, account, learning } = useStores();
  const { status, terms, error } = useStore(glossary, (s) => s);
  const signedIn = useStore(account, (s) => s.status === 'signed-in');
  const openUnit = useStore(learning, (s) => s.unit.data);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const q = normalize(query.trim());
  const visible = q
    ? terms.filter((t) =>
        [t.termo, t.significado, t.explicacao, t.exemplo, t.unidade ?? ''].some((f) =>
          normalize(f).includes(q),
        ),
      )
    : terms;
  const own = terms.filter((t) => t.explicacaoPropria).length;

  return (
    <div className="glossary">
      <p className="form-hint">
        {signedIn
          ? 'Os professores das suas turmas podem ler o seu glossário (sem editar).'
          : 'Sem login, os termos ficam só neste navegador e vão para a sua conta quando você entrar.'}
      </p>
      <div className="glossary-toolbar">
        <div className="search-field">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar no glossário"
            placeholder="Buscar termo, significado ou unidade"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Novo termo"
          title="Novo termo"
          aria-expanded={creating}
          onClick={() => setCreating((v) => !v)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      {creating && (
        <TermForm
          unit={openUnit ? { id: openUnit.id, title: openUnit.titulo } : null}
          onDone={() => setCreating(false)}
        />
      )}
      {status === 'loading' && terms.length === 0 && <p className="view-message">Carregando…</p>}
      {status === 'error' && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {status === 'ready' && terms.length === 0 && !creating && (
        <div className="view-message">
          <BookOpen size={20} aria-hidden="true" />
          <p>
            Nenhum termo ainda. Registre palavras e conceitos que você não conhece: na etapa de
            vocabulário de cada unidade ou pelo botão “Novo termo”.
          </p>
        </div>
      )}
      {terms.length > 0 && (
        <p className="glossary-count" aria-live="polite">
          {q
            ? `${visible.length} de ${terms.length} termos`
            : `${terms.length} ${terms.length === 1 ? 'termo' : 'termos'} · ${own} com explicação própria`}
        </p>
      )}
      <ul className="glossary-list" aria-label="Termos do glossário">
        {visible.map((t) => (
          <TermItem key={t.id} term={t} />
        ))}
      </ul>
    </div>
  );
}

function TermItem({ term }: { term: GlossaryTerm }) {
  const { glossary, learning } = useStores();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!window.confirm(`Excluir o termo “${term.termo}” do glossário?`)) return;
    try {
      await glossary.remove(term.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (editing)
    return (
      <li className="glossary-item">
        <TermForm term={term} onDone={() => setEditing(false)} />
      </li>
    );

  return (
    <li className="glossary-item">
      <details>
        <summary>
          <span className="glossary-term">{term.termo}</span>
          {term.explicacaoPropria ? (
            <span className="badge badge-concluida" title="Explicação com as suas palavras">
              <Check size={11} aria-hidden="true" /> própria
            </span>
          ) : (
            <span className="badge badge-soon">sem explicação própria</span>
          )}
        </summary>
        <TermDetails term={term} />
        {term.unitId && (
          <button
            type="button"
            className="unit-link"
            onClick={() => void learning.openUnit(term.unitId!)}
          >
            Unidade: {term.unidade ?? term.unitId}
          </button>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="row-actions">
          <button type="button" className="text-button" onClick={() => setEditing(true)}>
            <Pencil size={13} aria-hidden="true" /> Editar
          </button>
          <button type="button" className="text-button" onClick={() => void remove()}>
            <Trash2 size={13} aria-hidden="true" /> Excluir
          </button>
        </div>
      </details>
    </li>
  );
}

/** Campos de um termo (também usados na leitura pelo professor). */
export function TermDetails({ term }: { term: GlossaryTerm }) {
  return (
    <dl className="term-details">
      <dt>Significado pesquisado</dt>
      <dd>{term.significado || <em>Não preenchido.</em>}</dd>
      <dt>Explicação com as próprias palavras</dt>
      <dd>{term.explicacao || <em>Não preenchida.</em>}</dd>
      <dt>Exemplo de utilização</dt>
      <dd>
        {term.exemplo ? (
          <code className="term-example">{term.exemplo}</code>
        ) : (
          <em>Não preenchido.</em>
        )}
      </dd>
    </dl>
  );
}
