#!/bin/sh
# Antes de iniciar a API: aplica as migrações do banco e sincroniza o conteúdo das
# trilhas (/content). Defina SKIP_STARTUP_TASKS=true para pular as duas etapas.
set -e
if [ "${SKIP_STARTUP_TASKS:-false}" != "true" ]; then
  node dist/db/migrate.js
  node dist/content/sync.js "${CONTENT_DIR:-/content}"
fi
exec "$@"
