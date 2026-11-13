import type { CustomAssessmentPublic, CustomAssessmentResult } from '@trilhacode/shared';
import { CircleCheck, CircleX, RotateCcw, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { classroomApi } from '../api/client';
import { useStores } from '../project/ProjectContext';
import { formatDate, isPast } from './dates';

/** Avaliação complementar respondida pelo aluno. */
export default function StudentAssessmentPage({ id }: { id: string }) {
  const { classroom } = useStores();
  const [a, setA] = useState<CustomAssessmentPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CustomAssessmentResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    classroomApi
      .getAssessment(id)
      .then(setA)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <p className="view-message" role="alert">
        {error}
      </p>
    );
  if (!a) return <p className="view-message">Carregando…</p>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await classroomApi.answerAssessment(a.id, answers);
      setResult(r);
      setA({ ...a, myBestScore: Math.max(a.myBestScore ?? 0, r.nota) });
      classroom.changed();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <article className="classroom-page" aria-labelledby="av-titulo">
      <header className="track-header">
        <p className="welcome-kicker">
          Avaliação da turma
          {a.dueDate
            ? ` · prazo ${formatDate(a.dueDate)}${isPast(a.dueDate) ? ' (vencido)' : ''}`
            : ''}
        </p>
        <h1 id="av-titulo" className="track-heading">
          {a.title}
        </h1>
        {a.description && <p className="welcome-text">{a.description}</p>}
        <p className="form-hint">
          {a.questions.length} questão(ões) · nota mínima {a.minScore}%
          {a.myBestScore !== null ? ` · sua melhor nota: ${a.myBestScore}%` : ''}
        </p>
      </header>
      <form className="page-body assessment" onSubmit={submit}>
        {a.questions.map((q, qi) => {
          const fb = result?.questoes[qi];
          return (
            <fieldset
              key={qi}
              className="question"
              data-result={fb ? (fb.correta ? 'certa' : 'errada') : undefined}
            >
              <legend className="question-legend">
                <span className="question-kind">Questão {qi + 1}</span>
              </legend>
              <p className="question-text">{q.enunciado}</p>
              <div className="alternatives">
                {q.alternativas.map((alt, ai) => (
                  <label key={ai} className="alternative">
                    <input
                      type="radio"
                      name={`q${qi}`}
                      checked={answers[String(qi)] === ai}
                      disabled={!!result || busy}
                      onChange={() => setAnswers((s) => ({ ...s, [String(qi)]: ai }))}
                    />
                    <span>{alt}</span>
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
        {result ? (
          <section aria-live="polite">
            <p className={result.aprovado ? 'step-done' : 'step-pending'}>
              Nota: {result.nota}%.{' '}
              {result.aprovado
                ? 'Você atingiu a nota mínima.'
                : `A nota mínima é ${result.minScore}%. Leia o feedback e tente de novo.`}
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
            >
              <RotateCcw size={15} aria-hidden="true" /> Responder novamente
            </button>
          </section>
        ) : (
          <button
            type="submit"
            className="primary-button"
            disabled={busy || Object.keys(answers).length === 0}
          >
            <Send size={15} aria-hidden="true" /> Enviar respostas ({Object.keys(answers).length}/
            {a.questions.length})
          </button>
        )}
      </form>
    </article>
  );
}
