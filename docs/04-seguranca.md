# Segurança

Revisão da Etapa 7, feita com base nos requisitos de nível 1 do OWASP Application Security Verification Standard (ASVS 4.0.3). O nível 1 é o mínimo recomendado para qualquer aplicação e pode ser verificado por testes, sem acesso privilegiado ao ambiente. Esta revisão foi feita pela equipe do projeto; não substitui um teste de invasão independente, recomendado antes de uma implantação com muitos usuários.

Situação de cada requisito:

- **Atende:** implementado e, quando indicado, coberto por teste automatizado.
- **Implantação:** depende de quem instala (servidor, domínio, backup).
- **Pendente:** ainda não implementado, com a justificativa.

## Resumo da arquitetura

- A interface e a API ficam na mesma origem (a API em `/api`, atrás do Caddy). A sessão usa cookie, sem token no JavaScript.
- O código dos alunos roda num iframe `sandbox="allow-scripts"` (sem `allow-same-origin`) servido por **outra origem**. Ele não alcança cookies, `localStorage` nem a página da plataforma (teste `e2e/editor.spec.ts`).
- O conteúdo das trilhas é compilado de Markdown para HTML seguro (HTML escrito à mão é exibido como texto), e o gabarito das avaliações fica no servidor.

## V2. Autenticação

| Requisito                                 | Situação     | Como                                                                                                              |
| ----------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| 2.1.1 Senhas com 12 caracteres ou mais    | Atende       | `minPasswordLength: 12` (`apps/api/src/auth.ts`); contas antigas com senha menor continuam entrando.              |
| 2.1.2 Senhas de até 128 caracteres        | Atende       | `maxPasswordLength: 128`.                                                                                         |
| 2.1.7 Bloqueio de senhas vazadas          | **Pendente** | Exige consultar um serviço externo (Have I Been Pwned). Fica para uma versão futura, opcional por configuração.   |
| 2.1.9 Sem regras de composição            | Atende       | Só o tamanho é exigido; a interface sugere usar uma frase.                                                        |
| 2.2.1 Limite de tentativas                | Atende       | Limites do Better Auth: login 10/min, cadastro 5/min, recuperação de senha e reenvio de confirmação 3/min.        |
| 2.4.1 Hash de senha resistente            | Atende       | scrypt (padrão do Better Auth).                                                                                   |
| 2.5.x Recuperação de senha                | Atende       | Link de uso único, válido por 1 hora, enviado por e-mail. As sessões abertas são encerradas ao redefinir a senha. |
| E-mail verificado antes do primeiro login | Atende       | `requireEmailVerification: true`.                                                                                 |

## V3. Sessão

| Requisito                                              | Situação | Como                                                                                                                                                                                              |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.2.x Token de sessão aleatório e novo a cada login    | Atende   | Better Auth.                                                                                                                                                                                      |
| 3.3.1 Logout invalida a sessão no servidor             | Atende   | A sessão é apagada do banco.                                                                                                                                                                      |
| 3.3.x Expiração                                        | Atende   | 7 dias, renovada a cada dia de uso.                                                                                                                                                               |
| 3.4.1 a 3.4.3 Cookie `Secure`, `HttpOnly` e `SameSite` | Atende   | `HttpOnly` e `SameSite=Lax` sempre; `Secure` quando o endereço é `https://` (verificado no teste de fumaça do Docker).                                                                            |
| 3.5.x CSRF                                             | Atende   | Cookie `SameSite=Lax`; a API recusa requisições que alteram dados vindas de outra origem (`apps/api/src/server.ts`, teste `security.test.ts`); o Better Auth confere a origem nas próprias rotas. |
| 3.7.1 Reautenticação para ações sensíveis              | Atende   | Trocar a senha pede a senha atual; excluir a conta pede a senha (teste `privacy.test.ts`).                                                                                                        |

## V4. Controle de acesso

| Requisito                               | Situação | Como                                                                                                                                                                                                         |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1.1 Verificação no servidor           | Atende   | Toda rota protegida consulta a sessão e o papel (`requireUser`, `requireTeacher`).                                                                                                                           |
| 4.1.3 Menor privilégio                  | Atende   | Todo cadastro é de aluno; só um administrador promove contas. O papel não é aceito vindo do formulário (`input: false`).                                                                                     |
| 4.2.1 Acesso a dados de outros usuários | Atende   | Testes de integração confirmam que um aluno não vê dados de outro, que o professor só vê as próprias turmas e o glossário dos próprios alunos, e que o glossário de um aluno não pode ser editado por outro. |
| 4.3.1 Funções administrativas           | Atende   | Rotas de administração exigem o papel `admin`. O único administrador não consegue excluir a própria conta nem remover o próprio papel.                                                                       |

