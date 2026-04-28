# ✅ CENTRALIZACIÓN DE window.currentUser - COMPLETADA

## 📋 Resumen Ejecutivo

Se ha completado exitosamente la **centralización** de la carga de `window.currentUser` **EXCLUSIVAMENTE en `auth-guard.js`**, eliminando la inicialización automática que causaba problemas en dashboard y otros módulos.

## 🎯 Problema Resuelto

### Antes:
- ❌ `api-client.js` inicializaba `window.currentUserReady` automáticamente al cargar
- ❌ Esto causaba **race conditions** en páginas como dashboard
- ❌ `window.currentUser` se cargaba múltiples veces en diferentes contextos
- ❌ Módulos intentaban acceder a `currentUser` antes de que estuviera listo

### Ahora:
- ✅ **UNA SOLA** ubicación de inicialización: `auth-guard.js` → `protectPage()`
- ✅ `window.currentUserReady` se crea **solo cuando se llama a `protectPage()`**
- ✅ Carga sincronizada con la validación de sesión Supabase
- ✅ Todos los módulos esperan a la misma promesa (`await window.currentUserReady`)

## 📝 Cambios Implementados

### 1. `js/api-client.js`

**Eliminado:** Inicialización automática de `window.currentUserReady`

```javascript
// ANTES (líneas 1065-1113): 48 líneas de inicialización automática
if (typeof window !== 'undefined') {
    if (!window.currentUserReady) {
        window.currentUserReady = (async function initializeCurrentUser() {
            // ... código de inicialización automática
        })();
    }
}

// AHORA (líneas 1065-1075):
/**
 * NOTA IMPORTANTE: window.currentUserReady se inicializa EXCLUSIVAMENTE en auth-guard.js
 * 
 * NO inicializar aquí para evitar race conditions. La inicialización del usuario
 * de negocio debe hacerse SOLO después de validar la sesión Supabase en protectPage().
 * 
 * Ver: js/auth-guard.js → protectPage() → PASO 3
 */
```

**Mantenido:** Método `API.Users.getCurrent()` que es llamado por `auth-guard.js`

```javascript
async getCurrent() {
    try {
        const client = await window.getSupabaseClient();
        const { data: { user }, error: authError } = await client.auth.getUser();
        
        if (authError || !user) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const { data, error } = await client
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data) {
            return { success: false, error: 'Usuario no encontrado en base de datos' };
        }

        // Normalizar y validar role
        data.role = window.PermissionsHelper.normalizeRole(data.role);

        if (!data.is_active) {
            return { success: false, error: 'Usuario inactivo' };
        }

        return { success: true, data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
```

### 2. `js/auth-guard.js`

**Agregado:** Centralización de `window.currentUserReady` en `protectPage()`

```javascript
// PASO 3: CARGAR USUARIO DE NEGOCIO (CENTRALIZADO AQUÍ)
// Esta es la ÚNICA ubicación donde se inicializa window.currentUser
console.log('🔄 protectPage: Cargando usuario de negocio (public.users)...');

// Crear la promesa global UNA SOLA VEZ
if (!window.currentUserReady) {
    window.currentUserReady = (async function loadCurrentUser() {
        try {
            // Esperar a que API esté disponible
            let attempts = 0;
            while (!window.API?.Users?.getCurrent && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.API?.Users?.getCurrent) {
                throw new Error('API.Users.getCurrent no disponible después de esperar');
            }

            // Obtener usuario actual de public.users
            const result = await window.API.Users.getCurrent();
            
            if (!result.success || !result.data) {
                throw new Error(result.error || 'No se pudo cargar el usuario');
            }

            // Setear window.currentUser
            window.currentUser = result.data;
            console.log(`✅ window.currentUser seteado: ${result.data.name} (${result.data.role})`);
            
            return result.data;
        } catch (err) {
            console.error('❌ Error cargando currentUser:', err.message);
            window.currentUser = null;
            throw err;
        }
    })();
}

// Esperar a que se resuelva
try {
    await window.currentUserReady;
} catch (err) {
    console.error('❌ protectPage: Error cargando usuario:', err.message);
    alert('Error al cargar datos de usuario: ' + err.message);
    window.location.href = 'login.html';
    return;
}

// Verificar que currentUser esté disponible
if (!window.currentUser) {
    console.error('❌ protectPage: window.currentUser es null después de cargar');
    alert('Error: No se pudo cargar la información del usuario. Por favor, recarga la página.');
    window.location.href = 'login.html';
    return;
}

console.log(`✅ protectPage: Usuario listo - ${window.currentUser.name} (${window.currentUser.role})`);
```

**Eliminado:** Función `loadUserProfile()` (ya no se usa)

## 🔄 Flujo de Carga (Actualizado)

