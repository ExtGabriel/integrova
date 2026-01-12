# 🚀 Guía de Despliegue en Vercel - Integrova

## Variables de Entorno Requeridas

### Configurar en Vercel Dashboard → Settings → Environment Variables

#### **Supabase (CRÍTICO)**
```
VITE_SUPABASE_URL=https://ffefbeamhilqpvwutzri.supabase.co
VITE_SUPABASE_ANON_KEY=[tu_anon_key_de_supabase]
```

⚠️ **NUNCA uses SERVICE_ROLE_KEY en el frontend**

#### **API Backend (Si aplica)**
```
VITE_API_BASE_URL=https://tu-backend.railway.app
```

Si no tienes backend separado, deja esta variable vacía para usar el dominio actual.

---

## Pasos para Deploy

### 1. Conectar repositorio a Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Framework Preset: **Other** (proyecto estático)
4. Root Directory: **Dejar vacío** (vercel.json maneja la ruta)
5. Build Command: **Dejar vacío** (no requiere build)
6. Output Directory: **Dejar vacío**

### 2. Configurar variables de entorno
1. En Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Añade las variables listadas arriba
3. Aplica a **Production**, **Preview** y **Development**

### 3. Configurar dominio personalizado
1. En Vercel Dashboard → Tu Proyecto → Settings → Domains
2. Añade tu dominio de GoDaddy
3. Copia los registros DNS que Vercel te proporciona
4. En GoDaddy, actualiza los registros DNS:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`

### 4. Configurar Redirect URLs en Supabase
1. Ve a Supabase Dashboard → Authentication → URL Configuration
2. Añade tus URLs:
   - **Site URL**: `https://tudominio.com`
   - **Redirect URLs**: 
     - `https://tudominio.com/pages/dashboard.html`
     - `https://tudominio.vercel.app/pages/dashboard.html`

---

## Verificación Post-Deploy

### ✅ Checklist de Producción

- [ ] Login funciona correctamente
- [ ] Dashboard requiere autenticación
- [ ] Assets (CSS/JS/imágenes) cargan correctamente
- [ ] Variables de entorno están definidas
- [ ] HTTPS está activo
- [ ] No hay errores en la consola del navegador
- [ ] Supabase Auth funciona (revisar Network tab)

### 🐛 Troubleshooting

**Problema: "Supabase env vars missing"**
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están definidas en Vercel
- Redeploy después de añadir variables

**Problema: CSS/JS no cargan**
- Verifica rutas relativas en HTML
- Revisa que no haya rutas absolutas con `/` al inicio

**Problema: Login no funciona**
- Verifica Redirect URLs en Supabase
- Revisa console del navegador para errores

**Problema: API calls fallan**
- Si usas backend separado, verifica `VITE_API_BASE_URL`
- Revisa CORS en tu backend

---

## Notas Importantes

### 🔒 Seguridad
- ✅ **SERVICE_ROLE_KEY nunca debe estar en el frontend**
- ✅ Solo usa **ANON_KEY** en variables de entorno públicas
- ✅ Configura Row Level Security (RLS) en Supabase

### 📁 Estructura de Archivos
- Frontend estático se sirve desde `CFE INSIGHT/App/`
- `vercel.json` maneja el ruteo automáticamente
- Assets se cargan con rutas relativas

### 🔄 Actualizaciones
- Cada push a `main` despliega automáticamente
- Previews se crean para PRs
- Rollback disponible en Vercel Dashboard → Deployments

---

## Soporte

Si tienes problemas, revisa:
1. Logs de Vercel Dashboard → Deployments → [tu deploy] → Build Logs
2. Consola del navegador (F12)
3. Network tab para ver requests fallidos

**Creado para Integrova v2.0**
