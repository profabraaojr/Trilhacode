import { config } from '../config';

/**
 * Política de privacidade da instalação. Descreve o que a plataforma coleta e por
 * quê; a instituição que mantém a instalação informa o próprio nome e o contato do
 * encarregado (TRILHACODE_INSTITUTION e TRILHACODE_PRIVACY_CONTACT no contêiner).
 */
export default function PrivacyPage() {
  const institution = config.institution;
  const contact = config.privacyContact;
  return (
    <article className="classroom-page privacy-page" aria-labelledby="privacidade-titulo">
      <header className="track-header">
        <p className="welcome-kicker">Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</p>
        <h1 id="privacidade-titulo" className="track-heading">
          Privacidade
        </h1>
        <p className="welcome-text">
          {institution
            ? `Esta instalação da TrilhaCode é mantida por ${institution}, responsável pelo tratamento dos dados.`
            : 'A instituição que mantém esta instalação da TrilhaCode é a responsável pelo tratamento dos dados. Ela ainda não informou o próprio nome nesta página.'}
        </p>
      </header>
      <div className="page-body prose">
        <h2>Quais dados são guardados</h2>
        <ul>
          <li>
            <strong>Conta:</strong> nome, e-mail, senha (guardada só como hash, nunca em texto),
            instituição (opcional) e papel (aluno, professor ou administrador).
          </li>
          <li>
            <strong>Aprendizagem:</strong> etapas concluídas, resultados dos desafios, tentativas e
            notas das avaliações, termos do Meu Glossário e pontos.
          </li>
          <li>
            <strong>Turmas:</strong> matrículas, convites (e-mail e nome informados pelo professor)
            e respostas às avaliações da turma.
          </li>
          <li>
            <strong>Sessões:</strong> data, endereço IP e navegador de cada login, para manter você
            conectado e proteger a conta.
          </li>
        </ul>
        <p>
          Sem login, o progresso, os arquivos e o glossário ficam apenas no seu navegador. O código
          que você escreve roda num ambiente isolado e não é enviado ao servidor. A plataforma não
          usa cookies de publicidade nem ferramentas de rastreamento.
        </p>

        <h2>Para que são usados</h2>
        <p>
          Para oferecer as trilhas, registrar o seu progresso e permitir que os professores das suas
          turmas acompanhem a aprendizagem. Os professores veem apenas os alunos das próprias
          turmas, incluindo o glossário, sem poder editá-lo. Não há ranking público entre alunos.
        </p>

        <h2>Os seus direitos</h2>
        <ul>
          <li>
            <strong>Acesso e portabilidade:</strong> na visão Conta, “Baixar meus dados” gera um
            arquivo com tudo o que está guardado sobre você.
          </li>
          <li>
            <strong>Correção:</strong> nome e instituição podem ser alterados na visão Conta.
          </li>
          <li>
            <strong>Exclusão:</strong> na visão Conta, “Excluir minha conta” apaga a conta e os
            dados de aprendizagem de forma definitiva.
          </li>
        </ul>
        <p>
          Para outros pedidos, ou para dados de estudantes menores de idade, fale com a instituição
          {contact ? (
            <>
              {' '}
              pelo contato <strong>{contact}</strong>.
            </>
          ) : (
            ' que mantém esta instalação.'
          )}
        </p>
      </div>
    </article>
  );
}
