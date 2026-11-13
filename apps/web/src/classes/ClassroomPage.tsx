import type { TrackSummary } from '@trilhacode/content/types';
import type { AddStudentResult, ClassroomDashboard, ClassroomDetail } from '@trilhacode/shared';
import { Download, FileSpreadsheet, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { classroomApi, contentApi } from '../api/client';
import { ComingSoon } from '../components/ComingSoon';
import { ProgressBar } from '../learning/StatusIcon';
import { useStores } from '../project/ProjectContext';
import { AssessmentEditor } from './AssessmentEditor';
import { formatDate, formatDateTime, isPast } from './dates';
import { parseStudentFile } from './parseStudents';

type Tab = 'painel' | 'alunos' | 'trilhas' | 'avaliacoes' | 'professores';
const TABS: { id: Tab; label: string }[] = [
  { id: 'painel', label: 'Painel' },
  { id: 'alunos', label: 'Alunos' },
  { id: 'trilhas', label: 'Trilhas' },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'professores', label: 'Professores' },
];

const STATUS_LABEL: Record<AddStudentResult['status'], string> = {
  matriculado: 'Matriculado',
  convidado: 'Convite enviado',
  'ja-na-turma': 'Já estava na turma',
  'ja-convidado': 'Já havia convite',
  invalido: 'Não importado',
};

type Feedback = { kind: 'ok' | 'erro'; text: string } | null;
function Msg({ f }: { f: Feedback }) {
  if (!f) return null;
  return (
    <p
      className={f.kind === 'ok' ? 'form-ok' : 'form-error'}
      role={f.kind === 'erro' ? 'alert' : 'status'}
    >
      {f.text}
    </p>
  );
}

