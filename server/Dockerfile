# Force Node to resolve IPv4 first. The Docker bridge has no IPv6 NAT, so when
# DNS returns AAAA records npm/node would try IPv6 and hang until timeout. This
# lets us avoid `network: host` in the build. See docker-compose.yml.

# Stage 1: install ALL deps (needed for build)
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY package*.json ./
RUN npm ci

# Stage 2: build TypeScript → dist/
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: production-only deps
FROM node:20-alpine AS prod-deps
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 4: slim runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Same IPv4-first guard for runtime outbound calls (OTP engine, Google APIs).
ENV NODE_OPTIONS=--dns-result-order=ipv4first

# Only production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
# Compiled app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Pre-create writable storage dirs for review media + avatars so the uploads
# controller's mkdirSync (at module load) doesn't crash under USER node.
RUN mkdir -p storage/review-media storage/avatars && chown -R node:node storage

EXPOSE 5084
USER node

CMD ["node", "dist/main"]
