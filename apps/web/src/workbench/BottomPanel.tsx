import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ComingSoon } from '../components/ComingSoon';

const TABS = [
  {
    id: 'console',
    label: 'Console',
    description: 'Mensagens de console.log, avisos e erros do seu código, com a linha de origem.',
  },
  {
    id: 'resultado',
    label: 'Resultado',
    description:
      'A página produzida pelo seu HTML, CSS e JavaScript, executada em ambiente isolado.',
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface Props {
  onClose?: () => void;
}

export function BottomPanel({ onClose }: Props) {
  const [active, setActive] = useState<TabId>('console');
  const tab = TABS.find((t) => t.id === active)!;
  return (
    <section className="bottom-panel" aria-label="Painel inferior">
      <header className="pane-header">
        <div role="tablist" aria-label="Painel" className="panel-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`panel-tab-${t.id}`}
              aria-controls={`panel-tabpanel-${t.id}`}
              aria-selected={active === t.id}
              className="panel-tab"
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button
            type="button"
            className="icon-button"
            aria-label="Ocultar painel inferior"
            onClick={onClose}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        )}
      </header>
      <div
        className="pane-scroll"
        role="tabpanel"
        id={`panel-tabpanel-${tab.id}`}
        aria-labelledby={`panel-tab-${tab.id}`}
      >
        <ComingSoon title={tab.label} stage={2} description={tab.description} />
      </div>
    </section>
  );
}
