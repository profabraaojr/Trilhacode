import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AccountStore } from '../account/accountStore';
import { ClassroomStore } from '../classes/classroomStore';
import { GlossaryStore } from '../glossary/glossaryStore';
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
  account: AccountStore;
  classroom: ClassroomStore;
  glossary: GlossaryStore;
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
    const account = new AccountStore();
    const learning = new LearningStore(project, run, account);
    const classroom = new ClassroomStore();
    const glossary = new GlossaryStore(account);
    // O mapa da trilha e as páginas de turma disputam o primeiro plano da área central.
    learning.subscribe(() => {
      if (learning.getState().mapActive && classroom.getState().active) classroom.setActive(false);
    });
    // Abrir um arquivo traz o editor para o primeiro plano, à frente do mapa e das páginas.
    let lastFocus = project.getState().focusRequest;
    project.subscribe(() => {
      const f = project.getState().focusRequest;
      if (f === lastFocus) return;
      lastFocus = f;
      learning.setMapActive(false);
      classroom.setActive(false);
    });
    classroom.subscribe(() => {
      if (classroom.getState().active && learning.getState().mapActive)
        learning.setMapActive(false);
    });
    return {
      project,
      run,
      account,
      classroom,
      glossary,
      editor: new EditorStatusStore(),
      learning,
    };
  });

  useEffect(() => {
    let cancelled = false;
    void (storage ?? createBestStorage)().then((s) => {
      if (cancelled) return;
      void stores.project.init(s);
      // a sessão é consultada antes, para o progresso vir da conta quando houver login
      void stores.account.refresh().then(() => {
        void stores.learning.init(s);
        void stores.glossary.init(s);
      });
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
