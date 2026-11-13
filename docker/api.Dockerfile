# syntax=docker/dockerfile:1
# Imagem da API (Fastify + Better Auth + Drizzle). Contexto de build: raiz do repositório.

FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter "@trilhacode/api..."
RUN pnpm --filter "@trilhacode/api..." build
# Só a API e as dependências de produção, com os pacotes do monorepo já compilados.
RUN pnpm deploy --filter @trilhacode/api --prod --legacy /out

FROM node:22-alpine
LABEL org.opencontainers.image.source="https://github.com/profabraaojr/Trilhacode"
LABEL org.opencontainers.image.description="TrilhaCode: API"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
ENV NODE_ENV=production API_HOST=0.0.0.0 API_PORT=3000
WORKDIR /app
COPY --from=build /out ./
COPY content /content
COPY docker/api-entrypoint.sh /usr/local/bin/trilhacode-entrypoint
COPY docker/trilhacode-admin.sh /usr/local/bin/trilhacode-admin
RUN chmod +x /usr/local/bin/trilhacode-entrypoint /usr/local/bin/trilhacode-admin
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://127.0.0.1:3000/api/health > /dev/null || exit 1
ENTRYPOINT ["trilhacode-entrypoint"]
CMD ["node", "dist/index.js"]
