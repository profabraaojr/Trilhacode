# TrilhaCode

Plataforma educacional de programação, de código aberto, que reúne um editor no estilo VS Code e trilhas de aprendizagem com etapas pedagógicas, glossário pessoal, desafios e avaliações.

**Status:** Etapas 1 e 2 concluídas; Etapa 3 (trilhas e conteúdo) em validação. Áreas da interface marcadas com "Em breve" ainda não funcionam e indicam a etapa em que serão entregues.

## O que já funciona

**Trilhas e conteúdo (Etapa 3)**

- Trilha **HTML e CSS** para o ensino técnico, com 4 unidades autorais em dois módulos.
- Mapa visual da trilha (React Flow) com objetivos, pré-requisitos, progresso e o estado de cada unidade (bloqueada, disponível, em andamento, concluída).
- Unidade ao lado do editor, com as sete etapas: apresentação, fundamentação (com leitura complementar), demonstração (o exemplo abre no editor), experimentação (concluída ao executar o experimento), vocabulário (termos com pistas de pesquisa), desafio e avaliação.
- Desafios corrigidos por testes automáticos executados no sandbox, com uma orientação para cada item não atendido.
- Avaliações corrigidas no servidor (o gabarito não chega ao navegador), com feedback para cada alternativa e nota mínima de 70%.
- Exemplo, experimento e desafio de cada unidade abrem em projetos separados; o projeto livre do aluno é preservado.
- Progresso guardado no navegador (até existir login, na Etapa 4).
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

| Serviço           | Endereço                         |
| ----------------- | -------------------------------- |
| Interface         | http://localhost:5173            |
| API               | http://localhost:3000/api/health |
| Sandbox (Etapa 2) | http://localhost:5174            |
| Caixa de e-mail   | http://localhost:8025            |

## Comandos

| Comando            | O que faz                                                          |
| ------------------ | ------------------------------------------------------------------ |
| `pnpm dev`         | Sobe interface, API e sandbox com recarga automática               |
| `pnpm test`        | Testes de unidade e integração (os de banco exigem `DATABASE_URL`) |
| `pnpm test:e2e`    | Testes no navegador em três tamanhos de tela (Playwright)          |
| `pnpm lint`        | ESLint                                                             |
| `pnpm typecheck`   | Verificação de tipos do TypeScript                                 |
| `pnpm build`       | Build de produção de todos os pacotes                              |
| `pnpm db:generate` | Gera uma migração a partir de `apps/api/src/db/schema.ts`          |
| `pnpm db:migrate`  | Aplica as migrações pendentes                                      |

## Publicação do sandbox

O sandbox (`apps/sandbox`) gera um único arquivo HTML, sem dependências. Em produção ele deve ficar em **outra origem** (outro domínio ou subdomínio) que a interface, e a URL dele vai em `VITE_SANDBOX_URL` antes do build da interface. O iframe já isola o código por ser `sandbox` sem `allow-same-origin`; a origem separada é uma segunda camada de proteção.

## Limitações conhecidas

- Arquivos ficam em uma única pasta (sem subpastas) e só `.html`, `.css` e `.js`.
- `import` entre arquivos JavaScript (módulos ES) ainda não é suportado.
- As mensagens de erro do JavaScript vêm do navegador e do Monaco, em inglês.
- O verificador de HTML cobre os erros mais comuns (tags não fechadas, fechamento sem abertura); não é um validador completo.
- O progresso fica no navegador até a Etapa 4 (login); trocar de navegador ou limpar os dados do site recomeça o progresso.
- O registro de termos no Meu Glossário chega na Etapa 6; a etapa de vocabulário já sugere os termos e as pistas de pesquisa.

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
content/      trilhas, módulos e unidades (texto, desafios e avaliações)
  ui/         tokens visuais (cores, tipografia, espaçamento)
docs/         análise, arquitetura e plano por etapas
```

## Documentação

1. [Análise das referências (LiveCodes e Roadmap.sh)](docs/01-analise-referencias.md)
2. [Arquitetura](docs/02-arquitetura.md)
3. [Plano por etapas](docs/03-plano-etapas.md)

## Referências e créditos

- [LiveCodes](https://livecodes.io/) (MIT): referência e futuro motor de execução para linguagens adicionais.
- [roadmap.sh](https://roadmap.sh/): inspiração conceitual para a organização em mapas. Nenhum conteúdo do roadmap.sh é reproduzido neste projeto, por restrição da licença dele.
- Componentes de terceiros: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licença

Copyright (C) 2026 Abraão Jr. Costa e colaboradores do TrilhaCode.

Este programa é software livre, distribuído sob a [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only). Quem modificar o TrilhaCode e oferecê-lo a outras pessoas pela rede deve disponibilizar o código-fonte da versão modificada aos usuários desse serviço.
