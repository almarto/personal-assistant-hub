# Docker Configuration

Este directorio contiene la configuración de Docker para el Personal Assistant Hub monorepo.

## Estructura

```
docker/
├── homepage/
│   └── Dockerfile          # Dockerfile para la aplicación homepage
├── storybook/
│   ├── Dockerfile          # Dockerfile para Storybook
│   └── nginx.conf          # Configuración de Nginx para Storybook
├── postgres/
│   └── init/
│       └── 01-init.sql     # Script de inicialización de PostgreSQL
└── README.md
```

## Servicios Disponibles

### PostgreSQL Database

- **Puerto**: 5432
- **Usuario**: postgres
- **Contraseña**: postgres
- **Base de datos**: personal_assistant_hub (prod) / personal_assistant_hub_dev (dev)
- **Volumen persistente**: postgres_data / postgres_dev_data

### Homepage Application

- **Puerto**: 3000
- **Dockerfile**: Multi-stage build con Node.js 22 Alpine
- **Dependencias**: Conecta con PostgreSQL

### Storybook UI

- **Puerto**: 6006
- **Servidor**: Nginx Alpine
- **Contenido**: Documentación de componentes UI

### Adminer (Solo desarrollo)

- **Puerto**: 8080
- **Uso**: Administración de base de datos
- **Acceso**: http://localhost:8080

## Comandos Útiles

### Desarrollo

```bash
# Iniciar entorno de desarrollo completo
./scripts/setup-development.sh

# Solo base de datos para desarrollo local
pnpm docker:dev

# Ver logs
pnpm docker:dev:logs

# Parar servicios
pnpm docker:dev:down
```

### Producción

```bash
# Construir imágenes
pnpm docker:build

# Iniciar todos los servicios
pnpm docker:prod

# Ver logs
pnpm docker:prod:logs

# Parar servicios
pnpm docker:prod:down
```

### Gestión de Base de Datos

```bash
# Ejecutar migraciones
pnpm db:migrate

# Abrir Drizzle Studio
pnpm db:studio

# Acceder a PostgreSQL directamente
docker exec -it personal-assistant-hub-db-dev psql -U postgres -d personal_assistant_hub_dev
```

## Configuración de Entorno

### Variables de Entorno

Las variables se configuran en:

- `.env.development` - Para desarrollo local
- `.env` - Para producción (crear desde .env.example)

### Volúmenes Persistentes

- `postgres_data` - Datos de producción
- `postgres_dev_data` - Datos de desarrollo

Los datos se mantienen entre reinicios del contenedor.

## Troubleshooting

### Base de datos no conecta

```bash
# Verificar que el contenedor está corriendo
docker ps

# Ver logs de PostgreSQL
docker logs personal-assistant-hub-db-dev

# Reiniciar base de datos
pnpm docker:dev:down && pnpm docker:dev
```

### Problemas de permisos

```bash
# Limpiar volúmenes (⚠️ BORRA TODOS LOS DATOS)
docker-compose -f docker-compose.dev.yml down -v
```

### Reconstruir imágenes

```bash
# Forzar reconstrucción
docker-compose build --no-cache
```
