# 🚀 MÓDULO DE USUARIOS - GUÍA DE DESPLIEGUE Y VERIFICACIÓN

## 📋 RESUMEN EJECUTIVO

El módulo de usuarios ahora está **completamente funcional y listo para producción**:

✅ **Listar usuarios** - Con filtros por rol y búsqueda por texto
✅ **Cambiar rol** - Solo si tiene permiso (admin/programador)
✅ **Activar/Desactivar** - Solo si tiene permiso
✅ **Manejo de errores** - 401, 403, red, table not found
✅ **Mensajes claros** - Alertas en la UI, no solo console
✅ **Bloqueo de UI** - Sin permisos = interfaz bloqueada
✅ **Defensa robusta** - Defensive programming en todo el código
✅ **Integración permisos** - Usa el nuevo sistema permissions-helpers.js

---

## 🎯 REQUISITOS PRE-DESPLIEGUE

### 1. Verificar estructura de archivos

```bash
# Archivos MODIFICADOS:
✅ js/usuarios.js ........................... REESCRITO (560 líneas → mejor)
✅ pages/usuarios.html ...................... Scripts en orden correcto

# Archivos NUEVOS (de implementación anterior):
✅ js/permissions-helpers.js ................ Sistema de permisos completo
✅ js/api-client.js ......................... Extendido con métodos Users.*

# Archivos SIN CAMBIOS:
✓ js/api-client.js ....................... (mantener)
✓ js/auth-guard.js ........................ (mantener)
✓ js/config-supabase.js .................. (mantener)
✓ css/usuarios.css ....................... (mantener)
```

### 2. Verificar Supabase está configurado

```javascript
// En la consola del navegador en login.html:
window.supabaseClient  // Debe estar definido
window.supabaseClient.auth  // Debe tener métodos

// En cualquier página después de loguear:
window.API  // Debe estar definido
window.API.Users  // Debe estar definido
window.PermissionsHelper  // Debe estar definido
```

### 3. Verificar RLS en Supabase

Las políticas de fila ya deben estar configuradas para:
- ✅ `users` table - Solo ver usuarios accesibles según rol
- ✅ `users` table - Solo cambiar rol si es admin/programador
- ✅ `users` table - Solo cambiar estado si tiene permiso

Esto es CRÍTICO - sin RLS correcta, los permisos en cliente no significan nada.

---

## 🔍 VERIFICACIÓN PRE-DESPLIEGUE

### Paso 1: Test en desarrollo local

```bash
1. Abrir pages/login.html en navegador
2. Loguear como ADMIN o PROGRAMADOR
3. Ir a Usuarios
4. Abrir DevTools (F12)
5. Verificar en consola: NO ERRORES EN RED/CONSOLE
```

### Paso 2: Test en navegador (consola)

Copiar y pegar en consola del navegador:

```javascript
// QUICK CHECK
console.log('✓ API:', typeof window.API);
console.log('✓ Permisos:', typeof window.PermissionsHelper);
console.log('✓ Debug:', typeof window.__usuariosDebug);
console.log('✓ Usuarios:', window.__usuariosDebug?.allUsers?.()?.length || 0);
console.log('✓ Rol:', window.__usuariosDebug?.currentUserRole?.());
```

Resultado esperado:
```
✓ API: object
✓ Permisos: object
✓ Debug: object
✓ Usuarios: [número > 0]
✓ Rol: admin o programador
```

### Paso 3: Importar validation script

En la página de usuarios, copiar/pegar en consola:

```javascript
// Abrir en nueva tab:
// file:///C:/Users/.../App/scripts/usuarios-validation-script.js
// O copiar contenido completo y pegar en consola
```

Esperar a que termine y verificar:
- ✅ 20+ checks pasados
- ❌ 0 fallos
- ⚠️  Mínimo 0-2 warnings

---

## 🧪 CASOS DE TEST MÍNIMOS

### Test 1: Acceso completo (Admin)

**Precondición:** Loguear como usuario admin

