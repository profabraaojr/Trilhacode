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

**Situação:** implementada, aguardando validação. Decisões tomadas na implementação:

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

- Schema do conteúdo (trilha, módulo, unidade, sete etapas pedagógicas, desafio, avaliação) e CLI `content:validate` / `content:sync`.
- Mapa visual da trilha com estados (bloqueado, disponível, em andamento, concluído).
- Página da unidade com as etapas em sequência e o editor integrado na experimentação.
- Desafios corrigidos por testes no sandbox; avaliações com questões conceituais, leitura de código e problemas, com feedback por alternativa.
- Primeira trilha completa e autoral: HTML e CSS (escopo inicial a definir com o professor).

**Aceite:** adicionar uma unidade nova apenas criando arquivos em `content/` e rodando `content:sync`, sem recompilar; percorrer uma unidade do início ao fim.

## Etapa 4. Cadastro e perfis

- Cadastro, login, logout, verificação de e-mail, recuperação e troca de senha.
- Papéis aluno, professor e administrador, verificados na API.
- Edição de dados pessoais; progresso local migrado para a conta no primeiro login.

**Aceite:** fluxo completo testado com Mailpit; testes de API confirmam que um aluno não acessa dados de outro e que o professor só vê suas turmas.

## Etapa 5. Gestão pedagógica

- Turmas, cadastro individual e importação por CSV/XLSX com relatório de erros por linha.
- Atribuição de trilhas a turmas com prazo.
- Painel do professor: progresso da turma, desempenho individual, unidades com mais erros, glossários dos alunos.
- Avaliações complementares criadas pelo professor.
- Relatórios exportáveis (CSV).

## Etapa 6. Avaliação e evolução

- Livro-razão de pontos com as regras da arquitetura.
- Painel do aluno: trilhas iniciadas e concluídas, histórico de avaliações, desafios, conteúdos a revisar.
- "Meu Glossário" completo: registro durante a unidade, busca, edição e vínculo com a unidade de origem.

## Etapa 7. Qualidade e publicação

- Auditoria de segurança (OWASP ASVS nível 1), acessibilidade (WCAG 2.2 AA, axe + revisão manual), desempenho (Lighthouse).
- Documentação de instalação, contribuição e criação de conteúdo.
- Publicação no GitHub com licença escolhida, releases e guia de implantação (Docker).

## Etapas posteriores (fora do escopo inicial)

- Executor LiveCodes auto-hospedado: Python, SQL e outras linguagens.
- Trilhas de JavaScript, Python, Git, Banco de dados, Back-end, Full Stack e IA.
- Login institucional (SSO), modo offline completo, tradução da interface.
