import {
  checkExplanation,
  OWN_EXPLANATION_MIN,
  POINT_RULES,
  type GlossaryTerm,
  type GlossaryTermInput,
} from '@trilhacode/shared';
import { Check } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useStores } from '../project/ProjectContext';

interface Props {
  /** Termo a editar; sem ele, cria um novo. */
  term?: GlossaryTerm;
  /** Valores iniciais de um termo novo (ex.: termo sugerido na unidade). */
  initial?: Partial<GlossaryTermInput>;
  /** Unidade a que um termo novo fica ligado, com o título para exibição. */
  unit?: { id: string; title: string } | null;
  onDone: (term: GlossaryTerm | null) => void;
}

/** Retorno imediato sobre a explicação; a decisão final (e os pontos) é do servidor. */
function ExplanationFeedback({
  id,
  significado,
  explicacao,
}: {
  id: string;
  significado: string;
  explicacao: string;
}) {
  const check = checkExplanation(significado, explicacao);
  if (check.status === 'propria')
    return (
      <p id={id} className="explanation-check explanation-ok">
        <Check size={13} aria-hidden="true" /> Explicação com as suas palavras.
      </p>
    );
  const text =
    check.status === 'vazia'
      ? `Escreva o que você entendeu, com as suas palavras (mínimo de ${OWN_EXPLANATION_MIN} caracteres). É esta explicação que conta pontos.`
      : check.status === 'curta'
        ? `Faltam ${check.faltam} caracteres para a explicação contar pontos.`
        : `A explicação está muito parecida com o significado pesquisado (${Math.round(check.semelhanca * 100)}% dos trechos iguais). Reescreva com as suas palavras: o termo fica salvo, mas só conta pontos depois disso.`;
  return (
    <p
      id={id}
      className={`explanation-check ${check.status === 'copia' ? 'explanation-warn' : ''}`}
    >
      {text}
    </p>
  );
}

export function TermForm({ term, initial, unit, onDone }: Props) {
  const { glossary } = useStores();
  const uid = useId();
  const [termo, setTermo] = useState(term?.termo ?? initial?.termo ?? '');
  const [significado, setSignificado] = useState(term?.significado ?? initial?.significado ?? '');
  const [explicacao, setExplicacao] = useState(term?.explicacao ?? initial?.explicacao ?? '');
  const [exemplo, setExemplo] = useState(term?.exemplo ?? initial?.exemplo ?? '');
  const linked = term
    ? term.unitId
      ? { id: term.unitId, title: term.unidade ?? term.unitId }
      : null
    : (unit ?? null);
  const [keepUnit, setKeepUnit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const unitId = linked && keepUnit ? linked.id : null;
      const saved = await glossary.save(
        { termo, significado, explicacao, exemplo, unitId },
        term?.id,
        unitId ? linked!.title : null,
      );
      onDone(saved);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form
      className="term-form"
      onSubmit={(e) => void submit(e)}
      aria-label={term ? `Editar ${term.termo}` : 'Novo termo'}
    >
      <div className="form-field">
        <label htmlFor={`${uid}-termo`}>Palavra ou expressão</label>
        <input
          id={`${uid}-termo`}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          required
          maxLength={120}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${uid}-sig`}>Significado pesquisado</label>
        <textarea
          id={`${uid}-sig`}
          rows={3}
          value={significado}
          onChange={(e) => setSignificado(e.target.value)}
          aria-describedby={`${uid}-sig-hint`}
        />
        <span id={`${uid}-sig-hint`} className="form-hint">
          O que você encontrou na pesquisa (documentação, livro, professor). Anote a fonte, se
          puder.
        </span>
      </div>
      <div className="form-field">
        <label htmlFor={`${uid}-exp`}>Explicação com as suas palavras</label>
        <textarea
          id={`${uid}-exp`}
          rows={3}
          value={explicacao}
          onChange={(e) => setExplicacao(e.target.value)}
          aria-describedby={`${uid}-exp-check`}
        />
        <ExplanationFeedback
          id={`${uid}-exp-check`}
          significado={significado}
          explicacao={explicacao}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${uid}-ex`}>Exemplo de utilização</label>
        <textarea
          id={`${uid}-ex`}
          rows={2}
          className="code-input"
          value={exemplo}
          onChange={(e) => setExemplo(e.target.value)}
        />
      </div>
      {linked && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={keepUnit}
            onChange={(e) => setKeepUnit(e.target.checked)}
          />
          Ligado à unidade “{linked.title}”
        </label>
      )}
      <p className="form-hint">
        Termos ligados a uma unidade e com explicação própria valem {POINT_RULES.glossario} pontos
        (até {POINT_RULES.glossarioPorUnidade} termos por unidade).
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="row-actions">
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar termo'}
        </button>
        <button type="button" className="text-button" onClick={() => onDone(null)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
