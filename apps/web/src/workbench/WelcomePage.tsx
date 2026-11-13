import { STAGES, STAGE_STATUS_LABEL } from '../project/stages';

/** Conteúdo da aba "Boas-vindas": informação real sobre o estado do projeto. */
export function WelcomePage() {
  return (
    <article className="welcome">
      <header>
        <p className="welcome-kicker">TrilhaCode · versão 0.5.0</p>
        <h1 className="welcome-title">
          Aprender programação escrevendo, testando e entendendo o código.
        </h1>
        <p className="welcome-lead">
          A TrilhaCode reúne um editor no estilo VS Code e trilhas de aprendizagem com conceito,
          demonstração, experimentação, glossário pessoal, desafio e avaliação. Tudo roda no
          navegador, sem instalar programas.
        </p>
      </header>

      <section aria-labelledby="como-titulo">
        <h2 id="como-titulo" className="welcome-h2">
          Como começar
        </h2>
        <ol className="welcome-steps">
          <li>
            Abra <strong>Trilhas</strong> na barra de atividades (ícone de mapa) e escolha uma
            trilha.
          </li>
          <li>Escolha uma unidade: ela abre no painel ao lado do editor, com sete etapas.</li>
          <li>
            Nas etapas de experimentação e desafio, os arquivos abrem no editor. Seu projeto livre
            continua em <strong>Explorador</strong>.
          </li>
        </ol>
      </section>

      <section aria-labelledby="estado-titulo">
        <h2 id="estado-titulo" className="welcome-h2">
          Estado do desenvolvimento
        </h2>
        <p className="welcome-text">
          A plataforma é construída por etapas. Áreas marcadas com <strong>Em breve</strong> ainda
          não funcionam e indicam a etapa em que serão entregues.
        </p>
        <ol className="stage-list">
          {STAGES.map((s) => (
            <li key={s.number} className="stage-item" data-status={s.status}>
              <span className="stage-number" aria-hidden="true">
                {s.number}
              </span>
              <span className="stage-title">
                <span className="visually-hidden">Etapa {s.number}: </span>
                {s.title}
              </span>
              <span className={`badge badge-${s.status}`}>{STAGE_STATUS_LABEL[s.status]}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="welcome-footer">
        Software livre sob a licença AGPL-3.0.{' '}
        <a href="https://github.com/profabraaojr/Trilhacode" target="_blank" rel="noreferrer">
          Código-fonte no GitHub
        </a>
      </p>
    </article>
  );
}
