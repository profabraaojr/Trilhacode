import {
  CircleAlert,
  Moon,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Sun,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { API_STATUS_LABEL, type ApiStatus } from '../api/useApiHealth';
import { useStore } from '../lib/store';
import { LANGUAGE_LABEL, languageFor } from '../project/files';
import { useStores } from '../project/ProjectContext';
import { WELCOME_TAB, type SaveState } from '../project/projectStore';
import { useTheme } from '../theme/ThemeContext';

const SAVE_LABEL: Record<SaveState, string> = {
  loading: 'Carregando projeto…',
  saving: 'Salvando…',
  saved: 'Arquivos salvos no navegador',
  error: 'Erro ao salvar',
  memory: 'Não será salvo (armazenamento indisponível)',
};

export function SaveIndicator() {
  const { project } = useStores();
  const state = useStore(project, (s) => s.saveState);
  return (
    <span className="status-text" data-save={state} title={SAVE_LABEL[state]}>
      {SAVE_LABEL[state]}
    </span>
  );
}

function EditorInfo() {
  const { project, editor } = useStores();
  const active = useStore(project, (s) => s.active);
  const cursor = useStore(editor, (s) => s.cursor);
  const problems = useStore(editor, (s) => s.problems);
  const isFile = active !== null && active !== WELCOME_TAB;
  return (
    <>
      <span
        className="status-text status-problems"
        aria-label={`${problems.errors} erros e ${problems.warnings} avisos no código`}
        title="Problemas encontrados pelo editor"
      >
        <CircleAlert size={13} aria-hidden="true" /> {problems.errors}
        <TriangleAlert size={13} aria-hidden="true" /> {problems.warnings}
      </span>
      {isFile && cursor && (
        <span className="status-text">
          Ln {cursor.line}, Col {cursor.column}
        </span>
      )}
      {isFile && <span className="status-text">{LANGUAGE_LABEL[languageFor(active)]}</span>}
    </>
  );
}

interface Props {
  api: ApiStatus;
  sidebarOpen: boolean;
  panelOpen: boolean;
  contentOpen: boolean;
  onToggleSidebar: () => void;
  onTogglePanel: () => void;
  onToggleContent: () => void;
  onShowAccount: () => void;
}

export function ApiIndicator({ api, compact = false }: { api: ApiStatus; compact?: boolean }) {
  const label = API_STATUS_LABEL[api.state];
  const detail =
    api.state === 'online' || api.state === 'degraded' ? ` (API ${api.health.version})` : '';
  return (
    <span className="api-indicator" data-state={api.state} role="status" title={label + detail}>
      <span className="api-dot" aria-hidden="true" />
      <span className={compact ? 'visually-hidden' : undefined}>{label}</span>
    </span>
  );
}

function AccountIndicator({ onClick }: { onClick: () => void }) {
  const { account } = useStores();
  const status = useStore(account, (s) => s.status);
  const name = useStore(account, (s) => s.profile?.name);
  if (status === 'loading') return null;
  return (
    <button type="button" className="status-button status-account" onClick={onClick} title="Conta">
      <UserRound size={13} aria-hidden="true" />
      <span>{status === 'signed-in' ? name : 'Entrar'}</span>
    </button>
  );
}

export function StatusBar(props: Props) {
  const { resolved, toggle } = useTheme();
  const toggles = [
    {
      open: props.sidebarOpen,
      onClick: props.onToggleSidebar,
      icon: PanelLeft,
      label: 'barra lateral',
    },
    {
      open: props.panelOpen,
      onClick: props.onTogglePanel,
      icon: PanelBottom,
      label: 'painel inferior',
    },
    {
      open: props.contentOpen,
      onClick: props.onToggleContent,
      icon: PanelRight,
      label: 'painel de conteúdo',
    },
  ];
  return (
    <footer className="status-bar" aria-label="Barra de status">
      <div className="status-group">
        <ApiIndicator api={props.api} />
        <AccountIndicator onClick={props.onShowAccount} />
        <SaveIndicator />
        <EditorInfo />
      </div>
      <div className="status-group">
        {toggles.map(({ open, onClick, icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="status-button"
            aria-pressed={open}
            aria-label={`${open ? 'Ocultar' : 'Mostrar'} ${label}`}
            title={`${open ? 'Ocultar' : 'Mostrar'} ${label}`}
            onClick={onClick}
          >
            <Icon size={14} aria-hidden="true" />
          </button>
        ))}
        <button
          type="button"
          className="status-button"
          onClick={toggle}
          aria-label={resolved === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
          title={resolved === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          {resolved === 'dark' ? (
            <Sun size={14} aria-hidden="true" />
          ) : (
            <Moon size={14} aria-hidden="true" />
          )}
        </button>
        <span className="status-text status-version">TrilhaCode 0.6.0</span>
      </div>
    </footer>
  );
}
