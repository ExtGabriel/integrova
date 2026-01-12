# Backend Environment Variables

Las siguientes variables de entorno DEBEN estar configuradas en Railway para que el backend funcione correctamente:

## 🔐 Variables Críticas (Supabase)

### `SUPABASE_URL`
- **Valor**: URL del proyecto Supabase
- **Ejemplo**: `https://abc123xyz.supabase.co`
- **Obtener de**: [Supabase Dashboard](https://app.supabase.com/) → Project Settings → API → Project URL
- **Descripción**: Endpoint de tu base de datos Supabase

### `SUPABASE_SERVICE_ROLE_KEY`
- **Valor**: Clave de rol de servicio (privada, admin)
- **Ejemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Obtener de**: [Supabase Dashboard](https://app.supabase.com/) → Project Settings → API → Project API Keys → `service_role` key
- **⚠️ CRÍTICO**: Esta clave tiene permisos TOTALES. Nunca la expongas en frontend.

## 🤖 Variables Opcionales (IA)

### `OPENAI_API_KEY`
- **Valor**: Clave de API de OpenAI (si usas IA)
- **Obtener de**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Descripción**: Requerida solo si backend usa ChatGPT/GPT-4

## 🌍 Variables de Deployment

### `PORT`
- **Valor**: `3001` (recomendado, Railway lo configura automáticamente)
- **Descripción**: Puerto en el que escucha el servidor

### `NODE_ENV`
- **Valor**: `production`
- **Descripción**: Indica que es environment de producción

### `FRONTEND_URL`
- **Valor**: URL del frontend en Vercel
- **Ejemplo**: `https://tu-dominio.vercel.app` o `https://tu-dominio.com`
- **Uso**: Configuración de CORS para permitir requests desde frontend

---

## 📋 Checklist de Configuración en Railway

- [ ] Crear proyecto en [Railway](https://railway.app/)
- [ ] Conectar repositorio GitHub
- [ ] Añadir variable `SUPABASE_URL`
- [ ] Añadir variable `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Añadir variable `FRONTEND_URL` (URL de tu Vercel)
- [ ] Añadir variable `OPENAI_API_KEY` (si aplica)
- [ ] Deploy inicial
- [ ] Verificar logs en Railway Dashboard
- [ ] Obtener URL pública del servicio (ej: `https://cfe-backend-production-xxxx.railway.app`)
- [ ] Usar esa URL como `VITE_API_BASE_URL` en Vercel

---

## 🔗 Cómo conectar con Frontend (Vercel)

1. Después de desplegar el backend en Railway, obtendrás una URL pública
2. Usa esa URL como `VITE_API_BASE_URL` en tu proyecto Vercel
3. El frontend enviará todas las requests a esa URL

**Ejemplo**:
- Backend en Railway: `https://cfe-backend-production-xxxx.railway.app`
- Frontend en Vercel configura: `VITE_API_BASE_URL=https://cfe-backend-production-xxxx.railway.app`

---

## 🧪 Verificación Local (Desarrollo)

Para probar localmente ANTES de deployar:

```bash
# 1. Crear .env en la raíz del proyecto
cp .env.example .env

# 2. Rellenar con tus valores reales:
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_clave_privada
FRONTEND_URL=http://localhost:3000

# 3. Instalar dependencias
npm install

# 4. Ejecutar servidor local
npm start
# o
node server.js

# 5. Verificar que escucha en puerto 3001
# Acceso: http://localhost:3001/api/users
```

---

## ⚠️ Notas de Seguridad

- ✅ `SUPABASE_SERVICE_ROLE_KEY` SOLO en backend (Railway)
- ✅ Frontend SOLO usa `VITE_SUPABASE_ANON_KEY` (sin permisos)
- ✅ CORS está configurado para restringir a dominio Vercel
- ✅ Nunca hardcodees URLs o claves en el código

---

**Última actualización**: 2026-01-05
