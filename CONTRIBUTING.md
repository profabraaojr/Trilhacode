# Como contribuir

Obrigado pelo interesse na TrilhaCode. Há espaço para quem escreve código, quem escreve conteúdo e quem testa a plataforma em sala de aula.

## Formas de contribuir

- **Relatar problemas:** abra uma issue com os passos para reproduzir, o que aconteceu e o que era esperado. Falhas de segurança seguem outro caminho, descrito em [SECURITY.md](SECURITY.md).
- **Escrever conteúdo:** novas unidades e trilhas, seguindo [docs/07-criacao-de-conteudo.md](docs/07-criacao-de-conteudo.md).
- **Código:** correções e funcionalidades. Para mudanças grandes, abra uma issue antes para combinar a abordagem.
- **Acessibilidade:** testes com leitor de tela e outras tecnologias assistivas são muito bem-vindos (ver [docs/05-acessibilidade-desempenho.md](docs/05-acessibilidade-desempenho.md)).

## Ambiente de desenvolvimento

Requisitos: Node.js 22, pnpm 10 (via `corepack enable`) e Docker para o PostgreSQL e a caixa de e-mail de teste. Os comandos estão em "Como rodar" no [README](README.md).

Estrutura do monorepo:

| Pasta              | Conteúdo                                                                |
| ------------------ | ----------------------------------------------------------------------- |
| `apps/web`         | Interface (React 19 e Vite)                                             |
| `apps/api`         | API (Fastify, Better Auth e Drizzle com PostgreSQL)                     |
| `apps/sandbox`     | Página isolada que executa o código dos alunos                          |
| `packages/shared`  | Esquemas e tipos compartilhados entre interface e API                   |
| `packages/content` | Validação e compilação do conteúdo                                      |
| `packages/runners` | Protocolo do sandbox, proteção contra laço infinito e testes de desafio |
| `packages/ui`      | Tokens visuais                                                          |
| `content`          | Trilhas, em YAML e Markdown                                             |
| `docs`             | Arquitetura, plano, segurança, acessibilidade, implantação e conteúdo   |

## Antes de abrir um pull request

Rode as verificações (são as mesmas da CI):

```bash
pnpm lint && pnpm format:check && pnpm typecheck
```

```bash
pnpm test
```

```bash
pnpm test:e2e
```

E confira:

- Mudanças no banco vêm com uma migração gerada por `pnpm db:generate`, nunca editada à mão depois de publicada.
- Toda rota nova verifica a sessão e o papel no servidor e tem teste de integração, incluindo o caso de acesso negado.
- Elementos de interface usam papéis e nomes acessíveis, e os testes no navegador os localizam por eles (`getByRole`, `getByLabel`). O teste de acessibilidade com axe precisa continuar passando.
- Nada de scripts inline nem recursos externos: a interface roda sob uma Content-Security-Policy estrita, verificada pelos testes.
- Nenhuma funcionalidade só visual: o que ainda não funciona aparece marcado como "Em breve", com a etapa prevista.

## Convenções

- Código, banco e identificadores em inglês; textos da interface, documentação e mensagens de commit em português.
- Commits no formato `tipo: descrição` (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`).
- Dependências novas precisam de licença compatível com a AGPL-3.0 e entram em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). O pnpm só instala versões publicadas há pelo menos 14 dias.

## Licença das contribuições

Ao contribuir, você concorda que o código é licenciado sob a [AGPL-3.0](LICENSE), como o restante do projeto.
