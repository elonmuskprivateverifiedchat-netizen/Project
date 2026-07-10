FROM node:20-alpine AS builder
WORKDIR /workspace

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Copy workspace files and install dependencies
COPY . .
ENV CI=true
RUN pnpm install --frozen-lockfile

# Build the api-server
RUN pnpm --filter @workspace/api-server run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Copy built output
COPY --from=builder /workspace/artifacts/api-server/dist ./dist

# Copy lockfile and workspace config so pnpm can install production deps for this package
COPY --from=builder /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /workspace/artifacts/api-server/package.json ./package.json

# Install only production dependencies for the api-server package
ENV NODE_ENV=production
RUN pnpm install --no-frozen-lockfile --prod --filter @workspace/api-server

EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
