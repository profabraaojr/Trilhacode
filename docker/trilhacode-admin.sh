#!/bin/sh
# Define o papel de uma conta já cadastrada.
# Uso: docker compose exec api trilhacode-admin email@escola.br admin|professor|aluno
exec node /app/dist/admin/promote.js "$@"
