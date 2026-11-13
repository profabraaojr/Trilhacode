import { BookText, Code2, Menu, MonitorPlay, Moon, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ApiStatus } from '../api/useApiHealth';
import { useStores } from '../project/ProjectContext';
import { useTheme } from '../theme/ThemeContext';
import { ConsolePanel } from './ConsolePanel';
import { ContentPane } from './ContentPane';
import { EditorArea } from './EditorArea';
import { PreviewPane } from './PreviewPane';
import { SideBar } from './SideBar';
import { ApiIndicator } from './StatusBar';
import { VIEWS, type ViewId } from './views';

type Surface = 'conteudo' | 'codigo' | 'resultado';

const SURFACES = [
  { id: 'conteudo', label: 'Conteúdo', icon: BookText },
  { id: 'codigo', label: 'Código', icon: Code2 },
  { id: 'resultado', label: 'Resultado', icon: MonitorPlay },
] as const;

/** Layout para celular: uma área por vez, alternada por abas na base da tela. */
export function MobileWorkbench({ api }: { api: ApiStatus }) {
  const { resolved, toggle } = useTheme();
  const [surface, setSurface] = useState<Surface>('codigo');
  const { learning, account } = useStores();
  const [view, setView] = useState<ViewId | null>(() =>
    account.getState().urlAction ? 'conta' : null,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const firstItem = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    firstItem.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Pedidos de foco (abrir unidade, abrir experimento, verificar desafio) trocam a aba.
  useEffect(() => {
    let last = learning.getState().focus?.nonce ?? 0;
    return learning.subscribe(() => {
      const f = learning.getState().focus;
      if (!f || f.nonce === last) return;
      last = f.nonce;
      setView(null);
      setSurface(f.area);
    });
  }, [learning]);

  const openView = (id: ViewId) => {
    setView(id);
    setMenuOpen(false);
  };

  return (
    <div className="mobile-workbench">
      <header className="mobile-header">
        <button
          ref={menuButton}
          type="button"
          className="icon-button"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <span className="mobile-brand">TrilhaCode</span>
        <ApiIndicator api={api} compact />
        <button
          type="button"
          className="icon-button"
          onClick={toggle}
          aria-label={resolved === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          {resolved === 'dark' ? (
            <Sun size={18} aria-hidden="true" />
          ) : (
            <Moon size={18} aria-hidden="true" />
          )}
        </button>
      </header>

      <main className="mobile-main">
        {view ? (
          <SideBar
            view={view}
            onClose={() => setView(null)}
            onOpenFile={() => {
              setView(null);
              setSurface('codigo');
            }}
          />
        ) : surface === 'conteudo' ? (
          <ContentPane onShowTracks={() => setView('trilhas')} />
        ) : surface === 'codigo' ? (
          <EditorArea />
        ) : (
          <div className="mobile-result">
            <PreviewPane />
            <ConsolePanel />
          </div>
        )}
      </main>

      <nav className="mobile-tabs" aria-label="Áreas de trabalho">
        {SURFACES.map(({ id, label, icon: Icon }) => {
          const current = !view && surface === id;
          return (
            <button
              key={id}
              type="button"
              className="mobile-tab"
              aria-current={current ? 'page' : undefined}
              onClick={() => {
                setView(null);
                setSurface(id);
              }}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </nav>

      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <div
            id="mobile-menu"
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="pane-header">
              <h2 className="pane-title">Menu</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Fechar menu"
                onClick={() => setMenuOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <ul className="drawer-list">
              {VIEWS.map((v, i) => {
                const Icon = v.icon;
                return (
                  <li key={v.id}>
                    <button
                      ref={i === 0 ? firstItem : undefined}
                      type="button"
                      className="drawer-item"
                      onClick={() => openView(v.id)}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{v.label}</span>
                      {v.stage !== undefined && (
                        <span className="badge badge-soon">Etapa {v.stage}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
