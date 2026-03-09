# 🔧 Configuración Supabase - Guía de Despliegue

**Estado:** ✅ CONFIGURACIÓN LISTA - Solo falta pegar credenciales reales

---

## 📋 Archivos Modificados

### 1. **`App/js/config-supabase.js`** ⭐ NUEVO
**Propósito:** Inyecta `window.SUPABASE_CONFIG` para que supabaseClient.js pueda leerlo.

**Estado Actual:**
```javascript
window.SUPABASE_CONFIG = {
    url: '__SUPABASE_URL__',      // ⚠️ PLACEHOLDER - Reemplazar
    anonKey: '__SUPABASE_ANON_KEY__'  // ⚠️ PLACEHOLDER - Reemplazar
};
```

**👉 ACCIÓN REQUERIDA:** Editar este archivo con tus credenciales reales antes de desplegar.

---

### 2. **`App/js/supabaseClient.js`** ✏️ MODIFICADO
**Cambios:**
- Ahora lee desde `window.SUPABASE_CONFIG.url` y `window.SUPABASE_CONFIG.anonKey`
- Placeholders cambiados a `__SUPABASE_URL__` y `__SUPABASE_ANON_KEY__`
- Console.warn mejorado con instrucciones claras

**Validación:**
- Si los placeholders no se reemplazan, muestra warning explícito en console
- Login/Dashboard/Usuarios mostrarán error claro: "Configuración Supabase faltante"

---

### 3. **Páginas HTML Actualizadas**
Se agregó `<script src="../js/config-supabase.js"></script>` ANTES de supabaseClient.js en:

- ✅ `App/pages/login.html`
- ✅ `App/pages/dashboard.html`
- ✅ `App/pages/usuarios.html`

**Orden de carga crítico:**
```html
<script src="../js/config-supabase.js"></script>      <!-- 1º: Define window.SUPABASE_CONFIG -->
<script type="module" src="../js/supabaseClient.js"></script>  <!-- 2º: Lee la config -->
```

---

## 🔑 Cómo Obtener tus Credenciales

### Paso 1: Accede a Supabase Dashboard
```
https://supabase.com/dashboard
```

### Paso 2: Selecciona tu proyecto
- Si no tienes proyecto, crea uno nuevo
- Nombre sugerido: `cfe-insight-prod`

### Paso 3: Ve a Settings > API
En esta sección encontrarás:

**Project URL:**
```
https://abcdefghijk.supabase.co
```

**Project API Keys:**
- `anon public` - ✅ ESTA es la que necesitas (segura para frontend)
- `service_role` - ❌ NO uses esta (solo backend)

### Paso 4: Copia los valores

Ejemplo de valores reales (tuyos serán diferentes):
```javascript
window.SUPABASE_CONFIG = {
    url: 'https://xyzabcdefg.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiY2RlZmciLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxOTU2NTcxMjAwfQ.EJEMPLO_TOKEN_REAL_AQUI'
};
```

---

## ✅ Checklist de Configuración

### Pre-Despliegue (Local)

- [ ] Editaste `App/js/config-supabase.js` con tus credenciales reales
- [ ] Reemplazaste `__SUPABASE_URL__` con tu URL de proyecto
- [ ] Reemplazaste `__SUPABASE_ANON_KEY__` con tu anon key
- [ ] Guardaste el archivo

### Validación Local

- [ ] Abre `App/pages/login.html` en navegador (puede ser con Live Server)
- [ ] Abre DevTools Console (F12)
- [ ] Deberías ver: `✅ Supabase client listo (frontend)`
- [ ] NO deberías ver: `⚠️ CONFIGURACIÓN SUPABASE FALTANTE`

### Test de Funcionalidad

- [ ] Login con email/password funciona (crea usuario en Supabase Auth primero)
- [ ] Dashboard carga después de login exitoso
- [ ] Usuarios.html muestra lista desde tabla `users` (requiere datos en Supabase)

### Pre-Producción

- [ ] **IMPORTANTE:** Verifica que `config-supabase.js` NO esté en `.gitignore`
- [ ] Para seguridad adicional, considera usar Vercel Environment Variables (ver sección avanzada abajo)

---

## 🚀 Despliegue en Vercel

### Opción A: Hardcodear en `config-supabase.js` (Más Simple)

**Pros:**
- Setup inmediato
- No requiere configuración en Vercel
- Anon key es segura para exponer (tiene RLS protegiendo datos)

**Contras:**
- Credenciales visibles en código fuente del sitio (aceptable para anon key)

**Pasos:**
1. Edita `config-supabase.js` con credenciales reales
2. Haz commit y push:
```bash
git add App/js/config-supabase.js
git commit -m "Configure Supabase credentials for production"
git push origin main
```
3. Vercel auto-desplegará

---

### Opción B: Variables de Entorno Vercel (Avanzado)

**Pros:**
- Credenciales no visibles en repo
- Más "profesional" para proyectos enterprise

**Contras:**
- Requiere build step (ya no es 100% estático)
- Más complejo de configurar

**Si eliges esta opción:**

1. En Vercel Dashboard > Settings > Environment Variables:
   - `VITE_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJ...`

2. Modifica `config-supabase.js`:
```javascript
window.SUPABASE_CONFIG = {
    url: '__VITE_SUPABASE_URL__',
    anonKey: '__VITE_SUPABASE_ANON_KEY__'
};
```

3. Configura build en `package.json`:
```json
{
  "scripts": {
    "build": "node scripts/inject-env.js"
  }
}
```

4. Crea `scripts/inject-env.js` (reemplaza placeholders con process.env en build time)

