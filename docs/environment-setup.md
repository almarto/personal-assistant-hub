# Configuración de Variables de Entorno

Este proyecto utiliza diferentes archivos de configuración para desarrollo y producción.

## Archivos de Configuración

### `.env` (Producción)

Contiene las variables para el entorno de producción:

- `POSTGRES_DB=personal_assistant_hub`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=postgres`

### `.env.development` (Desarrollo)

Contiene las variables para el entorno de desarrollo:

- `DB_NAME=personal_assistant_hub_dev`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_assistant_hub_dev`

## Uso con Docker Compose

### Desarrollo

```bash
pnpm docker:dev
```

Utiliza `docker-compose.dev.yml` con variables de `.env.development`

### Producción

```bash
pnpm docker:prod
```

Utiliza `docker-compose.yml` con variables de `.env`

## Scripts Disponibles

- `pnpm docker:dev` - Inicia servicios de desarrollo
- `pnpm docker:dev:down` - Detiene servicios de desarrollo
- `pnpm docker:dev:logs` - Muestra logs de desarrollo
- `pnpm docker:prod` - Inicia servicios de producción
- `pnpm docker:prod:down` - Detiene servicios de producción
- `pnpm docker:prod:logs` - Muestra logs de producción

## Servicios Incluidos

### Desarrollo

- PostgreSQL (puerto 5432)
- Adminer (puerto 8080) - Interfaz web para gestionar la base de datos

### Producción

- PostgreSQL (puerto 5432)
- Homepage App (puerto 3000)
- Storybook (puerto 6006)
