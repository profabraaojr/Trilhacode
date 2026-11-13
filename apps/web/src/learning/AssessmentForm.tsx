import { CircleCheck, CircleX, RotateCcw, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { Prose } from './Prose';

const KIND_LABEL = {
  conceitual: 'Conceito',
  'leitura-de-codigo': 'Leitura de código',
  'resolucao-de-problema': 'Resolução de problema',
} as const;

export function AssessmentForm() {
  const { learning } = useStores();
  const unit = useStore(learning, (s) => s.unit.data)!;
  const assessment = useStore(learning, (s) => s.assessment);
  const progress = useStore(learning, (s) => s.progress.units[unit.id]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const etapa = unit.conteudo.etapas.avaliacao;
  const result = assessment.result;
  const feedback = new Map(result?.questoes.map((q) => [q.id, q]));
  const answered = Object.keys(answers).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void learning.submitAssessment(answers);
  };

  const retry = () => {
    setAnswers({});
    learning.setStep('avaliacao');
  };

  return (
    <form onSubmit={submit} className="assessment">
      <p className="step-note">
        {etapa.questoes.length} questões. Nota mínima para concluir: {etapa.notaMinima}%.
        {progress?.attempts
          ? ` Tentativas: ${progress.attempts}. Melhor nota: ${progress.bestScore ?? 0}%.`
          : ''}
      </p>
      {etapa.questoes.map((q, qi) => {
        const fb = feedback.get(q.id);
        return (
          <fieldset
            key={q.id}
            className="question"
            data-result={fb ? (fb.correta ? 'certa' : 'errada') : undefined}
          >
            <legend className="question-legend">
              <span className="question-kind">
                Questão {qi + 1} · {KIND_LABEL[q.tipo]}
              </span>
            </legend>
            <Prose html={q.enunciadoHtml} />
            {q.codigo && (
              <pre className="question-code">
                <code className={`language-${q.codigo.linguagem}`}>{q.codigo.conteudo}</code>
              </pre>
            )}
            <div className="alternatives">
              {q.alternativas.map((a) => (
                <label key={a.id} className="alternative">
                  <input
                    type="radio"
                    name={q.id}
                    value={a.id}
                    checked={answers[q.id] === a.id}
                    disabled={!!result || assessment.submitting}
                    onChange={() => setAnswers((s) => ({ ...s, [q.id]: a.id }))}
                  />
                  <span dangerouslySetInnerHTML={{ __html: a.textoHtml }} />
                </label>
              ))}
            </div>
            {fb && (
              <p className="question-feedback" role="note">
                {fb.correta ? (
                  <CircleCheck size={15} aria-hidden="true" />
                ) : (
                  <CircleX size={15} aria-hidden="true" />
                )}
                <span>
                  <strong>{fb.correta ? 'Correta. ' : fb.respondida ? 'Incorreta. ' : ''}</strong>
                  {fb.feedback}
                </span>
              </p>
            )}
          </fieldset>
        );
      })}

      {assessment.error && (
        <p className="step-pending" role="alert">
          {assessment.error}
        </p>
      )}

      {result ? (
        <section className="assessment-result" aria-live="polite">
          <p className={result.aprovado ? 'step-done' : 'step-pending'}>
            Nota: {result.nota}% ({result.acertos} de {result.total}).{' '}
            {result.aprovado
              ? 'Avaliação concluída.'
              : `Para concluir são necessários ${result.notaMinima}%. Leia o feedback de cada questão, revise as etapas da unidade e tente de novo.`}
          </p>
          <button type="button" className="secondary-button" onClick={retry}>
            <RotateCcw size={15} aria-hidden="true" /> Responder novamente
          </button>
        </section>
      ) : (
        <button
          type="submit"
          className="primary-button"
          disabled={assessment.submitting || answered === 0}
        >
          <Send size={15} aria-hidden="true" />{' '}
          {assessment.submitting
            ? 'Enviando…'
            : `Enviar respostas (${answered}/${etapa.questoes.length})`}
        </button>
      )}
    </form>
  );
}
