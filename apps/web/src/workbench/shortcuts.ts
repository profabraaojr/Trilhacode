import { useEffect } from 'react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';

export const SHORTCUTS = [
  { keys: `${MOD}+B`, description: 'Mostrar ou ocultar a barra lateral' },
  { keys: `${MOD}+J`, description: 'Mostrar ou ocultar o painel inferior' },
  { keys: `${MOD}+Alt+B`, description: 'Mostrar ou ocultar o painel de conteúdo' },
] as const;

interface Handlers {
  toggleSidebar: () => void;
  togglePanel: () => void;
  toggleContent: () => void;
}

/** Atalhos no padrão do VS Code. */
export function useWorkbenchShortcuts({ toggleSidebar, togglePanel, toggleContent }: Handlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'b' && e.altKey) {
        e.preventDefault();
        toggleContent();
      } else if (key === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (key === 'j' && !e.altKey) {
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar, togglePanel, toggleContent]);
}
