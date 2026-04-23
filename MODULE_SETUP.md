# Module Setup Reference

## Module Structure Template

```
modules/ModuleName/
├── __init__.py                    (empty; makes ModuleName importable)
├── server/                        Django app
│   ├── __init__.py
│   ├── apps.py                    App config (auto-generated)
│   ├── models.py                  Domain models
│   ├── views.py                   View functions / API logic
│   ├── urls.py                    Route definitions
│   ├── admin.py                   Django admin registration
│   ├── tests.py
│   └── migrations/                (auto-generated)
├── client/                        React components
│   ├── index.ts                   Entry point: exports component and route
│   ├── Home.tsx                   Main component
│   ├── components/                Feature-specific components
│   └── tests/
└── shared/                        Contracts
    ├── types.ts                   TypeScript interfaces
    ├── constants.ts               Shared constants
    └── utils.ts                   Utility functions
```

## Backend Integration

Framework discovers modules by folder presence and required files.

**Required for registration:**
- `modules/ModuleName/__init__.py` (can be empty)
- `modules/ModuleName/server/__init__.py` (auto-created by startapp)
- `modules/ModuleName/server/apps.py` (auto-created by startapp)

**Backend entry point:**
- `modules/ModuleName/registry.py` - stores locations of django components framework needs to pull in (models/urls/config etc...)
- Router automatically prefixes endpoints: `/api/modulename/...`

**Database:**
- Define models in `models.py`
- Run migrations via container: models are auto-discovered

## Frontend Integration

Framework auto-discovers modules in the build.

**Required for registration:**
- `modules/ModuleName/client/index.ts` — must export:
  - default: React component
  - route: string (path)

**Frontend entry point pattern:**
```typescript
// modules/ModuleName/client/index.ts
export const route = '/modulename'
export { default } from './Home'
```

**Routes are auto-composed** into the app router and lazy-loaded.

## Shared Contracts

**Location:** `modules/ModuleName/shared/`

**Purpose:** Define interfaces and constants used by both backend and frontend.

**Example:**
```typescript
// TypeScript interface
export interface DomainEntity {
  id: number
  name: string
  createdAt: string
}
```

Both backend (when serializing JSON) and frontend (when consuming JSON) should align with these contracts.

## Backend → Frontend Communication

1. Module defines a view that returns JSON.
2. Shared contract defines the shape of that JSON.
3. Frontend fetches from `/api/modulename/endpoint` and deserializes into the shared type.

**Example backend snippet:**
```python
# modules/ModuleName/server/views.py imports from shared types as reference
from django.http import JsonResponse
from ModuleName.server.models import DomainModel

def get_entities(request):
    items = DomainModel.objects.all().values('id', 'name', 'created_at')
    return JsonResponse({'items': list(items)})
```

**Example frontend snippet:**
```typescript
// modules/ModuleName/client/Home.tsx
import { DomainEntity } from '../shared/types'
import { API_BASE } from '../shared/constants'

const response = await fetch(`${API_BASE}/endpoint`)
const data: { items: DomainEntity[] } = await response.json()
```

## New Module Workflow

1. Create folder: `modules/ModuleName/`
2. Add `__init__.py` (empty file)
3. Run: `.\ scripts/create_module.bat ModuleName` (creates server app)
4. Add models to `server/models.py`
5. Add routes to `server/urls.py` (or create urls.py if missing)
6. Create `client/index.ts` with route and component export
7. Create `shared/types.ts` with data contracts
8. Verify discovery: backend should auto-register app, frontend should auto-register route

## Conventions

- **Import paths:** Use absolute module names. In `modules/ModuleName/server/models.py`, import as `from config.settings import...` not relative paths.
- **Route naming:** Use lowercase, dasherized paths in frontend; let backend auto-prefix with module name.
- **Shared artifacts:** Keep to interfaces and constants only; avoid runtime logic in shared.
- **Testing:** Keep tests inside each module (server/tests.py, client/tests/).
