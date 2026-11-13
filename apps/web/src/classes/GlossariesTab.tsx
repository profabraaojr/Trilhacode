import type { ClassroomDetail, StudentGlossary } from '@trilhacode/shared';
import { useEffect, useId, useState } from 'react';
import { glossaryApi } from '../api/client';
import { TermDetails } from '../glossary/GlossaryView';

/** Aba "Glossários" da turma: leitura dos termos que cada aluno registrou. */
export function GlossariesTab({ detail }: { detail: ClassroomDetail }) {
  const uid = useId();
  const [chosen, setChosen] = useState('');
  // a lista de alunos pode chegar depois (turma recarregada); sem escolha, vale o primeiro
  const studentId = detail.enrolled.some((s) => s.id === chosen)
    ? chosen
    : (detail.enrolled[0]?.id ?? '');
  const [data, setData] = useState<StudentGlossary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    glossaryApi
      .ofStudent(detail.id, studentId)
      .then((g) => {
        if (cancelled) return;
        setData(g);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [detail.id, studentId]);

  if (detail.enrolled.length === 0)
    return <p className="view-message">Nenhum aluno matriculado ainda.</p>;

  const current = data && data.aluno.id === studentId ? data : null;
  const own = current?.termos.filter((t) => t.explicacaoPropria).length ?? 0;

  return (
    <section aria-label="Glossários dos alunos">
      <p className="form-hint">
        Leitura dos termos registrados no Meu Glossário. Os alunos sabem que os professores das
        turmas podem ler; não é possível editar.
      </p>
      <div className="form-field inline-field">
        <label htmlFor={`${uid}-aluno`}>Aluno</label>
        <select id={`${uid}-aluno`} value={studentId} onChange={(e) => setChosen(e.target.value)}>
          {detail.enrolled.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.email})
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!current && !error && <p className="view-message">Carregando…</p>}
      {current && current.termos.length === 0 && (
        <p className="view-message">{current.aluno.name} ainda não registrou termos.</p>
      )}
      {current && current.termos.length > 0 && (
        <>
          <p className="glossary-count">
            {current.termos.length} termo(s) · {own} com explicação própria
          </p>
          <ul
            className="glossary-list glossary-read"
            aria-label={`Glossário de ${current.aluno.name}`}
          >
            {current.termos.map((t) => (
              <li key={t.id} className="glossary-item">
                <h3 className="glossary-term">
                  {t.termo}
                  {t.explicacaoPropria ? (
                    <span className="badge badge-concluida">explicação própria</span>
                  ) : (
                    <span className="badge badge-soon">sem explicação própria</span>
                  )}
                </h3>
                {t.unidade && <p className="form-hint">Unidade: {t.unidade}</p>}
                <TermDetails term={t} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
