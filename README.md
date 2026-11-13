# TrilhaCode

Plataforma educacional de programação, de código aberto, que reúne um editor no estilo VS Code e trilhas de aprendizagem com etapas pedagógicas, glossário pessoal, desafios e avaliações.

**Status:** Etapa 1 (fundação e identidade visual) em validação. Áreas da interface marcadas com "Em breve" ainda não funcionam e indicam a etapa em que serão entregues.

## O que já funciona

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

## Estrutura

```
apps/
  web/        interface (React + Vite)
  api/        API (Fastify + Drizzle + PostgreSQL)
  sandbox/    página de execução isolada (Etapa 2)
packages/
  shared/     schemas e tipos usados pela interface e pela API
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
