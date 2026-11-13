import { VIEWS, type ViewId } from './views';

interface Props {
  activeView: ViewId;
  sidebarOpen: boolean;
  onSelect: (id: ViewId) => void;
}

/** Barra vertical de ícones à esquerda, como no VS Code. */
export function ActivityBar({ activeView, sidebarOpen, onSelect }: Props) {
  const renderGroup = (placement: 'top' | 'bottom') =>
    VIEWS.filter((v) => v.placement === placement).map((v) => {
      const Icon = v.icon;
      const active = sidebarOpen && activeView === v.id;
      return (
        <li key={v.id}>
          <button
            type="button"
            className="activity-item"
            aria-label={v.label}
            aria-pressed={active}
            title={v.label}
            onClick={() => onSelect(v.id)}
          >
            <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </li>
      );
    });

  return (
    <nav className="activity-bar" aria-label="Barra de atividades">
      <ul>{renderGroup('top')}</ul>
      <ul>{renderGroup('bottom')}</ul>
    </nav>
  );
}