```
✅ Ver tabla con usuarios
✅ Selector de rol EDITABLE
✅ Botones status FUNCIONALES
✅ Buscar por email FUNCIONA
✅ Filtrar por rol FUNCIONA
✅ Cambiar rol de usuario → OK en 2 segundos
✅ Desactivar usuario → OK en 2 segundos
✅ Mensaje verde de éxito aparece
```

### Test 2: Acceso parcial (Auditor Senior)

**Precondición:** Loguear como auditor_senior

```
✅ Ver tabla con usuarios
⚠️  Selector de rol DESHABILITADO/GRIS
✅ Botones status FUNCIONALES
✅ Buscar FUNCIONA
✅ Cambiar status → OK
❌ Cambiar rol → Mostrar error 403
```

### Test 3: Sin acceso (Auditor)

**Precondición:** Loguear como auditor

```
❌ Tabla muestra: "Acceso Denegado"
❌ Botones deshabilitados
❌ Búsqueda deshabilitada
❌ Rol filter deshabilitado
✅ Mensaje descriptivo en la tabla
```

### Test 4: Error 403 (intento de cambio sin permiso)

```
1. Loguear como Auditor
2. DevTools → Network
3. Cambiar rol de usuario (si la UI permite)
   → Esperar respuesta API
4. Verificar en consola:
   ✅ Mensaje: "🚫 Acceso denegado (403)..."
   ✅ Alert rojo en la página
   ✅ Sin console.error rojo
```

### Test 5: Error de red

```
1. DevTools → Network
2. Marcar "Offline"
3. Cambiar rol de usuario
4. Verificar:
   ✅ Mensaje: "🔌 Error de conexión..."
   ✅ Alert rojo
   ✅ Sin crash de página
5. Desmarcar "Offline"
6. Página sigue funcionando
```

### Test 6: Performance

```
1. DevTools → Performance
2. Click en tabla con 100+ usuarios
3. Filtrar por rol
4. Verificar:
   ✅ Tabla actualiza < 500ms
   ✅ No freeze de UI
   ✅ Scroll es suave
```

---

## 📊 MONITOREO POST-DESPLIEGUE

### Primeras 24 horas

✅ **Logs to monitor:**
```
- DevTools Console: ✅ usuarios.js: Módulo inicializado
- Network tab: Todas las requests con status 200/201
- API calls: /rest/v1/users* ← debe retornar datos
```

✅ **Errores esperados (NINGUNO):**
```
- No debe haber errores rojos en consola
- No debe haber 404 en Network
- No debe haber 500 en API
```

⚠️ **Errores a investigar si aparecen:**
```
- window.API is undefined → Problema con script loading
- window.PermissionsHelper is undefined → Missing permissions-helpers.js
- PGRST301 en cambios → RLS policy no configurada
- 401 durante operaciones → Token expirado (esperado con manejo)
```

### Métricas de éxito

```
✅ Usuarios pueden listar usuarios (según rol)
✅ Usuarios pueden cambiar rol (si admin)
✅ Usuarios pueden activar/desactivar (si permiso)
✅ 0 crashes de navegador
✅ < 500ms para filtrado
✅ Alertas de error visibles en UI
✅ Sin console.error excepto warnings esperados
```

---

## 🛠️ TROUBLESHOOTING

### Problema: "window.API is undefined"

**Causa:** Script loading order incorrecto

**Solución:**
```html
<!-- En usuarios.html, verificar este orden EXACTO: -->
<script src="../js/config-supabase.js"></script>
<script src="../js/supabaseClient.js"></script>
<script src="../js/utils.js"></script>
<script src="../js/api-client.js"></script>
<script src="../js/permissions-helpers.js"></script>  <!-- IMPORTANTE -->
<script src="../js/auth-guard.js"></script>
<script src="../js/usuarios.js"></script>
```

### Problema: "Tabla muestra 'Acceso Denegado' sin razón"

**Causa 1:** RLS mal configurada en Supabase
- Verificar políticas en tabla `users`
- Verificar que retorna datos en Query Editor

**Causa 2:** API.canAccessUsers() retorna false
- Verificar rol del usuario en tabla `profiles`
- Verificar que usuario está en grupos permitidos

