import { POINT_KIND_LABEL, POINT_KINDS, type ReviewItem } from '@trilhacode/shared';
import {
  BookOpen,
  ClipboardCheck,
  FlaskConical,
  History,
  Map as MapIcon,
  Star,
} from 'lucide-react';
import { ProgressBar } from '../learning/StatusIcon';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { useEvolution } from './useEvolution';

const REVIEW_LABEL: Record<ReviewItem['motivo'], string> = {
  'avaliacao-abaixo': 'Rever a avaliação',
  'desafio-pendente': 'Terminar o desafio',
  'explicacao-pendente': 'Completar o glossário',
};

/** Visão "Minha evolução": indicadores de aprendizagem do próprio aluno. */
export function EvolutionView({ onShowAccount }: { onShowAccount?: () => void }) {
  const { account, learning, classroom } = useStores();
  const status = useStore(account, (s) => s.status);
  const { data, error } = useEvolution();

  if (status === 'loading') return <p className="view-message">Carregando…</p>;
  if (status !== 'signed-in')
    return (
      <div className="view-message">
        <p>
          Entre na sua conta para acumular pontos e acompanhar a sua evolução. O progresso feito
          neste navegador vai junto para a conta.
        </p>
        {onShowAccount && (
          <button type="button" className="secondary-button" onClick={onShowAccount}>
            Entrar
          </button>
        )}
      </div>
    );
  if (error && !data)
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p className="view-message">Carregando…</p>;

  const started = data.trilhas.filter((t) => t.iniciada);
  const openHistory = () => {
    classroom.open({ kind: 'evolucao', id: 'historico', title: 'Minha evolução' });
    learning.requestFocus('codigo');
  };

  return (
    <div className="evolution">
      <section className="points-card" aria-label="Pontuação">
        <Star size={18} aria-hidden="true" />
        <p>
          <span className="points-total">{data.pontos.total}</span> pontos
        </p>
      </section>
      <dl className="points-breakdown">
        {POINT_KINDS.map((k) => (
          <div key={k}>
            <dt>{POINT_KIND_LABEL[k]}</dt>
            <dd>{data.pontos.porTipo[k]}</dd>
          </div>
        ))}
      </dl>

      <ul className="indicator-list" aria-label="Indicadores">
        <li>
          <MapIcon size={14} aria-hidden="true" />
          Trilhas: {started.length} iniciadas · {data.trilhas.filter((t) => t.concluida).length}{' '}
          concluídas
        </li>
        <li>
          <ClipboardCheck size={14} aria-hidden="true" />
          Avaliações: {data.avaliacoes.realizadas} realizadas · {data.avaliacoes.aprovadas} com nota
          mínima
        </li>
        <li>
          <FlaskConical size={14} aria-hidden="true" />
          Desafios concluídos: {data.desafios.concluidos}
        </li>
        <li>
          <BookOpen size={14} aria-hidden="true" />
          Glossário: {data.glossario.termos} termos · {data.glossario.comExplicacaoPropria} com
          explicação própria
        </li>
      </ul>

      {started.length > 0 && (
        <section aria-label="Progresso nas trilhas">
          <h3 className="unit-group-title">Progresso nas trilhas</h3>
          {started.map((t) => (
            <div key={t.id} className="evolution-track">
              <button
                type="button"
                className="unit-link"
                onClick={() => void learning.openTrack(t.id)}
              >
                {t.titulo}
              </button>
              <ProgressBar value={t.percentual} label={`Progresso em ${t.titulo}`} />
              <span className="form-hint">
                {t.unidadesConcluidas} de {t.unidades} unidades concluídas
              </span>
            </div>
          ))}
        </section>
      )}

      <section aria-label="Para revisar">
        <h3 className="unit-group-title">Para revisar</h3>
        {data.revisar.length === 0 ? (
          <p className="form-hint">Nada pendente nas unidades que você já começou.</p>
        ) : (
          <ul className="review-list">
            {data.revisar.map((r) => (
              <li key={`${r.motivo}:${r.unitId}`} className="attention-item">
                <button
                  type="button"
                  className="unit-link"
                  onClick={() => void learning.openUnit(r.unitId)}
                >
                  {REVIEW_LABEL[r.motivo]}: {r.unidade}
                </button>
                <span className="form-hint">{r.detalhe}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" className="secondary-button" onClick={openHistory}>
        <History size={14} aria-hidden="true" /> Ver histórico completo
      </button>
    </div>
  );
}
