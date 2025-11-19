# Multi-stage build for Storybook
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Storybook
FROM base AS builder
RUN pnpm run build-storybook --filter=@personal-assistant-hub/ui

# Production stage with nginx
FROM nginx:alpine AS runner

# Copy built storybook
COPY --from=builder /app/packages/ui/storybook-static /usr/share/nginx/html

# Copy nginx configuration
COPY docker/storybook/nginx.conf /etc/nginx/nginx.conf

EXPOSE 6006

CMD ["nginx", "-g", "daemon off;"]