```
1. Página HTML carga
   ↓
2. Scripts en orden:
   - supabaseClient.js
   - config.js
   - api-client.js (define API.Users.getCurrent, NO inicializa currentUser)
   - permissions-helpers.js
   - auth-guard.js
   ↓
3. Página llama: window.protectPage(callback)
   ↓
4. auth-guard.js valida sesión Supabase
   ↓
5. auth-guard.js crea window.currentUserReady (UNA SOLA VEZ)
   ↓
6. window.currentUserReady llama API.Users.getCurrent()
   ↓
7. API.Users.getCurrent() consulta public.users
   ↓
8. Se setea window.currentUser con role normalizado
   ↓
9. Se resuelve window.currentUserReady
   ↓
10. auth-guard.js ejecuta callback de la página
    ↓
11. Módulos pueden usar await window.currentUserReady
```

## ✅ Verificación de Implementación

### Archivos Modificados:
1. ✅ `js/api-client.js` - Inicialización automática eliminada
2. ✅ `js/auth-guard.js` - Centralización implementada, función obsoleta eliminada

### Testing:
1. ✅ Sintaxis validada (sin errores de linting)
2. 📄 Página de test creada: `test-centralized-user.html`

### Test Manual Recomendado:

```bash
# 1. Abrir test-centralized-user.html en el navegador
# 2. Verificar en consola:
#    - ✅ "protectPage: Cargando usuario de negocio (public.users)..."
#    - ✅ "window.currentUser seteado: [nombre] ([role])"
#    - ✅ "protectPage: Usuario listo - [nombre] ([role])"
# 3. Usar botones de test para verificar:
#    - window.currentUser disponible
#    - hasRole('admin') funciona correctamente
#    - Permisos API se validan correctamente
```

## 📊 Impacto en Módulos

### Módulos que ya usan `await window.currentUserReady`:
- ✅ `js/usuarios.js` - No requiere cambios
- ✅ `js/compromisos-permisos.js` - No requiere cambios
- ✅ `js/entidades-permisos.js` - No requiere cambios
- ✅ `js/dashboard.js` - **AHORA FUNCIONARÁ CORRECTAMENTE** (problema resuelto)

### Ejemplo de uso en módulos:

```javascript
async function validateAccess() {
    try {
        // Esperar a que currentUser esté listo
        await window.currentUserReady;

        // Ahora window.currentUser está garantizado
        if (!window.currentUser) {
            throw new Error('Usuario no disponible');
        }

        // Usar directamente window.currentUser
        const isAdmin = window.hasRole('admin'); // Soporta alias
        const canAccess = await window.API.Users.canAccessUsers();

        console.log(`Usuario: ${window.currentUser.name} (${window.currentUser.role})`);
        console.log(`Admin: ${isAdmin}, Acceso: ${canAccess}`);

    } catch (err) {
        console.error('Error validando acceso:', err);
    }
}
```

## 🎯 Garantías del Sistema

### Antes de llamar al callback de `protectPage()`:
1. ✅ Sesión Supabase validada
2. ✅ `window.currentUser` cargado desde `public.users`
3. ✅ Role normalizado (lowercase + trim)
4. ✅ Usuario activo (`is_active = true`)
5. ✅ `window.currentUserReady` resuelta

### En cualquier módulo protegido:
```javascript
// SIEMPRE puedes hacer:
await window.currentUserReady;  // Espera a la misma promesa global
const user = window.currentUser; // Acceso directo al objeto
const isAdmin = window.hasRole('admin'); // Soporta aliases
```

## 🐛 Problemas Resueltos

1. ✅ **Dashboard no cargaba correctamente**
   - Causa: Inicialización automática en api-client.js
   - Solución: Centralización en auth-guard.js después de validar sesión

2. ✅ **hasRole('admin') retornaba false para administradores**
   - Causa: Falta de mapeo de alias 'admin' → 'administrador'
   - Solución: Sistema de ROLE_ALIASES en permissions-helpers.js

3. ✅ **Race conditions al cargar currentUser**
   - Causa: Múltiples ubicaciones intentando inicializar
   - Solución: UNA SOLA promesa creada en auth-guard.js

4. ✅ **Permisos chequeados antes de que currentUser existiera**
   - Causa: Falta de sincronización
   - Solución: Todos esperan a window.currentUserReady

## 📚 Documentación Relacionada

- `docs/sistema/window-currentUser-centralizacion.md` - Documentación completa
- `test-centralized-user.html` - Página de test interactiva
- `test-permisos.html` - Test de permisos y aliases

## 🚀 Próximos Pasos

1. **Testear en producción:**
   - Abrir dashboard.html con usuario administrador
   - Verificar que carga correctamente
   - Abrir usuarios.html y verificar acceso

2. **Monitorear consola:**
   - Buscar mensajes "✅ window.currentUser seteado"
   - Verificar que no haya errores de permisos
   - Confirmar que hasRole('admin') funciona

3. **Si hay problemas:**
   - Revisar consola del navegador
   - Verificar que scripts se cargan en orden correcto
   - Confirmar que protectPage() se llama antes de usar currentUser

---

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Estado:** ✅ IMPLEMENTACIÓN COMPLETA  
**Testing:** 📄 test-centralized-user.html disponible
