import { CircleCheck, CircleX, FolderOpen, ListChecks } from 'lucide-react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { workspaceKey } from './learningStore';
import { Prose } from './Prose';

export function ChallengePanel() {
  const { learning, run, project } = useStores();
  const unit = useStore(learning, (s) => s.unit.data)!;
  const projectKey = useStore(project, (s) => s.projectKey);
  const testing = useStore(run, (s) => s.testing);
  const testResults = useStore(run, (s) => s.testResults);
  const done = useStore(learning, (s) => !!s.progress.units[unit.id]?.steps.desafio);
  const key = workspaceKey(unit.id, 'desafio');
  const inChallenge = projectKey === key;
  const results = testResults?.projectKey === key ? testResults.results : null;
  const passed = results?.filter((r) => r.ok).length ?? 0;
  const etapa = unit.conteudo.etapas.desafio;

  return (
    <>
      <Prose html={etapa.html} />
      <div className="step-actions">
        {!inChallenge && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => void learning.openWorkspace('desafio')}
          >
            <FolderOpen size={15} aria-hidden="true" /> Abrir desafio no editor
          </button>
        )}
        <button
          type="button"
          className="primary-button"
          onClick={() => void learning.verifyChallenge()}
          disabled={testing}
        >
          <ListChecks size={15} aria-hidden="true" />{' '}
          {testing ? 'Verificando…' : 'Verificar desafio'}
        </button>
      </div>
      {inChallenge && (
        <p className="step-note">
          Os arquivos do desafio estão abertos no editor e são salvos automaticamente.
        </p>
      )}
      {done && !results && (
        <p className="step-done">Desafio concluído. Você pode verificar de novo quando quiser.</p>
      )}
      {results && (
        <section className="test-results" aria-live="polite" aria-label="Resultado da verificação">
          <p className={passed === results.length ? 'step-done' : 'step-pending'}>
            {passed === results.length
              ? `Todos os ${results.length} itens foram atendidos. Desafio concluído!`
              : `${passed} de ${results.length} itens atendidos. Corrija os itens abaixo e verifique de novo.`}
          </p>
          <ul className="test-list">
            {results.map((r) => (
              <li key={r.descricao} className="test-item" data-ok={r.ok}>
                {r.ok ? (
                  <CircleCheck size={16} aria-label="Atendido" role="img" />
                ) : (
                  <CircleX size={16} aria-label="Não atendido" role="img" />
                )}
                <span>
                  <span className="test-title">{r.descricao}</span>
                  {!r.ok && r.mensagem && <span className="test-hint">{r.mensagem}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
