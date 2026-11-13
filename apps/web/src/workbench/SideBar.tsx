import { X } from 'lucide-react';
import { ComingSoon } from '../components/ComingSoon';
import { FileExplorer } from './FileExplorer';
import { SettingsView } from './SettingsView';
import { getView, type ViewId } from './views';

interface Props {
  view: ViewId;
  onClose?: () => void;
  /** Chamado ao abrir um arquivo (no celular, volta para a aba Código). */
  onOpenFile?: () => void;
}

export function SideBar({ view, onClose, onOpenFile }: Props) {
  const def = getView(view);
  return (
    <aside className="sidebar" aria-label={def.label}>
      <header className="pane-header">
        <h2 className="pane-title">{def.label}</h2>
        {onClose && (
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar barra lateral"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </header>
      <div className="pane-scroll">
        {view === 'explorador' ? (
          <FileExplorer onOpen={onOpenFile} />
        ) : view === 'configuracoes' ? (
          <SettingsView />
        ) : def.stage === undefined ? null : (
          <ComingSoon title={def.label} stage={def.stage} description={def.description} />
        )}
      </div>
    </aside>
  );
}
