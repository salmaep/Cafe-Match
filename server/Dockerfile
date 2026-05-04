# Stage 1: install ALL deps (needed for build)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: build TypeScript → dist/
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: production-only deps
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 4: slim runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
# Compiled app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

EXPOSE 3000
USER node

CMD ["node", "dist/main"]
