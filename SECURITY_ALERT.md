# 🔒 ALERTA DE SEGURIDAD CRÍTICA

## ⚠️ ACCIÓN REQUERIDA INMEDIATA

El archivo `.env` de este proyecto contiene **claves sensibles expuestas** que DEBEN ser rotadas inmediatamente.

### 📋 Pasos a seguir AHORA:

#### 1. Rotar claves de Supabase (CRÍTICO)

1. Ir a [Supabase Dashboard](https://app.supabase.com/)
2. Seleccionar tu proyecto
3. Navegar a **Settings** → **API**
4. En la sección **Project API keys**:
   - Copia la nueva `service_role` key (si aún no la has cambiado)
   - ⚠️ **IMPORTANTE**: Esta clave tiene permisos de administrador total
   - La clave `anon` puede mantenerse (es pública y está protegida por RLS)

#### 2. Eliminar .env del repositorio

```powershell
# Verificar que .gitignore incluye .env
Get-Content .gitignore | Select-String ".env"

# Si .env ya fue commiteado, eliminarlo del historial
git rm --cached .env

# Commit el cambio
git commit -m "Remove exposed .env file from repository"

# Push los cambios
git push origin main
```

#### 3. Configurar variables en Vercel

1. Ir a tu proyecto en [Vercel Dashboard](https://vercel.com/)
2. Navegar a **Settings** → **Environment Variables**
3. Añadir las siguientes variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `VITE_SUPABASE_URL` | https://tu-proyecto.supabase.co | Production |
| `VITE_SUPABASE_ANON_KEY` | Tu nueva anon key | Production |
| `VITE_API_BASE_URL` | https://tu-dominio.com | Production |

⚠️ **NO AÑADIR** `SUPABASE_SERVICE_ROLE_KEY` a Vercel - solo usar en backend separado

#### 4. Verificar exposición

Si el repositorio es público en GitHub:

1. Verificar commits anteriores que puedan contener `.env`
2. Si se encontró exposición histórica:
   - Considera hacer el repo privado temporalmente
   - O usa herramientas como [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) para limpiar el historial

### 🛡️ Medidas de seguridad implementadas

✅ `.gitignore` actualizado para excluir `.env`  
✅ `.env.example` creado como plantilla segura  
✅ Frontend usa SOLO `ANON_KEY` (no `SERVICE_ROLE_KEY`)  
✅ Variables de entorno documentadas en `VERCEL_DEPLOYMENT.md`  

### 📖 Referencias

- [Supabase Security Best Practices](https://supabase.com/docs/guides/api/api-keys)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Git Remove Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

---

**Creado**: 2026-01-05  
**Criticidad**: 🔴 ALTA  
**Estado**: Pendiente de acción
