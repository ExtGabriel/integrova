# CFE INSIGHT - Sistema de Control de Roles y Permisos

## 📋 Resumen Ejecutivo

Se ha implementado un sistema **centralizado, defensivo y reutilizable** de control de roles en el frontend de CFE Insight/Integrova. El sistema NO es reemplazo de la seguridad backend (RLS), sino **complemento UX** para mejorar la experiencia del usuario.

---

## 🏗️ Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                        APLICACIÓN FRONTEND                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Páginas HTML    │    │  Módulos JS      │                   │
│  │  (compromisos,   │    │  (usuarios,      │                   │
│  │   entidades,     │    │   dashboard,     │                   │
│  │   etc)           │    │   global-search) │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       ▼                                          │
│           ┌──────────────────────────┐                          │
│           │  permissions-helpers.js  │  ◄─── NUEVO             │
│           │  (Sistema de permisos)   │                          │
│           └───────────┬──────────────┘                          │
│                       │                                          │
│           ┌───────────▼──────────────┐                          │
│           │   api-client.js          │  ◄─── EXTENDIDO         │
│           │   (Cliente Supabase)     │                          │
│           └───────────┬──────────────┘                          │
│                       │                                          │
│           ┌───────────▼──────────────────┐                      │
│           │  auth-guard.js (sin cambios) │                      │
│           │  + supabaseClient.js         │                      │
│           └───────────┬──────────────────┘                      │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │         SUPABASE (Backend)                  │                │
│  │  - Tabla users (rol, permisos)             │                │
│  │  - RLS (Row Level Security)                │                │
│  │  - Fuente de Verdad                        │                │
│  └─────────────────────────────────────────────┘                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Autenticación y Permisos

```
1. Usuario hace login
   ↓
2. auth-guard.js carga su sesión desde Supabase
   ↓
3. Se obtiene perfil del usuario (tabla users)
   ↓
4. PermissionsHelper cachea el rol en memoria
   ↓
5. Módulos usan PermissionsHelper para:
   - Ocultar/mostrar botones
   - Deshabilitar controles
   - Bloquear acciones
   ↓
6. Backend (RLS) valida realmente al procesar
   ↓
7. Si hay intento no autorizado → error 403/401
```

---

## 🔐 Roles y Permisos

### Roles Válidos

```javascript
{
  ADMIN: 'administrador',          // Acceso total
  PROGRAMADOR: 'programador',      // Admin técnico
  SOCIO: 'socio',                  // Poder de decisión
  SUPERVISOR: 'supervisor',        // Supervisión
  AUDITOR_SENIOR: 'auditor_senior',// Auditoría avanzada
  AUDITOR: 'auditor',              // Auditoría básica
  CLIENTE: 'cliente'               // Solo lectura
}
```

### Matriz de Permisos por Módulo

#### USUARIOS
```
administrador     → [ver, crear, editar, cambiar_rol, activar_desactivar, eliminar]
programador       → [ver, crear, editar, cambiar_rol, activar_desactivar]
supervisor        → [ver, activar_desactivar]
socio            → [ver]
auditor_senior   → [ver]
auditor          → [ver]
cliente          → [] (sin acceso)
```

#### ENTIDADES
```
administrador     → [ver, crear, editar, eliminar]
programador       → [ver, crear, editar]
supervisor        → [ver, editar]
socio            → [ver, editar]
auditor_senior   → [ver]
auditor          → [ver]
cliente          → [ver] (lectura)
```

#### COMPROMISOS
```
administrador     → [ver, crear, editar, eliminar, cambiar_estado]
programador       → [ver, crear, editar, cambiar_estado]
supervisor        → [ver, editar, cambiar_estado]
socio            → [ver, editar, cambiar_estado]
auditor_senior   → [ver]
auditor          → [ver]
cliente          → [ver] (lectura)
```

---

## 📦 Nuevos Archivos

### 1. `js/permissions-helpers.js`

**Sistema centralizado de permisos con 2 niveles:**

#### Nivel 1: Verificación de Roles
```javascript
// Verificar si tiene UN O VARIOS de estos roles
const hasAdminRights = await PermissionsHelper.hasRole(['administrador', 'programador']);

// Obtener rol actual
const myRole = await PermissionsHelper.getCurrentRole(); // 'auditor', 'cliente', etc
```

#### Nivel 2: Verificación de Acciones
```javascript
// ¿Puede hacer una acción en un recurso?
const canCreate = await PermissionsHelper.hasPermission('crear', 'usuarios');
const canEdit = await PermissionsHelper.hasPermission('editar', 'entidades');

// ¿Puede acceder al módulo completo?
const canAccessModule = await PermissionsHelper.canAccessModule('usuarios');
```

