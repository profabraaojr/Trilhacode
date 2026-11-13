import {
  ClipboardList,
  Map as MapIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { WELCOME_TAB } from '../project/projectStore';
import { FileIcon } from './FileIcon';
import { WelcomePage } from './WelcomePage';

const MonacoEditor = lazy(() => import('../editor/MonacoEditor'));
const TrackMap = lazy(() => import('../learning/TrackMap'));
const ClassroomPage = lazy(() => import('../classes/ClassroomPage'));
const StudentAssessmentPage = lazy(() => import('../classes/StudentAssessmentPage'));
const EvolutionPage = lazy(() => import('../evolution/EvolutionPage'));
const PrivacyPage = lazy(() => import('../privacy/PrivacyPage'));

/**
 * Área central: abas de arquivos e editor, além das páginas especiais
 * (mapa da trilha, página da turma, avaliação da turma).
 */
export function EditorArea() {
  const { project, learning, classroom } = useStores();
  const openTabs = useStore(project, (s) => s.openTabs);
  const active = useStore(project, (s) => s.active);
  const mapOpen = useStore(learning, (s) => s.mapOpen);
  const mapActive = useStore(learning, (s) => s.mapActive);
  const trackTitle = useStore(learning, (s) => s.track.data?.titulo);
  const page = useStore(classroom, (s) => s.page);
  const pageActive = useStore(classroom, (s) => s.active);
  const specialActive = mapActive || pageActive;
  const showEditor = !specialActive && active !== null && active !== WELCOME_TAB;
  // O Monaco (vários MB) só é baixado quando o editor aparece pela primeira vez;
  // depois continua montado, para preservar desfazer, cursor e rolagem.
  const [editorNeeded, setEditorNeeded] = useState(showEditor);
  if (showEditor && !editorNeeded) setEditorNeeded(true);

  const selectTab = (tab: string) => {
    learning.setMapActive(false);
    classroom.setActive(false);
    project.setActive(tab);
  };

  const panelLabel = mapActive
    ? 'Mapa da trilha'
    : pageActive && page
      ? page.title
      : active === WELCOME_TAB
        ? 'Boas-vindas'
        : (active ?? 'Nenhum arquivo');

  return (
    <section className="editor-area" aria-label="Área do editor">
      {/* Um tablist só pode conter abas: o botão de fechar fica fora da árvore de
          acessibilidade, e pelo teclado a aba fecha com Delete (aria-keyshortcuts). */}
      <div className="tabs" role="tablist" aria-label="Arquivos abertos">
        {mapOpen && (
          <div className="tab" data-selected={mapActive || undefined}>
            <button
              type="button"
              role="tab"
              aria-selected={mapActive}
              className="tab-label"
              onClick={() => learning.setMapActive(true)}
              aria-keyshortcuts="Delete"
              onKeyDown={(e) => e.key === 'Delete' && learning.closeMap()}
            >
              <MapIcon size={14} aria-hidden="true" />
              Mapa{trackTitle ? ` · ${trackTitle}` : ''}
            </button>
            <button
              type="button"
              className="tab-close"
              tabIndex={-1}
              aria-hidden="true"
              aria-label="Fechar mapa"
              title="Fechar"
              onClick={() => learning.closeMap()}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        {page && (
          <div className="tab" data-selected={pageActive || undefined}>
            <button
              type="button"
              role="tab"
              aria-selected={pageActive}
              className="tab-label"
              onClick={() => classroom.setActive(true)}
              aria-keyshortcuts="Delete"
              onKeyDown={(e) => e.key === 'Delete' && classroom.close()}
            >
              {page.kind === 'turma' ? (
                <Users size={14} aria-hidden="true" />
              ) : page.kind === 'avaliacao' ? (
                <ClipboardList size={14} aria-hidden="true" />
              ) : page.kind === 'evolucao' ? (
                <TrendingUp size={14} aria-hidden="true" />
              ) : (
                <ShieldCheck size={14} aria-hidden="true" />
              )}
              {page.kind === 'turma'
                ? `Turma · ${page.title}`
                : page.kind === 'avaliacao'
                  ? `Avaliação · ${page.title}`
                  : page.title}
            </button>
            <button
              type="button"
              className="tab-close"
              tabIndex={-1}
              aria-hidden="true"
              aria-label={`Fechar ${page.title}`}
              title="Fechar"
              onClick={() => classroom.close()}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        {openTabs.map((tab) => {
          const selected = !specialActive && tab === active;
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
                aria-keyshortcuts="Delete"
                onKeyDown={(e) => e.key === 'Delete' && project.closeTab(tab)}
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
                tabIndex={-1}
                aria-hidden="true"
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
      <div className="editor-content" role="tabpanel" aria-label={panelLabel}>
        {mapActive && (
          <Suspense fallback={<p className="editor-loading">Carregando o mapa…</p>}>
            <TrackMap />
          </Suspense>
        )}
        {pageActive && page && (
          <Suspense fallback={<p className="editor-loading">Carregando…</p>}>
            {page.kind === 'turma' ? (
              <ClassroomPage key={page.id} id={page.id} />
            ) : page.kind === 'avaliacao' ? (
              <StudentAssessmentPage key={page.id} id={page.id} />
            ) : page.kind === 'evolucao' ? (
              <EvolutionPage />
            ) : (
              <PrivacyPage />
            )}
          </Suspense>
        )}
        {!specialActive && active === WELCOME_TAB && <WelcomePage />}
        {!specialActive && active === null && (
          <div className="editor-empty">
            <p>Nenhum arquivo aberto.</p>
            <p>Abra um arquivo pelo Explorador.</p>
          </div>
        )}
        {editorNeeded && (
          <Suspense
            fallback={showEditor ? <p className="editor-loading">Carregando o editor…</p> : null}
          >
            <MonacoEditor visible={showEditor} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
