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

# Install production dependencies specifically for the api-server into its package folder
# This creates a standalone node_modules at artifacts/api-server/node_modules that can be copied
RUN pnpm --no-frozen-lockfile --prod --filter @workspace/api-server --dir artifacts/api-server install --shamefully-hoist

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Copy built output
COPY --from=builder /workspace/artifacts/api-server/dist ./dist
# Also copy the built output to the original workspace path some worker threads expect
COPY --from=builder /workspace/artifacts/api-server/dist /workspace/artifacts/api-server/dist

# Copy the standalone production node_modules created in the builder stage
COPY --from=builder /workspace/artifacts/api-server/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