/** Página de uma turma (professores): painel, alunos, trilhas, avaliações e professores. */
export default function ClassroomPage({ id }: { id: string }) {
  const { classroom } = useStores();
  const [tab, setTab] = useState<Tab>('painel');
  const [detail, setDetail] = useState<ClassroomDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cada alteração (aluno adicionado, trilha atribuída...) incrementa a versão e recarrega.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    classroomApi
      .get(id)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        classroom.rename(d.name);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id, classroom, version]);

  const changed = () => {
    setVersion((v) => v + 1);
    classroom.changed();
  };

  if (error)
    return (
      <p className="view-message" role="alert">
        {error}
      </p>
    );
  if (!detail) return <p className="view-message">Carregando a turma…</p>;

  return (
    <article className="classroom-page" aria-labelledby="turma-titulo">
      <header className="track-header">
        <p className="welcome-kicker">
          Turma{detail.period ? ` · ${detail.period}` : ''}
          {detail.institution ? ` · ${detail.institution}` : ''}
        </p>
        <h1 id="turma-titulo" className="track-heading">
          {detail.name}
        </h1>
        <p className="welcome-text">
          {detail.students} aluno(s) · {detail.invitations.length} convite(s) pendente(s) ·{' '}
          {detail.tracks} trilha(s)
        </p>
      </header>
      <div className="page-tabs" role="tablist" aria-label="Seções da turma">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="page-tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="page-body" role="tabpanel">
        {tab === 'painel' && <DashboardTab id={id} />}
        {tab === 'alunos' && <StudentsTab detail={detail} onChange={changed} />}
        {tab === 'trilhas' && <TracksTab detail={detail} onChange={changed} />}
        {tab === 'avaliacoes' && <AssessmentsTab detail={detail} onChange={changed} />}
        {tab === 'professores' && <TeachersTab detail={detail} onChange={changed} />}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ Painel */

function DashboardTab({ id }: { id: string }) {
  const [d, setD] = useState<ClassroomDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    classroomApi
      .dashboard(id)
      .then(setD)
      .catch((e: Error) => setError(e.message));
  }, [id]);
  if (error) return <p className="form-error">{error}</p>;
  if (!d) return <p className="view-message">Calculando…</p>;

  const attention = [...d.units]
    .filter((u) => u.struggling > 0 || (u.averageScore !== null && u.averageScore < 70))
    .sort(
      (a, b) => b.struggling - a.struggling || (a.averageScore ?? 100) - (b.averageScore ?? 100),
    );

  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">{d.overall.students}</span>
          <span className="stat-label">alunos matriculados</span>
        </div>
        <div className="stat">
          <span className="stat-value">{d.overall.progress}%</span>
          <span className="stat-label">progresso médio nas trilhas atribuídas</span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {d.overall.averageScore === null ? '—' : `${d.overall.averageScore}%`}
          </span>
          <span className="stat-label">média nas avaliações das unidades</span>
        </div>
      </div>
      <p>
        <a className="secondary-button" href={classroomApi.reportUrl(id)} download>
          <Download size={15} aria-hidden="true" /> Exportar relatório (CSV)
        </a>
      </p>

      <section aria-labelledby="painel-alunos">
        <h2 id="painel-alunos" className="track-subheading">
          Alunos
        </h2>
        {d.students.length === 0 ? (
          <p className="view-message">
            Nenhum aluno matriculado ainda. Use a aba Alunos para convidar.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  <th scope="col">Progresso</th>
                  <th scope="col">Unidades concluídas</th>
                  <th scope="col">Média</th>
                  {d.assessments.map((a) => (
                    <th key={a.id} scope="col">
                      {a.title}
                    </th>
                  ))}
                  <th scope="col">Última atividade</th>
                  <th scope="col">Prazos</th>
                </tr>
              </thead>
              <tbody>
                {d.students.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">
                      <span className="user-name">{s.name}</span>
                      <span className="form-hint">{s.email}</span>
                    </th>
                    <td className="cell-progress">
                      <ProgressBar value={s.progress} label={`Progresso de ${s.name}`} />
                    </td>
                    <td>{s.unitsCompleted}</td>
                    <td>{s.averageScore === null ? '—' : `${s.averageScore}%`}</td>
                    {d.assessments.map((a) => (
                      <td key={a.id}>
                        {s.customScores[a.id] === null || s.customScores[a.id] === undefined
                          ? '—'
                          : `${s.customScores[a.id]}%`}
                      </td>
                    ))}
                    <td>{s.lastActivity ? formatDateTime(s.lastActivity) : 'sem atividade'}</td>
                    <td>
                      {s.overdue.length ? (
                        <span className="badge badge-late">Atrasado: {s.overdue.join(', ')}</span>
                      ) : (
                        'em dia'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="painel-unidades">
        <h2 id="painel-unidades" className="track-subheading">
          Unidades que pedem atenção
        </h2>
        <p className="form-hint">
          Unidades em que alunos tentaram a avaliação e ainda não atingiram a nota mínima, ou em que
          a média está abaixo de 70%.
        </p>
        {attention.length === 0 ? (
          <p className="view-message">Nenhuma unidade com dificuldade registrada até agora.</p>
        ) : (
          <ul className="attention-list">
            {attention.map((u) => (
              <li key={u.id} className="attention-item">
                <span>
                  <span className="user-name">{u.title}</span>
                  <span className="form-hint">{u.trackTitle}</span>
                </span>
                <span className="attention-data">
                  {u.struggling} aluno(s) abaixo da nota mínima · média {u.averageScore ?? '—'}% ·{' '}
                  {u.averageAttempts ?? '—'} tentativa(s) em média
                </span>
              </li>
            ))}
          </ul>
        )}
        <details className="unit-objectives">
          <summary>Todas as unidades</summary>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Unidade</th>
                  <th scope="col">Concluíram</th>
                  <th scope="col">Média</th>
                  <th scope="col">Tentativas (média)</th>
                </tr>
              </thead>
              <tbody>
                {d.units.map((u) => (
                  <tr key={u.id}>
                    <th scope="row">{u.title}</th>
                    <td>{u.completedPct}%</td>
                    <td>{u.averageScore === null ? '—' : `${u.averageScore}%`}</td>
                    <td>{u.averageAttempts ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <ComingSoon
        title="Glossários dos alunos"
        stage={6}
        description="Consulta aos termos que cada aluno registrou no Meu Glossário, com as explicações escritas por ele."
      />
    </>
  );
}

/* ------------------------------------------------------------ Alunos */

function StudentsTab({ detail, onChange }: { detail: ClassroomDetail; onChange: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [results, setResults] = useState<AddStudentResult[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const send = async (
    students: { email: string; name?: string; row?: number }[],
    skipped: number[] = [],
  ) => {
    setBusy(true);
    setFeedback(null);
    try {
      const r = await classroomApi.addStudents(detail.id, students);
      setResults(r);
      const ok = r.filter((x) => x.status === 'matriculado' || x.status === 'convidado').length;
      const bad = r.filter((x) => x.status === 'invalido').length + skipped.length;
      setFeedback({
        kind: bad ? 'erro' : 'ok',
        text: `${ok} aluno(s) matriculado(s) ou convidado(s).${bad ? ` ${bad} linha(s) com problema: veja a tabela.` : ''}${
          skipped.length ? ` Linhas sem e-mail: ${skipped.join(', ')}.` : ''
        }`,
      });
      onChange();
    } catch (e) {
      setFeedback({ kind: 'erro', text: (e as Error).message });
    }
    setBusy(false);
  };

  const addOne = async (e: FormEvent) => {
    e.preventDefault();
    await send([{ email, ...(name.trim() ? { name } : {}) }]);
    setEmail('');
    setName('');
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await parseStudentFile(file);
      if (!parsed.students.length) {
        setFeedback({
          kind: 'erro',
          text: 'Nenhum e-mail encontrado na planilha. Use uma coluna "e-mail" (e, se quiser, "nome").',
        });
        return;
      }
      await send(parsed.students, parsed.skipped);
    } catch (e) {
      setFeedback({ kind: 'erro', text: (e as Error).message });
    }
  };

  return (
    <>
      <section className="page-section">
        <h2 className="track-subheading">Adicionar alunos</h2>
        <p className="form-hint">
          Quem já tem conta entra na turma na hora. Quem ainda não tem recebe um convite por e-mail
          e entra na turma ao criar a conta com esse endereço.
        </p>
        <form className="inline-form" onSubmit={addOne} aria-label="Adicionar aluno">
          <div className="form-field">
            <label htmlFor="aluno-email">E-mail do aluno</label>
            <input
              id="aluno-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="aluno-nome">Nome (opcional)</label>
            <input id="aluno-nome" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="primary-button" disabled={busy}>
            <UserPlus size={15} aria-hidden="true" /> Adicionar
          </button>
        </form>
        <div className="form-field import-field">
          <label htmlFor="aluno-planilha">
            <FileSpreadsheet size={15} aria-hidden="true" /> Importar planilha (.xlsx ou .csv)
          </label>
          <input
            id="aluno-planilha"
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <span className="form-hint">
            Uma coluna "e-mail" e, se quiser, uma coluna "nome". A primeira linha pode ser o
            cabeçalho.
          </span>
        </div>
        <Msg f={feedback} />
        {results && (
          <div className="table-wrap">
            <table className="data-table" aria-label="Resultado da importação">
              <thead>
                <tr>
                  <th scope="col">Linha</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={`${r.email}-${i}`} data-status={r.status}>
                    <td>{r.row ?? '—'}</td>
                    <td>{r.email}</td>
                    <td>
                      {STATUS_LABEL[r.status]}
                      {r.message ? `: ${r.message}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="page-section">
        <h2 className="track-subheading">Matriculados ({detail.enrolled.length})</h2>
        <ul className="user-list">
          {detail.enrolled.map((s) => (
            <li key={s.id} className="user-row">
              <span className="user-info">
                <span className="user-name">{s.name}</span>
                <span className="form-hint">{s.email}</span>
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remover ${s.name} da turma`}
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Remover ${s.name} da turma? O progresso do aluno continua salvo na conta dele.`,
                    )
                  )
                    return;
                  await classroomApi.removeStudent(detail.id, s.id);
                  onChange();
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {detail.invitations.length > 0 && (
        <section className="page-section">
          <h2 className="track-subheading">Convites pendentes ({detail.invitations.length})</h2>
          <ul className="user-list">
            {detail.invitations.map((inv) => (
              <li key={inv.id} className="user-row">
                <span className="user-info">
                  <span className="user-name">{inv.name ?? inv.email}</span>
                  <span className="form-hint">
                    {inv.email} · convidado em {formatDateTime(inv.createdAt)}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Cancelar convite de ${inv.email}`}
                  onClick={async () => {
                    await classroomApi.cancelInvite(detail.id, inv.id);
                    onChange();
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------ Trilhas */

function TracksTab({ detail, onChange }: { detail: ClassroomDetail; onChange: () => void }) {
  const [tracks, setTracks] = useState<TrackSummary[] | null>(null);
  const [trackId, setTrackId] = useState('');
  const [due, setDue] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    contentApi
      .listTracks()
      .then(setTracks)
      .catch((e: Error) => setFeedback({ kind: 'erro', text: e.message }));
  }, []);

  const assigned = new Set(detail.assignments.map((a) => a.trackId));
  const available = (tracks ?? []).filter((t) => !assigned.has(t.id));

  const save = async (id: string, dueDate: string | null) => {
    try {
      await classroomApi.assign(detail.id, { trackId: id, dueDate });
      setFeedback({ kind: 'ok', text: 'Trilha atualizada.' });
      onChange();
    } catch (e) {
      setFeedback({ kind: 'erro', text: (e as Error).message });
    }
  };

  return (
    <>
      <section className="page-section">
        <h2 className="track-subheading">Trilhas atribuídas</h2>
        {detail.assignments.length === 0 && (
          <p className="view-message">Nenhuma trilha atribuída ainda.</p>
        )}
        <ul className="user-list">
          {detail.assignments.map((a) => (
            <li key={a.trackId} className="user-row">
              <span className="user-info">
                <span className="user-name">{a.trackTitle}</span>
                <span className="form-hint">
                  {a.units} unidade(s) ·{' '}
                  {a.dueDate
                    ? `prazo ${formatDate(a.dueDate)}${isPast(a.dueDate) ? ' (vencido)' : ''}`
                    : 'sem prazo'}
                </span>
              </span>
              <span className="row-actions">
                <input
                  type="date"
                  aria-label={`Prazo de ${a.trackTitle}`}
                  defaultValue={a.dueDate ?? ''}
                  onBlur={(e) => {
                    if ((e.target.value || null) !== a.dueDate)
                      void save(a.trackId, e.target.value || null);
                  }}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remover ${a.trackTitle} da turma`}
                  onClick={async () => {
                    await classroomApi.unassign(detail.id, a.trackId);
                    onChange();
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="page-section">
        <h2 className="track-subheading">Atribuir trilha</h2>
        <form
          className="inline-form"
          aria-label="Atribuir trilha"
          onSubmit={(e) => {
            e.preventDefault();
            if (trackId) void save(trackId, due || null).then(() => setTrackId(''));
          }}
        >
          <div className="form-field">
            <label htmlFor="trilha-escolha">Trilha</label>
            <select
              id="trilha-escolha"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              required
            >
              <option value="">Escolha…</option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="trilha-prazo">Prazo (opcional)</label>
            <input
              id="trilha-prazo"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          <button type="submit" className="primary-button">
            Atribuir
          </button>
        </form>
        <Msg f={feedback} />
      </section>
    </>
  );
}

/* ------------------------------------------------------------ Avaliações */

function AssessmentsTab({ detail, onChange }: { detail: ClassroomDetail; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <section className="page-section">
        <h2 className="track-subheading">Avaliações complementares</h2>
        <p className="form-hint">
          Questões de múltipla escolha criadas por você, com feedback para cada alternativa. As
          respostas são corrigidas no servidor, e as notas aparecem no painel e no relatório.
        </p>
        {detail.assessments.length === 0 && !editing && (
          <p className="view-message">Nenhuma avaliação criada.</p>
        )}
        <ul className="user-list">
          {detail.assessments.map((a) => (
            <li key={a.id} className="user-row">
              <span className="user-info">
                <span className="user-name">{a.title}</span>
                <span className="form-hint">
                  {a.questions} questão(ões){a.dueDate ? ` · prazo ${formatDate(a.dueDate)}` : ''}
                </span>
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Excluir avaliação ${a.title}`}
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Excluir "${a.title}"? As respostas dos alunos também serão apagadas.`,
                    )
                  )
                    return;
                  await classroomApi.deleteAssessment(a.id);
                  onChange();
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {!editing && (
          <button type="button" className="primary-button" onClick={() => setEditing(true)}>
            Nova avaliação
          </button>
        )}
      </section>
      {editing && (
        <AssessmentEditor
          classroomId={detail.id}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChange();
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------ Professores */

function TeachersTab({ detail, onChange }: { detail: ClassroomDetail; onChange: () => void }) {
  const { classroom } = useStores();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const owner = detail.myRole === 'responsavel';
  return (
    <section className="page-section">
      <h2 className="track-subheading">Professores</h2>
      <ul className="user-list">
        {detail.teachers.map((t) => (
          <li key={t.id} className="user-row">
            <span className="user-info">
              <span className="user-name">{t.name}</span>
              <span className="form-hint">
                {t.email} · {t.role === 'responsavel' ? 'responsável' : 'coprofessor'}
              </span>
            </span>
            {owner && t.role === 'coprofessor' && (
              <button
                type="button"
                className="icon-button"
                aria-label={`Remover ${t.name} da turma`}
                onClick={async () => {
                  await classroomApi.removeTeacher(detail.id, t.id);
                  onChange();
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {owner ? (
        <form
          className="inline-form"
          aria-label="Adicionar coprofessor"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await classroomApi.addTeacher(detail.id, email);
              setEmail('');
              setFeedback({ kind: 'ok', text: 'Coprofessor adicionado.' });
              onChange();
            } catch (err) {
              setFeedback({ kind: 'erro', text: (err as Error).message });
            }
          }}
        >
          <div className="form-field">
            <label htmlFor="coprof-email">E-mail do coprofessor</label>
            <input
              id="coprof-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="secondary-button">
            Adicionar coprofessor
          </button>
        </form>
      ) : (
        <p className="form-hint">Só o professor responsável adiciona ou remove coprofessores.</p>
      )}
      <Msg f={feedback} />
      {owner && (
        <div className="danger-zone">
          <button
            type="button"
            className="secondary-button"
            onClick={async () => {
              if (
                !window.confirm(
                  `Excluir a turma "${detail.name}"? Matrículas, convites e avaliações da turma serão apagados.`,
                )
              )
                return;
              await classroomApi.remove(detail.id);
              classroom.close();
              classroom.changed();
            }}
          >
            <Trash2 size={15} aria-hidden="true" /> Excluir turma
          </button>
        </div>
      )}
    </section>
  );
}
