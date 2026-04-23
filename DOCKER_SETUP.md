# Docker Setup Reference

## Service Architecture

### Services
- **db**: PostgreSQL storage service.
- **api**: Django backend runtime.
- **web**: React frontend + dev server (Vite).

Services communicate via container network using service names (e.g., `db`, `api`).

### Folder Mappings

```
host                          container (api service)    container (web service)
──────────────────────────────────────────────────────────────────────────
../server          →          /app                       (not mounted)
../client          →          (not mounted)              /app
../modules         →          /modules                   /modules
../data/postgres   →          /var/lib/postgresql/data  (not available)
```

### Endpoints
- API: `http://localhost:8000` → Django runserver inside api container
- Web: `http://localhost:3000` → Vite dev server (port 5173 internally)
- DB: `localhost:5432` → PostgreSQL; from inside containers use service name `db`

## Mount Strategy

### Bind Mounts (Host ↔ Container)
- **Source folder mounted as app root**: Allows hot reload and live debugging.
- **Dependency caches must be separate**: npm packages and Python cache should not be under the mounted app root or they will be overwritten.
- **Startup scripts placed outside app root**: If a setup script is under an app root mount, it disappears when that mount is applied at container runtime.

Example problem:
```
DOCKERFILE: COPY setup.sh /app/docker/setup.sh
COMPOSE:    volumes: ../server:/app

Result: /app/docker/setup.sh is overwritten and gone.
Solution: COPY setup.sh /setup.sh (outside /app mount point)
```

## Port Mapping

Internal container ports do not match host ports. Map the internal listening port to the desired external port.

```
api service:   8000:8000       (internal 8000 → host 8000)
web service:   3000:5173       (internal 5173 → host 3000)
db service:    5432:5432       (internal 5432 → host 5432)
```

If unreachable, verify:
1. Service is listening on the internal port.
2. Port mapping is `HOST:INTERNAL`, not reversed.

## File Watching on Windows

Docker on Windows does not trigger inotify-based file watchers through mounted volumes. Enable polling in the web service environment:
```
CHOKIDAR_USEPOLLING=true
```

## Configuration Alignment

- Backend must read `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD` from environment at container startup.
- These values must match actual database service credentials and network name.
- Avoid duplicating these secrets in multiple config files.

## Scope

- Do not document generated dependency folders or runtime data.
- Document mount paths, port mappings, and service discovery names (these are stable architecture decisions).
