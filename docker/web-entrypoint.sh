#!/bin/sh
# Gera /config.js com os endereços desta instalação, para a mesma imagem servir
# qualquer domínio sem recompilar a interface.
set -e
: "${TRILHACODE_URL:?defina TRILHACODE_URL (ex.: https://trilha.escola.br)}"
: "${TRILHACODE_SANDBOX_URL:?defina TRILHACODE_SANDBOX_URL (ex.: https://sandbox.trilha.escola.br)}"
if [ "$TRILHACODE_URL" = "$TRILHACODE_SANDBOX_URL" ]; then
  echo "TRILHACODE_SANDBOX_URL precisa ser uma origem diferente de TRILHACODE_URL." >&2
  exit 1
fi
json() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
cat > /srv/web/config.js <<JS
// Gerado pelo contêiner na inicialização (docker/web-entrypoint.sh).
window.__TRILHACODE__ = {
  sandboxUrl: "$(json "$TRILHACODE_SANDBOX_URL")",
  institution: "$(json "${TRILHACODE_INSTITUTION:-}")",
  privacyContact: "$(json "${TRILHACODE_PRIVACY_CONTACT:-}")"
};
JS

# Caddyfile final: opções globais (se houver e-mail) + configuração da imagem
{
  if [ -n "${ACME_EMAIL:-}" ]; then printf '{\n\temail %s\n}\n\n' "$ACME_EMAIL"; fi
  cat /etc/caddy/Caddyfile.base
} > /etc/caddy/Caddyfile

exec "$@"
