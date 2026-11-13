# TrilhaCode

Plataforma educacional de programação, de código aberto, que reúne um editor no estilo VS Code e trilhas de aprendizagem com etapas pedagógicas, glossário pessoal, desafios e avaliações.

**Status:** versão 1.0.0 em validação. As sete etapas do plano inicial estão implementadas; a Etapa 7 (qualidade e publicação) aguarda aprovação. Para instalar numa escola, veja o [guia de implantação](docs/06-implantacao.md).

## O que já funciona

**Qualidade e publicação (Etapa 7)**

- LGPD: o usuário baixa todos os seus dados (JSON) e exclui a própria conta, com a senha; página de privacidade com a instituição responsável e o contato do encarregado.
- Segurança revisada com o OWASP ASVS nível 1 ([relatório](docs/04-seguranca.md)): Content-Security-Policy estrita verificada pelos testes, cabeçalhos de segurança, proteção contra CSRF por origem, erros sem detalhes internos, tokens fora dos registros e senhas de 12 caracteres ou mais.
- Acessibilidade verificada com axe-core (WCAG 2.2 AA) nas telas principais e desempenho medido com Lighthouse: 90 no celular e 100 no computador ([relatório](docs/05-acessibilidade-desempenho.md)).
- Imagens Docker e Compose de produção com HTTPS automático (Caddy); as imagens são publicadas no GitHub Container Registry a cada release.

**Avaliação e evolução (Etapa 6)**

- Meu Glossário: o aluno registra termos com significado pesquisado, explicação com as próprias palavras e exemplo de uso, direto na etapa de vocabulário da unidade ou pela barra lateral, com busca, edição e exclusão. Sem login, os termos ficam no navegador e vão para a conta no primeiro login.
- Verificação simples de cópia: se a explicação repete o significado pesquisado, o termo é salvo, mas não pontua, e o aluno recebe um aviso para reescrever.
- Pontuação em livro-razão de eventos imutáveis, sem bônus por velocidade: 5 pontos por etapa concluída; até 30 pelo desafio (proporcional aos testes aprovados); até 50 pela avaliação (melhor tentativa); 5 por termo com explicação própria ligado a uma unidade (até 5 termos por unidade); 20 por unidade e 100 por trilha concluídas.
- Minha evolução: pontos por tipo de atividade, trilhas iniciadas e concluídas, percentual de progresso, avaliações realizadas, desafios concluídos, glossário e uma lista do que revisar (avaliação abaixo da nota mínima, desafio incompleto, termo sem explicação própria). O histórico completo traz cada tentativa de avaliação, os desafios e os pontos recebidos.
- Professor: aba Glossários na turma, para ler (sem editar) os termos de cada aluno; pontos e termos no painel e no relatório CSV. Não há ranking entre alunos.

**Gestão pedagógica (Etapa 5)**

- Turmas criadas por professores, com professor responsável e coprofessores.
- Matrícula por convite: o professor informa o e-mail (um a um ou por planilha `.xlsx`/`.csv`, com relatório por linha). Quem já tem conta entra na hora; quem não tem recebe o convite e entra na turma ao confirmar o e-mail do cadastro.
- Trilhas atribuídas à turma, com prazo.
- Painel da turma: progresso de cada aluno nas trilhas atribuídas, unidades concluídas, média nas avaliações, última atividade, prazos vencidos e as unidades em que a turma tem mais dificuldade.
- Avaliações complementares de múltipla escolha, com feedback por alternativa, corrigidas no servidor.
- Relatório da turma em CSV (abre no Excel e no LibreOffice em português).
- Visão do aluno: turmas, trilhas com prazo e avaliações a responder.
- Permissões verificadas na API: professores só veem as próprias turmas; alunos, só as turmas em que estão matriculados.

**Cadastro e perfis (Etapa 4)**

- Cadastro por e-mail e senha, com confirmação obrigatória do e-mail antes do primeiro login; reenvio do link.
- Login, logout, recuperação de senha por link enviado por e-mail e troca de senha (encerra as sessões em outros aparelhos).
- Edição de nome e instituição.
- Papéis aluno, professor e administrador, verificados na API. Todo cadastro é de aluno; um administrador promove contas na visão Conta. O primeiro administrador é criado com `pnpm admin:criar email@exemplo.org`.
- Progresso nas trilhas salvo na conta; no primeiro login, o progresso feito no navegador é importado. Notas da avaliação registradas pelo servidor.
- Senhas com hash scrypt, sessões em cookie `HttpOnly` e limite de tentativas em login, cadastro e recuperação de senha (Better Auth).

