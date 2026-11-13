import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Abaixo desta largura a interface usa abas em vez de colunas. */
export const MOBILE_QUERY = '(max-width: 767px)';
/** Entre o celular e esta largura (tablet), o painel de conteúdo começa recolhido. */
export const COMPACT_QUERY = '(max-width: 1199px)';
