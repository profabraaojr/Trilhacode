import { Ban, ChevronDown, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import type { ConsoleItem } from '../project/runStore';

const LEVEL_LABEL = {
  log: 'Mensagem',
  info: 'Informação',
  debug: 'Depuração',
  warn: 'Aviso',
  error: 'Erro',
} as const;

function LevelIcon({ level }: { level: ConsoleItem['level'] }) {
  if (level === 'error') return <CircleAlert size={14} aria-hidden="true" />;
  if (level === 'warn') return <TriangleAlert size={14} aria-hidden="true" />;
  if (level === 'info') return <Info size={14} aria-hidden="true" />;
  return <span className="console-bullet" aria-hidden="true" />;
}

interface Props {
  onClose?: () => void;
}

/** Console: mensagens, avisos e erros do código do aluno, com a linha de origem. */
export function ConsolePanel({ onClose }: Props) {
  const { run, editor } = useStores();
  const entries = useStore(run, (s) => s.entries);
  const dropped = useStore(run, (s) => s.dropped);
  const listRef = useRef<HTMLDivElement>(null);
  const errors = entries.filter((e) => e.level === 'error').length;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <section className="bottom-panel" aria-label="Console">
      <header className="pane-header">
        <h2 className="pane-title">
          Console
          {entries.length > 0 && (
            <span
              className="console-count"
              aria-label={`${entries.length} mensagens, ${errors} erros`}
            >
              {entries.length}
            </span>
          )}
        </h2>
        <div className="pane-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Limpar console"
            title="Limpar console"
            onClick={() => run.clear()}
          >
            <Ban size={15} aria-hidden="true" />
          </button>
          {onClose && (
            <button
              type="button"
              className="icon-button"
              aria-label="Ocultar painel inferior"
              onClick={onClose}
            >
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>
      <div
        ref={listRef}
        className="console-list pane-scroll"
        role="log"
        aria-live="polite"
        aria-label="Mensagens do console"
      >
        <ol className="console-items">
          {dropped > 0 && (
            <li className="console-entry console-system">
              {dropped} mensagens antigas foram descartadas para manter o console leve.
            </li>
          )}
          {entries.length === 0 && (
            <li className="console-empty">
              Nenhuma mensagem. Use <code>console.log()</code> no seu JavaScript para escrever aqui.
            </li>
          )}
          {entries.map((e) => (
            <li
              key={e.id}
              className={`console-entry console-${e.level}${e.origin === 'system' ? ' console-system' : ''}`}
            >
              <span className="console-icon">
                <LevelIcon level={e.level} />
                <span className="visually-hidden">{LEVEL_LABEL[e.level]}: </span>
              </span>
              <span className="console-text">
                {e.origin === 'system' && <strong className="console-origin">TrilhaCode: </strong>}
                {e.text}
              </span>
              {e.location && (
                <button
                  type="button"
                  className="console-location"
                  title={`Abrir ${e.location.file} na linha ${e.location.line}`}
                  onClick={() => editor.requestReveal(e.location!.file, e.location!.line)}
                >
                  {e.location.file}:{e.location.line}
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