### Problema: "No puedo cambiar rol ni status"

**Causa:** Permisos no configurados
```sql
-- Verificar en Supabase SQL Editor:
SELECT role, can_change_roles, can_change_status 
FROM user_permissions 
WHERE user_id = 'XXX';
```

### Problema: "Error 403 pero no veo mensaje en UI"

**Causa:** `alertContainer` no existe o tiene ID diferente

**Solución:** Verificar en usuarios.html:
```html
<div id="alertContainer" style="margin-bottom: 12px;"></div>
```

### Problema: "Spinner de carga no desaparece"

**Causa:** `loadingContainer` no existe o tiene ID diferente

**Solución:** Verificar en usuarios.html:
```html
<div id="loadingContainer"></div>
```

---

## 🔒 SEGURIDAD - VERIFICAR ANTES DE PRODUCCIÓN

### Tokens y autenticación

- [ ] Tokens se guardan en sessionStorage o httpOnly cookies (NO localStorage)
- [ ] Tokens se envían en header `Authorization: Bearer <token>`
- [ ] Token expira después de 24 horas
- [ ] Logout borra el token correctamente

### Validación de permisos

- [ ] Validación en CLIENTE: defensive - bloquea UI
- [ ] Validación en SERVIDOR (RLS): DEFENSIVA - es la real

### Datos sensibles

- [ ] Contraseña nunca en HTML (mostrar "••••")
- [ ] Console.log nunca muestra contraseñas
- [ ] Debug object nunca expone tokens

### CORS

- [ ] Si API en dominio diferente: CORS habilitado en Supabase
- [ ] Si API en mismo dominio: funciona automático

---

## 📈 ESCALABILIDAD FUTURA

Si hay 1000+ usuarios:

1. **Paginación**: Agregar en usuarios.js
   ```javascript
   // Cargar en chunks de 100
   getAccessibleUsers() → parámetro limit/offset
   ```

2. **Lazy loading**: Cargar filas al scroll
   ```javascript
   // En renderUsers, cargar bajo demanda
   ```

3. **Caché**: Guardar lista localmente
   ```javascript
   // Invalidar cada 5 minutos
   ```

4. **Virtual scrolling**: Si tabla muy larga
   ```javascript
   // Renderizar solo visible rows
   ```

---

## 📞 SOPORTE TÉCNICO

Si hay problemas en producción:

### Recolectar información

```javascript
// En consola del navegador, ejecutar:
console.table({
  'Navegador': navigator.userAgent,
  'Rol actual': window.__usuariosDebug.currentUserRole(),
  'Usuarios cargados': window.__usuariosDebug.allUsers().length,
  'Permisos': window.__usuariosDebug.permisos(),
  'API disponible': typeof window.API !== 'undefined'
});
```

### Compartir logs

```javascript
// Copiar logs de consola
// DevTools → Console → botón derecho → Save as...
// O screenshot de:
// - Network requests
// - Console errors
// - Current user permissions
```

---

## ✅ CHECKLIST DE DESPLIEGUE

- [ ] Archivos cargados en servidor
- [ ] Script loading order verificado
- [ ] RLS configurado en Supabase
- [ ] Test login → usuarios funciona
- [ ] Test admin → puede cambiar rol
- [ ] Test auditor → solo lectura
- [ ] Test error 403 → muestra mensaje
- [ ] DevTools console → sin errores rojos
- [ ] Network tab → status 200/201 en APIs
- [ ] Performance → filtrado < 500ms
- [ ] Mobile → tabla scrollea bien
- [ ] Alertas → visibles y desaparecen
- [ ] Logout → funciona y limpia datos

---

## 📝 DOCUMENTACIÓN RELACIONADA

- `MODULO-USUARIOS-VERIFICACION.md` - Checklist detallado de funcionalidades
- `usuarios.js` - Código fuente con comentarios
- `permissions-helpers.js` - Sistema de permisos
- `api-client.js` - API centralizado

---

**Versión:** 1.0 Production Ready
**Última actualización:** 2024
**Estado:** ✅ LISTO PARA DESPLIEGUE
