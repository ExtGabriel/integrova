# 🔐 Sistema de Permisos CFE INSIGHT v4

## Arquitectura

**Dos capas de permisos:**

```
┌─────────────────────────────────────────────────────┐
│ PERMISOS GLOBALES (users.role)                      │
│ - admin → acceso total al sistema                   │
│ - user → usuario normal con permisos por entidad    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ PERMISOS POR ENTIDAD (entity_users.role)            │
│ - owner → control total de la entidad               │
│ - auditor → ver + auditar                           │
│ - viewer → solo lectura                             │
│ - null → sin acceso (no asignado)                   │
└─────────────────────────────────────────────────────┘
```

## Uso en Frontend

### 1️⃣ Permisos Globales

```javascript
// ¿Es admin?
if (PermissionsHelper.isAdmin()) {
    console.log('Usuario es administrador');
}

// ¿Es user normal?
if (PermissionsHelper.isUser()) {
    console.log('Usuario normal');
}

// Obtener rol actual
const role = PermissionsHelper.getCurrentRole();
console.log('Mi rol:', role); // 'admin' o 'user'

// Obtener perfil completo
const profile = PermissionsHelper.getMyProfile();
console.log('Mi usuario:', profile.email, profile.role);

// Requerir admin (throw error)
try {
    PermissionsHelper.requireAdmin(null, true); // true = throw error
} catch(e) {
    console.error('No eres admin');
}
```

### 2️⃣ Permisos por Entidad

```javascript
// Obtener entity_role del usuario en una entidad
// Desde API: const userEntityRole = await API.EntityUsers.getUserRole(entityId, userId);

// Ejemplos de uso:
const entityRole = 'owner'; // O 'auditor', 'viewer', null

if (PermissionsHelper.canViewEntity(entityRole)) {
    console.log('✅ Puede ver la entidad');
}

if (PermissionsHelper.canEditEntity(entityRole)) {
    console.log('✅ Puede editar la entidad');
}

if (PermissionsHelper.canCreateCommitment(entityRole)) {
    console.log('✅ Puede crear compromisos');
}

if (PermissionsHelper.canAudit(entityRole)) {
    console.log('✅ Puede auditar');
}
```

### 3️⃣ Renderizado Condicional

```html
<!-- Mostrar botón solo si puede editar -->
<button 
    id="editBtn" 
    style="display: none;"
    onclick="editEntity()">
    Editar
</button>

<script>
    // En el código de carga de entidad:
    const userEntityRole = await API.EntityUsers.getUserRole(entityId, userId);
    
    const editBtn = document.getElementById('editBtn');
    if (PermissionsHelper.canEditEntity(userEntityRole)) {
        editBtn.style.display = 'block'; // Mostrar
    }
</script>
```

### 4️⃣ Protección de API

```javascript
// ANTES de llamar a una API:

// Verificar permisos local (UX)
if (!PermissionsHelper.canEditEntity(userEntityRole)) {
    alert('No tienes permisos para editar esta entidad');
    return;
}

// Llamar a API (el RLS de Supabase hará la verificación final)
try {
    await API.Entities.update(entityId, data);
    console.log('✅ Entidad actualizada');
} catch(e) {
    if (e.code === 'PGRST301') {
        console.error('Acceso denegado por RLS');
    }
}
```

## Matriz de Permisos

### Permisos Globales

| Rol | isAdmin | isUser | hasPermission | Acceso |
|-----|---------|--------|---------------|--------|
| admin | ✅ | ❌ | ✅ (siempre) | Total |
| user | ❌ | ✅ | ❌ (default) | Basado en entity_role |
| null | ❌ | ❌ | ❌ | Ninguno |

### Permisos por Entidad

| Entity Role | canViewEntity | canEditEntity | canCreateCommitment | canAudit |
|-------------|---------------|---------------|---------------------|----------|
| owner | ✅ | ✅ | ✅ | ✅ |
| auditor | ✅ | ❌ | ❌ | ✅ |
| viewer | ✅ | ❌ | ❌ | ❌ |
| null | ❌ | ❌ | ❌ | ❌ |
| **admin** (global) | **✅ SIEMPRE** | **✅ SIEMPRE** | **✅ SIEMPRE** | **✅ SIEMPRE** |

## Casos de Uso Típicos

### 📋 Listar entidades (con permisos)

```javascript
async function loadEntitiesWithPermissions(userId) {
    // 1. Obtener todas las entidades del usuario
    const entities = await API.EntityUsers.listByEntity(userId);
    
    // 2. Renderizar con permisos
    entities.forEach(entity => {
        const row = createEntityRow(entity.entity_id, entity.name);
        
        // Habilitar/deshabilitar botones según role
        if (!PermissionsHelper.canEditEntity(entity.role)) {
            row.editBtn.disabled = true;
        }
        
        if (!PermissionsHelper.canAudit(entity.role)) {
            row.auditBtn.style.display = 'none';
        }
        
        appendRow(row);
    });
}
```

### 👥 Asignar usuario a entidad

