# 🔐 GUÍA: Sistema de Autenticación y Permisos

## Problema Resuelto

**ANTES**: `window.currentUser` nunca se seteaba, causando que:
- Los roles no funcionaban correctamente
- Los administradores recibían "Acceso Denegado"
- Las validaciones de permisos fallaban

**DESPUÉS**: Sistema robusto y centralizado que garantiza:
- ✅ `window.currentUser` siempre está disponible para usuarios autenticados
- ✅ Promesa global `window.currentUserReady` asegura sincronización
- ✅ Validaciones de permisos funcionan correctamente
- ✅ Código defensivo con manejo de errores

---

## Arquitectura

### 1. Flujo de Inicialización

```
┌─────────────────────────────────────────────────────────┐
│ 1. Carga de página (ej: usuarios.html)                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Scripts se cargan en orden:                         │
│    - supabaseClient.js                                  │
│    - api-client.js  ← Crea window.currentUserReady     │
│    - permissions-helpers.js                             │
│    - auth-guard.js                                      │
│    - usuarios.js (u otro módulo)                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. api-client.js automáticamente:                      │
│    - Llama API.Users.getCurrent()                       │
│    - Consulta auth.getUser() → obtiene uid              │
│    - Consulta public.users → obtiene perfil completo    │
│    - Normaliza role (trim + lowercase)                  │
│    - Valida is_active                                   │
│    - Setea window.currentUser                           │
│    - Resuelve window.currentUserReady                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. protectPage() se ejecuta:                           │
│    - Valida sesión de Supabase                          │
│    - Espera a API.Users.getCurrent()                    │
│    - Ejecuta callback de inicialización                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. validateAccess() en módulo (ej: usuarios.js):       │
│    - await window.currentUserReady                      │
│    - Verifica window.currentUser                        │
│    - Valida permisos usando PermissionsHelper           │
│    - Renderiza UI según permisos                        │
└─────────────────────────────────────────────────────────┘
```

---

## Métodos Principales

### 1. `API.Users.getCurrent()`

**Ubicación**: `js/api-client.js`

**Propósito**: Obtener el usuario actual autenticado y setear `window.currentUser`

**Proceso**:
1. Lee `auth.getUser()` para obtener el `uid`
2. Consulta `public.users` con ese `uid`
3. Normaliza el `role` (trim + lowercase)
4. Valida `is_active`
5. Setea `window.currentUser`

**Retorno**:
```javascript
{
  success: true,
  data: {
    id: 'uuid',
    email: 'admin@empresa.com',
    name: 'Administrador',
    role: 'administrador',  // ← normalizado
    is_active: true
    // ... otros campos
  }
}
```

**En caso de error**:
```javascript
{
  success: false,
  data: null,
  error: 'Usuario admin@empresa.com no existe en tabla public.users. Contacta al administrador.'
}
```

---

### 2. `window.currentUserReady`

**Ubicación**: `js/api-client.js` (se crea automáticamente)

**Tipo**: `Promise<object|null>`

**Propósito**: Promesa que se resuelve cuando `window.currentUser` está listo

**Uso en módulos**:
```javascript
async function validateAccess() {
    // CRÍTICO: Esperar a que window.currentUser esté listo
    if (window.currentUserReady) {
        await window.currentUserReady;
    }

    // Ahora window.currentUser está garantizado
    if (!window.currentUser) {
        showErrorMsg('Error cargando usuario');
        return false;
    }

    console.log(`Usuario: ${window.currentUser.name} (${window.currentUser.role})`);
    // ... validaciones de permisos
}
```

---

### 3. `window.currentUser`

**Tipo**: `object | null`

**Estructura**:
```javascript
{
  id: 'uuid',
  email: 'usuario@empresa.com',
  name: 'Nombre Usuario',
  role: 'administrador',  // ← siempre normalizado (lowercase, trimmed)
  is_active: true,
  full_name: 'Nombre Completo Usuario',
  // ... otros campos de public.users
}
```

**Acceso directo** (después de `await window.currentUserReady`):
```javascript
if (window.currentUser.role === 'administrador') {
    // Usuario es admin
}
```

---

## Integración en Páginas

### Patrón Estándar (ej: usuarios.js)

