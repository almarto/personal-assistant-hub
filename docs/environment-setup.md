# Environment Variables Configuration

This project uses different configuration files for development and production.

## Configuration Files

### `.env` (Production)

Contains variables for the production environment:

- `POSTGRES_DB=personal_assistant_hub`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=postgres`

### `.env.development` (Development)

Contains variables for the development environment:

- `DB_NAME=personal_assistant_hub_dev`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_assistant_hub_dev`

## Usage with Docker Compose

### Development

```bash
pnpm docker:dev
```

Uses `docker-compose.dev.yml` with variables from `.env.development`

### Production

```bash
pnpm docker:prod
```

Uses `docker-compose.yml` with variables from `.env`

## Available Scripts

- `pnpm docker:dev` - Start development services
- `pnpm docker:dev:down` - Stop development services
- `pnpm docker:dev:logs` - Show development logs
- `pnpm docker:prod` - Start production services
- `pnpm docker:prod:down` - Stop production services
- `pnpm docker:prod:logs` - Show production logs

## Included Services

### Development

- PostgreSQL (port 5432)
- Adminer (port 8080) - Web interface for database management

### Production

- PostgreSQL (port 5432)
- Homepage App (port 3000)
- Storybook (port 6006)
