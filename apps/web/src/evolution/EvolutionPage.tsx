import { POINT_KIND_LABEL, POINT_KINDS } from '@trilhacode/shared';
import { formatDateTime } from '../classes/dates';
import { useStores } from '../project/ProjectContext';
import { useEvolution } from './useEvolution';

/** Página "Minha evolução" na área central: histórico completo do aluno. */
export default function EvolutionPage() {
  const { learning } = useStores();
  const { data, error } = useEvolution();
  if (error && !data)
    return (
      <p className="view-message" role="alert">
        {error}
      </p>
    );
  if (!data) return <p className="editor-loading">Carregando…</p>;

  const max = Math.max(1, ...POINT_KINDS.map((k) => data.pontos.porTipo[k]));

  return (
    <div className="classroom-page evolution-page">
      <header className="page-body">
        <h2 className="unit-title">Minha evolução</h2>
        <p className="form-hint">
          A pontuação valoriza compreensão e aplicação: avaliações e desafios pesam mais que
          concluir etapas, e nada depende da velocidade.
        </p>
      </header>
      <div className="page-body">
        <div className="stat-row">
          <div className="stat">
            <span className="stat-value">{data.pontos.total}</span>
            <span className="stat-label">pontos acumulados</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {data.trilhas.filter((t) => t.concluida).length}/
              {data.trilhas.filter((t) => t.iniciada).length}
            </span>
            <span className="stat-label">trilhas concluídas / iniciadas</span>
          </div>
          <div className="stat">
            <span className="stat-value">{data.avaliacoes.realizadas}</span>
            <span className="stat-label">avaliações realizadas</span>
          </div>
          <div className="stat">
            <span className="stat-value">{data.desafios.concluidos}</span>
            <span className="stat-label">desafios concluídos</span>
          </div>
          <div className="stat">
            <span className="stat-value">{data.glossario.termos}</span>
            <span className="stat-label">termos no glossário</span>
          </div>
        </div>

        <section className="page-section" aria-labelledby="ev-pontos">
          <h3 id="ev-pontos">Pontos por tipo de atividade</h3>
          <ul className="bar-list">
            {POINT_KINDS.map((k) => (
              <li key={k}>
                <span className="bar-label">{POINT_KIND_LABEL[k]}</span>
                <span className="bar-track" aria-hidden="true">
                  <span
                    className="bar-fill"
                    style={{ width: `${(data.pontos.porTipo[k] / max) * 100}%` }}
                  />
                </span>
                <span className="bar-value">{data.pontos.porTipo[k]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="page-section" aria-labelledby="ev-avaliacoes">
          <h3 id="ev-avaliacoes">Histórico de avaliações</h3>
          {data.avaliacoes.historico.length === 0 ? (
            <p className="form-hint">Nenhuma avaliação feita com a conta ainda.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table" aria-label="Histórico de avaliações">
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Avaliação</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Nota</th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.avaliacoes.historico.map((h, i) => (
                    <tr key={`${h.origem}:${h.id}:${i}`}>
                      <td>{formatDateTime(h.em)}</td>
                      <td>
                        {h.origem === 'unidade' ? (
                          <button
                            type="button"
                            className="unit-link"
                            onClick={() => void learning.openUnit(h.id)}
                          >
                            {h.titulo}
                          </button>
                        ) : (
                          h.titulo
                        )}
                      </td>
                      <td>
                        {h.origem === 'unidade' ? 'Trilha' : 'Turma'}: {h.contexto}
                      </td>
                      <td>
                        <span className="cell-progress">
                          <span className="bar-track" aria-hidden="true">
                            <span className="bar-fill" style={{ width: `${h.nota}%` }} />
                          </span>
                          {h.nota}%
                        </span>
                      </td>
                      <td>{h.aprovado ? 'Nota mínima atingida' : 'Abaixo da nota mínima'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="page-section" aria-labelledby="ev-desafios">
          <h3 id="ev-desafios">Desafios</h3>
          {data.desafios.resultados.length === 0 ? (
            <p className="form-hint">Nenhum desafio verificado com a conta ainda.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table" aria-label="Desafios">
                <thead>
                  <tr>
                    <th scope="col">Unidade</th>
                    <th scope="col">Melhor resultado</th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.desafios.resultados.map((c) => (
                    <tr key={c.unitId}>
                      <td>
                        <button
                          type="button"
                          className="unit-link"
                          onClick={() => void learning.openUnit(c.unitId)}
                        >
                          {c.unidade}
                        </button>
                      </td>
                      <td>
                        {c.aprovados} de {c.total} testes
                      </td>
                      <td>{c.concluido ? 'Concluído' : 'Em andamento'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="page-section" aria-labelledby="ev-eventos">
          <h3 id="ev-eventos">Pontos recebidos</h3>
          {data.eventos.length === 0 ? (
            <p className="form-hint">Os pontos aparecem aqui conforme você avança nas unidades.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table" aria-label="Pontos recebidos">
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Atividade</th>
                    <th scope="col">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.eventos.map((e, i) => (
                    <tr key={i}>
                      <td>{formatDateTime(e.em)}</td>
                      <td>{e.descricao}</td>
                      <td>+{e.pontos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
