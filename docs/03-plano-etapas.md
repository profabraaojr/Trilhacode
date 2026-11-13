# Plano de desenvolvimento por etapas

Cada etapa termina com uma entrega testável e só avança depois de validada. Os critérios de aceite abaixo são o que será demonstrado na validação.

## Etapa 1. Fundação e identidade visual

**Situação:** concluída e validada em 13/11/2026. Desvios do plano original: o pacote `packages/ui` contém só os tokens visuais (componentes ficam em `apps/web` até haver reuso); `packages/content-schema` e `packages/runners` serão criados nas Etapas 3 e 2, quando tiverem conteúdo.

**Entrega:** monorepo funcionando, banco e e-mail locais, interface-esqueleto no estilo VS Code.

- Monorepo pnpm com `apps/web`, `apps/api`, `apps/sandbox` e pacotes compartilhados.
- `docker compose up` sobe PostgreSQL e Mailpit.
- Migração inicial do banco com as tabelas de usuários, trilhas e progresso.
- Tokens visuais (tema escuro e claro), layout com barra de atividades, barra lateral, área central, painel inferior e barra de status, redimensionáveis.
- Layout responsivo com abas no celular.
- CI no GitHub Actions: lint, verificação de tipos e testes.

**Aceite:** um comando instala e sobe o projeto; a interface abre em computador, tablet e celular; painéis sem função ainda aparecem identificados como "em breve"; CI verde.

## Etapa 2. Editor e execução

**Situação:** concluída e validada em 13/11/2026. Decisões tomadas na implementação:

- O resultado ficou ao lado do editor (como a visualização ao vivo de um editor), e o painel inferior ficou com o console. No celular, a aba Resultado mostra resultado e console empilhados.
- `index.html` é o arquivo de entrada; CSS e JS só entram quando vinculados nele, para o aluno aprender a vincular arquivos como em um site real. A plataforma avisa quando há arquivo não vinculado.
- Laço infinito: o código é instrumentado com uma verificação de tempo em cada laço (limite de 1 s), além de um vigia que encerra o iframe se a página parar de responder por 4 s.
- Diagnósticos de HTML: o Monaco não traz validação de HTML; foi escrito um verificador de tags para os erros comuns de iniciantes.
- O painel de conteúdo da unidade começa recolhido até existir conteúdo (Etapa 3).

- Monaco com abas, explorador de arquivos (criar, renomear, excluir), destaque de sintaxe, diagnósticos de HTML, CSS e JS.
- Executor web em iframe isolado, console com `log`, `warn`, `error` e exceções, limite de tempo.
- Visualização do resultado em painel ou janela própria.
- Persistência local dos arquivos (IndexedDB).

**Aceite:** escrever uma página com HTML, CSS e JS, executá-la e ver o resultado e o console; um laço infinito é interrompido sem travar a aba; teste automatizado comprova que o código do sandbox não acessa cookies nem `localStorage` da aplicação.

## Etapa 3. Trilhas e conteúdo

**Situação:** concluída e validada em 13/11/2026. Escopo definido com o responsável: 4 unidades, público do ensino técnico, rascunho autoral para revisão, MDN como leitura complementar. Decisões tomadas na implementação:

- **Progresso no navegador** até a Etapa 4, quando será associado à conta do aluno.
- **Vocabulário:** a etapa sugere termos com pistas de pesquisa (sem a definição pronta); o formulário do Meu Glossário segue previsto para a Etapa 6.
- **Conclusão das etapas:** leitura por botão "Concluir etapa"; experimentação ao executar o experimento; desafio quando todos os testes passam; avaliação com nota mínima de 70%.
- **Avaliação corrigida no servidor**, para o gabarito não chegar ao navegador. As alternativas são embaralhadas de forma determinística na compilação, porque no rascunho a alternativa correta caía quase sempre na mesma posição.
- **Unidades bloqueadas** podem ser abertas; o bloqueio indica a ordem recomendada, sem impedir o estudo.
- **Links de leitura complementar:** o ambiente de desenvolvimento não tinha acesso ao MDN; os endereços são conferidos pelo job "Links de leitura complementar" da CI.

- Schema do conteúdo (trilha, módulo, unidade, sete etapas pedagógicas, desafio, avaliação) e CLI `content:validate` / `content:sync`.
- Mapa visual da trilha com estados (bloqueado, disponível, em andamento, concluído).
- Página da unidade com as etapas em sequência e o editor integrado na experimentação.
- Desafios corrigidos por testes no sandbox; avaliações com questões conceituais, leitura de código e problemas, com feedback por alternativa.
- Primeira trilha completa e autoral: HTML e CSS (escopo inicial a definir com o professor).

**Aceite:** adicionar uma unidade nova apenas criando arquivos em `content/` e rodando `content:sync`, sem recompilar; percorrer uma unidade do início ao fim.

## Etapa 4. Cadastro e perfis

**Situação:** concluída e validada em 13/11/2026. Definições aprovadas pelo responsável:

1. Todo cadastro é de aluno; contas de professor são promovidas por um administrador.
2. O primeiro administrador é criado por comando no servidor (`pnpm admin:criar`).
3. O cadastro pede nome, e-mail, senha e instituição (opcional); turma e professor serão definidos na matrícula (Etapa 5).
4. E-mail por qualquer servidor SMTP configurado; Mailpit em desenvolvimento.

