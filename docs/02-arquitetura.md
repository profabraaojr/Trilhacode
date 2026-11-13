# Proposta de arquitetura

Status: **aprovada em 13/11/2026** (nome TrilhaCode, licença AGPL-3.0-only, tecnologias da seção 3). Implementação a partir da Etapa 1.

## 1. Princípios

1. **Conteúdo separado do código.** Trilhas, unidades, questões e desafios são arquivos de dados validados, carregados no banco por um comando de importação. Uma trilha nova não exige recompilar a aplicação.
2. **Linguagens como plugins.** Cada linguagem é registrada por um executor que segue uma interface comum. Adicionar Python ou SQL significa adicionar um executor, não alterar o editor.
3. **Código do aluno nunca roda no servidor nem na origem da aplicação.** Toda execução acontece no navegador, em iframe isolado e origem separada.
4. **Nada de tela falsa.** Recurso não implementado não aparece, ou aparece desabilitado com o rótulo "em breve".
5. **Somente dependências de código aberto,** com licença compatível com a AGPL-3.0 do projeto, registradas em `THIRD_PARTY_NOTICES.md`.

## 2. Visão geral

```
┌──────────────────────────── Navegador ─────────────────────────────┐
│  apps/web  (React + Vite, origem app.exemplo)                      │
│  ┌──────────┬──────────────────────────────┬─────────────────────┐ │
│  │ Trilhas  │ Editor (Monaco) + abas       │ Conteúdo da unidade │ │
│  │ Arquivos │ Console / Terminal           │ Glossário           │ │
│  └──────────┴──────────────┬───────────────┴─────────────────────┘ │
│                            │ postMessage (origem verificada)        │
│  ┌─────────────────────────▼──────────────────────────────────┐    │
│  │ apps/sandbox (origem run.exemplo) iframe sandbox           │    │
│  │   executor web (HTML/CSS/JS)  |  LiveCodes auto-hospedado  │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTPS / JSON
┌──────────────────────────────▼─────────────────────────────────────┐
│  apps/api  (Node + Fastify + Better Auth)                           │
│   auth · trilhas · progresso · avaliações · turmas · relatórios     │
└───────────────┬───────────────────────────────┬────────────────────┘
                │                               │
        PostgreSQL (dados)               SMTP (e-mails de verificação
                                          e recuperação de senha)
```

## 3. Tecnologias propostas

| Camada             | Escolha                                | Licença            | Motivo                                                                                        |
| ------------------ | -------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| Linguagem          | TypeScript em todo o projeto           | Apache-2.0         | Tipos compartilhados entre front, API e validação de conteúdo                                 |
| Monorepo           | pnpm workspaces                        | MIT                | Pacotes independentes no mesmo repositório                                                    |
| Front-end          | React 19 + Vite                        | MIT                | Ecossistema amplo; SPA leve, sem servidor de renderização                                     |
| Editor             | Monaco Editor                          | MIT                | É o editor do VS Code: destaque de sintaxe, numeração, diagnósticos e sugestões já prontos    |
| Mapa da trilha     | React Flow (`@xyflow/react`)           | MIT                | Grafos interativos com nós e arestas                                                          |
| Gráficos do painel | Recharts                               | MIT                | Indicadores do aluno e do professor                                                           |
| API                | Fastify                                | MIT                | Rápido, validação por schema, plugins                                                         |
| Autenticação       | Better Auth                            | MIT                | E-mail/senha, verificação de e-mail, recuperação de senha, sessões e papéis, sem serviço pago |
| Banco              | PostgreSQL                             | PostgreSQL License | Relacional, maduro, gratuito                                                                  |
| ORM e migrações    | Drizzle ORM                            | Apache-2.0         | SQL explícito, migrações versionadas                                                          |
| Validação          | Zod                                    | MIT                | Mesmo schema valida API e arquivos de conteúdo                                                |
| Planilhas          | PapaParse (CSV) + ExcelJS (XLSX)       | MIT                | Importação de alunos                                                                          |
| E-mail             | Nodemailer; Mailpit em desenvolvimento | MIT-0 / MIT        | Qualquer SMTP em produção; caixa de teste local                                               |
| Execução extra     | LiveCodes (auto-hospedado, SDK)        | MIT                | Python, SQL e outras linguagens no navegador                                                  |
| Testes             | Vitest + Playwright                    | MIT / Apache-2.0   | Unidade e ponta a ponta                                                                       |
| Ambiente local     | Docker Compose                         | Apache-2.0         | Sobe Postgres e Mailpit com um comando                                                        |

Alternativa considerada para o front e a API: Next.js em um único app. Descartei porque a separação entre aplicação, API e sandbox fica mais clara em apps distintos, e o sandbox precisa de origem própria de qualquer forma.

## 4. Estrutura do repositório

```
trilhacode/
├── apps/
│   ├── web/            # interface (React + Vite)
│   ├── api/            # API REST + autenticação
│   └── sandbox/        # página estática servida em outra origem
├── packages/
│   ├── shared/         # tipos e schemas Zod comuns
│   ├── content-schema/ # schema das trilhas + CLI de validação/importação
│   ├── runners/        # interface Runner + executores (web, livecodes)
│   └── ui/             # componentes e tokens visuais
├── content/
│   └── trilhas/
│       └── html-css/
│           ├── trilha.yaml
│           └── modulos/01-estrutura/unidades/01-tags/
│               ├── unidade.md         # etapas 1 a 3 e 5
│               ├── exemplo/           # arquivos da demonstração
│               ├── desafio.yaml       # enunciado + testes
│               └── avaliacao.yaml     # questões e feedback
├── docs/
├── docker-compose.yml
└── THIRD_PARTY_NOTICES.md
```

