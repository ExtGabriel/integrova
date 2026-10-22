# INTEGROVA

Plataforma de gestión y auditoría para: compromisos, entidades, formularios,
estados financieros, ajustes, consultas y módulos de auditoría.

## Arquitectura

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Frontend   │─────▶│  Backend Express │─────▶│   Supabase   │
│ (estático)   │      │   server.js      │      │  (Postgres)  │
│ Vercel       │      │   Railway :3001  │      │              │
└──────┬───────┘      └──────────────────┘      └──────▲───────┘
       │                                              │
       └────────── Supabase (anon key + RLS) ─────────┘
```

- **Frontend** — SPA estática en `CFE INSIGHT/App/` (`pages/`, `js/`, `css/`,
  `audit/`). Sin framework ni build: HTML + JS vanilla. El navegador habla
  directo con Supabase (anon key, protegida por RLS) para lecturas y con el
  backend `/api/*` para operaciones sensibles.
- **Backend** — `server.js` (Express). Sirve los estáticos de
  `CFE INSIGHT/App`, expone la API REST y usa la **service role key** de
  Supabase (omite RLS) para operaciones administrativas: gestión de usuarios,
  borrado en cascada de entidades/compromisos/datasets, procesamiento de
  Excel (`xlsx`), anotaciones PDF (`pdf-lib`) y subida de archivos (`multer`).
- **Base de datos** — Supabase Postgres con RLS. Las migraciones están en
  `supabase-migrations/` y se aplican manualmente desde el SQL Editor.

## Estructura

```
server.js                  Backend Express (API + estáticos)
railway.toml               Config deploy Railway (backend)
vercel.json                Config deploy Vercel (frontend + proxy /api)
supabase-migrations/       Scripts SQL del esquema
CFE INSIGHT/
  App/
    index.html             Entrada → redirige a /pages/login.html
    pages/                 Pantallas (dashboard, compromisos, entidades,
                           formularios, módulos de auditoría, etc.)
    js/                    Módulos: api-client.js, database-api.js,
                           config-supabase.js, utils.js, ...
    css/ audit/ assets/    Estilos, papeles de trabajo, recursos
    supabase-migrations/   Copia de migraciones
```

> Nota: existen copias legacy en la raíz (`pages/`, `js/`, `audit/`, `docs/`
> parciales) que **no son servidas por el servidor**. La versión real siempre
> es `CFE INSIGHT/App/`.

## Ejecutar en local

```bash
npm install
# crear .env con las variables de abajo
node server.js          
```

Abrir `http://localhost:3001` → redirige al login.

## Variables de entorno

| Variable | Uso |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo backend.** Admin total (bypass RLS). Nunca exponer al cliente |
| `JWT_SECRET` | Firma de tokens de sesión de la API |
| `SESSION_SECRET` | Sesiones |
| `OPENAI_API_KEY` | Funciones de IA (soporte/chat) |
| `CORS_ORIGIN` | Origen permitido para la API |
| `DEMO_MODE` | Modo demo sin datos reales |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | Rate limiting de `/api/` |
| `PORT` | Puerto local (default 3001) |

El anon key del frontend vive en `App/js/config-supabase.js` — es pública por
diseño y está protegida por RLS.

## Deploy

El sistema está dividido en dos servicios:

- **Frontend → Vercel** (`vercel.json`): publica `CFE INSIGHT/App` como
  estático. Las peticiones `/api/*` se reescriben al backend en Railway
  (`integrova-production-5b1b.up.railway.app`). `/` redirige a
  `/pages/login.html`.
- **Backend → Railway** (`railway.toml`): nixpacks, `node server.js`,
  puerto 3001. Las variables de entorno se configuran en el dashboard de
  Railway — **nunca** subir el `.env` al repo.
- **Supabase**: los cambios de esquema se aplican a mano con los scripts de
  `supabase-migrations/`.

Flujo: push a `main` → redeploy automático en Vercel y Railway (según la
integración configurada en cada plataforma).

## Seguridad

- `/api/*` pasa por `authenticateToken` (JWT) + rate limiting; las rutas de
  escritura además exigen `requireEditor`.
- Roles de usuario: `admin`, `editor`, `viewer` (ver `docs/sistema/` para el
  detalle de permisos).
- La `service_role` key solo se usa en `server.js`. Si algún día se filtra,
  rotarla en Supabase → Settings → API.

## Borrado en cascada

Eliminar una **entidad** o un **compromiso** borra permanentemente todo lo
relacionado (datasets, cuentas, asignaciones, ajustes, estados financieros,
ledger, formularios, consultas, subcarpetas, observaciones). La cascada la
ejecuta el backend con service role — no hay `ON DELETE CASCADE` en la BD.