```javascript
(function () {
    'use strict';

    // ==========================================
    // VALIDACIONES Y PERMISOS
    // ==========================================

    async function validateAccess() {
        try {
            console.log('🔐 Validando acceso...');

            // ✅ PASO CRÍTICO: Esperar a window.currentUserReady
            if (window.currentUserReady) {
                console.log('⏳ Esperando a window.currentUserReady...');
                await window.currentUserReady;
            }

            // ✅ Verificar que currentUser esté disponible
            if (!window.currentUser) {
                console.error('❌ window.currentUser no disponible');
                showErrorMsg('Error cargando datos de usuario. Recarga la página.');
                disableUI();
                return false;
            }

            console.log(`✅ Usuario: ${window.currentUser.name} (${window.currentUser.role})`);

            // ✅ Validar acceso al módulo
            const canAccess = await PermissionsHelper.canAccessModule('usuarios');
            if (!canAccess) {
                showErrorMsg('No tienes permiso para acceder a este módulo.');
                disableUI();
                return false;
            }

            // ✅ Validar permisos específicos
            const canCreate = await PermissionsHelper.hasPermission('crear', 'usuarios');
            const canEdit = await PermissionsHelper.hasPermission('editar', 'usuarios');

            console.log('✅ Permisos:', { canCreate, canEdit });

            return true;
        } catch (err) {
            console.error('❌ Error validando acceso:', err);
            showErrorMsg('Error al validar permisos de acceso.');
            return false;
        }
    }

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    async function initializePage() {
        console.log('🚀 Inicializando página...');

        // Validar acceso PRIMERO
        const hasAccess = await validateAccess();
        if (!hasAccess) {
            console.error('❌ Acceso denegado');
            return;
        }

        // Cargar datos y configurar UI
        await loadData();
        setupEventListeners();
    }

    // ==========================================
    // PROTEGER PÁGINA
    // ==========================================

    window.protectPage(initializePage);

})();
```

---

## Validación de Permisos

### Verificar Roles

```javascript
// Verificar UN rol
const isAdmin = await PermissionsHelper.hasRole('administrador');

// Verificar MÚLTIPLES roles (OR)
const isAdminOrProgrammer = await PermissionsHelper.hasRole(['administrador', 'programador']);

// Obtener rol actual
const currentRole = await PermissionsHelper.getCurrentRole();
console.log(`Mi rol: ${currentRole}`);
```

### Verificar Permisos de Acción

```javascript
// ¿Puede crear usuarios?
const canCreate = await PermissionsHelper.hasPermission('crear', 'usuarios');

// ¿Puede editar entidades?
const canEdit = await PermissionsHelper.hasPermission('editar', 'entidades');

// ¿Puede eliminar compromisos?
const canDelete = await PermissionsHelper.hasPermission('eliminar', 'compromisos');
```

### Verificar Acceso a Módulos

```javascript
// ¿Puede acceder a usuarios?
const canAccessUsers = await PermissionsHelper.canAccessModule('usuarios');

// ¿Puede acceder a reportes?
const canAccessReports = await PermissionsHelper.canAccessModule('reportes');
```

### Proteger Elementos de UI

```javascript
// Deshabilitar botón si no tiene permiso
await PermissionsHelper.disableIfNoPermission(
    'createBtn',        // ID del elemento
    'crear',           // Acción requerida
    'usuarios',        // Recurso
    'No tienes permiso para crear usuarios'  // Tooltip
);

// Ocultar botón si no tiene permiso
await PermissionsHelper.hideIfNoPermission(
    'deleteBtn',
    'eliminar',
    'usuarios'
);
```

---

## Manejo de Errores

### Usuario no existe en public.users

```javascript
// API.Users.getCurrent() retorna:
{
  success: false,
  data: null,
  error: 'Usuario admin@empresa.com no existe en tabla public.users. Contacta al administrador.'
}
```

**Acción**: Mostrar error claro y bloquear acceso

### Usuario inactivo

```javascript
// API.Users.getCurrent() retorna:
{
  success: false,
  data: null,
  error: 'Usuario inactivo. Contacta al administrador.'
}
```

**Acción**: Mostrar mensaje y redirigir a login

### Sin rol asignado

```javascript
{
  success: false,
  data: null,
  error: 'Usuario sin rol asignado. Contacta al administrador.'
}
```

---

## Debugging

### Verificar estado de currentUser

```javascript
// En consola del navegador:
console.log('currentUser:', window.currentUser);
console.log('currentUserReady:', window.currentUserReady);

// Esperar la promesa manualmente:
await window.currentUserReady;
console.log('Después de esperar:', window.currentUser);
```