## 5. Execução de código

Interface comum a todos os executores:

```ts
interface Runner {
  id: string; // "web", "python", ...
  languages: string[]; // extensões aceitas
  run(files: ProjectFile[]): Promise<RunSession>; // emite console e resultado
  test(files: ProjectFile[], tests: TestSpec): Promise<TestReport>;
}
```

- **Executor web (implementado na Etapa 2, `packages/runners`).** A cada execução a interface cria um iframe novo apontando para o sandbox (`apps/sandbox`, outra origem), com `sandbox="allow-scripts allow-modals allow-forms"` e sem `allow-same-origin`. Quando o sandbox avisa que está pronto, a interface envia os arquivos por `postMessage`. O sandbox gera URLs `blob:` para o CSS e o JS do projeto, troca as referências do `index.html` por elas, instrumenta os laços e escreve o documento. O console, os erros (com arquivo e linha) e um sinal de vida a cada segundo voltam por `postMessage`; a interface só aceita mensagens do iframe da execução atual.
- **Proteção contra laço infinito.** O JavaScript é analisado com Acorn e cada laço recebe uma verificação de tempo, inserida sem quebras de linha para preservar os números de linha. Passando de 1 s, o laço lança um erro com a linha. Se mesmo assim a página parar de responder, o vigia da interface descarta o iframe após 4 s sem sinal de vida.
- **Executor LiveCodes (etapa posterior).** Usa o SDK em modo headless apontando para a instância própria do LiveCodes. Habilita Python, SQL e outras linguagens sem escrever compiladores.
- **Arquivos do aluno** ficam no IndexedDB do navegador (funciona sem rede) e são sincronizados com a API quando o aluno está autenticado.

## 6. Modelo de dados (resumo)

```
usuarios ──< sessoes                 papel: aluno | professor | admin
usuarios ──1 perfis_aluno            nome, instituicao, ...
instituicoes ──< turmas ──< matriculas >── usuarios(aluno)
turmas >── professor (usuarios)

trilhas ──< modulos ──< unidades ──< etapas
unidades ──1 desafios ; unidades ──1 avaliacoes ──< questoes
trilhas ──< trilha_prerequisitos (grafo do mapa)

atribuicoes      turma × trilha, prazo
progresso        aluno × unidade × etapa, status, concluido_em
tentativas       aluno × avaliacao, respostas, nota, feedback
submissoes       aluno × desafio, arquivos, relatorio de testes
glossario        aluno, termo, significado, explicacao_propria, exemplo, unidade
eventos_pontos   aluno, tipo, pontos, referencia (livro-razão imutável)
projetos_codigo  aluno, unidade, arquivos (jsonb), atualizado_em
```

Os nomes acima descrevem as entidades. No código e no banco os identificadores estão em inglês (`user`, `track`, `module`, `unit`, `unit_progress`...), o que mantém compatibilidade com o Better Auth e facilita contribuições externas; a interface e a documentação permanecem em português. O schema implementado está em `apps/api/src/db/schema.ts`.

O conteúdo vive em `content/` e é copiado para o banco por `pnpm content:sync` (implementado na Etapa 3: `packages/content` valida e compila o Markdown em HTML seguro, separa o gabarito das questões e grava tudo em uma transação); cada item tem um identificador estável (`html-css/estrutura/tags`) para que o progresso dos alunos sobreviva a revisões de texto.

## 7. Segurança e privacidade

- Senhas com hash (scrypt, padrão do Better Auth); sessões em cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- Controle de acesso verificado na API, nunca só na interface. Professor vê apenas alunos das próprias turmas.
- Limite de tentativas em login e recuperação de senha.
- Content-Security-Policy restritiva na aplicação; o sandbox fica em outro domínio.
- Plataforma escolar trata dados de menores: coletar o mínimo, documentar a base legal conforme a LGPD e permitir exportação e exclusão dos dados do aluno.

## 8. Pontuação

Pontos são registrados como eventos num livro-razão (`eventos_pontos`), nunca como um número editável. Regras iniciais, ajustáveis em configuração:

- Etapa concluída: pontos fixos e baixos, para não premiar apenas "clicar até o fim".
- Avaliação: pontos proporcionais ao acerto, contando a **melhor** tentativa; nova tentativa após revisar o conteúdo pode recuperar pontos.
- Desafio: pontos pelos testes aprovados.
- Glossário: pontos quando o aluno escreve a explicação com as próprias palavras (com verificação simples de que não é cópia do campo "significado").
- **Nenhum bônus por velocidade.** O tempo é registrado só para relatórios do professor.

## 9. Identidade visual

- Tema escuro padrão inspirado no VS Code (barra de atividades, barra lateral, área de editor, painel inferior, barra de status), com tema claro disponível. Cores definidas como tokens CSS, sem copiar marcas ou ícones da Microsoft; ícones do conjunto Codicons (CC-BY-4.0) ou Lucide (ISC).
- Tipografia: Inter para interface e JetBrains Mono para código (ambas OFL).
- Responsividade: no celular, os painéis viram abas (Conteúdo · Código · Resultado), em vez de colunas.
- Contraste mínimo WCAG AA e navegação completa por teclado.
