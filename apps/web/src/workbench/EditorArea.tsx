import { Sparkles, X } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { WELCOME_TAB } from '../project/projectStore';
import { FileIcon } from './FileIcon';
import { WelcomePage } from './WelcomePage';

const MonacoEditor = lazy(() => import('../editor/MonacoEditor'));

/** Área central: abas de arquivos e editor (ou a página de boas-vindas). */
export function EditorArea() {
  const { project } = useStores();
  const openTabs = useStore(project, (s) => s.openTabs);
  const active = useStore(project, (s) => s.active);
  const showEditor = active !== null && active !== WELCOME_TAB;

  return (
    <section className="editor-area" aria-label="Área do editor">
      <div className="tabs" role="tablist" aria-label="Arquivos abertos">
        {openTabs.map((tab) => {
          const selected = tab === active;
          const label = tab === WELCOME_TAB ? 'Boas-vindas' : tab;
          return (
            <div key={tab} className="tab" data-selected={selected || undefined}>
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                className="tab-label"
                onClick={() => project.setActive(tab)}
                onAuxClick={(e) => e.button === 1 && project.closeTab(tab)}
              >
                {tab === WELCOME_TAB ? (
                  <Sparkles size={14} aria-hidden="true" />
                ) : (
                  <FileIcon name={tab} />
                )}
                {label}
              </button>
              <button
                type="button"
                className="tab-close"
                aria-label={`Fechar ${label}`}
                title="Fechar"
                onClick={() => project.closeTab(tab)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      <div
        className="editor-content"
        role="tabpanel"
        aria-label={active === WELCOME_TAB ? 'Boas-vindas' : (active ?? 'Nenhum arquivo')}
      >
        {active === WELCOME_TAB && <WelcomePage />}
        {active === null && (
          <div className="editor-empty">
            <p>Nenhum arquivo aberto.</p>
            <p>Abra um arquivo pelo Explorador.</p>
          </div>
        )}
        <Suspense
          fallback={showEditor ? <p className="editor-loading">Carregando o editor…</p> : null}
        >
          <MonacoEditor visible={showEditor} />
        </Suspense>
      </div>
    </section>
  );
}