**Trilhas e conteúdo (Etapa 3)**

- Trilha **HTML e CSS** para o ensino técnico, com 4 unidades autorais em dois módulos.
- Mapa visual da trilha (React Flow) com objetivos, pré-requisitos, progresso e o estado de cada unidade (bloqueada, disponível, em andamento, concluída).
- Unidade ao lado do editor, com as sete etapas: apresentação, fundamentação (com leitura complementar), demonstração (o exemplo abre no editor), experimentação (concluída ao executar o experimento), vocabulário (termos com pistas de pesquisa), desafio e avaliação.
- Desafios corrigidos por testes automáticos executados no sandbox, com uma orientação para cada item não atendido.
- Avaliações corrigidas no servidor (o gabarito não chega ao navegador), com feedback para cada alternativa e nota mínima de 70%.
- Exemplo, experimento e desafio de cada unidade abrem em projetos separados; o projeto livre do aluno é preservado.
- Progresso guardado no navegador sem login e na conta com login (Etapa 4).
- Conteúdo em arquivos (`content/`), validado e carregado no banco sem recompilar a plataforma. Guia de autoria em [content/README.md](content/README.md).

**Editor e execução (Etapa 2)**

- Editor Monaco (o mesmo do VS Code) com destaque de sintaxe, numeração de linhas, autocompletar e diagnósticos: JavaScript e CSS pelos serviços do Monaco; HTML por um verificador próprio de tags não fechadas ou fora de ordem.
- Explorador de arquivos (criar, renomear, excluir, restaurar o exemplo) e abas. O `index.html` é o arquivo de entrada; CSS e JS entram quando vinculados nele, como em um site real, e a plataforma avisa quando um arquivo não está vinculado.
- Execução em ambiente isolado: cada execução roda em um iframe novo, com `sandbox="allow-scripts"` e em outra origem. O código do aluno não acessa cookies, `localStorage` nem a página da plataforma (há teste automatizado para isso).
- Proteção contra laço infinito: um laço que passa de 1 s sem terminar é interrompido com a linha exata, e a página continua respondendo.
- Console com mensagens, avisos, erros e a linha de origem; clicar na linha leva o editor até ela.
- Execução automática 1 s depois de parar de digitar (pode ser desligada), `Ctrl+Enter` para executar.
- Projeto salvo automaticamente no navegador (IndexedDB).

**Fundação (Etapa 1)**

- Interface no estilo VS Code: barra de atividades, barra lateral, área do editor, painel inferior, painel de conteúdo e barra de status.
- Painéis redimensionáveis e recolhíveis, com o tamanho lembrado entre visitas; atalhos `Ctrl+B`, `Ctrl+J` e `Ctrl+Alt+B`.
- Tema escuro e claro (ou seguir o sistema), com contraste mínimo WCAG AA.
- Layout responsivo: colunas no computador, painel de conteúdo recolhido no tablet, abas Conteúdo, Código e Resultado no celular.
- API com verificação de saúde (`GET /api/health`); a barra de status mostra se o servidor e o banco estão disponíveis.
- Banco PostgreSQL com a migração inicial: usuários e sessões (formato do Better Auth), trilhas, módulos, unidades e progresso por etapa pedagógica.

## Requisitos

- Node.js 22 ou mais recente
- pnpm 10 (`corepack enable` instala a versão definida no projeto)
- Docker, para o banco de dados e a caixa de e-mail de teste (ou um PostgreSQL 16 instalado localmente)

## Como rodar

```bash
cp .env.example .env
```

```bash
corepack enable && pnpm install
```

```bash
docker compose up -d
```

```bash
pnpm db:migrate
```

```bash
pnpm content:sync
```

```bash
pnpm dev
```

Endereços em desenvolvimento:

| Serviço         | Endereço                         |
| --------------- | -------------------------------- |
| Interface       | http://localhost:5173            |
| API             | http://localhost:3000/api/health |
| Sandbox         | http://localhost:5174            |
| Caixa de e-mail | http://localhost:8025            |

## Comandos

