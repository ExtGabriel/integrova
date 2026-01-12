# Refactorización de dashboard-init.js - Resumen de Cambios

## Objetivo
Refactorizar el flujo de sesión del dashboard para usar `supabase.auth.onAuthStateChange` de forma correcta y garantizar inicialización única tras confirmar sesión activa.

## Cambios Realizados

### 1. ✅ Eliminado flujo basado en `getSession()` inmediato
- **Antes**: El script llamaba directamente a `getSession()` y redirigía a login si no había sesión
- **Problema**: Esto podría no capturar la sesión en tiempo, especialmente en navegadores que aplican restricciones de cookies
- **Después**: Usa `supabase.auth.onAuthStateChange` que es el listener correcto

### 2. ✅ Implementado `supabase.auth.onAuthStateChange`
```javascript
window.API.supabase.auth.onAuthStateChange(async (event, session) => {
    // Manejo de eventos de autenticación
})
```

**Eventos manejados:**
- `INITIAL_SESSION`: Sesión inicial al cargar la página
- `USER_UPDATED`: El usuario fue actualizado
- `SIGNED_IN`: Usuario inició sesión
- `SIGNED_OUT`: Usuario cerró sesión (ÚNICA condición para redirigir a login)
- `TOKEN_REFRESHED`: Token fue refrescado

### 3. ✅ Redirección SOLO en SIGNED_OUT
```javascript
if (event === 'SIGNED_OUT') {
    console.warn('⚠️ Sesión cerrada por usuario o por inactividad');
    redirectToLogin();
    return;
}
```
- No hay redirecciones automáticas por `getSession()` vacío
- Solo redirige cuando Supabase confirma explícitamente `SIGNED_OUT`
- Esto previene redirecciones falsas durante carga lenta

### 4. ✅ Inicialización UNA SOLA VEZ
```javascript
let dashboardInitialized = false;

if (!dashboardInitialized) {
    dashboardInitialized = true;
    console.log('🔄 Inicializando dashboard (primera vez)...');
    await initDashboard(session);
} else {
    console.log('🔄 Actualizando datos tras cambio de sesión...');
    await updateDashboardData(session);
}
```

- La variable `dashboardInitialized` previene múltiples inicializaciones
- Primera sesión válida: ejecuta `initDashboard()` completo
- Cambios posteriores de sesión: ejecuta `updateDashboardData()` (más ligero)

### 5. ✅ Flujo de inicialización mejorado

**Orden de ejecución:**

```
1. dashboard-init.js carga
2. Espera a que window.API esté disponible (máx 5 segundos)
3. Llama setupAuthStateListener()
4. Supabase emite evento (normalmente INITIAL_SESSION)
5. Si sesión válida → initDashboard() o updateDashboardData()
6. Dashboard listo
```

### 6. ✅ Separación de responsabilidades

**`initDashboard(session)` - Ejecución UNA VEZ:**
- Mostrar indicador de carga
- Guardar sesión
- Obtener perfil del usuario
- Renderizar dashboard
- Cargar datos iniciales
- Configurar event listeners

**`updateDashboardData(session)` - Ejecución en cambios posteriores:**
- Actualizar perfil del usuario
- Actualizar sesión
- Sin reinicializar componentes

### 7. ✅ Manejo robusto de errores

- Verifica disponibilidad de `window.API` antes de usar
- Verifica disponibilidad de cliente Supabase
- Espera hasta 5 segundos a que API cargue
- Muestra errores claros si falla

## Beneficios de esta refactorización

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Flujo de sesión** | Basado en getSession() inmediato | Basado en listener de Supabase |
| **Redirecciones** | Posibles redirecciones falsas | SOLO redirige en SIGNED_OUT |
| **Inicializaciones** | Potencialmente múltiples | UNA SOLA VEZ |
| **Rendimiento** | Re-inicializa todo en cada cambio | Actualiza solo datos en cambios |
| **Confiabilidad** | Susceptible a timing | Respeta eventos de Supabase |

## Compatibilidad

✅ Compatible con:
- `api-client.js` (proporciona `window.API`)
- `supabaseClient.js` (proporciona cliente Supabase)
- `dashboard.js` (espera `loadDashboardDataFromAPI`)
- Todas las páginas que incluyen `dashboard-init.js`

## Logs esperados en consola

```
⏳ dashboard-init.js cargado. Esperando window.API...
✅ window.API disponible. Configurando listener de autenticación...
🔐 Auth event: INITIAL_SESSION ✅ Sesión activa
✅ Sesión válida detectada: <user-id>
🔄 Inicializando dashboard (primera vez)...
🔄 Obteniendo perfil...
✅ Perfil obtenido: <profile-id>
🔄 Renderizando dashboard...
🔄 Cargando datos...
✅ Dashboard inicializado correctamente
```

## Próximos pasos recomendados

1. Probar en navegador: Validar que el dashboard se inicializa correctamente
2. Probar logout: Verificar que SIGNED_OUT redirige a login
3. Probar token refresh: Verificar que TOKEN_REFRESHED actualiza datos
4. Validar en mobile: Especialmente con restricciones de cookies
