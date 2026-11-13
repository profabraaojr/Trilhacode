# Histórico de versões

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-11

Primeira versão pública, com o escopo inicial do plano em sete etapas.

### Editor e execução

- Interface no estilo VS Code, responsiva (computador, tablet e celular), com tema claro e escuro.
- Editor Monaco com diagnósticos de HTML, CSS e JavaScript; explorador de arquivos e abas; projeto salvo no navegador.
- Execução isolada num iframe em outra origem, com interrupção de laços infinitos e console com a linha de origem.

### Trilhas e conteúdo

- Trilhas em YAML e Markdown, validadas e carregadas sem recompilar (`content:validate`, `content:sync`).
- Unidades com as sete etapas pedagógicas, desafios corrigidos por testes automáticos e avaliações com feedback por alternativa, corrigidas no servidor.
- Primeira trilha: HTML e CSS, com quatro unidades.

### Contas e turmas

- Cadastro com confirmação de e-mail, recuperação de senha e papéis de aluno, professor e administrador.
- Turmas com professor responsável e coprofessores, matrícula por convite (e-mail ou planilha), trilhas com prazo, avaliações complementares, painel da turma e relatório CSV.

### Avaliação e evolução

- Meu Glossário, com verificação de explicação copiada e leitura pelo professor.
- Pontuação em livro-razão, sem bônus por velocidade; painel Minha evolução, com histórico e conteúdos a revisar.

### Qualidade e publicação

- LGPD: exportação dos dados e exclusão da conta pelo próprio usuário; página de privacidade.
- Segurança (OWASP ASVS nível 1): cabeçalhos e Content-Security-Policy estrita, proteção contra CSRF por origem, erros sem detalhes internos, tokens fora dos registros, senhas de 12 caracteres ou mais.
- Acessibilidade verificada com axe-core (WCAG 2.2 AA) nas telas principais; Lighthouse 90 no celular e 100 no computador.
- Imagens Docker, Compose de produção com HTTPS automático e publicação no GitHub Container Registry a cada release.
