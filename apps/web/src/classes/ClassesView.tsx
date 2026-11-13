import type { ClassroomSummary, MyClassroom } from '@trilhacode/shared';
import { CalendarClock, ClipboardList, Map as MapIcon, Plus, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { classroomApi } from '../api/client';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { formatDate, isPast } from './dates';

/** Visão "Turmas" da barra lateral: turmas que o usuário ensina e turmas em que estuda. */
export function ClassesView({ onShowAccount }: { onShowAccount?: () => void }) {
  const { account } = useStores();
  const status = useStore(account, (s) => s.status);
  const role = useStore(account, (s) => s.profile?.role);
  if (status === 'loading') return <p className="view-message">Carregando…</p>;
  if (status !== 'signed-in')
    return (
      <div className="view-message">
        <p>Entre na sua conta para ver suas turmas.</p>
        {onShowAccount && (
          <button type="button" className="secondary-button" onClick={onShowAccount}>
            Entrar
          </button>
        )}
      </div>
    );
  return (
    <div className="classes">
      {(role === 'professor' || role === 'admin') && <TeachingList />}
      <StudyingList />
    </div>
  );
}

function TeachingList() {
  const { classroom, learning } = useStores();
  const revision = useStore(classroom, (s) => s.revision);
  const [list, setList] = useState<ClassroomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [period, setPeriod] = useState('');

  useEffect(() => {
    classroomApi
      .list()
      .then(setList)
      .catch((e: Error) => setError(e.message));
  }, [revision]);

  const open = (c: { id: string; name: string }) => {
    classroom.open({ kind: 'turma', id: c.id, title: c.name });
    learning.requestFocus('codigo');
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { id } = await classroomApi.create({ name, period: period || null });
      setCreating(false);
      setName('');
      setPeriod('');
      classroom.changed();
      open({ id, name });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="classes-section" aria-label="Turmas que ensino">
      <div className="classes-head">
        <h3 className="unit-group-title">Turmas que ensino</h3>
        <button
          type="button"
          className="icon-button"
          aria-label="Nova turma"
          title="Nova turma"
          onClick={() => setCreating((v) => !v)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      {creating && (
        <form className="account-form classes-form" onSubmit={create} aria-label="Nova turma">
          <div className="form-field">
            <label htmlFor="nova-turma-nome">Nome da turma</label>
            <input
              id="nova-turma-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="form-field">
            <label htmlFor="nova-turma-periodo">Período (opcional)</label>
            <input
              id="nova-turma-periodo"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="2026/2"
            />
          </div>
          <button type="submit" className="primary-button">
            Criar turma
          </button>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {list && list.length === 0 && !creating && (
        <p className="view-message">Nenhuma turma ainda. Use + para criar.</p>
      )}
      <ul className="unit-list">
        {list?.map((c) => (
          <li key={c.id}>
            <button type="button" className="unit-link class-link" onClick={() => open(c)}>
              <Users size={16} aria-hidden="true" />
              <span>
                <span className="class-name">{c.name}</span>
                <span className="track-meta">
                  {c.students} aluno(s) · {c.tracks} trilha(s)
                  {c.myRole === 'coprofessor' ? ' · coprofessor' : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudyingList() {
  const { classroom, learning } = useStores();
  const revision = useStore(classroom, (s) => s.revision);
  const [mine, setMine] = useState<MyClassroom[] | null>(null);

  useEffect(() => {
    classroomApi
      .mine()
      .then(setMine)
      .catch(() => setMine([]));
  }, [revision]);

  if (!mine) return null;
  return (
    <section className="classes-section" aria-label="Minhas turmas">
      <h3 className="unit-group-title">Minhas turmas</h3>
      {mine.length === 0 && (
        <p className="view-message">
          Você ainda não está em nenhuma turma. Seu professor pode convidá-lo pelo seu e-mail.
        </p>
      )}
      {mine.map((c) => (
        <article key={c.id} className="my-class">
          <h4 className="class-name">{c.name}</h4>
          <p className="track-meta">Professor(es): {c.teachers.join(', ')}</p>
          {c.assignments.length > 0 && (
            <ul className="my-class-list" aria-label={`Trilhas da turma ${c.name}`}>
              {c.assignments.map((a) => (
                <li key={a.trackId}>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => void learning.openTrack(a.trackId)}
                  >
                    <MapIcon size={14} aria-hidden="true" /> {a.trackTitle}
                  </button>
                  {a.dueDate && (
                    <span className={isPast(a.dueDate) ? 'due due-late' : 'due'}>
                      <CalendarClock size={12} aria-hidden="true" /> até {formatDate(a.dueDate)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {c.assessments.length > 0 && (
            <ul className="my-class-list" aria-label={`Avaliações da turma ${c.name}`}>
              {c.assessments.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      classroom.open({ kind: 'avaliacao', id: a.id, title: a.title });
                      learning.requestFocus('codigo');
                    }}
                  >
                    <ClipboardList size={14} aria-hidden="true" /> {a.title}
                  </button>
                  <span className="due">
                    {a.myBestScore === null ? 'não respondida' : `melhor nota: ${a.myBestScore}%`}
                    {a.dueDate ? ` · até ${formatDate(a.dueDate)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </section>
  );
}
