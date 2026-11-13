import { X } from 'lucide-react';
import { ComingSoon } from '../components/ComingSoon';

interface Props {
  onClose?: () => void;
}

/** Painel à direita com a explicação da unidade de aprendizagem. */
export function ContentPane({ onClose }: Props) {
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
        <ComingSoon
          title="Conteúdo da unidade"
          stage={3}
          description="Explicação do conceito, fundamentação, exemplos comentados, desafio e avaliação, em sete etapas, ao lado do editor."
        />
      </div>
    </aside>
  );
}
