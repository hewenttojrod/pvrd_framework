# Framework Architecture Reference

## Project Layout

```
pvrd_framework/
├── server/                    Backend project root (Django)
│   ├── manage.py
│   ├── config/                Django config package
│   │   ├── settings.py        Database, apps, middleware
│   │   ├── urls.py            Route composition entry point
│   │   └── wsgi.py / asgi.py
│   └── staticfiles/           Collected static assets
├── client/                    Frontend project root (React + Vite)
│   ├── src/
│   │   ├── App.tsx            Shell component
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
├── modules/                   Feature modules (backend + frontend)
│   └── ModuleName/            See MODULE_SETUP.md
├── docker/                    Container definitions
│   ├── docker-compose.yaml    Service topology and mounts
│   ├── server.Dockerfile      Backend image spec
│   ├── client.Dockerfile      Frontend image spec
│   └── server_setup.sh        Backend startup script
└── scripts/                   Developer automation
    ├── build.bat
    └── create_module.bat
```

## Data Flow

```
React App → (fetch) → http://localhost:8000/api/endpoint/
                        ↓
                      Django Router (config.urls)
                        ↓
                      Module Router (modules/*/server/urls.py)
                        ↓
                      Module View Logic + Models
                        ↓
                      PostgreSQL (service: db)
```

## Module Integration

### Backend
- Framework auto-discovers module apps via settings.
- Module routes are composed into the main router (not manually copied).
- Database migrations are applied per module.

### Frontend
- Framework auto-discovers module entry points via vite glob.
- Module routes are composed into the app router.
- Module components are lazy-loaded.

### Shared
- Each module can define shared contracts (types, constants) in a `shared/` subfolder.
- Both backend and frontend import from this folder.

## Environment Configuration

Backend reads container environment at startup:
- `DATABASE_ENGINE`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`

Frontend does not connect to database directly; all data flows through backend REST API.

## API Endpoint Convention

Module routes are automatically prefixed by module name:
```
/api/{module_name_lowercase}/...
```

Example: Module `Bookstore` exposes routes at `/api/bookstore/books/`, `/api/bookstore/authors/`, etc.
