import type * as Monaco from 'monaco-editor';

/** Temas do editor alinhados aos tokens visuais da TrilhaCode (packages/ui/src/tokens.css). */
export function defineThemes(monaco: typeof Monaco) {
  monaco.editor.defineTheme('trilhacode-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8a919c', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c792ea' },
      { token: 'string', foreground: 'a5d6a7' },
      { token: 'number', foreground: 'f9a66c' },
      { token: 'tag', foreground: '5eead4' },
      { token: 'attribute.name', foreground: 'fbbf24' },
      { token: 'attribute.value', foreground: 'a5d6a7' },
    ],
    colors: {
      'editor.background': '#21252c',
      'editor.foreground': '#e6e8eb',
      'editorLineNumber.foreground': '#5c6370',
      'editorLineNumber.activeForeground': '#c4c9d1',
      'editor.lineHighlightBackground': '#2a2f3866',
      'editorCursor.foreground': '#2dd4bf',
      'editor.selectionBackground': '#2dd4bf33',
      'editorIndentGuide.background1': '#2e333b',
      'editorWidget.background': '#1b1e24',
      'editorWidget.border': '#3d434d',
    },
  });
  monaco.editor.defineTheme('trilhacode-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5f6775', fontStyle: 'italic' },
      { token: 'tag', foreground: '0b655e' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1c2027',
      'editorLineNumber.foreground': '#8a919c',
      'editorLineNumber.activeForeground': '#1c2027',
      'editor.lineHighlightBackground': '#f1f3f6',
      'editorCursor.foreground': '#0f766e',
      'editor.selectionBackground': '#0f766e26',
    },
  });
}