| Comando                            | O que faz                                                          |
| ---------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                         | Sobe interface, API e sandbox com recarga automática               |
| `pnpm test`                        | Testes de unidade e integração (os de banco exigem `DATABASE_URL`) |
| `pnpm test:e2e`                    | Testes no navegador em três tamanhos de tela (Playwright)          |
| `pnpm lint`                        | ESLint                                                             |
| `pnpm typecheck`                   | Verificação de tipos do TypeScript                                 |
| `pnpm build`                       | Build de produção de todos os pacotes                              |
| `pnpm db:generate`                 | Gera uma migração a partir de `apps/api/src/db/schema.ts`          |
| `pnpm db:migrate`                  | Aplica as migrações pendentes                                      |
| `pnpm content:validate`            | Valida o conteúdo de `content/` e mostra erros com arquivo e campo |
| `pnpm content:sync`                | Carrega o conteúdo no banco (sem recompilar a plataforma)          |
| `pnpm content:links`               | Confere se os links de leitura complementar respondem              |
| `pnpm admin:criar <email>`         | Torna administradora uma conta já cadastrada                       |
| `pnpm admin:papel <email> <papel>` | Define o papel (aluno, professor ou admin) de uma conta            |

Os testes no navegador (`pnpm test:e2e`) sobem a API e precisam do PostgreSQL ativo.

## Implantação

Para instalar num servidor, com Docker e HTTPS automático, siga o [guia de implantação](docs/06-implantacao.md). A interface e a API ficam na mesma origem (a sessão usa cookies), e o sandbox fica em outra origem, uma das camadas que isolam o código dos alunos.

## Limitações conhecidas

- Arquivos ficam em uma única pasta (sem subpastas) e só `.html`, `.css` e `.js`.
- `import` entre arquivos JavaScript (módulos ES) ainda não é suportado.
- As mensagens de erro do JavaScript vêm do navegador e do Monaco, em inglês.
- O verificador de HTML cobre os erros mais comuns (tags não fechadas, fechamento sem abertura); não é um validador completo.
- Sem login, o progresso fica só no navegador; ao entrar, ele é levado para a conta.
- Os testes do desafio rodam no navegador do aluno; o servidor confere o total de testes, mas confia no número de aprovados. Para a pontuação de uma plataforma escolar, consideramos o risco aceitável.
- A verificação de cópia no glossário compara pares de palavras: pega cópias e pequenas trocas, mas não paráfrases. O professor lê os glossários para avaliar a qualidade.
- Avaliações feitas antes da Etapa 6 contam na melhor nota, mas não aparecem no histórico tentativa a tentativa.
- Senhas não são comparadas com listas de senhas vazadas (ASVS 2.1.7), e ainda não houve teste com leitor de tela por pessoas que usam essa tecnologia.

## Estrutura

```
apps/
  web/        interface (React + Vite)
  api/        API (Fastify + Drizzle + PostgreSQL)
  sandbox/    ambiente de execução isolado (origem separada)
packages/
  shared/     schemas e tipos usados pela interface e pela API
  runners/    execução: protocolo, proteção contra laço infinito, testes de desafio
  content/    formato do conteúdo: schema, validação e compilação
  ui/         tokens visuais (cores, tipografia, espaçamento)
content/      trilhas, módulos e unidades (texto, desafios e avaliações)
docker/       imagens e configuração do Caddy para produção
docs/         arquitetura, plano, segurança, acessibilidade, implantação e conteúdo
```

## Documentação

1. [Análise das referências (LiveCodes e Roadmap.sh)](docs/01-analise-referencias.md)
2. [Arquitetura](docs/02-arquitetura.md)
3. [Plano por etapas](docs/03-plano-etapas.md)
4. [Segurança (OWASP ASVS nível 1)](docs/04-seguranca.md)
5. [Acessibilidade e desempenho](docs/05-acessibilidade-desempenho.md)
6. [Implantação com Docker](docs/06-implantacao.md)
7. [Criação de conteúdo](docs/07-criacao-de-conteudo.md)

Também: [como contribuir](CONTRIBUTING.md), [política de segurança](SECURITY.md) e [histórico de versões](CHANGELOG.md).

## Referências e créditos

- [LiveCodes](https://livecodes.io/) (MIT): referência e futuro motor de execução para linguagens adicionais.
- [roadmap.sh](https://roadmap.sh/): inspiração conceitual para a organização em mapas. Nenhum conteúdo do roadmap.sh é reproduzido neste projeto, por restrição da licença dele.
- Componentes de terceiros: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licença

Copyright (C) 2026 Abraão Jr. Costa e colaboradores do TrilhaCode.

Este programa é software livre, distribuído sob a [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only). Quem modificar o TrilhaCode e oferecê-lo a outras pessoas pela rede deve disponibilizar o código-fonte da versão modificada aos usuários desse serviço.
