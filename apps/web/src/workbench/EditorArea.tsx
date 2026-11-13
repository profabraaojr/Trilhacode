import { Map as MapIcon, Sparkles, X } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { WELCOME_TAB } from '../project/projectStore';
import { FileIcon } from './FileIcon';
import { WelcomePage } from './WelcomePage';

const MonacoEditor = lazy(() => import('../editor/MonacoEditor'));
const TrackMap = lazy(() => import('../learning/TrackMap'));

/** Área central: abas de arquivos e editor (ou a página de boas-vindas). */
export function EditorArea() {
  const { project, learning } = useStores();
  const openTabs = useStore(project, (s) => s.openTabs);
  const active = useStore(project, (s) => s.active);
  const mapOpen = useStore(learning, (s) => s.mapOpen);
  const mapActive = useStore(learning, (s) => s.mapActive);
  const trackTitle = useStore(learning, (s) => s.track.data?.titulo);
  const showEditor = !mapActive && active !== null && active !== WELCOME_TAB;
  const selectTab = (tab: string) => {
    learning.setMapActive(false);
    project.setActive(tab);
  };

  return (
    <section className="editor-area" aria-label="Área do editor">
      <div className="tabs" role="tablist" aria-label="Arquivos abertos">
        {mapOpen && (
          <div className="tab" data-selected={mapActive || undefined}>
            <button
              type="button"
              role="tab"
              aria-selected={mapActive}
              className="tab-label"
              onClick={() => learning.setMapActive(true)}
            >
              <MapIcon size={14} aria-hidden="true" />
              Mapa{trackTitle ? ` · ${trackTitle}` : ''}
            </button>
            <button
              type="button"
              className="tab-close"
              aria-label="Fechar mapa"
              title="Fechar"
              onClick={() => learning.closeMap()}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        {openTabs.map((tab) => {
          const selected = !mapActive && tab === active;
          const label = tab === WELCOME_TAB ? 'Boas-vindas' : tab;
          return (
            <div key={tab} className="tab" data-selected={selected || undefined}>
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                className="tab-label"
                onClick={() => selectTab(tab)}
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
        aria-label={
          mapActive
            ? 'Mapa da trilha'
            : active === WELCOME_TAB
              ? 'Boas-vindas'
              : (active ?? 'Nenhum arquivo')
        }
      >
        {mapActive && (
          <Suspense fallback={<p className="editor-loading">Carregando o mapa…</p>}>
            <TrackMap />
          </Suspense>
        )}
        {!mapActive && active === WELCOME_TAB && <WelcomePage />}
        {!mapActive && active === null && (
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