```javascript
async function assignUserToEntity(entityId, userId, role) {
    // Solo admins pueden hacer esto
    if (!PermissionsHelper.isAdmin()) {
        alert('Solo administradores pueden asignar usuarios');
        return;
    }
    
    await API.EntityUsers.assign(entityId, userId, role);
    console.log(`✅ ${userId} asignado como ${role}`);
}
```

### ✏️ Editar entidad

```javascript
async function editEntity(entityId, data) {
    // 1. Obtener role actual del usuario
    const userEntityRole = await API.EntityUsers.getUserRole(
        entityId, 
        PermissionsHelper.getMyProfile().id
    );
    
    // 2. Verificar permisos
    if (!PermissionsHelper.canEditEntity(userEntityRole)) {
        alert('No tienes permisos para editar');
        return;
    }
    
    // 3. Actualizar
    try {
        await API.Entities.update(entityId, data);
        console.log('✅ Actualizado');
    } catch(e) {
        console.error('❌ Error:', e.message);
    }
}
```

### 🔍 Auditar compromisos

```javascript
async function loadCommitmentsForAudit(entityId) {
    // 1. Obtener role en la entidad
    const userEntityRole = await API.EntityUsers.getUserRole(
        entityId,
        PermissionsHelper.getMyProfile().id
    );
    
    // 2. Verificar si puede auditar
    if (!PermissionsHelper.canAudit(userEntityRole)) {
        alert('No tienes permiso para auditar esta entidad');
        return;
    }
    
    // 3. Cargar y mostrar compromisos
    const commitments = await API.Commitments.getByEntity(entityId);
    displayCommitments(commitments, 'audit');
}
```

## Constantes Públicas

```javascript
// Roles globales
PermissionsHelper.GLOBAL_ROLES.ADMIN  // 'admin'
PermissionsHelper.GLOBAL_ROLES.USER   // 'user'

// Roles por entidad
PermissionsHelper.ENTITY_ROLES.OWNER   // 'owner'
PermissionsHelper.ENTITY_ROLES.AUDITOR // 'auditor'
PermissionsHelper.ENTITY_ROLES.VIEWER  // 'viewer'
```

## Métodos Públicos Disponibles

### Globales
- `isAdmin(user?)` → boolean
- `isUser(user?)` → boolean
- `requireAdmin(user?, throwError?)` → boolean | throws
- `hasPermission(permission, user?)` → boolean
- `getCurrentRole(user?)` → string|null
- `getMyProfile()` → object|null

### Por Entidad
- `canViewEntity(entityRole, user?)` → boolean
- `canEditEntity(entityRole, user?)` → boolean
- `canCreateCommitment(entityRole, user?)` → boolean
- `canAudit(entityRole, user?)` → boolean

## Notas Importantes

⚠️ **Frontend vs Backend**
- Estos helpers son para UX (mostrar/ocultar botones)
- El backend (RLS de Supabase) es la **fuente de verdad**
- Siempre asume que el backend rechazará llamadas no autorizadas

⚠️ **window.currentUser**
- Debe ser inicializado al login
- Es la fuente de verdad para el rol global
- Se usa si no se proporciona parámetro `user`

⚠️ **Entity Roles**
- Obten del endpoint: `API.EntityUsers.getUserRole(entityId, userId)`
- Puede ser null (sin asignación)
- Son independientes del rol global

⚠️ **Admin Override**
- Los admins siempre retornan `true` en métodos por entidad
- No necesitan tener entity_role en entity_users
- Son "superusuarios" que pueden hacer cualquier cosa

## Integración con API

```javascript
// En api-client.js, el módulo EntityUsers proporciona:
API.EntityUsers.listByEntity(entityId)    // Todos los usuarios de una entidad
API.EntityUsers.assign(entityId, userId, role)  // Asignar usuario
API.EntityUsers.updateRole(entityId, userId, newRole)  // Cambiar role
API.EntityUsers.remove(entityId, userId)  // Remover usuario
API.EntityUsers.getUserRole(entityId, userId)  // Obtener role de un usuario
```

## Flujo Completo de Ejemplo

```javascript
// 1. Usuario hace login
window.currentUser = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'user'  // GLOBAL role
};

// 2. Verificar si es admin
if (PermissionsHelper.isAdmin()) {
    console.log('Es administrador - puede gestionar todo');
} else {
    console.log('Es usuario normal - permisos por entidad');
}

// 3. Cargar entidades del usuario
const myEntities = await API.EntityUsers.listByEntity(window.currentUser.id);

// 4. Para cada entidad, mostrar opciones según role
myEntities.forEach(({ entity_id, role: entityRole, name }) => {
    console.log(`Entidad: ${name}`);
    
    // entityRole = 'owner' | 'auditor' | 'viewer' | null
    console.log(`- ¿Puede ver? ${PermissionsHelper.canViewEntity(entityRole)}`);
    console.log(`- ¿Puede editar? ${PermissionsHelper.canEditEntity(entityRole)}`);
    console.log(`- ¿Puede crear compromisos? ${PermissionsHelper.canCreateCommitment(entityRole)}`);
    console.log(`- ¿Puede auditar? ${PermissionsHelper.canAudit(entityRole)}`);
});
```

---

**Versión:** 4.0  
**Última actualización:** 2024  
**Archivo:** `js/permissions-helpers.js`
