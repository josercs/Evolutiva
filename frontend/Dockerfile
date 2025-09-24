FROM node:20.11-alpine AS deps
WORKDIR /app
# Copia manifests (npm e/ou pnpm)
COPY sistema-estudos/package.json sistema-estudos/package-lock.json* sistema-estudos/pnpm-lock.yaml* ./
# Instala pnpm leve e escolhe estratégia ótima
RUN corepack enable && \
	 if [ -f pnpm-lock.yaml ]; then \
		 echo "[info] pnpm-lock.yaml detectado (pode estar desatualizado)" && \
		 pnpm install --no-frozen-lockfile --ignore-scripts; \
	 elif [ -f package-lock.json ]; then \
		 npm ci --ignore-scripts; \
	 else \
		 npm install --ignore-scripts; \
	 fi

FROM node:20.11-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY sistema-estudos/ ./
# Build (variáveis ex: VITE_API_URL via compose)
RUN npm run build

FROM node:20.11-alpine AS exporter
WORKDIR /out
COPY --from=build /app/dist ./
