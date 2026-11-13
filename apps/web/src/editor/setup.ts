/**
 * Carrega o Monaco apenas com HTML, CSS e JavaScript (em vez de todas as linguagens),
 * configura os workers locais (nada vem de CDN) e os temas.
 * Este módulo é importado sob demanda, para não pesar no carregamento inicial.
 */
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/css/register.js';
import 'monaco-editor/languages/definitions/html/register.js';
import 'monaco-editor/languages/definitions/javascript/register.js';
import 'monaco-editor/languages/features/css/register.js';
import 'monaco-editor/languages/features/html/register.js';
import { javascriptDefaults } from 'monaco-editor/languages/features/typescript/register.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import CssWorker from 'monaco-editor/languages/features/css/css.worker.js?worker';
import HtmlWorker from 'monaco-editor/languages/features/html/html.worker.js?worker';
import TsWorker from 'monaco-editor/languages/features/typescript/ts.worker.js?worker';
import type * as MonacoTypes from 'monaco-editor';
import { defineThemes } from './themes';

declare global {
  interface Window {
    MonacoEnvironment?: { getWorker(workerId: string, label: string): Worker };
  }
}

self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};

// Erros de sintaxe e de uso evidente no JavaScript (sem exigir tipos).
javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: false,
  noSyntaxValidation: false,
});
javascriptDefaults.setCompilerOptions({
  allowJs: true,
  checkJs: false,
  allowNonTsExtensions: true,
  target: 99, // ESNext
  lib: ['esnext', 'dom', 'dom.iterable'],
});

const api = monaco as unknown as typeof MonacoTypes;
defineThemes(api);

export { api as monaco };