#### Nivel 3: Utilidades de UI
```javascript
// Deshabilitar botón si no tiene permiso
await PermissionsHelper.disableIfNoPermission(
  'deleteBtn',           // ID del elemento
  'eliminar',            // Acción requerida
  'usuarios',            // Recurso
  'No tienes permisos'   // Tooltip
);

// Ocultar elemento si no tiene acceso
await PermissionsHelper.hideIfNoPermission('adminPanel', 'ver', 'usuarios');

// Validar o fallar
const canProceed = await PermissionsHelper.checkPermissionOrFail(
  'cambiar_rol',
  'usuarios',
  '❌ No tienes permiso para cambiar roles de usuarios'
);
```

**Métodos Públicos:**
- `hasRole(roles)` - Verificar role(s)
- `hasAllRoles(roles)` - Verificar ALL (raro)
- `hasPermission(action, resource)` - Verificar acción
- `canAccessModule(module)` - Acceso al módulo
- `isRoleHigherOrEqual(role1, role2)` - Jerarquía
- `getCurrentRole()` - Rol actual
- `getPermissions(resource)` - Listar todos los permisos
- `disableIfNoPermission(element, action, resource, tooltip)`
- `hideIfNoPermission(element, action, resource)`
- `checkPermissionOrFail(action, resource, errorMsg)`
- `requireModuleAccess(module, containerId)`

---

## 🔧 Cambios en Archivos Existentes

### 1. `js/api-client.js` (EXTENDIDO)

**Métodos Nuevos Agregados:**

```javascript
// Verificar acceso a módulos
async canAccessUsers()        // Módulo de usuarios
async canAccessEntities()     // Módulo de entidades
async canAccessCommitments()  // Módulo de compromisos
async canAccessModule(name)   // Genérico

// Métodos existentes (sin cambios):
async hasRole(roles)              // ✅ YA EXISTÍA
async getCurrentRole()            // ✅ YA EXISTÍA
async getCurrentUserName()        // ✅ YA EXISTÍA
async canAccessUsers()            // ✅ YA EXISTÍA
```

**Nota:** La máquina de permisos REAL vive en `permissions-helpers.js`. El `api-client.js` expone solo lo básico para compatibilidad hacia atrás.

### 2. `js/usuarios.js` (SIN CAMBIOS DESTRUCTIVOS)

El archivo ya usa correctamente:
- `API.canAccessUsers()` - Valida acceso
- `API.Users.canChangeRoles()` - Valida capacidad
- `API.Users.canChangeStatus()` - Valida capacidad
- Bloquea UI si no hay permisos
- Muestra mensajes claros en toast

**Puede mejorar usando permisos helpers:**
```javascript
// Dentro de usuarios.js, tras loadUsers():
const perms = await PermissionsHelper.getPermissions('usuarios');
if (!perms.includes('cambiar_rol')) {
  // Ocultar selects de rol
}
if (!perms.includes('activar_desactivar')) {
  // Ocultar botones de estado
}
```

### 3. `js/auth-guard.js` (SIN CAMBIOS)

✅ **NO SE MODIFICÓ** - Mantiene su funcionamiento intacto

### 4. Páginas HTML (COMPATIBLES)

Las páginas pueden usar permisos helpers sin cambiar HTML existente:

```html
<!-- Ejemplo en compromisos.html -->
<button id="createCommitmentBtn" onclick="...">
  <i class="bi bi-plus-circle"></i>
</button>

<script>
// Proteger botón si no tiene permiso
window.protectPage(async () => {
  await PermissionsHelper.disableIfNoPermission(
    'createCommitmentBtn',
    'crear',
    'compromisos',
    'No tienes permiso para crear compromisos'
  );
});
</script>
```

---

## 🚀 Cómo Usar

### En HTML (Proteger Página)

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Scripts en orden CORRECTO -->
  <script src="js/config-supabase.js"></script>
  <script src="js/supabaseClient.js"></script>
  <script src="js/api-client.js"></script>
  <script src="js/permissions-helpers.js"></script>  ← NUEVO
  <script src="js/auth-guard.js"></script>
</head>
<body>
  <!-- HTML de página -->
  <button id="deleteBtn" onclick="handleDelete()">Eliminar</button>

  <script>
    async function initPage() {
      // Ocultar botón si no tiene permiso
      await PermissionsHelper.hideIfNoPermission('deleteBtn', 'eliminar', 'entidades');
      
      // O deshabilitar con tooltip
      await PermissionsHelper.disableIfNoPermission(
        'deleteBtn', 
        'eliminar', 
        'entidades',
        'Solo admin puede eliminar'
      );
    }

    window.protectPage(initPage);
  </script>