Decisões de implementação: interface e API na mesma origem (sessão em cookie); a avaliação de quem está logado é registrada pelo servidor ao corrigir, enquanto as demais etapas são marcadas pela interface; a importação do progresso do navegador aceita o que estava salvo localmente; nos testes automatizados, os e-mails ficam em memória (`MAIL_CAPTURE`), opção recusada em produção.

- Cadastro, login, logout, verificação de e-mail, recuperação e troca de senha.
- Papéis aluno, professor e administrador, verificados na API.
- Edição de dados pessoais; progresso local migrado para a conta no primeiro login.

**Aceite:** fluxo completo testado com Mailpit; testes de API confirmam que um aluno não acessa dados de outro e que o professor só vê suas turmas.

## Etapa 5. Gestão pedagógica

**Situação:** concluída e validada em 13/11/2026. Definições aprovadas pelo responsável: matrícula por convite por e-mail; professor responsável com coprofessores; avaliações complementares de múltipla escolha com feedback por alternativa (questões abertas ficam para depois); consulta aos glossários dos alunos na Etapa 6, com o lugar reservado no painel.

Decisões de implementação: a planilha é lida no navegador (`read-excel-file` e `papaparse`), e cada linha é validada no servidor; um convite para uma conta já existente mas sem e-mail confirmado vira matrícula na confirmação; "unidades que pedem atenção" são as que têm alunos abaixo da nota mínima ou média abaixo de 70%; o relatório usa ponto e vírgula e BOM, para abrir corretamente em planilhas configuradas em português.

- Turmas, cadastro individual e importação por CSV/XLSX com relatório de erros por linha.
- Atribuição de trilhas a turmas com prazo.
- Painel do professor: progresso da turma, desempenho individual, unidades com mais erros, glossários dos alunos.
- Avaliações complementares criadas pelo professor.
- Relatórios exportáveis (CSV).

## Etapa 6. Avaliação e evolução

**Situação:** concluída e validada em 13/11/2026. Definições aprovadas pelo responsável:

1. Tabela de pontos: etapa concluída 5; desafio até 30 (proporcional aos testes aprovados); avaliação até 50 (melhor tentativa); termo do glossário com explicação própria 5 (até 5 por unidade); unidade concluída 20; trilha concluída 100.
2. O professor lê todo o glossário dos alunos das suas turmas, sem editar; o aluno é avisado na tela do glossário.
3. Sem ranking entre alunos; o professor vê os pontos de cada um no painel da turma.
4. Verificação de cópia por semelhança: a explicação parecida demais com o significado é salva, mas não pontua, e o aluno recebe um aviso.

Decisões de implementação: a cada mudança no progresso, o servidor calcula quanto cada item vale e lança só a diferença positiva no livro-razão (`point_event`), sob um bloqueio por aluno; assim o total nunca diminui, repetir uma ação não pontua de novo e excluir e recriar termos não gera pontos extras. A semelhança é a proporção de pares de palavras da explicação que já aparecem no significado (sem acentos e maiúsculas), com limite de 50% e mínimo de 40 caracteres; a mesma função roda no navegador (aviso imediato) e no servidor (decisão). Só termos ligados a uma unidade pontuam, para estimular o registro durante o estudo. O resultado do desafio vem dos testes executados no sandbox do navegador; o servidor confere o total de testes da unidade. Termos sem login ficam no navegador e são importados no primeiro login, como o progresso.

- Livro-razão de pontos com as regras da arquitetura.
- Painel do aluno: trilhas iniciadas e concluídas, histórico de avaliações, desafios, conteúdos a revisar.
- "Meu Glossário" completo: registro durante a unidade, busca, edição e vínculo com a unidade de origem.

## Etapa 7. Qualidade e publicação

**Situação:** implementada, aguardando validação. Definições aprovadas pelo responsável: implantação com Docker Compose e guia (sem publicar em serviço de hospedagem); primeira versão pública 1.0.0; exportação dos dados e exclusão da conta pelo próprio usuário, com página de privacidade; imagens publicadas no GitHub Container Registry a cada release.

Decisões de implementação: a interface passou a ler a configuração de `/config.js`, gerado quando o contêiner inicia, para que as mesmas imagens sirvam qualquer domínio; o script de tema saiu do HTML para a política de segurança dispensar `unsafe-inline`, e o Zod roda sem compilar validadores no navegador (`jitless`), para dispensar `unsafe-eval`; as imagens são duas (API; interface e sandbox no Caddy, em duas origens); a exclusão de conta usa o Better Auth, sempre com a senha, e o único administrador não pode se excluir; o editor Monaco passou a ser carregado só quando um arquivo é aberto, o que levou o desempenho no celular de 46 para 90. Relatórios: [segurança](04-seguranca.md) e [acessibilidade e desempenho](05-acessibilidade-desempenho.md).

- Auditoria de segurança (OWASP ASVS nível 1), acessibilidade (WCAG 2.2 AA, axe + revisão manual), desempenho (Lighthouse).
- Documentação de instalação, contribuição e criação de conteúdo.
- Publicação no GitHub com licença escolhida, releases e guia de implantação (Docker).

## Etapas posteriores (fora do escopo inicial)

- Executor LiveCodes auto-hospedado: Python, SQL e outras linguagens.
- Trilhas de JavaScript, Python, Git, Banco de dados, Back-end, Full Stack e IA.
- Login institucional (SSO), modo offline completo, tradução da interface.
