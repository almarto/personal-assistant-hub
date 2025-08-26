#!/bin/bash

# Setup script for Personal Assistant Hub development environment

set -e

echo "🚀 Setting up Personal Assistant Hub development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.development..."
    cp .env.development .env
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start development database
echo "🐘 Starting PostgreSQL database..."
pnpm docker:dev

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
pnpm db:migrate

echo "✅ Development environment setup complete!"
echo ""
echo "🎉 You can now:"
echo "  - Start development: pnpm dev"
echo "  - View Storybook: pnpm storybook"
echo "  - Access database admin: http://localhost:8080"
echo "  - View database studio: pnpm db:studio"
echo ""
echo "📊 Services running:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Adminer: http://localhost:8080"
echo ""
echo "To stop the database: pnpm docker:dev:down"