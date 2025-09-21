FROM node:20.11-alpine AS deps
WORKDIR /app
# Copia apenas manifests para cache de dependências
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts

FROM node:20.11-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
# Build (com variáveis injetadas em runtime pelo compose via VITE_API_URL se necessário)
RUN npm run build

# Nginx vai servir os estáticos; copiamos para um volume compartilhado
FROM alpine:3.20 AS exporter
WORKDIR /out
COPY --from=build /app/dist ./
