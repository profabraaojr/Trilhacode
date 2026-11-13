import { ArrowLeft, FilePlus, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import { ENTRY_FILE } from '../project/files';
import { useStores } from '../project/ProjectContext';
import { FileIcon } from './FileIcon';

type Editing = { mode: 'create' } | { mode: 'rename'; name: string } | null;

/** Explorador de arquivos do projeto: abrir, criar, renomear e excluir. */
export function FileExplorer({ onOpen }: { onOpen?: () => void }) {
  const { project, learning } = useStores();
  const files = useStore(project, (s) => s.files);
  const label = useStore(project, (s) => s.projectLabel);
  const isDefault = useStore(project, (s) => s.projectKey === 'local:default');
  const active = useStore(project, (s) => s.active);
  const [editing, setEditing] = useState<Editing>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const startCreate = () => {
    setEditing({ mode: 'create' });
    setValue('');
    setError(null);
  };
  const startRename = (name: string) => {
    setEditing({ mode: 'rename', name });
    setValue(name);
    setError(null);
  };
  const cancel = () => {
    setEditing(null);
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const result =
      editing.mode === 'create'
        ? project.createFile(value)
        : project.renameFile(editing.name, value);
    if (result.ok) {
      setEditing(null);
      setError(null);
      if (editing.mode === 'create') onOpen?.();
    } else {
      setError(result.error);
    }
  };

  const remove = (name: string) => {
    if (!window.confirm(`Excluir ${name}? Esta ação não pode ser desfeita.`)) return;
    const r = project.deleteFile(name);
    if (!r.ok) window.alert(r.error);
  };

  const reset = () => {
    const what = isDefault ? 'o projeto de exemplo' : 'os arquivos iniciais desta etapa';
    if (window.confirm(`Restaurar ${what}? Os arquivos atuais deste projeto serão substituídos.`))
      project.resetToInitial();
  };

  const nameForm = (
    <form onSubmit={submit} className="explorer-form">
      <input
        autoFocus
        className="explorer-input"
        aria-label={editing?.mode === 'create' ? 'Nome do novo arquivo' : 'Novo nome do arquivo'}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder="exemplo.js"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => e.key === 'Escape' && cancel()}
        onBlur={() => !value.trim() && cancel()}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
      />
      {error && (
        <p id={errorId} className="explorer-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );

  return (
    <div className="explorer">
      <div className="explorer-toolbar">
        <span className="explorer-project" title={label}>
          {label}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Novo arquivo"
          title="Novo arquivo"
          onClick={startCreate}
        >
          <FilePlus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Restaurar projeto de exemplo"
          title="Restaurar projeto de exemplo"
          onClick={reset}
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      </div>
      {!isDefault && (
        <button
          type="button"
          className="text-button explorer-back"
          onClick={() => void learning.backToMyProject()}
        >
          <ArrowLeft size={14} aria-hidden="true" /> Voltar ao meu projeto
        </button>
      )}
      <ul className="explorer-list" aria-label="Arquivos do projeto">
        {files.map((f) =>
          editing?.mode === 'rename' && editing.name === f.name ? (
            <li key={f.name} className="explorer-editing">
              {nameForm}
            </li>
          ) : (
            <li key={f.name} className="explorer-item" data-active={active === f.name || undefined}>
              <button
                type="button"
                className="explorer-open"
                aria-current={active === f.name ? 'true' : undefined}
                onClick={() => {
                  project.openTab(f.name);
                  onOpen?.();
                }}
              >
                <FileIcon name={f.name} />
                <span className="explorer-name">{f.name}</span>
                {f.name === ENTRY_FILE && <span className="explorer-tag">entrada</span>}
              </button>
              {f.name !== ENTRY_FILE && (
                <span className="explorer-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Renomear ${f.name}`}
                    title="Renomear"
                    onClick={() => startRename(f.name)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Excluir ${f.name}`}
                    title="Excluir"
                    onClick={() => remove(f.name)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </span>
              )}
            </li>
          ),
        )}
        {editing?.mode === 'create' && <li className="explorer-editing">{nameForm}</li>}
      </ul>
      <p className="explorer-hint">
        O {ENTRY_FILE} é a página que roda no resultado. Vincule nele os arquivos CSS e JavaScript.
      </p>
    </div>
  );
}
