# 🔗 Integración Frontend-Backend: Arquitectura Deployment

**Resumen**: Integrova - Frontend estático en Vercel + Backend Express en Railway  
**Comunicación**: HTTPS REST API con CORS configurado

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                   USUARIOS (Internet)                    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
     ┌───────────────┴───────────────┐
     │                               │
┌────▼─────────────────┐    ┌──────▼──────────────────┐
│   VERCEL Frontend    │    │  Railway Backend       │
│  Static HTML/JS/CSS  │────│   Express API          │
│  ✅ Production Ready │    │  ✅ Production Ready   │
│                      │    │                         │
│ URLs:                │    │ URLs:                  │
│ https://dominio.com  │    │ https://api.../api/*   │
│ https://...vercel.app│    │                        │
└──────────────────────┘    └──────────────────────────┘
        ▲                            ▲
        │                            │
   Código (HTML)                 Código (Express)
   Variables de                  Variables de
   entorno (Vercel)              entorno (Railway)
```

---

## 📡 Flujo de Comunicación

### Ejemplo: Usuario hace login

```
1. Usuario escribe email/password en frontend
2. Frontend envía request:
   POST https://api.../api/auth/login
   (auth delegada a Supabase, no a backend)

3. Backend valida y retorna:
   {"success": true, "session": {...}}

4. Frontend guarda sesión en Supabase
5. Usuario redirecciona a dashboard
```

### Ejemplo: Dashboard carga datos

```
1. Dashboard.html carga en Vercel
2. JavaScript en frontend ejecuta:
   GET https://api.../api/commitments
   (Headers incluyen Authorization: Bearer TOKEN)

3. Backend recibe request:
   - Valida token Supabase
   - Ejecuta query en BD
   - Retorna JSON

4. Frontend renderiza datos en tabla
```

---

## 🔒 Seguridad

### Frontend (Vercel)
- ✅ SOLO tiene `VITE_SUPABASE_ANON_KEY`
- ✅ NO tiene claves privadas
- ✅ CORS permite comunicación con backend

### Backend (Railway)
- ✅ Tiene `SUPABASE_SERVICE_ROLE_KEY` (privada, admin)
- ✅ CORS restringido a dominio Vercel + localhost
- ✅ Variables de entorno nunca se exponen en frontend

### Comunicación
- ✅ HTTPS obligatorio (TLS/SSL)
- ✅ CORS headers válidos
- ✅ Autenticación via Supabase tokens

---

## 🔄 Variables de Entorno

### Frontend (Vercel - `VITE_` prefix)

```bash
# Variables públicas (inyectadas en build)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Clave PÚBLICA

# Apunta al backend en Railway
VITE_API_BASE_URL=https://cfe-backend-production-xxxx.railway.app

# Usadas por: CFE INSIGHT/App/js/api-client.js
```

**Verificación**:
```javascript
// En DevTools Console del frontend
console.log(window.location.href) // https://dominio.com
console.log(import.meta.env.VITE_API_BASE_URL) // https://api.../
```

### Backend (Railway - environment)

```bash
# Variables privadas (NO inyectadas en frontend)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Clave PRIVADA (admin)

# Para CORS
FRONTEND_URL=https://dominio.com

# Sistema
NODE_ENV=production
PORT=3001

# Opcionales
OPENAI_API_KEY=sk-... (si usas IA)
```

**Verificación**:
```bash
# En Railway Logs, debería ver:
# ✅ Variables de entorno cargadas correctamente
```

---

## 🌐 URLs de Endpoints

### Frontend

```javascript
// Resuelto automáticamente en api-client.js
const API_BASE_URL = "https://cfe-backend-production-xxxx.railway.app"

// Usado por todas las páginas:
fetch(`${API_BASE_URL}/api/users`)
fetch(`${API_BASE_URL}/api/commitments`)
etc.
```

### Backend

```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id

GET    /api/commitments
GET    /api/commitments/:id
POST   /api/commitments
PUT    /api/commitments/:id
DELETE /api/commitments/:id

... más endpoints en server.js
```

---

## ⚙️ Deployment Checklist

### Backend (Railway)

- [ ] Repository conectado a Railway
- [ ] `SUPABASE_URL` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `FRONTEND_URL` apuntando a Vercel
- [ ] Deployment completado (checkmark verde)
- [ ] URL pública generada (ejemplo: `https://cfe-backend-production-xxxx.railway.app`)
- [ ] Test: `curl https://cfe-backend-production-xxxx.railway.app/api/users`
- [ ] Logs sin errores

### Frontend (Vercel)

- [ ] Repository conectado a Vercel
- [ ] `VITE_SUPABASE_URL` configurado
- [ ] `VITE_SUPABASE_ANON_KEY` configurado
- [ ] `VITE_API_BASE_URL` = URL de Railway
- [ ] Redeploy después de cambiar variables
- [ ] Deployment completado
- [ ] Test: login funciona
- [ ] Test: datos se cargan desde backend

### CORS

- [ ] Frontend puede comunicarse con backend
- [ ] Sin errores "CORS not allowed" en DevTools

---

## 🧪 Testing Manual

### 1. Verificar conectividad

```bash
# En terminal local
curl https://cfe-backend-production-xxxx.railway.app/api/users

# Debería retornar JSON (posiblemente vacío)
```

### 2. Verificar CORS

```bash
# En DevTools Console del frontend
fetch('https://cfe-backend-production-xxxx.railway.app/api/users')
  .then(r => r.json())
  .then(d => console.log(d))

# Si no hay error CORS, ✅ está bien configurado
```

### 3. Verificar autenticación

```bash
# Login en frontend
1. Ir a https://dominio.com/pages/login.html
2. Usar credenciales Supabase
3. Debería redireccionar a dashboard

# Si funciona, ✅ autenticación correcta
```

### 4. Verificar API calls

```bash
# En dashboard
1. Hacer búsqueda o navegar a datos
2. Abrir DevTools → Network
3. Buscar requests a `/api/`
4. Verificar que status sea 200, no 403/CORS

# Si todo es 200, ✅ integración correcta
```

---

## 📊 Monitoreo

### Railway Dashboard

- Logs del backend en tiempo real
- Métricas de CPU/RAM
- Auto-restart si hay error

### Vercel Dashboard

- Build logs
- Deploy history
- Analytics de performance

### Verificación del usuario

- Si datos se cargan = backend activo
- Si sale error = revisar logs de Railway

---

## 🚀 Escalado Futuro

Si el proyecto crece:

1. **Railway Pro**: ~$7/mes, recursos ilimitados
2. **Vercel Pro**: ~$20/mes, features avanzadas
3. **Supabase**: Escala automáticamente
4. **CDN**: Railway tiene CDN integrado

---

## 📞 Soporte Rápido

| Problema | Solución |
|----------|----------|
| Frontend no conecta a backend | Verificar `VITE_API_BASE_URL` en Vercel |
| CORS error | Actualizar `FRONTEND_URL` en Railway |
| Backend no inicia | Verificar `SUPABASE_SERVICE_ROLE_KEY` en Railway |
| Datos vacíos | Verificar RLS en Supabase (recomendado) |

---

**Última actualización**: 2026-01-05  
**Arquitectura**: ✅ LISTA PARA PRODUCCIÓN
