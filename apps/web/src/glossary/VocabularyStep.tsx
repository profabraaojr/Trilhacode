import type { UnitPayload } from '@trilhacode/content/types';
import { Check, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Prose } from '../learning/Prose';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { TermForm } from './TermForm';

const same = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;

/**
 * Etapa de vocabulário: a unidade sugere termos com pistas de pesquisa (sem a
 * definição pronta) e o aluno registra cada um no Meu Glossário.
 */
export function VocabularyStep({ unit }: { unit: UnitPayload }) {
  const { glossary } = useStores();
  const terms = useStore(glossary, (s) => s.terms);
  const [open, setOpen] = useState<string | null>(null);
  const etapa = unit.conteudo.etapas.vocabulario;
  const mine = terms.filter((t) => t.unitId === unit.id);
  const registered = (termo: string) => mine.find((t) => same(t.termo, termo));
  const extra = mine.filter((t) => !etapa.termos.some((h) => same(h.termo, t.termo)));
  const linked = { id: unit.id, title: unit.titulo };

  return (
    <>
      <Prose html={etapa.html} />
      <h4 className="terms-title">Termos sugeridos para pesquisar</h4>
      <dl className="terms">
        {etapa.termos.map((h) => {
          const term = registered(h.termo);
          const key = `hint:${h.termo}`;
          return (
            <div key={h.termo} className="term">
              <div className="term-head">
                <dt>{h.termo}</dt>
                {term ? (
                  <span
                    className={
                      term.explicacaoPropria ? 'badge badge-concluida' : 'badge badge-soon'
                    }
                  >
                    {term.explicacaoPropria ? (
                      <>
                        <Check size={11} aria-hidden="true" /> registrado
                      </>
                    ) : (
                      'falta a explicação própria'
                    )}
                  </span>
                ) : null}
              </div>
              <dd>Pista: {h.dica}</dd>
              {open === key ? (
                <TermForm
                  term={term}
                  initial={{ termo: h.termo }}
                  unit={linked}
                  onDone={() => setOpen(null)}
                />
              ) : (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setOpen(key)}
                  aria-label={
                    term ? `Editar ${h.termo} no glossário` : `Registrar ${h.termo} no glossário`
                  }
                >
                  {term ? (
                    <Pencil size={13} aria-hidden="true" />
                  ) : (
                    <Plus size={13} aria-hidden="true" />
                  )}
                  {term ? 'Editar no glossário' : 'Registrar no glossário'}
                </button>
              )}
            </div>
          );
        })}
      </dl>

      {extra.length > 0 && (
        <>
          <h4 className="terms-title">Outros termos que você registrou nesta unidade</h4>
          <ul className="glossary-list">
            {extra.map((t) => (
              <li key={t.id} className="glossary-item">
                {open === t.id ? (
                  <TermForm term={t} onDone={() => setOpen(null)} />
                ) : (
                  <button type="button" className="text-button" onClick={() => setOpen(t.id)}>
                    <Pencil size={13} aria-hidden="true" /> {t.termo}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {open === 'novo' ? (
        <TermForm unit={linked} onDone={() => setOpen(null)} />
      ) : (
        <button type="button" className="secondary-button" onClick={() => setOpen('novo')}>
          <Plus size={14} aria-hidden="true" /> Registrar outro termo
        </button>
      )}
      <p className="step-note">
        Pesquise o significado, depois explique com as suas palavras e dê um exemplo. Todos os
        termos ficam no Meu Glossário, na barra de atividades.
      </p>
    </>
  );
}
