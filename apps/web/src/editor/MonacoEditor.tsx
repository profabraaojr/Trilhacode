import type * as Monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { languageFor } from '../project/files';
import { useStores } from '../project/ProjectContext';
import { WELCOME_TAB } from '../project/projectStore';
import { useTheme } from '../theme/ThemeContext';
import { lintHtml } from './htmlLint';
import { monaco } from './setup';

const HTML_MARKER_OWNER = 'trilhacode-html';

const uriFor = (name: string) => monaco.Uri.file(`/${name}`);
const nameOf = (model: Monaco.editor.ITextModel) => model.uri.path.replace(/^\//, '');

/**
 * Editor de código (Monaco). Uma única instância é reaproveitada entre as abas;
 * cada arquivo tem o seu modelo, com histórico de desfazer e posição do cursor próprios.
 */
export default function MonacoEditor({ visible }: { visible: boolean }) {
  const { project, run, editor: status } = useStores();
  const { resolved } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const viewStates = useRef(new Map<string, Monaco.editor.ICodeEditorViewState | null>());
  const lintTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Criação do editor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ed = monaco.editor.create(container, {
      model: null,
      theme:
        document.documentElement.dataset.theme === 'light' ? 'trilhacode-light' : 'trilhacode-dark',
      automaticLayout: true,
      fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
      fontSize: 14,
      lineHeight: 22,
      tabSize: 2,
      minimap: { enabled: false },
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      fixedOverflowWidgets: true,
      padding: { top: 8 },
      renderLineHighlight: 'line',
      ariaLabel: 'Editor de código',
    });
    editorRef.current = ed;

    const lint = (model: Monaco.editor.ITextModel) => {
      if (languageFor(nameOf(model)) !== 'html') return;
      const name = nameOf(model);
      clearTimeout(lintTimers.current.get(name));
      lintTimers.current.set(
        name,
        setTimeout(() => {
          if (model.isDisposed()) return;
          monaco.editor.setModelMarkers(
            model,
            HTML_MARKER_OWNER,
            lintHtml(model.getValue()).map((p) => ({
              message: p.message,
              severity:
                p.severity === 'error'
                  ? monaco.MarkerSeverity.Error
                  : monaco.MarkerSeverity.Warning,
              startLineNumber: p.line,
              startColumn: p.column,
              endLineNumber: p.line,
              endColumn: p.endColumn,
              source: 'TrilhaCode',
            })),
          );
        }, 300),
      );
    };

    const syncModels = () => {
      const { files } = project.getState();
      const names = new Set(files.map((f) => f.name));
      for (const model of monaco.editor.getModels()) {
        if (!names.has(nameOf(model))) {
          viewStates.current.delete(nameOf(model));
          model.dispose();
        }
      }
      for (const f of files) {
        const uri = uriFor(f.name);
        let model = monaco.editor.getModel(uri);
        if (!model) {
          model = monaco.editor.createModel(f.content, languageFor(f.name), uri);
          lint(model);
        } else if (model.getValue() !== f.content) {
          model.setValue(f.content);
        }
      }
    };

    const syncActive = () => {
      const { active } = project.getState();
      const current = ed.getModel();
      const target =
        active && active !== WELCOME_TAB ? monaco.editor.getModel(uriFor(active)) : null;
      if (current === target) return;
      if (current && !current.isDisposed())
        viewStates.current.set(nameOf(current), ed.saveViewState());
      ed.setModel(target);
      if (target) {
        const vs = viewStates.current.get(nameOf(target));
        if (vs) ed.restoreViewState(vs);
      } else {
        status.clearCursor();
      }
    };

    syncModels();
    syncActive();
    const unsubscribe = project.subscribe(() => {
      syncModels();
      syncActive();
    });

    const contentSub = ed.onDidChangeModelContent(() => {
      const model = ed.getModel();
      if (!model) return;
      project.updateContent(nameOf(model), model.getValue());
      lint(model);
    });
    const cursorSub = ed.onDidChangeCursorPosition((e) =>
      status.setCursor(e.position.lineNumber, e.position.column),
    );
    const markerSub = monaco.editor.onDidChangeMarkers(() => {
      let errors = 0;
      let warnings = 0;
      for (const m of monaco.editor.getModelMarkers({})) {
        if (m.severity === monaco.MarkerSeverity.Error) errors++;
        else if (m.severity === monaco.MarkerSeverity.Warning) warnings++;
      }
      status.setProblems(errors, warnings);
    });

    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => run.requestRun());
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void project.flush();
      run.requestRun();
    });

    let lastReveal = status.getState().reveal?.nonce ?? 0;
    const unsubscribeReveal = status.subscribe(() => {
      const r = status.getState().reveal;
      if (!r || r.nonce === lastReveal) return;
      lastReveal = r.nonce;
      project.openTab(r.file);
      syncActive();
      ed.revealLineInCenter(r.line);
      ed.setPosition({ lineNumber: r.line, column: 1 });
      ed.focus();
    });

    const timers = lintTimers.current;
    return () => {
      unsubscribe();
      unsubscribeReveal();
      contentSub.dispose();
      cursorSub.dispose();
      markerSub.dispose();
      timers.forEach((t) => clearTimeout(t));
      ed.dispose();
      editorRef.current = null;
    };
  }, [project, run, status]);

  useEffect(() => {
    monaco.editor.setTheme(resolved === 'light' ? 'trilhacode-light' : 'trilhacode-dark');
  }, [resolved]);

  return (
    <div ref={containerRef} className="monaco-host" hidden={!visible} data-testid="code-editor" />
  );
}
