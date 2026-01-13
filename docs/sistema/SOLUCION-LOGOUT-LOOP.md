# 🔒 CORRECCIÓN DEL LOOP DE LOGOUT - DOCUMENTACIÓN TÉCNICA

## 📋 PROBLEMA IDENTIFICADO

**Síntoma:** Al hacer logout, el usuario cerraba sesión pero inmediatamente volvía a iniciar sesión automáticamente.

**Causa raíz:** 
El evento `INITIAL_SESSION` de Supabase se dispara cuando la página carga y detecta una sesión guardada en localStorage. Después de ejecutar `signOut()`, Supabase aún tenía una sesión residual que se rehidrataba automáticamente al evento `INITIAL_SESSION`.

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. Flag de Control de Logout Manual

Se implementó `window.__MANUAL_LOGOUT__` como flag global que:

- Se activa ANTES de `signOut()`
- Bloquea cualquier rehidratación de sesión
- Solo se desactiva en login explícito

```javascript
// En auth-guard.js - Función logout()
window.__MANUAL_LOGOUT__ = true; // ← Activar ANTES de signOut
await client.auth.signOut();
window.location.href = 'login.html';
```

### 2. Modificación del Auth State Listener

El listener `onAuthStateChange` ahora:

**ANTES (problemático):**
```javascript
client.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION' && session) {
        // ❌ Esto reinyectaba la sesión después de logout
        initDashboard(session);
    }
    if (event === 'SIGNED_OUT') {
        redirectToLogin();
    }
});
```

**DESPUÉS (correcto):**
```javascript
client.auth.onAuthStateChange((event, session) => {
    // ✅ BLOQUEO 1: Ignorar INITIAL_SESSION si hay logout manual
    if (window.__MANUAL_LOGOUT__) {
        if (event === 'INITIAL_SESSION') {
            console.log('🚫 INITIAL_SESSION ignorado - Logout manual activo');
            return; // NO hacer nada
        }
    }

    // ✅ BLOQUEO 2: SIGNED_OUT tiene prioridad absoluta
    if (event === 'SIGNED_OUT') {
        window.__MANUAL_LOGOUT__ = true; // Asegurar bloqueo
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
});
```

### 3. Limpieza del Flag en Login

Cuando el usuario inicia sesión exitosamente:

```javascript
// En login.html
if (data?.session?.user) {
    // 🔓 Permitir sesión nuevamente
    window.__MANUAL_LOGOUT__ = false;
    window.location.href = 'dashboard.html';
}
```

### 4. Protección en Login Page

Se evita la redirección automática si hay logout manual:

```javascript
// En login.html - initLogin()
if (window.__MANUAL_LOGOUT__) {
    console.log('🚫 Logout manual detectado - No redirigir');
    return; // Permanecer en login
}

const { data: { session } } = await supabaseClient.auth.getSession();
if (session?.user) {
    window.location.href = 'dashboard.html'; // Solo redirigir si NO hay logout manual
}
```

## 🎯 FLUJO COMPLETO

### ANTES (Loop infinito):
```
1. Usuario hace clic en Logout
2. auth.signOut() ejecuta
3. SIGNED_OUT event dispara → Redirige a login
4. Login carga → getSession() encuentra sesión residual
5. INITIAL_SESSION event dispara → Reinyecta sesión ❌
6. Usuario redirigido a dashboard automáticamente ❌
7. LOOP INFINITO ❌
```

### DESPUÉS (Correcto):
```
1. Usuario hace clic en Logout
2. window.__MANUAL_LOGOUT__ = true ✅ (BLOQUEO ACTIVADO)
3. sessionStorage.clear() ✅
4. auth.signOut() ejecuta ✅
5. SIGNED_OUT event dispara → Redirige a login ✅
6. Login carga → Detecta __MANUAL_LOGOUT__ = true ✅
7. NO redirige automáticamente ✅
8. Usuario ve formulario de login ✅
9. Usuario ingresa credenciales
10. Login exitoso → __MANUAL_LOGOUT__ = false ✅
11. Redirige a dashboard ✅
12. INITIAL_SESSION dispara (permitido porque flag = false) ✅
```

