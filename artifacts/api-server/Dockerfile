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

# Copy package manifest and built output for api-server
COPY --from=builder /workspace/artifacts/api-server/package.json ./package.json
COPY --from=builder /workspace/artifacts/api-server/dist ./dist
COPY --from=builder /workspace/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
