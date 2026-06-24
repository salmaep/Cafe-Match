# Build context = REPO ROOT (see docker-compose.yml `client.build.context: .`).
# This is so we can `COPY shared/` alongside `COPY client/`. Vite resolves
# `@shared` → `../shared` at build time and bundles the files into the static
# output. After build there's no runtime dependency on this folder layout.

# Force Node to resolve IPv4 first. The Docker bridge has no IPv6 NAT, so when
# DNS returns AAAA records npm/node would try IPv6 and hang until timeout. This
# lets us avoid `network: host` in the build. See docker-compose.yml.

# Stage 1: install deps
FROM node:20-alpine AS deps
WORKDIR /app/client
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY client/package*.json ./
RUN npm ci

# Stage 2: build static assets
# Vite reads `client/.env` from the project root automatically and bakes
# values into the bundle.
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY shared ./shared
COPY client ./client
WORKDIR /app/client
RUN npm run build

# Stage 3: serve static assets via nginx
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5083
CMD ["nginx", "-g", "daemon off;"]
