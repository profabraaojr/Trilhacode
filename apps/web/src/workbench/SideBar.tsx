import { X } from 'lucide-react';
import { ComingSoon } from '../components/ComingSoon';
import { SettingsView } from './SettingsView';
import { getView, type ViewId } from './views';

interface Props {
  view: ViewId;
  onClose?: () => void;
}

export function SideBar({ view, onClose }: Props) {
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
        {def.stage === undefined ? (
          <SettingsView />
        ) : (
          <ComingSoon title={def.label} stage={def.stage} description={def.description} />
        )}
      </div>
    </aside>
  );
}
