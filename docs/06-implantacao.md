# Implantação com Docker

Este guia instala a TrilhaCode num servidor próprio (da escola, da secretaria ou de um provedor de nuvem), com HTTPS automático. Leva cerca de 30 minutos para quem já administra um servidor Linux.

## O que é instalado

| Serviço | Imagem                                | Função                                                        |
| ------- | ------------------------------------- | ------------------------------------------------------------- |
| `db`    | `postgres:16-alpine`                  | Banco de dados (volume `pgdata`).                             |
| `api`   | `ghcr.io/profabraaojr/trilhacode-api` | API. Ao iniciar, aplica as migrações e carrega as trilhas.    |
| `web`   | `ghcr.io/profabraaojr/trilhacode-web` | Caddy servindo a interface e o sandbox, com HTTPS automático. |

A interface e o sandbox **precisam** ficar em origens diferentes, por exemplo `trilha.escola.br` e `sandbox.trilha.escola.br`. Essa separação é uma das camadas que impedem o código dos alunos de alcançar a plataforma.

## Requisitos

- Servidor Linux com Docker e o plugin Compose (`docker compose version`), 2 GB de RAM e 10 GB de disco para começar.
- Dois nomes de domínio (ou subdomínios) apontando para o IP do servidor, com registro DNS do tipo A ou AAAA.
- Portas 80 e 443 liberadas no firewall. O Caddy usa a 80 para obter o certificado.
- Uma conta de e-mail com acesso SMTP, para enviar a confirmação de cadastro, a recuperação de senha e os convites de turma.

## Instalação

1. Baixe os arquivos de implantação do repositório (não é preciso o código inteiro):

   ```bash
   mkdir trilhacode && cd trilhacode
   ```

   ```bash
   curl -fsSLO https://raw.githubusercontent.com/profabraaojr/Trilhacode/v1.0.0/docker-compose.prod.yml
   ```

   ```bash
   curl -fsSL -o .env.prod https://raw.githubusercontent.com/profabraaojr/Trilhacode/v1.0.0/.env.prod.example
   ```

2. Gere a senha do banco e o segredo das sessões:

   ```bash
   openssl rand -base64 32
   ```

   ```bash
   openssl rand -base64 48
   ```

3. Edite `.env.prod` e preencha os endereços, as duas senhas geradas, o SMTP e, para a página de privacidade, o nome da instituição e o contato do encarregado de dados. Proteja o arquivo:

   ```bash
   chmod 600 .env.prod
   ```

4. Suba os serviços:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

5. Acompanhe a inicialização. A API mostra "Migrações aplicadas" e "Conteúdo sincronizado"; o Caddy obtém os certificados no primeiro acesso:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f
   ```

6. Acesse o endereço da interface, crie a sua conta e confirme o e-mail. Depois, torne essa conta administradora:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod exec api trilhacode-admin seu.email@escola.br admin
   ```

   Pela visão Conta, o administrador promove professores. O mesmo comando aceita os papéis `professor` e `aluno`.

## Verificação

- A barra de status, no rodapé da interface, mostra "Servidor conectado" e a versão.
- `https://seu-endereco/api/health` responde `"status":"ok"` e `"database":"up"`.
- No Explorador, ao abrir e editar o `index.html`, o resultado aparece ao lado. Se ficar em branco, confira `TRILHACODE_SANDBOX_URL` e o DNS do sandbox.
- O e-mail de confirmação chega. Se não chegar, veja os registros da API (`logs api`) e os dados do SMTP.

## Atualização

1. Leia as notas da nova versão (aba Releases do repositório).
2. Altere `TRILHACODE_VERSION` em `.env.prod`.
3. Baixe as imagens e reinicie. As migrações rodam sozinhas:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod pull
   ```

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

Faça uma cópia do banco antes de atualizar.

## Cópia de segurança

Cópia diária do banco (agende com `cron`):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_dump -U trilhacode -Fc trilhacode > trilhacode-$(date +%F).dump
```

Restauração numa instalação nova, com os serviços parados exceto o `db`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_restore -U trilhacode -d trilhacode --clean < trilhacode-AAAA-MM-DD.dump
```

Guarde as cópias fora do servidor e com acesso restrito: elas contêm dados pessoais de estudantes. Defina também por quanto tempo serão mantidas, conforme a política de privacidade da instituição.

## Conteúdo próprio

As imagens já trazem as trilhas do repositório. Para usar trilhas próprias, monte uma pasta no serviço `api` e indique-a em `CONTENT_DIR`:

```yaml
api:
  volumes:
    - ./content:/conteudo:ro
  environment:
    CONTENT_DIR: /conteudo
```

O formato está em [docs/07-criacao-de-conteudo.md](07-criacao-de-conteudo.md). O conteúdo é recarregado a cada reinício da API.

## Gerar as imagens localmente

Sem o registro do GitHub, o Compose também compila as imagens a partir do código:

```bash
git clone https://github.com/profabraaojr/Trilhacode.git && cd Trilhacode
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Variáveis

| Variável                                                          | Obrigatória                  | Descrição                                                                                     |
| ----------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| `TRILHACODE_URL`                                                  | Sim                          | Endereço público da interface, com `https://`.                                                |
| `TRILHACODE_SANDBOX_URL`                                          | Sim                          | Endereço público do sandbox, em outra origem.                                                 |
| `POSTGRES_PASSWORD`                                               | Sim                          | Senha do banco.                                                                               |
| `BETTER_AUTH_SECRET`                                              | Sim                          | Segredo das sessões, com 32 ou mais caracteres. Trocá-lo encerra todas as sessões.            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Sim (exceto usuário e senha) | Servidor de e-mail.                                                                           |
| `MAIL_FROM`                                                       | Sim                          | Remetente dos e-mails.                                                                        |
| `TRILHACODE_VERSION`                                              | Não                          | Versão das imagens (padrão `1.0.0`).                                                          |
| `ACME_EMAIL`                                                      | Não                          | E-mail para avisos do Let's Encrypt.                                                          |
| `TRILHACODE_INSTITUTION`, `TRILHACODE_PRIVACY_CONTACT`            | Não, mas recomendadas        | Instituição responsável e contato do encarregado de dados, exibidos na página de privacidade. |

## Publicação das imagens (mantenedores)

Ao publicar uma release no GitHub com uma tag `vX.Y.Z`, o workflow `.github/workflows/release.yml` gera as imagens para `amd64` e `arm64` e as publica em `ghcr.io/profabraaojr/trilhacode-api` e `trilhacode-web`, com as tags `X.Y.Z`, `X.Y` e `latest`. Na primeira publicação, o GitHub cria os pacotes como privados: em **Packages › trilhacode-api › Package settings**, mude a visibilidade para pública (o mesmo para `trilhacode-web`). Sem isso, quem instalar não conseguirá baixar as imagens.
