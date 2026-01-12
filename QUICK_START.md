# ⚡ QUICK START: Deployment en 30 Minutos

**Para llevar Integrova a producción AHORA**

---

## 🟢 Backend: Railway (10 min)

```powershell
# 1. Commit cambios
git add .
git commit -m "Listo para producción"
git push origin main

# 2. Ir a https://railway.app → Sign up (GitHub)

# 3. New Project → Deploy from GitHub → Seleccionar repo

# 4. Variables (Settings → Variables):
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_clave_privada
FRONTEND_URL=https://tu-dominio.vercel.app (o *.vercel.app)
NODE_ENV=production

# 5. Deploy automático comienza
# Esperar checkmark verde ✅

# 6. COPIAR URL pública:
# Ejemplo: https://cfe-backend-production-xxxx.railway.app
```

---

## 🟢 Frontend: Vercel (5 min)

```
1. Dashboard → Tu proyecto → Settings

2. Environment Variables → Agregar:
   Name: VITE_API_BASE_URL
   Value: https://cfe-backend-production-xxxx.railway.app
   Environment: Production

3. Save → Redeploy (automático o manual)

4. Esperar a que Deployment termine (checkmark verde) ✅
```

---

## 🧪 Verificar (5 min)

```bash
# Test 1: Backend funciona
curl https://cfe-backend-production-xxxx.railway.app/api/users

# Test 2: Frontend carga
https://tu-dominio.vercel.app

# Test 3: Login funciona
- Email: tu@supabase.com
- Password: tu contraseña
- Debería redirigir a dashboard

# Test 4: Datos se cargan
- Dashboard debería mostrar datos
- DevTools (F12) → Network → Sin errores CORS
```

---

## 🔐 Seguridad

✅ .env NO está en GitHub (`.gitignore` lo excluye)  
✅ Frontend solo tiene ANON_KEY  
✅ Backend solo tiene SERVICE_ROLE_KEY  
✅ CORS restringido a Vercel domain  

---

## 📞 Si algo no funciona

| Problema | Solución |
|----------|----------|
| CORS error | Verificar `FRONTEND_URL` en Railway |
| Backend no responde | Ir a Railway Logs, buscar errores |
| Datos vacíos | Login funciona pero BD vacía (normal) |
| Variables no aplican | Hacer redeploy manual |

---

## 📚 Documentación Completa

- `RAILWAY_DEPLOYMENT_GUIDE.md` - Paso a paso
- `VERCEL_DEPLOYMENT.md` - Frontend setup
- `BACKEND_ENV_VARS.md` - Variables necesarias
- `FRONTEND_BACKEND_INTEGRATION.md` - Cómo se comunican

---

**¡Listo! Tu Integrova está en producción.** 🚀