⚠️ **RECOMENDACIÓN:** Usa Opción A primero. Solo migra a Opción B si tienes requisitos de seguridad estrictos.

---

## 🔒 Seguridad - FAQ

### ¿Es seguro exponer la anon key en frontend?

✅ **SÍ**, siempre que:
1. Uses Row Level Security (RLS) en Supabase
2. NO expongas la `service_role` key
3. Tengas políticas RLS configuradas en todas las tablas

La `anon` key está **diseñada** para ser pública. Supabase la valida en cada request y aplica RLS.

### ¿Qué pasa si alguien ve mi anon key?

- Solo podrán hacer requests permitidos por tus políticas RLS
- Ejemplo: Si tu tabla `users` tiene RLS `SELECT` solo para usuarios autenticados, un atacante con tu anon key NO podrá leer datos sin login válido

### ¿Cómo protejo datos sensibles?

1. **Habilita RLS en todas las tablas:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

2. **Crea políticas restrictivas:**
```sql
-- Solo usuarios autenticados pueden leer
CREATE POLICY "users_select" ON users
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo pueden ver su propio perfil
CREATE POLICY "users_select_own" ON users
FOR SELECT USING (auth.uid() = auth_id);
```

3. **Nunca expongas service_role key** (tiene bypass de RLS)

---

## 🧪 Testing Post-Despliegue

### 1. Verificar Configuración Cargada

Abre DevTools en tu sitio desplegado:
```javascript
console.log(window.SUPABASE_CONFIG);
// Debería mostrar: { url: "https://...", anonKey: "eyJ..." }
```

### 2. Verificar Cliente Inicializado

```javascript
console.log(window.supabaseClient);
// Debería mostrar: SupabaseClient { ... }
```

### 3. Test de Login

1. Crea usuario de prueba en Supabase Dashboard > Authentication > Users
2. Intenta login en tu sitio
3. Verifica en Network tab que requests van a `https://tu-proyecto.supabase.co/auth/v1/token`

### 4. Test de Sesión

1. Loguéate
2. Refresca página
3. Deberías seguir logueado (sessionStorage + Supabase tokens)

---

## 🐛 Troubleshooting

### Error: "CONFIGURACIÓN SUPABASE FALTANTE"

**Causa:** Placeholders no reemplazados en `config-supabase.js`

**Solución:**
```bash
# Verifica el contenido del archivo
cat App/js/config-supabase.js

# Si ves __SUPABASE_URL__, edítalo con valores reales
```

---

### Error: "Failed to fetch" en login

**Causas posibles:**

1. **URL incorrecta** - Verifica que sea exacta (sin trailing slash)
   ```javascript
   url: 'https://abc.supabase.co'  // ✅ Correcto
   url: 'https://abc.supabase.co/' // ❌ Incorrecto
   ```

2. **Anon key incorrecta** - Cópiala completa desde Supabase Dashboard

3. **CORS bloqueado** - Verifica en Supabase Dashboard > Settings > API que tu dominio Vercel esté permitido

---

### Warning: "AutoRefreshToken failed"

**Causa:** Sesión expirada o token inválido

**Solución:**
```javascript
// En DevTools Console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## 📁 Estructura Final de Archivos

```
CFE INSIGHT/
└── App/
    ├── js/
    │   ├── config-supabase.js      ⭐ NUEVO - Edita aquí tus credenciales
    │   ├── supabaseClient.js       ✏️ MODIFICADO - Lee desde config
    │   ├── auth-guard.js           (sin cambios)
    │   ├── dashboard.js            (sin cambios)
    │   └── ...
    └── pages/
        ├── login.html              ✏️ Carga config-supabase.js
        ├── dashboard.html          ✏️ Carga config-supabase.js
        ├── usuarios.html           ✏️ Carga config-supabase.js
        └── ...
```

---

## ✅ Checklist Final Pre-Producción

### Configuración Básica
- [ ] `config-supabase.js` editado con credenciales reales
- [ ] Console warning de placeholders desaparecido
- [ ] Login funcional en local

### Supabase Dashboard
- [ ] Proyecto creado
- [ ] Tabla `users` existe con columnas: `id, auth_id, nombre, rol, correo, telefono, equipo, username, activo`
- [ ] RLS habilitado en tabla `users`
- [ ] Al menos un usuario de prueba creado en Authentication

### Vercel
- [ ] Repositorio conectado a Vercel
- [ ] Build settings: Framework Preset = Other, Output Directory = `App`
- [ ] Dominio asignado

### Testing
- [ ] Login → Dashboard funciona en producción
- [ ] Dashboard → Usuarios funciona
- [ ] Logout limpia sesión
- [ ] Refresh mantiene sesión

---

## 🎓 Lo que NO se modificó (según requisitos)

✅ Lógica de login (intacta)  
✅ auth-guard.js (intacta)  
✅ dashboard.js (intacta, solo se agregó config en HTML)  
✅ Navegación (intacta)  
✅ Roles (intactos)  

**Solo se configuró la inyección de credenciales, sin tocar lógica de negocio.**

---

## 📞 Soporte

Si encuentras errores post-despliegue:

1. Revisa DevTools Console para errores de Supabase
2. Verifica Network tab para ver requests fallidos
3. Confirma que RLS esté configurado en Supabase
4. Verifica que anon key tenga permisos correctos

---

**Configuración completada por:** GitHub Copilot  
**Fecha:** Enero 7, 2026  
**Método:** Inyección vía `window.SUPABASE_CONFIG` (frontend puro)  
**Seguridad:** ✅ Solo anon key (pública), sin secretos expuestos
