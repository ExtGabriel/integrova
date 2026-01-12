# ⚡ QUICK START - VERIFICACIÓN DEL SISTEMA

**Fecha:** Enero 12, 2026

---

## ✅ Lista de Verificación Rápida

Abre el navegador y verifica cada punto:

### 1️⃣ Login (login.html)

```
URLs para probar:
- Local: http://localhost:3000/pages/login.html
- Producción: https://tu-dominio.com/pages/login.html
```

**Verificaciones:**
- [ ] Página carga sin errores en consola
- [ ] Abre DevTools (F12) → Console
- [ ] Ves logs azules (✅) pero NO errores rojos
- [ ] El formulario se ve correctamente
- [ ] Botón "Entrar" está habilitado

**Test Login:**
```
Email: usuario@test.com
Password: password123
```

- [ ] Login fallido muestra error claro
- [ ] Login exitoso redirige a dashboard sin loops

---

### 2️⃣ Dashboard (dashboard.html)

```
URL: http://localhost:3000/pages/dashboard.html
```

**Verificaciones en Console:**
- [ ] Ves: `🔐 Auth event: INITIAL_SESSION`
- [ ] Ves: `✅ Sesión válida detectada`
- [ ] Ves: `🔄 Inicializando dashboard (primera vez)...`
- [ ] Ves: `✅ Dashboard inicializado correctamente`
- [ ] NO ves el mensaje de inicialización dos veces (una sola vez ✅)

**Verificaciones en UI:**
- [ ] Dashboard carga correctamente
- [ ] Mensaje de bienvenido aparece con tu nombre
- [ ] Widgets y datos se cargan
- [ ] No hay errores de propiedades undefined

---

### 3️⃣ Verificar window.API en Console

Abre DevTools y ejecuta:

```javascript
// Verificar que todo existe
window.API // Debe existir y no ser undefined
window.API.Entities.getAll() // Debe ser función
window.API.Commitments // Debe existir
window.API.Users // Debe existir
window.API.Notifications // Debe existir
window.supabaseClient // Debe existir
window.APP_CONFIG // Debe existir

// Ejecutar para ver stubs
await window.API.Entities.getAll()
// Debe retornar: { success: true/false, data: [...], error: null/mensaje }
```

---

### 4️⃣ Test Logout

En el dashboard:

- [ ] Busca botón de logout (normalmente en esquina superior)
- [ ] Haz clic
- [ ] Deberías redirigir a login.html
- [ ] Console debe mostrar: `⚠️ Sesión cerrada por usuario o por inactividad`
- [ ] Console debe mostrar: `Auth event: SIGNED_OUT`

---

### 5️⃣ Verificar No Hay Loops

**Test 1: Recargar página del dashboard**
- [ ] Presiona F5
- [ ] Dashboard NO redirige a login
- [ ] Console NO muestra inicialización múltiple (solo una vez)

**Test 2: Ir de login a dashboard**
- [ ] Desde login.html, inicia sesión
- [ ] Redirige a dashboard sin loops
- [ ] Dashboard se inicializa sin errores

---

## 🔍 Qué Buscar en la Consola

### ✅ CORRECTO (Logs que deberías ver)

```
⏳ supabaseClient.js cargado. Iniciando Supabase...
✅ Supabase SDK v2 disponible correctamente
✅ Supabase v2 client inicializado correctamente
✅ api-client.js: API Client inicializado
⏳ dashboard-init.js cargado. Esperando window.API...
✅ window.API disponible. Configurando listener de autenticación...
🔐 Auth event: INITIAL_SESSION ✅ Sesión activa
✅ Sesión válida detectada: [user-id]
🔄 Inicializando dashboard (primera vez)...
✅ Dashboard inicializado correctamente
```

### ❌ INCORRECTO (Errores a NO ver)

```
ERROR: Cannot read property 'supabase' of undefined
ERROR: window.API is undefined
ERROR: import.meta is not defined
ERROR: Supabase SDK v2 no está disponible
Multiple dashboard initializations (más de una vez)
Loops de redirección
```

---

## 📊 Estado por Componente

| Componente | Estado | Verificación |
|-----------|--------|--------------|
| Supabase SDK | ✅ CDN v2 | Scripts carga desde CDN |
| config.js | ✅ Sin import.meta | window.APP_CONFIG existe |
| supabaseClient.js | ✅ Robusto | window.supabaseClient existe |
| api-client.js | ✅ Con stubs | window.API SIEMPRE existe |
| dashboard-init.js | ✅ Sesión única | Una sola inicialización |
| dashboard.js | ✅ Limpio | Sin lógica de auth |
| dashboard.html | ✅ Orden correcto | Scripts en orden |
| login.html | ✅ Orden correcto | Scripts en orden |

---

## 🐛 Troubleshooting

### Problema: "Supabase SDK no disponible"

**Solución:**
1. Verifica que el script CDN carga primero en HTML
2. Abre DevTools → Network → busca `supabase-js@2`
3. Debe tener status 200 (OK), no 404

### Problema: "window.API is undefined"

**Solución:**
1. Verifica que api-client.js carga
2. Abre DevTools → Network → busca `api-client.js`
3. Verifica orden de scripts en HTML (api-client.js después de supabaseClient.js)

### Problema: Dashboard no carga datos

**Solución:**
1. Abre DevTools → Console
2. Ejecuta: `await window.API.Entities.getAll()`
3. Verifica respuesta: `{success: true/false, data: [...], error: null}`
4. Si `success: false`, verifica credenciales Supabase en `config-supabase.js`

### Problema: Loop login/dashboard

**Solución:**
1. Abre DevTools → Console
2. Busca cuántas veces ves `🔐 Auth event: INITIAL_SESSION`
3. Debe ser **UNA SOLA VEZ** en dashboard
4. Si ves múltiples, verifica que `dashboardInitialized` flag funciona en dashboard-init.js

---

## 📞 Contacto/Soporte

Si encuentras errores que NO están listados arriba:

1. Abre DevTools (F12)
2. Ve a Console
3. Copia el mensaje de error completo
4. Copia los logs relacionados
5. Crea un issue con esta información

---

## 🎯 Objetivo

Sistema **100% funcional**, **sin errores**, **sin loops**, listo para producción.

Verificación completada en: **[Tu fecha]**  
Responsable: **[Tu nombre]**
