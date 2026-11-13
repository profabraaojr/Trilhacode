import { X } from 'lucide-react';
import { UnitView } from '../learning/UnitView';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';

interface Props {
  onClose?: () => void;
  /** Abre a lista de trilhas (barra lateral no computador, menu no celular). */
  onShowTracks?: () => void;
}

/** Painel com a unidade de aprendizagem aberta. */
export function ContentPane({ onClose, onShowTracks }: Props) {
  const { learning } = useStores();
  const unit = useStore(learning, (s) => s.unit);

  return (
    <aside className="content-pane" aria-label="Conteúdo da unidade">
      <header className="pane-header">
        <h2 className="pane-title">Conteúdo da unidade</h2>
        {onClose && (
          <button
            type="button"
            className="icon-button"
            aria-label="Ocultar painel de conteúdo"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </header>
      <div className="pane-scroll">
        {unit.status === 'loading' && <p className="view-message">Carregando a unidade…</p>}
        {unit.status === 'error' && (
          <p className="view-message" role="alert">
            {unit.error}
          </p>
        )}
        {unit.status === 'ready' && unit.data && <UnitView key={unit.data.id} />}
        {unit.status === 'idle' && (
          <div className="view-message">
            <p>Nenhuma unidade aberta.</p>
            <p>Escolha uma trilha e uma unidade para estudar aqui, ao lado do editor.</p>
            {onShowTracks && (
              <button type="button" className="secondary-button" onClick={onShowTracks}>
                Ver trilhas
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
