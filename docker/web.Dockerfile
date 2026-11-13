# syntax=docker/dockerfile:1
# Imagem da interface e do sandbox, servidos pelo Caddy (HTTPS automático) em duas
# origens diferentes. Contexto de build: raiz do repositório.

FROM node:22-alpine AS build
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
COPY docker/web-entrypoint.sh /usr/local/bin/trilhacode-entrypoint
RUN chmod +x /usr/local/bin/trilhacode-entrypoint
ENTRYPOINT ["trilhacode-entrypoint"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
