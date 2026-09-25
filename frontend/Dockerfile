# syntax=docker/dockerfile:1

# ---- deps: instala dependências (inclui devDependencies, necessárias para o build do Vite) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- dev: servidor de desenvolvimento com hot reload (uso local via docker-compose.yml) ----
FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build: gera o bundle estático de produção ----
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# ---- production: serve o build estático via Nginx (imagem final enxuta, sem Node) ----
FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
