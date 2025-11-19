# Multi-stage build for Homepage
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY apps/homepage/package.json ./apps/homepage/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
FROM base AS builder
RUN pnpm run build --filter=homepage

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy built application
COPY --from=builder /app/apps/homepage/dist ./dist
COPY --from=builder /app/apps/homepage/package.json ./package.json

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", "dist/index.js"]