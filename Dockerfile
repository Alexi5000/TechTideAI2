# ─── Stage 1: Build ──────────────────────────────────────
FROM node:20-slim AS build

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace config and lockfile first (cache layer)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY apis/package.json apis/tsconfig.json apis/
COPY agents/package.json agents/tsconfig.json agents/tsconfig.build.json agents/
COPY backend/package.json backend/tsconfig.json backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apis/src/ apis/src/
COPY agents/src/ agents/src/
COPY backend/src/ backend/src/

# Build all packages in dependency order
RUN pnpm -C apis build && \
    pnpm -C agents build && \
    pnpm -C backend build

# ─── Stage 2: Runtime ────────────────────────────────────
FROM node:20-slim AS runtime

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apis/package.json apis/
COPY agents/package.json agents/
COPY backend/package.json backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=build /app/apis/dist/ apis/dist/
COPY --from=build /app/agents/dist/ agents/dist/
COPY --from=build /app/backend/dist/ backend/dist/

# Runtime configuration
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4050
EXPOSE 4050

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4050/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "backend/dist/index.js"]
