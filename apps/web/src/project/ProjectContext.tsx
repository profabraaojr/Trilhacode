import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { LearningStore } from '../learning/learningStore';
import { EditorStatusStore } from './editorStatus';
import { ProjectStore } from './projectStore';
import { RunStore } from './runStore';
import { createBestStorage, type ProjectStorage } from './storage';

interface Stores {
  project: ProjectStore;
  run: RunStore;
  editor: EditorStatusStore;
  learning: LearningStore;
}

const ProjectContext = createContext<Stores | null>(null);

export function ProjectProvider({
  children,
  storage,
}: {
  children: ReactNode;
  /** Permite injetar armazenamento em memória nos testes. */
  storage?: () => Promise<ProjectStorage>;
}) {
  const [stores] = useState<Stores>(() => {
    const project = new ProjectStore();
    const run = new RunStore();
    return {
      project,
      run,
      editor: new EditorStatusStore(),
      learning: new LearningStore(project, run),
    };
  });

  useEffect(() => {
    let cancelled = false;
    void (storage ?? createBestStorage)().then((s) => {
      if (cancelled) return;
      void stores.project.init(s);
      void stores.learning.init(s);
    });
    const onHide = () => void stores.project.flush();
    window.addEventListener('pagehide', onHide);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', onHide);
    };
  }, [stores, storage]);

  return <ProjectContext value={stores}>{children}</ProjectContext>;
}

export function useStores(): Stores {
  const ctx = use(ProjectContext);
  if (!ctx) throw new Error('useStores precisa estar dentro de <ProjectProvider>.');
  return ctx;
}