</body>
</html>
```

### En Módulos JS

```javascript
// En un módulo (ej: usuarios.js)

async function loadDataForRole() {
  // 1️⃣ Verificar rol simple
  const isAdmin = await PermissionsHelper.hasRole('administrador');
  if (isAdmin) {
    showAdminPanel();
  }

  // 2️⃣ Verificar múltiples roles
  const canModerate = await PermissionsHelper.hasRole(['admin', 'supervisor']);

  // 3️⃣ Verificar acciones específicas
  const canDelete = await PermissionsHelper.hasPermission('eliminar', 'usuarios');
  if (canDelete) {
    renderDeleteButtons();
  }

  // 4️⃣ Obtener todos los permisos
  const perms = await PermissionsHelper.getPermissions('compromisos');
  console.log('Mis permisos en compromisos:', perms);
  // → ['ver', 'crear', 'editar'] para admin
  // → ['ver'] para auditor
}

window.protectPage(loadDataForRole);
```

### Bloqueo de Acciones

```javascript
// ¿Puede hacer X?
async function handleDelete(itemId) {
  const canDelete = await PermissionsHelper.checkPermissionOrFail(
    'eliminar',
    'entidades',
    '❌ No tienes permiso para eliminar entidades'
  );
  
  if (!canDelete) return; // Bloqueado con mensaje
  
  // Proceder con eliminación
  await API.Entities.delete(itemId);
}
```

---

## 🛡️ Seguridad y Buenas Prácticas

### Regla de Oro
> **El frontend NO ES seguro. RLS (Row Level Security) en Supabase ES la verdadera barrera.**

Frontend es solo UX. Si alguien modifica JavaScript, puede ver todo. Lo importante:

1. ✅ RLS en Supabase bloquea acceso real
2. ✅ Frontend oculta opciones (mejor UX)
3. ✅ Backend rechaza peticiones no autorizadas

### Validaciones Defensivas

```javascript
// ✅ CORRECTO: Verificar en frontend Y backend
async function createUser(userData) {
  // 1. Frontend valida
  if (!await PermissionsHelper.hasPermission('crear', 'usuarios')) {
    alert('No tienes permiso');
    return;
  }

  // 2. API hace llamada (backend lo vuelve a validar)
  const result = await API.Users.create(userData);
  // → Si no tiene permisos reales → Error 403
}

// ❌ INCORRECTO: Confiar solo en frontend
async function deleteUser(userId) {
  if (isLoggedIn) { // ← NO SUFICIENTE
    await API.Users.delete(userId);
  }
}
```

### Caché de Permisos

El rol se obtiene UNA VEZ de Supabase y se cachea:
- `API.getMyProfile()` → Cachea perfil
- `PermissionsHelper` → Usa caché
- Si el rol cambia en BD → Recargar página

Para **forzar actualización**:
```javascript
// En api-client.js, currentProfile se puede resetear
// (pero normalmente no es necesario)
```

---

## 📝 Ejemplos Prácticos

### Ejemplo 1: Página de Usuarios

```html
<!-- usuarios.html -->
<body>
  <button id="createUserBtn">Crear usuario</button>
  <button id="editRoleBtn">Cambiar rol</button>
  <button id="deleteUserBtn">Eliminar usuario</button>
  
  <script src="js/config-supabase.js"></script>
  <script src="js/supabaseClient.js"></script>
  <script src="js/api-client.js"></script>
  <script src="js/permissions-helpers.js"></script>
  <script src="js/auth-guard.js"></script>
  <script src="js/usuarios.js"></script>

  <script>
    async function initPage() {
      // Bloquear botones según permisos
      await PermissionsHelper.disableIfNoPermission(
        'createUserBtn', 'crear', 'usuarios', 'No tienes permiso para crear usuarios'
      );
      
      await PermissionsHelper.disableIfNoPermission(
        'editRoleBtn', 'cambiar_rol', 'usuarios', 'No tienes permiso para cambiar roles'
      );
      
      await PermissionsHelper.hideIfNoPermission(
        'deleteUserBtn', 'eliminar', 'usuarios'
      );
    }

    window.protectPage(initPage);
  </script>
