# Stage 1: install deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: build static assets
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_URL=http://localhost:3084/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 3: serve via Vite preview
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3083
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3083"]
