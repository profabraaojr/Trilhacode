import { useEffect } from 'react';
import { useStores } from '../project/ProjectContext';

const DEBOUNCE_MS = 1000;

/** Com "Automático" ligado, executa o projeto 1 s depois que o aluno para de digitar. */
export function useAutoRun() {
  const { project, run } = useStores();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastFiles = project.getState().files;
    const unsubscribe = project.subscribe(() => {
      const { files, saveState } = project.getState();
      if (files === lastFiles || saveState === 'loading') return;
      lastFiles = files;
      if (!run.getState().autoRun) return;
      clearTimeout(timer);
      timer = setTimeout(() => run.requestRun(), DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [project, run]);
}
