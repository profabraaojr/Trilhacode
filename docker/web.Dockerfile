# syntax=docker/dockerfile:1
# Imagem da interface e do sandbox, servidos pelo Caddy (HTTPS automático) em duas
# origens diferentes. Contexto de build: raiz do repositório.

# A compilação roda na arquitetura da máquina de build (sem emulação): o resultado é
# JavaScript e arquivos estáticos, iguais para amd64 e arm64. Só o estágio final é
# específico de cada plataforma. Compilar sob emulação levava mais de uma hora.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter "@trilhacode/web..." --filter "@trilhacode/sandbox..."
RUN pnpm --filter @trilhacode/sandbox build && pnpm --filter @trilhacode/web build

FROM caddy:2-alpine
LABEL org.opencontainers.image.source="https://github.com/profabraaojr/Trilhacode"
LABEL org.opencontainers.image.description="TrilhaCode: interface e sandbox (Caddy)"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
COPY --from=build /repo/apps/web/dist /srv/web
COPY --from=build /repo/apps/sandbox/dist /srv/sandbox
COPY docker/Caddyfile /etc/caddy/Caddyfile.base
COPY --chmod=755 docker/web-entrypoint.sh /usr/local/bin/trilhacode-entrypoint
ENTRYPOINT ["trilhacode-entrypoint"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