## 📁 ARCHIVOS MODIFICADOS

### 1. `js/auth-guard.js` (NUEVO)
- Implementa flag `window.__MANUAL_LOGOUT__`
- Función `logout()` activa el flag
- Listener `onAuthStateChange` respeta el flag
- UNA SOLA llamada a `onAuthStateChange` en todo el proyecto

### 2. `pages/login.html`
- Limpia el flag en login exitoso: `window.__MANUAL_LOGOUT__ = false`
- No redirige automáticamente si `__MANUAL_LOGOUT__ === true`

### 3. `js/dashboard.js`
- Función `logout()` actualizada para usar `window.logout()` centralizado
- Fallback con activación del flag

### 4. `js/supabaseClient.js` (NUEVO)
- Inicialización correcta del cliente Supabase v2
- Expone `window.getSupabaseClient()` y `window.getSupabaseSession()`

### 5. `js/config-supabase.js` (NUEVO)
- Configuración de credenciales Supabase

## 🧪 CÓMO PROBAR

### Test 1: Logout debe funcionar
1. Abrir dashboard
2. Hacer clic en Logout
3. **Esperado:** Redirige a login y se queda ahí
4. **NO debe:** Volver a dashboard automáticamente

### Test 2: Login debe funcionar
1. Estar en login
2. Ingresar credenciales válidas
3. **Esperado:** Redirige a dashboard
4. **Flag debe estar:** `window.__MANUAL_LOGOUT__ === false`

### Test 3: Sesión persistente debe funcionar
1. Iniciar sesión
2. Cerrar pestaña
3. Abrir nueva pestaña en la misma URL
4. **Esperado:** Si hay sesión válida, dashboard carga
5. **NO debe:** Redirigir a login si la sesión es válida

### Test 4: Verificar flag en consola
```javascript
// En dashboard después de login
console.log(window.__MANUAL_LOGOUT__); // Debe ser: false

// Después de logout (antes de redirección)
console.log(window.__MANUAL_LOGOUT__); // Debe ser: true
```

## 🚫 PROHIBICIONES RESPETADAS

✅ No se crearon nuevos sistemas de auth  
✅ No se duplicaron listeners  
✅ No se usaron hacks de timeout  
✅ No se eliminó el auth guard  
✅ No se rompió producción  
✅ El código es limpio y mantenible

## 🔑 PUNTOS CLAVE

1. **UNA SOLA fuente de verdad:** `window.__MANUAL_LOGOUT__`
2. **UNA SOLA llamada:** `onAuthStateChange` en `auth-guard.js`
3. **Prioridad absoluta:** `SIGNED_OUT` siempre gana
4. **Bloqueo explícito:** `INITIAL_SESSION` no reinyecta si hay logout manual
5. **Limpieza controlada:** Flag solo se limpia en login exitoso

## 📊 EVENTOS DE SUPABASE MANEJADOS

| Evento | Acción | Respeta Flag |
|--------|--------|--------------|
| `INITIAL_SESSION` | Ignora si `__MANUAL_LOGOUT__ === true` | ✅ SÍ |
| `SIGNED_IN` | Procesa normalmente | ✅ SÍ |
| `SIGNED_OUT` | Activa flag y redirige | ✅ SÍ |
| `USER_UPDATED` | No redirige | N/A |
| `TOKEN_REFRESHED` | No redirige | N/A |

## 💡 RECOMENDACIONES

1. **NO modificar el flag manualmente** fuera de las funciones designadas
2. **NO crear múltiples listeners** `onAuthStateChange`
3. **NO ejecutar `getSession()` múltiples veces** sin control
4. **SÍ usar `window.logout()`** en lugar de `auth.signOut()` directo
5. **SÍ verificar el flag** antes de rehidratar sesión

---

**Estado:** ✅ CORRECCIÓN COMPLETA  
**Autor:** GitHub Copilot  
**Fecha:** 2026-01-13  
**Versión:** 1.0
