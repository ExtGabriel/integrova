# 📊 Diagrama de Deployment Final

## Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERNET (USUARIOS)                               │
│                   https://tu-dominio.vercel.app                            │
│                   https://tu-dominio.com (GoDaddy)                         │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                    HTTPS (con certificado gratis)
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
┌────────────────────────┐              ┌──────────────────────────┐
│  🌐 VERCEL PLATFORM    │              │  🚂 RAILWAY PLATFORM     │
├────────────────────────┤              ├──────────────────────────┤
│                        │              │                          │
│  FRONTEND ESTÁTICO     │              │  BACKEND NODE.JS         │
│  ✅ Optimizado         │              │  ✅ Escalable            │
│  ✅ CDN Global         │              │  ✅ Auto-restart         │
│  ✅ Auto-deploy        │              │  ✅ Logs en tiempo real  │
│                        │              │                          │
│  Archivos:             │              │  Servidor Express:       │
│  ├─ index.html         │              │  ├─ /api/users           │
│  ├─ login.html         │              │  ├─ /api/commitments     │
│  ├─ dashboard.html     │              │  ├─ /api/entities        │
│  ├─ entidades.html     │              │  ├─ /api/audit/*         │
│  ├─ usuarios.html      │  ◀──────────▶│  ├─ /api/records         │
│  ├─ css/               │   REST API   │  ├─ /api/hallazgos       │
│  ├─ js/                │   + CORS     │  └─ ~40+ endpoints       │
│  │  ├─ api-client.js   │              │                          │
│  │  ├─ auth-guard.js   │              │  Variables:              │
│  │  ├─ dashboard.js    │              │  ├─ SUPABASE_URL         │
│  │  └─ ...             │              │  ├─ SUPABASE_SERVICE...  │
│  └─ assets/            │              │  ├─ FRONTEND_URL         │
│                        │              │  └─ NODE_ENV             │
│  Variables de Entorno: │              │                          │
│  ├─ VITE_SUPABASE_URL  │              │  Port: 3001              │
│  ├─ VITE_SUPABASE_KEY  │              │  Runtime: Node.js 18+    │
│  └─ VITE_API_BASE_URL◀─┼──────────────┤  Memory: 512MB           │
│        (apunta aquí)   │              │                          │
└────────────────────────┘              └──────────────────────────┘
        │                                       │
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                    HTTPS (TLS/SSL)
                            │
                            ▼
              ┌─────────────────────────────┐
              │  🗄️  SUPABASE CLOUD         │
              ├─────────────────────────────┤
              │                             │
              │  PostgreSQL Database        │
              │  ✅ 200MB free              │
              │  ✅ Realtime DB             │
              │                             │
              │  Authentication:            │
              │  ├─ Email/Password          │
              │  ├─ JWT tokens              │
              │  └─ Session management      │
              │                             │
              │  Storage:                   │
              │  └─ File storage (1GB)      │
              │                             │
              │  Variables:                 │
              │  ├─ SUPABASE_URL (pública)  │
              │  ├─ ANON_KEY (pública)      │
              │  └─ SERVICE_KEY (privada)   │
              │                             │
              └─────────────────────────────┘
```

---

## Flujo de Datos: Login

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO ENTRA A LA APP                       │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
        1. Frontend Vercel carga
           (index.html → JavaScript)
                   │
                   ▼
        2. Script llama auth-guard.js
           requireAuth() → verifica sesión
                   │
                   ├──(¿Sesión válida?)──→ ✅ Ir a dashboard
                   │
                   └──(NO)──→ Redirigir a login.html
                              │
                              ▼
                   3. Usuario entra credenciales
                              │
                              ▼
                   4. JavaScript llama Supabase:
                      supabase.auth.signInWithPassword()
                              │
                              ▼
                      ┌─────────────────────┐
                      │ Supabase Auth       │
                      │ Verifica usuario    │
                      │ Genera JWT token    │
                      └────────┬────────────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
                   ▼                       ▼
             ✅ Válido              ❌ Inválido
                   │                       │
                   ▼                       ▼
             Token guardado           Error mostrado
             Redirigir a              Volver a login
             dashboard.html
                   │
                   ▼
        5. Dashboard carga
           API client resuelve VITE_API_BASE_URL
                   │
                   ▼
        6. JavaScript hace requests:
           GET /api/commitments
           GET /api/entities
           (incluye Authorization: Bearer JWT)
                   │
                   ▼
           ┌────────────────────────────┐
           │ Backend (Railway)          │
           │ Valida token               │
           │ Ejecuta query en Supabase  │
           │ Retorna JSON               │
           └────────┬───────────────────┘
                    │
                    ▼
           Response JSON llega a frontend
           JavaScript renderiza tabla
           Usuario ve datos ✅
```

---

## Flujo de Deployment

```
┌─────────────────────────────────────────────────────────┐
│         USUARIO HACE git push A GITHUB                  │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────────┐    ┌─────────────────┐
│  VERCEL CI/CD   │    │  RAILWAY CI/CD  │
├─────────────────┤    ├─────────────────┤
│                 │    │                 │
│ 1. Detecta push │    │ 1. Detecta push │
│ 2. Corre build  │    │ 2. Corre build  │
│    npm run      │    │    npm install  │
│    build        │    │    npm start    │
│ 3. Deploy a CDN │    │ 3. Deploy a     │
│                 │    │    Railway      │
│ URL:            │    │ URL:            │
│ *.vercel.app    │    │ *.railway.app   │
│                 │    │                 │
│ Tiempo: 30s     │    │ Tiempo: 2-5min  │
│                 │    │                 │
│ Status:         │    │ Status:         │
│ ✅ LIVE         │    │ ✅ LIVE         │
└─────────────────┘    └─────────────────┘
    │                         │
    └────────────┬────────────┘
                 │
                 ▼
       ✅ AMBOS EN PRODUCCIÓN
       Usuarios ven nuevos cambios
       en 2-5 minutos
```

---

## Flujo de Variables de Entorno

```
┌─────────────────────────────────────────────────────────┐
│              DESARROLLADOR EN LOCAL                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  .env (LOCAL)                                          │
│  ├─ VITE_SUPABASE_URL=http://localhost              │
│  ├─ VITE_SUPABASE_ANON_KEY=test_key                 │
│  └─ VITE_API_BASE_URL=http://localhost:3001         │
│                                                         │
│  npm run dev                                            │
│  ✅ Frontend en http://localhost:5173                 │
│  ✅ Backend en http://localhost:3001                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         │
                    git push
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌─────────────────────────────┐  ┌──────────────────────────┐
│  VERCEL DASHBOARD           │  │  RAILWAY DASHBOARD       │
├─────────────────────────────┤  ├──────────────────────────┤
│ Environment Variables       │  │ Environment Variables    │
│                             │  │                          │
│ Name: VITE_SUPABASE_URL    │  │ Name: SUPABASE_URL       │
│ Value: https://tuproyecto  │  │ Value: https://tu...     │
│        .supabase.co         │  │        .supabase.co      │
│ Env: Production             │  │ Env: Production          │
│                             │  │                          │
│ Name: VITE_SUPABASE_ANON_KEY   │ Name: SUPABASE_SERVICE...│
│ Value: eyJhbGc...          │  │ Value: eyJhbGc...       │
│ Env: Production             │  │ Env: Production          │
│                             │  │                          │
│ Name: VITE_API_BASE_URL    │  │ Name: FRONTEND_URL       │
│ Value: https://cfe-backend │  │ Value: https://tu-...    │
│        -production-xxx      │  │        .vercel.app       │
│        .railway.app         │  │ Env: Production          │
│ Env: Production             │  │                          │
│                             │  │ Name: NODE_ENV           │
│                             │  │ Value: production        │
└─────────────────────────────┘  └──────────────────────────┘
        │                                  │
        │ Inyecta en build               │ Inyecta en runtime
        │                                  │
        ▼                                  ▼
┌─────────────────────────────┐  ┌──────────────────────────┐
│  VERCEL CDN                 │  │  RAILWAY NODE.JS        │
├─────────────────────────────┤  ├──────────────────────────┤
│                             │  │                          │
│ import.meta.env: {          │  │ process.env: {           │
│  VITE_SUPABASE_URL: "..",   │  │  SUPABASE_URL: "..",    │
│  VITE_SUPABASE_ANON_KEY: ..│  │  SUPABASE_SERVICE_KEY:..│
│  VITE_API_BASE_URL: "..."  │  │  FRONTEND_URL: "..",    │
│ }                           │  │  NODE_ENV: "production" │
│                             │  │ }                        │
└─────────────────────────────┘  └──────────────────────────┘
```

---

## Estados y Transiciones

```
┌──────────────────────────────────────────────────────┐
│              CICLO DE VIDA DEL PROYECTO              │
└──────────────────────────────────────────────────────┘

 DESARROLLO LOCAL          STAGING                PRODUCCIÓN
 (Tu máquina)             (Opcional)              (Internet)
      │                      │                         │
      │  npm run dev         │                         │
      │  ├─ Frontend OK      │                         │
      │  ├─ Backend OK       │  Revisar cambios       │
      │  └─ Test Local       │         │              │
      │         │            │         ▼              │
      │         ├────────────┼────→ Git Push          │
      │         │            │         │              │
      │         │            │         ├──→ Test en   │
      │         │            │              Staging   │
      │         │            │                   │    │
      │         │            │         ✅ Pasa?  │    │
      │         │            │                   ▼    │
      │         │            │              Merge     │
      │         │            │                   │    │
      │         │            │         ✅ Merge OK    │
      │         │            │                   │    │
      │         │            │                   ▼    │
      │         │            │          Auto-deploy   │
      │         │            │                   │    │
      │         │            │                   ▼    │
      │         │            │          Vercel OK ✅  │
      │         │            │          Railway OK ✅ │
      │         │            │                   │    │
      │         │            │                   ▼    │
      │         │            │          EN PRODUCCIÓN │
      │         │            │          USUARIOS VEN  │
      │         │            │          LOS CAMBIOS   │
      │         │            │                        │
      │ Volver a editar...   │                        │
      └────────────────────────────────────────────────┘
            (ciclo continua)
```

---

## Seguridad: Flujo de Claves

```
┌─────────────────────────────────────────────────────────┐
│                   SUPABASE DASHBOARD                    │
│              (Admin solo - sin internet)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Project Settings → API                                │
│  ├─ SUPABASE_URL (pública, safe to share)             │
│  │   └─ Cada cliente obtiene esto                      │
│  │                                                      │
│  ├─ ANON_KEY (pública, BUT limitada)                 │
│  │   └─ Frontend: puedes compartir esto                │
│  │   └─ Limitada por Row Level Security (RLS)         │
│  │   └─ No puede DELETE/UPDATE datos sin RLS           │
│  │                                                      │
│  └─ SERVICE_ROLE_KEY (PRIVADA, NUNCA COMPARTIR) ⚠️   │
│      └─ Backend SOLO: full admin access               │
│      └─ Acceso a TODAS las tablas                      │
│      └─ Railway: guardada en variables de entorno     │
│      └─ NUNCA en código fuente                         │
│      └─ NUNCA en frontend                              │
└─────────────────────────────────────────────────────────┘
         │                     │                    │
         │                     │                    │
    PUBLIC                 PUBLIC               PRIVATE
    (pero limitado         (sin restricciones   (solo backend)
     por RLS)              por defecto)
         │                     │                    │
         ▼                     │                    ▼
    ┌─────────┐                │            ┌──────────────┐
    │ FRONTEND│                │            │  RAILWAY     │
    │(Vercel) │                │            │  (Backend)   │
    └─────────┘                │            └──────────────┘
    ANON_KEY uso:             │            SERVICE_KEY uso:
    ├─ SELECT tablas         │            ├─ SELECT all
    │  (sin RLS) ❌          │            ├─ INSERT all
    │                         │            ├─ UPDATE all
    ├─ SELECT tablas         │            └─ DELETE all
    │  (con RLS) ✅          │
    └─ (limitado)            │
                              │
                              └─► Si RLS no está activo:
                                  ANON_KEY tiene acceso total
                                  ⚠️ PELIGRO: Cualquiera puede
                                     ver/modificar datos
                                  
                              ✅ SOLUCIÓN: Activar RLS en
                                 Supabase Dashboard
```

---

## Monitor en Tiempo Real

```
┌──────────────────────────────────────────────────────┐
│  USUARIO ABRE https://tu-dominio.vercel.app         │
└────────────────┬─────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
   Vercel              Railway
   Analytics           Logs
   ├─ Visits           ├─ Requests
   ├─ Bounce rate      ├─ Response time
   ├─ Performance      ├─ Errors
   └─ Duration         ├─ Memory usage
                       └─ CPU usage
      
      Puedes ver:
      ✅ Si usuarios están usando la app
      ✅ Si hay errores
      ✅ Si el backend está respondiendo rápido
      ✅ Si recursos son suficientes
```

---

**Diagrama actualizado**: 2026-01-05
**Versión**: Final para producción
**Estado**: ✅ Listo para deployment
