# 🚀 Guía de Deployment: Backend Express en Railway

**Objetivo**: Desplegar el backend Express en Railway para producción  
**Tiempo estimado**: 10-15 minutos  
**Requisitos**: GitHub y Railway.app

---

## 📋 Resumen del Proceso

```
Tu código en GitHub → Railway detecta cambios → Auto-deploy → URL pública
```

El backend estará disponible en: `https://cfe-backend-production-xxxx.railway.app`

---

## ✅ Paso 1: Preparación (Local)

### 1.1 Verificar que el código está listo

```bash
# Asegurar que estamos en la rama correcta
git status

# El proyecto debe tener:
# - server.js en la raíz (o CFE INSIGHT/server.js)
# - package.json con script "start"
# - .env.example (documentación)
# - Archivo railway.toml (ya creado)
```

### 1.2 Verificar package.json

Asegurate de que `package.json` tenga en la raíz:

```json
{
  "name": "cfe-insight-backend",
  "version": "1.0.0",
  "description": "Backend API para Integrova",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.x.x",
    "cors": "^2.x.x",
    "dotenv": "^16.x.x",
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

Si no tienes `package.json`, crear uno:

```bash
npm init -y
npm install express cors dotenv @supabase/supabase-js node-fetch multer xlsx
```

### 1.3 Commit y push a GitHub

```bash
git add .
git commit -m "Preparar backend para deployment en Railway"
git push origin main
```

---

## 🚂 Paso 2: Crear Proyecto en Railway

### 2.1 Ir a Railway.app

1. Abrir [https://railway.app/](https://railway.app/)
2. **Sign up** con GitHub (recomendado) o email
3. Dashboard → **New Project**

### 2.2 Conectar Repositorio

1. Seleccionar **Deploy from GitHub**
2. Autorizar Railway para acceder a tu GitHub
3. Seleccionar tu repositorio `cfe-insight` (o similar)
4. Seleccionar rama `main` (o tu rama activa)
5. Hacer clic en **Deploy**

Railway detectará automáticamente:
- ✅ Node.js runtime (por `package.json`)
- ✅ Comando start (`node server.js`)
- ✅ Puerto 3001

---

## 🔐 Paso 3: Configurar Variables de Entorno

### 3.1 Acceder a Project Settings

1. En Railway Dashboard, seleccionar tu proyecto
2. Hacer clic en **Variables**

### 3.2 Añadir Variables

Crear las siguientes variables (copiar exactamente los nombres):

| Variable | Valor | Copiar de |
|----------|-------|-----------|
| `SUPABASE_URL` | `https://tu-proyecto.supabase.co` | [Supabase Dashboard](https://app.supabase.com/) → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (tu clave privada) | [Supabase Dashboard](https://app.supabase.com/) → Settings → API → service_role key |
| `FRONTEND_URL` | `https://tu-dominio.vercel.app` | Será la URL de tu Vercel (configurable después) |
| `NODE_ENV` | `production` | Valor fijo |
| `OPENAI_API_KEY` | (opcional) | Solo si usas IA en el backend |

### 3.3 Guardar y Redeploy

1. Hacer clic en **Save**
2. Railway automáticamente hará redeploy
3. Esperar hasta que aparezca el checkmark verde ✅

---

## 🌐 Paso 4: Obtener URL Pública del Backend

### 4.1 Verificar Deployment Exitoso

1. En Railway Dashboard, seleccionar el servicio
2. Hacer clic en **Deployments**
3. Buscar el deployment más reciente
4. Si tiene checkmark verde ✅, está activo

### 4.2 Copiar URL Pública

1. En el servicio, buscar la sección **Networking**
2. Copiar la URL pública (ejemplo: `https://cfe-backend-production-xxxx.railway.app`)
3. **Guardar esta URL** - la necesitaremos para configurar Vercel

---

## 🧪 Paso 5: Verificar que el Backend Funciona

### 5.1 Test simple con curl

```bash
# Reemplazar BACKEND_URL con la URL de Railway
curl https://BACKEND_URL/api/users

# Debería retornar un JSON (vacío o con usuarios)
# Si sale {"error": ...} está conectado a Supabase correctamente
```

### 5.2 Test desde Postman/Thunder Client

1. Importar endpoint: `https://BACKEND_URL/api/users`
2. Método: `GET`
3. Si recibe respuesta JSON, ✅ está funcionando

---

## 🔗 Paso 6: Conectar Frontend (Vercel)

### 6.1 Ir a Vercel Dashboard

1. Abrir [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleccionar tu proyecto
3. Ir a **Settings** → **Environment Variables**

### 6.2 Actualizar `VITE_API_BASE_URL`

Crear o actualizar variable:

```
Name: VITE_API_BASE_URL
Value: https://cfe-backend-production-xxxx.railway.app
Environment: Production
```

Reemplazar `xxxx` con el ID real de tu Railway.

### 6.3 Redeploy Frontend

1. Ir a **Deployments**
2. Seleccionar el deployment más reciente
3. Hacer clic en **Redeploy** (para aplicar nueva variable)
4. Esperar a que termine (unos 30 segundos)

---

## 📊 Paso 7: Actualizar CORS en Railway

### 7.1 El Backend ya tiene CORS configurado

Cuando el backend se desplegó, ya debería tener CORS para:
- Localhost (desarrollo)
- Tu dominio Vercel (producción)

### 7.2 Verificar que funciona

1. Ir a tu frontend en Vercel
2. Abrir DevTools (F12)
3. Ir a **Console**
4. Hacer una búsqueda o navegar a una página que use API
5. Verificar que las requests lleguen sin error CORS

---

## ✅ Checklist Final

- [ ] Backend está en GitHub
- [ ] Railway conectado a GitHub
- [ ] Variables de entorno configuradas en Railway
- [ ] Backend respondiendo en https://BACKEND_URL/api/users
- [ ] VITE_API_BASE_URL configurado en Vercel
- [ ] Frontend redeployed en Vercel
- [ ] Prueba de login funciona
- [ ] Prueba de búsqueda/filtros funciona
- [ ] Sin errores CORS en DevTools

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'express'"

```bash
# En tu máquina local:
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
# Railway redeployará automáticamente
```

### Error: "SUPABASE_URL is undefined"

1. Verificar que la variable está en Railway
2. Usar nombre exacto: `SUPABASE_URL` (mayúsculas)
3. Hacer redeploy manualmente

### Error: "CORS - origin not allowed"

1. Verificar VITE_API_BASE_URL en Vercel
2. Copiar exactamente la URL del frontend
3. Actualizar FRONTEND_URL en Railway variables
4. Hacer redeploy del backend

### Backend no responde en Railway

1. Ir a **Logs** en el servicio de Railway
2. Buscar mensajes de error (color rojo)
3. Verificar que SUPABASE_SERVICE_ROLE_KEY es correcta

---

## 📞 Documentación de Referencia

- [Railway Docs](https://docs.railway.app/)
- [Supabase Setup](https://app.supabase.com/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Express.js](https://expressjs.com/)
- [CORS Configuration](https://expressjs.com/en/resources/middleware/cors.html)

---

## 🚀 Próximos Pasos (Después de Deployment)

1. **Monitoreo**: Railway Dashboard mostrará logs y métricas
2. **Auto-deploy**: Cada push a GitHub auto-redeploya el backend
3. **Escalar**: Si necesitas más poder, Railway lo escala automáticamente
4. **Dominio personalizado**: Railway permite mapear dominios propios (gratuito)

---

**Última actualización**: 2026-01-05  
**Criticidad**: 🟢 ESTABLE  
**Tiempo para completar**: ~15 minutos
