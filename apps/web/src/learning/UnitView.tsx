import { UNIT_STEPS, type UnitStepId } from '@trilhacode/shared';
import { ArrowLeft, ArrowRight, Check, ExternalLink, FolderOpen } from 'lucide-react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { AssessmentForm } from './AssessmentForm';
import { ChallengePanel } from './ChallengePanel';
import { workspaceKey } from './learningStore';
import { completedSteps } from './progress';
import { Prose } from './Prose';

/** Unidade de aprendizagem com as sete etapas pedagógicas. */
export function UnitView() {
  const { learning, project } = useStores();
  const unit = useStore(learning, (s) => s.unit.data)!;
  const step = useStore(learning, (s) => s.step);
  const progress = useStore(learning, (s) => s.progress.units[unit.id]);
  const projectKey = useStore(project, (s) => s.projectKey);
  const stepIndex = UNIT_STEPS.findIndex((s) => s.id === step);
  const current = UNIT_STEPS[stepIndex]!;
  const isDone = (id: UnitStepId) => !!progress?.steps[id];
  const etapas = unit.conteudo.etapas;

  const complete = () => {
    learning.completeStep(step);
    learning.goToNextStep();
  };

  return (
    <article className="unit" aria-labelledby="unit-title">
      <header className="unit-header">
        <p className="unit-breadcrumb">
          {unit.trilhaTitulo} › {unit.moduloTitulo}
        </p>
        <h2 id="unit-title" className="unit-title">
          {unit.titulo}
        </h2>
        <p className="unit-meta">
          {unit.nivel} · {unit.duracaoMinutos} min · {completedSteps(progress)} de 7 etapas
        </p>
        <details className="unit-objectives">
          <summary>Objetivos da unidade</summary>
          <ul>
            {unit.objetivos.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </details>
      </header>

      <nav aria-label="Etapas da unidade">
        <ol className="stepper">
          {UNIT_STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className="stepper-item"
                aria-current={s.id === step ? 'step' : undefined}
                data-done={isDone(s.id) || undefined}
                onClick={() => learning.setStep(s.id)}
                title={s.label}
              >
                <span className="stepper-number" aria-hidden="true">
                  {isDone(s.id) ? <Check size={12} /> : i + 1}
                </span>
                <span className="visually-hidden">
                  Etapa {i + 1}: {s.label}
                  {isDone(s.id) ? ' (concluída)' : ''}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="step" aria-labelledby="step-title">
        <h3 id="step-title" className="step-title">
          <span className="step-index">Etapa {stepIndex + 1} de 7</span>
          {current.label}
        </h3>

        {step === 'apresentacao' && <Prose html={etapas.apresentacao.html} />}

        {step === 'fundamentacao' && (
          <>
            <Prose html={etapas.fundamentacao.html} />
            {unit.conteudo.leituraComplementar.length > 0 && (
              <aside className="reading">
                <h4>Leitura complementar</h4>
                <ul>
                  {unit.conteudo.leituraComplementar.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        {r.titulo} <ExternalLink size={12} aria-hidden="true" />
                      </a>{' '}
                      <span className="reading-source">({r.fonte})</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </>
        )}

        {step === 'demonstracao' && (
          <>
            <Prose html={etapas.demonstracao.html} />
            {etapas.demonstracao.arquivos.length > 0 && (
              <div className="step-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void learning.openWorkspace('demonstracao')}
                >
                  <FolderOpen size={15} aria-hidden="true" /> Abrir exemplo no editor
                </button>
              </div>
            )}
          </>
        )}

        {step === 'experimentacao' && (
          <>
            <Prose html={etapas.experimentacao.html} />
            <div className="step-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void learning.openWorkspace('experimentacao')}
              >
                <FolderOpen size={15} aria-hidden="true" />
                {projectKey === workspaceKey(unit.id, 'experimentacao')
                  ? 'Experimento aberto no editor'
                  : 'Abrir experimento no editor'}
              </button>
            </div>
            <p className={isDone('experimentacao') ? 'step-done' : 'step-note'}>
              {isDone('experimentacao')
                ? 'Etapa concluída: você executou o experimento.'
                : 'Esta etapa é concluída quando você executar o experimento.'}
            </p>
          </>
        )}

        {step === 'vocabulario' && (
          <>
            <Prose html={etapas.vocabulario.html} />
            <h4 className="terms-title">Termos sugeridos para pesquisar</h4>
            <dl className="terms">
              {etapas.vocabulario.termos.map((t) => (
                <div key={t.termo} className="term">
                  <dt>{t.termo}</dt>
                  <dd>Pista: {t.dica}</dd>
                </div>
              ))}
            </dl>
            <p className="step-note">
              <span className="badge badge-soon">Em breve · Etapa 6</span> O registro no Meu
              Glossário (termo, significado pesquisado, explicação com suas palavras e exemplo)
              chega na Etapa 6. Por enquanto, anote os termos no seu caderno.
            </p>
          </>
        )}

        {step === 'desafio' && <ChallengePanel />}
        {step === 'avaliacao' && <AssessmentForm key={unit.id} />}

        {['apresentacao', 'fundamentacao', 'demonstracao', 'vocabulario'].includes(step) && (
          <div className="step-actions">
            {isDone(step) ? (
              <p className="step-done">Etapa concluída.</p>
            ) : (
              <button type="button" className="primary-button" onClick={complete}>
                <Check size={15} aria-hidden="true" /> Concluir etapa
              </button>
            )}
          </div>
        )}
      </section>

      <footer className="step-nav">
        <button
          type="button"
          className="text-button"
          disabled={stepIndex === 0}
          onClick={() => learning.setStep(UNIT_STEPS[stepIndex - 1]!.id)}
        >
          <ArrowLeft size={14} aria-hidden="true" /> Anterior
        </button>
        <button
          type="button"
          className="text-button"
          disabled={stepIndex === UNIT_STEPS.length - 1}
          onClick={() => learning.goToNextStep()}
        >
          Próxima <ArrowRight size={14} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
