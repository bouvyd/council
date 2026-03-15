FROM node:22-alpine AS base

WORKDIR /app

# Copy workspace manifests first for better layer caching.
COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

COPY backend backend
COPY shared shared

EXPOSE 3001

CMD ["npx", "tsx", "backend/src/index.ts"]