## V5. Validação, sanitização e codificação

| Requisito                  | Situação | Como                                                                                                                          |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 5.1.x Validação de entrada | Atende   | Corpos de requisição validados com zod (`packages/shared`), com limites de tamanho; corpo máximo de 1 MB (padrão do Fastify). |
| 5.2.x HTML de terceiros    | Atende   | O Markdown das trilhas é compilado com HTML bruto desativado; o React escapa o restante.                                      |
| 5.3.x Injeção              | Atende   | Consultas com Drizzle (parametrizadas); nenhuma montagem de SQL com texto do usuário.                                         |
| Código do aluno            | Atende   | Executado só no sandbox isolado, com interrupção de laços infinitos.                                                          |

## V7. Erros e registros

| Requisito                           | Situação | Como                                                                                                                                                                                             |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1.1 Sem credenciais nos registros | Atende   | O log de requisições guarda só método e URL, com tokens de confirmação e de redefinição de senha removidos (`redactUrl`, teste em `security.test.ts`). Cabeçalhos (cookies) não são registrados. |
| 7.4.1 Mensagens de erro genéricas   | Atende   | Erros internos respondem "Erro interno no servidor"; a causa vai só para o log (teste `security.test.ts`).                                                                                       |

## V8. Proteção de dados

| Requisito                          | Situação    | Como                                                                                                                                                          |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.2.1 Sem cache de dados sensíveis | Atende      | Respostas da API com `Cache-Control: no-store`.                                                                                                               |
| 8.3.x Direitos do titular (LGPD)   | Atende      | O usuário baixa todos os seus dados em JSON e exclui a conta, com a senha (Conta › Seus dados). A página de privacidade descreve o que é guardado e para quê. |
| Backup e retenção                  | Implantação | Ver `docs/06-implantacao.md` (cópia do volume do banco).                                                                                                      |

## V9. Comunicação

| Requisito   | Situação    | Como                                                                                                           |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| 9.1.x HTTPS | Implantação | O Caddy obtém e renova certificados automaticamente com domínios públicos e envia `Strict-Transport-Security`. |
| E-mail      | Implantação | Use SMTP com TLS (`SMTP_SECURE=true` na porta 465, ou STARTTLS na 587).                                        |

## V10 e V14. Código malicioso, dependências e configuração

| Requisito                                                                  | Situação | Como                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.3.2 / 14.2.1 Dependências atualizadas e sem vulnerabilidades conhecidas | Atende   | `pnpm audit --prod` revisado. O `dompurify` trazido pelo Monaco foi forçado para a versão corrigida (override em `pnpm-workspace.yaml`). Resta um alerta moderado do `esbuild` (GHSA-67mh-4wv8-2f99), que afeta só o servidor de desenvolvimento do esbuild, usado pela ferramenta de migrações (`drizzle-kit`) e não incluído na execução da plataforma. |
| Pacotes recém-publicados                                                   | Atende   | O pnpm só instala versões publicadas há pelo menos 14 dias (`minimumReleaseAge`).                                                                                                                                                                                                                                                                         |
| 14.4.x Cabeçalhos de segurança                                             | Atende   | Interface: `Content-Security-Policy` sem `unsafe-eval` e sem scripts inline, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS. API: `default-src 'none'`, `X-Frame-Options: DENY`, `nosniff`. O sandbox só pode ser incorporado pela interface.                                                          |
| CSP verificada                                                             | Atende   | Os testes no navegador rodam sob a mesma política de produção, e um teste falha se houver qualquer violação (`e2e/seguranca.spec.ts`).                                                                                                                                                                                                                    |
| 14.3.x Sem informações de depuração em produção                            | Atende   | `NODE_ENV=production` nas imagens; a captura de e-mails dos testes (`MAIL_CAPTURE`) é recusada em produção; o segredo padrão de desenvolvimento é recusado em produção.                                                                                                                                                                                   |
| Contêineres                                                                | Atende   | A API roda como usuário sem privilégios (`node`); o banco não expõe porta para fora da rede do Docker.                                                                                                                                                                                                                                                    |

## Pontos de atenção conhecidos

- **Resultado dos desafios:** os testes rodam no navegador do aluno; o servidor confere o total de testes, mas confia no número de aprovados. Um aluno com conhecimento técnico pode forjar o resultado e ganhar até 30 pontos por desafio. O impacto se limita à pontuação.
- **Senhas vazadas:** ver 2.1.7, acima.
- **Turmas de um professor excluído:** continuam existindo para os coprofessores e administradores.

## Como relatar uma vulnerabilidade

Veja [SECURITY.md](../SECURITY.md).
