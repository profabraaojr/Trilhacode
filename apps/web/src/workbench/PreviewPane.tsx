import { SandboxSession, type RunStatus } from '@trilhacode/runners';
import { Play } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { ENTRY_FILE } from '../project/files';
import { useStores } from '../project/ProjectContext';

export const SANDBOX_URL: string = import.meta.env.VITE_SANDBOX_URL ?? 'http://localhost:5174/';

const STATUS_LABEL: Record<RunStatus | 'idle', string> = {
  idle: 'Aguardando',
  starting: 'Preparando…',
  running: 'Executando…',
  finished: 'Executado',
  stopped: 'Interrompido',
  unavailable: 'Sandbox indisponível',
};

/** Painel "Resultado": executa o projeto no sandbox isolado. */
export function PreviewPane() {
  const { project, run } = useStores();
  const hostRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<SandboxSession | null>(null);
  const request = useStore(run, (s) => s.request);
  const status = useStore(run, (s) => s.status);
  const autoRun = useStore(run, (s) => s.autoRun);
  const loaded = useStore(project, (s) => s.saveState !== 'loading');

  useEffect(() => {
    if (!hostRef.current) return;
    const session = new SandboxSession(hostRef.current, { sandboxUrl: SANDBOX_URL });
    sessionRef.current = session;
    return () => {
      session.dispose();
      sessionRef.current = null;
    };
  }, []);

  // Executa ao montar, a cada pedido de execução e quando o projeto termina de carregar.
  useEffect(() => {
    if (!loaded) return;
    const { files, projectKey } = project.getState();
    const tests = run.takePendingTests();
    sessionRef.current?.run(
      files,
      ENTRY_FILE,
      {
        onConsole: (entries) => run.push(...entries),
        onClear: () => run.clear(),
        onStatus: (s) => {
          run.setStatus(s);
          if (s === 'stopped' || s === 'unavailable') run.testsAborted();
        },
        onTests: (results) => run.setTestResults(projectKey, results),
      },
      tests ?? undefined,
    );
  }, [request, loaded, project, run]);

  return (
    <section className="preview-pane" aria-label="Resultado">
      <header className="pane-header">
        <h2 className="pane-title">Resultado</h2>
        <div className="preview-controls">
          <span className="preview-status" data-status={status} aria-live="polite">
            {STATUS_LABEL[status]}
          </span>
          <label className="toggle" title="Executar automaticamente 1 s depois de parar de digitar">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => run.setAutoRun(e.target.checked)}
            />
            Automático
          </label>
          <button
            type="button"
            className="run-button"
            onClick={() => run.requestRun()}
            title="Executar (Ctrl+Enter)"
            aria-label="Executar"
          >
            <Play size={14} aria-hidden="true" />
            <span className="run-button-label">Executar</span>
          </button>
        </div>
      </header>
      <div ref={hostRef} className="preview-host" />
    </section>
  );
}