### Ver permisos del usuario actual

```javascript
// Ver todos los permisos en un módulo
const perms = await PermissionsHelper.getPermissions('usuarios');
console.log('Mis permisos en usuarios:', perms);

// Ver rol
const role = await PermissionsHelper.getCurrentRole();
console.log('Mi rol:', role);
```

### Debug helpers

```javascript
// En usuarios.js hay un helper de debug:
window.__usuariosDebug.permisos();
// Retorna: { canChangeRoles: true, canChangeStatus: true, hasAccessToUsers: true }
```

---

## Casos de Uso Comunes

### 1. Mostrar/ocultar botón según rol

```javascript
async function setupUI() {
    await window.currentUserReady;

    const isAdmin = await PermissionsHelper.hasRole(['administrador', 'programador']);
    
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        if (isAdmin) {
            deleteBtn.style.display = 'block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }
}
```

### 2. Validar acción antes de ejecutar

```javascript
async function deleteUser(userId) {
    // Validar permiso antes de ejecutar
    const canDelete = await PermissionsHelper.hasPermission('eliminar', 'usuarios');
    
    if (!canDelete) {
        alert('No tienes permiso para eliminar usuarios');
        return;
    }

    // Ejecutar acción
    const result = await API.Users.delete(userId);
    // ...
}
```

### 3. Renderizar tabla con acciones condicionales

```javascript
async function renderUsersTable(users) {
    await window.currentUserReady;

    const canEdit = await PermissionsHelper.hasPermission('editar', 'usuarios');
    const canDelete = await PermissionsHelper.hasPermission('eliminar', 'usuarios');

    users.forEach(user => {
        const row = document.createElement('tr');
        
        // ... columnas normales
        
        // Columna de acciones
        const actionsCell = document.createElement('td');
        
        if (canEdit) {
            actionsCell.innerHTML += `<button onclick="editUser('${user.id}')">Editar</button>`;
        }
        
        if (canDelete) {
            actionsCell.innerHTML += `<button onclick="deleteUser('${user.id}')">Eliminar</button>`;
        }
        
        row.appendChild(actionsCell);
        tableBody.appendChild(row);
    });
}
```

---

## Checklist de Integración

Al crear una nueva página con validación de permisos:

- [ ] Cargar scripts en orden correcto (ver usuarios.html como ejemplo)
- [ ] En la función de inicialización, agregar:
  ```javascript
  if (window.currentUserReady) {
      await window.currentUserReady;
  }
  if (!window.currentUser) {
      // manejar error
      return;
  }
  ```
- [ ] Validar acceso al módulo con `PermissionsHelper.canAccessModule()`
- [ ] Validar permisos específicos antes de mostrar botones
- [ ] Usar `window.protectPage()` para envolver la inicialización
- [ ] Manejar errores de forma clara en la UI (no solo console.log)
- [ ] Probar con diferentes roles (admin, auditor, cliente, etc.)

---

## Roles Disponibles

```javascript
const ROLES = {
    ADMIN: 'administrador',           // Acceso total
    PROGRAMADOR: 'programador',       // Casi total
    SOCIO: 'socio',                   // Gestión completa
    SUPERVISOR: 'supervisor',         // Supervisión
    AUDITOR_SENIOR: 'auditor_senior', // Auditoría avanzada
    AUDITOR: 'auditor',               // Auditoría básica
    CLIENTE: 'cliente'                // Solo lectura
};
```

---

## Migración de Código Existente

Si tienes código que usa `sessionStorage.getItem('userUI')` o similar:

**ANTES**:
```javascript
const userUI = JSON.parse(sessionStorage.getItem('userUI'));
if (userUI.role === 'administrador') {
    // ...
}
```

**DESPUÉS**:
```javascript
await window.currentUserReady;

if (window.currentUser.role === 'administrador') {
    // ...
}
```

---

## Soporte

Si encuentras problemas:

1. Verificar consola del navegador
2. Verificar que los scripts estén cargados en orden
3. Verificar que `window.currentUser` no sea `null`
4. Revisar que el usuario exista en `public.users`
5. Revisar que el usuario tenga `is_active = true`
6. Revisar que el usuario tenga un `role` asignado

---

**Actualizado**: Enero 2026  
**Versión**: 1.0
