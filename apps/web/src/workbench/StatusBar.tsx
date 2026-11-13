import { Moon, PanelBottom, PanelLeft, PanelRight, Sun } from 'lucide-react';
import { API_STATUS_LABEL, type ApiStatus } from '../api/useApiHealth';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  api: ApiStatus;
  sidebarOpen: boolean;
  panelOpen: boolean;
  contentOpen: boolean;
  onToggleSidebar: () => void;
  onTogglePanel: () => void;
  onToggleContent: () => void;
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
        <span className="status-text">TrilhaCode 0.1.0</span>
      </div>
    </footer>
  );
}
