# Build context = REPO ROOT (see docker-compose.yml `client.build.context: .`).
# This is so we can `COPY shared/` alongside `COPY client/`. Vite resolves
# `@shared` → `../shared` at build time and bundles the files into the static
# output. After build there's no runtime dependency on this folder layout.

# Stage 1: install deps
FROM node:20-alpine AS deps
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

# Stage 2: build static assets
# Vite reads `client/.env` from the project root automatically and bakes
# values into the bundle.
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY shared ./shared
COPY client ./client
WORKDIR /app/client
RUN npm run build

# Stage 3: serve static assets via nginx
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3083
CMD ["nginx", "-g", "daemon off;"]
