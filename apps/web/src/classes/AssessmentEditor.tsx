import type { CustomAssessmentInput } from '@trilhacode/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { classroomApi } from '../api/client';

type Alt = { texto: string; correta: boolean; feedback: string };
type Q = { enunciado: string; alternativas: Alt[] };

const emptyQuestion = (): Q => ({
  enunciado: '',
  alternativas: [
    { texto: '', correta: true, feedback: '' },
    { texto: '', correta: false, feedback: '' },
    { texto: '', correta: false, feedback: '' },
  ],
});

/** Editor de avaliação complementar: questões de múltipla escolha com feedback por alternativa. */
export function AssessmentEditor({
  classroomId,
  onCancel,
  onSaved,
}: {
  classroomId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [minScore, setMinScore] = useState(70);
  const [questions, setQuestions] = useState<Q[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateQ = (qi: number, patch: Partial<Q>) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  const updateAlt = (qi: number, ai: number, patch: Partial<Alt>) =>
    updateQ(qi, {
      alternativas: questions[qi]!.alternativas.map((a, i) =>
        i === ai ? { ...a, ...patch } : patch.correta ? { ...a, correta: false } : a,
      ),
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const input: CustomAssessmentInput = {
      title,
      description,
      dueDate: dueDate || null,
      minScore,
      questions,
    };
    try {
      await classroomApi.createAssessment(classroomId, input);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <form className="page-section assessment-editor" onSubmit={submit} aria-label="Nova avaliação">
      <h2 className="track-subheading">Nova avaliação</h2>
      <div className="form-field">
        <label htmlFor="av-titulo">Título</label>
        <input
          id="av-titulo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
        />
      </div>
      <div className="form-field">
        <label htmlFor="av-descricao">Orientações (opcional)</label>
        <textarea
          id="av-descricao"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="inline-form">
        <div className="form-field">
          <label htmlFor="av-prazo">Prazo (opcional)</label>
          <input
            id="av-prazo"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="av-nota">Nota mínima (%)</label>
          <input
            id="av-nota"
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </div>
      </div>

      {questions.map((q, qi) => (
        <fieldset key={qi} className="question">
          <legend className="question-legend">
            <span className="question-kind">Questão {qi + 1}</span>
          </legend>
          <div className="form-field">
            <label htmlFor={`q${qi}-enunciado`}>Enunciado</label>
            <textarea
              id={`q${qi}-enunciado`}
              rows={2}
              value={q.enunciado}
              onChange={(e) => updateQ(qi, { enunciado: e.target.value })}
              required
            />
          </div>
          {q.alternativas.map((a, ai) => (
            <div key={ai} className="alt-editor">
              <label className="radio">
                <input
                  type="radio"
                  name={`q${qi}-correta`}
                  checked={a.correta}
                  onChange={() => updateAlt(qi, ai, { correta: true })}
                />
                Correta
              </label>
              <div className="form-field">
                <label htmlFor={`q${qi}-a${ai}`}>Alternativa {String.fromCharCode(65 + ai)}</label>
                <input
                  id={`q${qi}-a${ai}`}
                  value={a.texto}
                  onChange={(e) => updateAlt(qi, ai, { texto: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor={`q${qi}-f${ai}`}>
                  Feedback da alternativa {String.fromCharCode(65 + ai)}
                </label>
                <input
                  id={`q${qi}-f${ai}`}
                  value={a.feedback}
                  onChange={(e) => updateAlt(qi, ai, { feedback: e.target.value })}
                  placeholder={a.correta ? 'Por que está certa' : 'Por que está errada'}
                  required
                />
              </div>
              {q.alternativas.length > 2 && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover alternativa ${String.fromCharCode(65 + ai)} da questão ${qi + 1}`}
                  onClick={() => {
                    const rest = q.alternativas.filter((_, i) => i !== ai);
                    if (a.correta) rest[0] = { ...rest[0]!, correta: true };
                    updateQ(qi, { alternativas: rest });
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          <div className="step-actions">
            {q.alternativas.length < 6 && (
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  updateQ(qi, {
                    alternativas: [...q.alternativas, { texto: '', correta: false, feedback: '' }],
                  })
                }
              >
                <Plus size={14} aria-hidden="true" /> Alternativa
              </button>
            )}
            {questions.length > 1 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}
              >
                <Trash2 size={14} aria-hidden="true" /> Remover questão
              </button>
            )}
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary-button"
        onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
      >
        <Plus size={15} aria-hidden="true" /> Adicionar questão
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="step-actions">
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar avaliação'}
        </button>
        <button type="button" className="text-button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
