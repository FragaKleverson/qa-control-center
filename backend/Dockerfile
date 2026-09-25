# syntax=docker/dockerfile:1

# ---- deps: instala apenas dependências de produção, em camada cacheável ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- production: imagem final enxuta, sem ferramentas de build, usuário não-root ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY templates ./templates
COPY prisma/schema.prisma prisma/migrations ./prisma/

# Usuário não-root — evita rodar o processo Node como root dentro do container
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs \
    && chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3001

# Liveness/readiness usando o endpoint público /health (Fase 4, item 14)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]