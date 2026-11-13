import { Sparkles } from 'lucide-react';
import { WelcomePage } from './WelcomePage';

/**
 * Área central. Na Etapa 1 contém apenas a aba "Boas-vindas";
 * o editor Monaco e as abas de arquivos chegam na Etapa 2.
 */
export function EditorArea() {
  return (
    <section className="editor-area" aria-label="Área do editor">
      <div className="tabs" role="tablist" aria-label="Arquivos abertos">
        <button
          type="button"
          role="tab"
          aria-selected="true"
          className="tab"
          id="tab-welcome"
          aria-controls="tabpanel-welcome"
        >
          <Sparkles size={14} aria-hidden="true" />
          Boas-vindas
        </button>
      </div>
      <div
        className="editor-content"
        role="tabpanel"
        id="tabpanel-welcome"
        aria-labelledby="tab-welcome"
      >
        <WelcomePage />
      </div>
    </section>
  );
}
