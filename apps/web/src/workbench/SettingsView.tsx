import { useTheme, type ThemePreference } from '../theme/ThemeContext';
import { SHORTCUTS } from './shortcuts';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Seguir o sistema' },
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
];

export function SettingsView() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="view-body">
      <fieldset className="field">
        <legend className="field-label">Tema</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className="radio">
            <input
              type="radio"
              name="theme"
              value={o.value}
              checked={preference === o.value}
              onChange={() => setPreference(o.value)}
            />
            {o.label}
          </label>
        ))}
      </fieldset>
      <section className="field">
        <h3 className="field-label">Atalhos de teclado</h3>
        <dl className="shortcut-list">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="shortcut-row">
              <dt>
                <kbd>{s.keys}</kbd>
              </dt>
              <dd>{s.description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