</body>
```

### Ejemplo 2: Modal de Creación Condicionada

```javascript
async function showCreateForm() {
  // Verificar permiso
  const canCreate = await PermissionsHelper.hasPermission('crear', 'compromisos');
  
  if (!canCreate) {
    alert('No tienes permiso para crear compromisos');
    return;
  }

  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('createModal'));
  modal.show();
}
```

### Ejemplo 3: Renderizar Tabla Condicionada

```javascript
function renderCommitmentsTable(commitments) {
  const tbody = document.querySelector('#table tbody');
  const currentPerms = await PermissionsHelper.getPermissions('compromisos');
  
  commitments.forEach(commitment => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${commitment.name}</td>
      <td>${commitment.status}</td>
      <td>
        ${currentPerms.includes('editar') ? `<button onclick="edit(${commitment.id})">Editar</button>` : ''}
        ${currentPerms.includes('eliminar') ? `<button onclick="delete(${commitment.id})">Eliminar</button>` : ''}
      </td>
    `;
    tbody.appendChild(row);
  });
}
```

---

## 🧪 Testing/Debugging

### Debug Mode

```javascript
// En consola:

// Ver mis permisos
await PermissionsHelper.getPermissions('usuarios');

// Ver mi rol
await PermissionsHelper.getCurrentRole();

// Probar acceso a módulo
await PermissionsHelper.canAccessModule('entidades');

// Ver jerarquía
await PermissionsHelper.isRoleHigherOrEqual('programador', 'auditor');
```

### Debug en HTML

```html
<script>
  window.protectPage(async () => {
    // Exponer helpers en consola
    window.__DEBUG_PERMS = PermissionsHelper;
    console.log('🔐 PermissionsHelper disponible en __DEBUG_PERMS');
    
    // Ver rol actual
    const role = await PermissionsHelper.getCurrentRole();
    console.log('👤 Tu rol:', role);
    
    // Ver todos tus permisos
    const perms = await PermissionsHelper.getPermissions('usuarios');
    console.log('📋 Tus permisos en usuarios:', perms);
  });
</script>
```

---

## 📋 Checklist de Implementación

- [x] Crear `permissions-helpers.js`
- [x] Extender `api-client.js` con métodos de acceso
- [x] NO modificar `auth-guard.js`
- [x] Mantener `usuarios.js` funcional
- [ ] Integrar en `compromisos.html` (opcional)
- [ ] Integrar en `entidades.html` (opcional)
- [ ] Documentar cambios en README
- [ ] Validar en consola sin errores

---

## 📚 Referencia Rápida

| Método | Uso | Retorna |
|--------|-----|---------|
| `hasRole(roles)` | ¿Tiene este rol? | boolean |
| `hasPermission(action, resource)` | ¿Puede hacer esto? | boolean |
| `canAccessModule(module)` | ¿Puede ver el módulo? | boolean |
| `getCurrentRole()` | ¿Cuál es mi rol? | string \| null |
| `getPermissions(resource)` | Listar permisos | Array |
| `disableIfNoPermission(...)` | Deshabilitar botón | void |
| `hideIfNoPermission(...)` | Ocultar elemento | void |
| `checkPermissionOrFail(...)` | Bloquear con error | boolean |

---

## 🔄 Flujo Típico de Uso

```
1. Página carga
   ↓
2. window.protectPage() ejecuta callback
   ↓
3. initPage() valida autenticación
   ↓
4. Obtiene perfil de usuario (rol)
   ↓
5. Usa PermissionsHelper para:
   - Ocultar/deshabilitar botones
   - Renderizar contenido condicionado
   - Bloquear acciones no permitidas
   ↓
6. Usuario interactúa
   ↓
7. Antes de acción: checkPermissionOrFail()
   ↓
8. Si OK: llama API (backend valida de nuevo)
   ↓
9. Si error 403/401: muestra error
```

---

## 🚨 Errores Comunes

### ❌ Error: "PermissionsHelper is undefined"
**Causa:** Script no cargó o está en orden incorrecto

**Solución:**
```html
<!-- Orden correcto -->
<script src="js/config-supabase.js"></script>
<script src="js/supabaseClient.js"></script>
<script src="js/api-client.js"></script>
<script src="js/permissions-helpers.js"></script>  ← Aquí
<script src="js/auth-guard.js"></script>
```

### ❌ Error: "API is undefined"
**Causa:** `api-client.js` no cargó antes de `permissions-helpers.js`

**Solución:** Cargar en orden correcto

### ❌ Error: "No hay sesión"
**Causa:** Usuario no autenticado, no vino de login.html

**Solución:** Usar `window.protectPage()` que valida sesión

### ⚠️ Permiso aparentemente incorrecto
**Causa:** Caché de rol desactualizado

**Solución:** Recargar página (F5) para resetear caché

---

## 📞 Soporte

Para preguntas o issues:
1. Verificar orden de scripts
2. Revisar consola (F12) para errores
3. Probar `await PermissionsHelper.getCurrentRole()` en consola
4. Verificar que tabla `users` en Supabase tiene columna `role`
5. Verificar RLS en Supabase está configurado

---

**Última actualización:** 2025-01-13  
**Versión:** 1.0  
**Estado:** Producción
