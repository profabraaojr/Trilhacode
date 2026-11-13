import type { Evolution } from '@trilhacode/shared';
import { useEffect, useState } from 'react';
import { evolutionApi } from '../api/client';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';

/**
 * Indicadores do aluno logado. Recarrega quando o progresso ou o glossário mudam,
 * com um pequeno atraso para juntar mudanças seguidas.
 */
export function useEvolution(): { data: Evolution | null; error: string | null } {
  const { account, learning, glossary } = useStores();
  const signedIn = useStore(account, (s) => s.status === 'signed-in');
  const progress = useStore(learning, (s) => s.progress);
  const terms = useStore(glossary, (s) => s.terms);
  const [data, setData] = useState<Evolution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      evolutionApi
        .get()
        .then((d) => {
          if (cancelled) return;
          setData(d);
          setError(null);
        })
        .catch((e: Error) => !cancelled && setError(e.message));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signedIn, progress, terms]);

  return signedIn ? { data, error } : { data: null, error: null };
}
