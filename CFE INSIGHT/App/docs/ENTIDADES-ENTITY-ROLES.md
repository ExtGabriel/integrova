# 🔐 Guía: Conectar Entidades con Entity Roles

## Objetivo
Integrar el sistema de roles por entidad (`entity_users.role`) en la vista de entidades para proteger acciones críticas.

## Arquitectura

```
entidades.html
    ↓
    ├─ Cargar tabla de entidades
    │  └─ Cada fila tiene botones (ver, editar, eliminar, crear compromiso)
    │
    ├─ Usuario hace clic en "Ver Entidad"
    │  └─ EntityRoleManager.loadEntity(entity) 
    │     ├─ Guarda entity en window.currentEntity
    │     ├─ Consulta API.EntityUsers.getUserRole(entityId, userId)
    │     ├─ Guarda role en window.currentEntityRole
    │     └─ Protege botones según permisos
    │
    └─ Usuario intenta acción (editar, eliminar, crear compromiso)
       └─ EntityRoleManager.checkPermission(action)
          ├─ Verifica role en window.currentEntityRole
          ├─ Si no tiene permiso → Alert + return
          └─ Si tiene permiso → Proceder
```

## Paso 1: Cargar el Módulo

En `entidades.html`, asegúrate del orden de scripts:

```html
<!-- Orden CRÍTICO: -->
<script src="js/config-supabase.js"></script>
<script src="js/supabaseClient.js"></script>
<script src="js/api-client.js"></script>
<script src="js/permissions-helpers.js"></script>
<script src="js/entity-role-manager.js"></script>  ← AGREGAR ESTA LÍNEA
<script src="js/auth-guard.js"></script>
<!-- ... otros scripts ... -->
```

## Paso 2: Al Mostrar Entidades

Cuando cargas la tabla de entidades, agrega un handler para "Ver Entidad":

### Código Actual (antes)
```javascript
// Cuando el usuario hace clic en "Ver Entidad"
async function onViewEntity(entityId, entityName) {
    // Ir a la vista de detalles
    showEntityDetails(entityId);
}
```

### Código Nuevo (después)
```javascript
// Cuando el usuario hace clic en "Ver Entidad"
async function onViewEntity(entityId, entityName) {
    try {
        // PASO 1: Obtener datos de la entidad
        const entity = await API.Entities.getById(entityId);
        
        // PASO 2: Cargar entity role
        const success = await EntityRoleManager.loadEntity(entity);
        if (!success) {
            alert('Error al cargar permisos de la entidad');
            return;
        }

        // PASO 3: Ir a la vista de detalles (botones ya estarán protegidos)
        showEntityDetails(entityId);

    } catch (error) {
        console.error('Error cargando entidad:', error);
        alert('Error al cargar la entidad');
    }
}
```

## Paso 3: Proteger Botones de Acciones

En el HTML de la vista detalle de entidad, usa `data-action`:

```html
<!-- Vista detalle de entidad (ejemplo) -->
<div id="entityDetail">
    <h2 id="entityName"></h2>

    <!-- BOTÓN EDITAR -->
    <button class="btn btn-primary" data-action="edit" onclick="onEditEntity()">
        <i class="bi bi-pencil"></i> Editar
    </button>

    <!-- BOTÓN CREAR COMPROMISO -->
    <button class="btn btn-success" data-action="create-commitment" onclick="onCreateCommitment()">
        <i class="bi bi-plus"></i> Crear Compromiso
    </button>

    <!-- BOTÓN AUDITAR -->
    <button class="btn btn-info" data-action="audit" onclick="onAuditEntity()">
        <i class="bi bi-clipboard-check"></i> Auditar
    </button>

    <!-- BOTÓN ELIMINAR -->
    <button class="btn btn-danger" data-action="delete" onclick="onDeleteEntity()">
        <i class="bi bi-trash"></i> Eliminar
    </button>

    <!-- Tabla de Compromisos (solo visible si tiene acceso) -->
    <table id="commitmentsTable" style="display: none;">
        <!-- ... -->
    </table>
</div>
```

Los botones serán **automáticamente deshabilitados** cuando se cargue la entidad si el usuario no tiene permiso.

## Paso 4: Handlers de Acciones

Protege cada handler:

```javascript
/**
 * EDITAR ENTIDAD
 */
async function onEditEntity() {
    // VALIDACIÓN: Verificar permiso
    if (!EntityRoleManager.checkPermission('edit')) {
        return; // Usuario vio el alert, regresa
    }

    try {
        // Abrir modal/formulario de edición
        openEditEntityModal(window.currentEntity);
    } catch (error) {
        console.error('Error editando entidad:', error);
    }
}

/**
 * ELIMINAR ENTIDAD
 */
async function onDeleteEntity() {
    // VALIDACIÓN: Verificar permiso
    if (!EntityRoleManager.checkPermission('delete')) {
        return;
    }

    try {
        // Confirmación adicional
        if (!confirm(`¿Eliminar "${window.currentEntity.name}"?`)) {
            return;
        }

        // Llamar API
        await API.Entities.delete(window.currentEntity.id);
        alert('Entidad eliminada');
        
        // Limpiar estado
        EntityRoleManager.clearEntity();
        
        // Recargar tabla
        loadEntities();

    } catch (error) {
        console.error('Error eliminando entidad:', error);
        alert('Error al eliminar la entidad');
    }
}

/**
 * CREAR COMPROMISO
 */
async function onCreateCommitment() {
    // VALIDACIÓN: Verificar permiso
    if (!EntityRoleManager.checkPermission('create-commitment')) {
        return;
    }

    try {
        // Abrir modal para crear compromiso
        openCreateCommitmentModal(window.currentEntity.id);

    } catch (error) {
        console.error('Error creando compromiso:', error);
    }
}

/**
 * AUDITAR ENTIDAD
 */
async function onAuditEntity() {
    // VALIDACIÓN: Verificar permiso
    if (!EntityRoleManager.checkPermission('audit')) {
        return;
    }

    try {
        // Cargar vista de auditoría
        showAuditView(window.currentEntity.id);

    } catch (error) {
        console.error('Error en auditoría:', error);
    }
}
```

## Paso 5: Mostrar Estado de Permisos (Opcional)

Para dar feedback visual al usuario sobre sus permisos:

```javascript
function displayPermissionsStatus() {
    const state = EntityRoleManager.getState();
    
    const statusDiv = document.getElementById('permissionsStatus');
    if (!statusDiv) return;

    const html = `
        <div class="alert alert-info">
            <strong>${state.currentEntity?.name || 'Entidad'}</strong><br>
            <small>
                Tu role: <strong>${state.currentEntityRole || 'Sin asignar'}</strong>
                ${state.isAdmin ? ' (Administrador)' : ''}
            </small>
            <ul style="margin: 5px 0 0 20px; font-size: 0.9em;">
                <li>✏️ Editar: ${state.permissions.canEdit ? '✅' : '❌'}</li>
                <li>➕ Crear compromisos: ${state.permissions.canCreateCommitment ? '✅' : '❌'}</li>
                <li>🔍 Auditar: ${state.permissions.canAudit ? '✅' : '❌'}</li>
                <li>🗑️ Eliminar: ${state.permissions.canDelete ? '✅' : '❌'}</li>
            </ul>
        </div>
    `;

    statusDiv.innerHTML = html;
}

// Llamar cuando se carga la entidad
async function onViewEntity(entityId, entityName) {
    const entity = await API.Entities.getById(entityId);
    await EntityRoleManager.loadEntity(entity);
    displayPermissionsStatus();  // ← Aquí
    showEntityDetails(entityId);
}
```

## Paso 6: Actualizar Roles en Tiempo Real

Si cambias roles (ej: en página de usuarios), actualiza el cache:

```javascript
// En usuarios.html, después de asignar un usuario a una entidad:
async function onAssignUserToEntity(entityId, userId, role) {
    try {
        // Asignar en BD
        await API.EntityUsers.assign(entityId, userId, role);

        // Refrescar cache de roles
        await EntityRoleManager.refreshEntityRole(entityId, userId);

        alert('Usuario asignado correctamente');

    } catch (error) {
        console.error('Error asignando usuario:', error);
    }
}
```

## Matriz de Referencia: Quién Puede Hacer Qué

| Rol | Editar | Crear Compromisos | Auditar | Eliminar |
|-----|--------|-------------------|---------|----------|
| **owner** | ✅ | ✅ | ✅ | ✅ |
| **auditor** | ❌ | ❌ | ✅ | ❌ |
| **viewer** | ❌ | ❌ | ❌ | ❌ |
| **admin** (global) | ✅ SIEMPRE | ✅ SIEMPRE | ✅ SIEMPRE | ✅ SIEMPRE |

## API de EntityRoleManager

### Métodos Principales

```javascript
// 1. Cargar una entidad completa
await EntityRoleManager.loadEntity(entity, userId?)
// → Establece window.currentEntity y window.currentEntityRole

// 2. Verificar permiso (muestra alert si no tiene)
EntityRoleManager.checkPermission('edit'|'delete'|'create-commitment'|'audit')
// → true/false

// 3. Actualizar botones manualmente
await EntityRoleManager.updateActionButtons()

// 4. Obtener role específico
const role = await EntityRoleManager.getEntityRole(entityId, userId?)
// → 'owner'|'auditor'|'viewer'|null

// 5. Limpiar estado
EntityRoleManager.clearEntity()

// 6. Refrescar rol después de cambios
const newRole = await EntityRoleManager.refreshEntityRole(entityId)

// 7. Obtener estado actual (debugging)
const state = EntityRoleManager.getState()
// → { currentEntity, currentEntityRole, isAdmin, permissions: {...} }
```

## Debugging

```javascript
// Ver estado actual
console.log(EntityRoleManager.getState());

// Ver cache de roles
// (El cache es privado, pero puedes hacer llamadas para verificar)
const role = await EntityRoleManager.getEntityRole(1);
console.log('Role en entidad 1:', role);

// Logs automáticos cuando se cargan entidades:
// ✅ EntityRoleManager: Role para entidad X (cache)
// 🔄 EntityRoleManager: Obteniendo role para entidad X...
// ✅ EntityRoleManager: Botones actualizados: { canEdit: true, ... }
```

## Implementación Sugerida - Checklist

- [ ] Agregar `<script src="js/entity-role-manager.js"></script>` en entidades.html
- [ ] Modificar `onViewEntity()` para llamar `EntityRoleManager.loadEntity()`
- [ ] Agregar `data-action` a botones de acciones críticas
- [ ] Implementar `EntityRoleManager.checkPermission()` en cada handler
- [ ] Probar con diferentes roles:
  - [ ] Admin (debe poder hacer todo)
  - [ ] Owner (puede editar, crear, auditar, eliminar)
  - [ ] Auditor (solo ver y auditar)
  - [ ] Viewer (solo ver)
  - [ ] Sin asignar (no puede hacer nada)
- [ ] Verificar que botones se deshabilitan automáticamente
- [ ] Verificar que alertas muestran mensaje claro

## Notas Importantes

⚠️ **Frontend vs Backend**
- Estos helpers son **UX defensiva** (mostrar/ocultar botones)
- El backend (RLS de Supabase) es la **fuente de verdad**
- Siempre asumir que el backend rechazará operaciones no autorizadas

⚠️ **Orden de Scripts**
- `entity-role-manager.js` debe cargar **DESPUÉS** de:
  - `permissions-helpers.js`
  - `api-client.js`
  - Pero **ANTES** de cualquier script que lo use

⚠️ **Admin Override**
- Los admins (global role = 'admin') pueden hacer cualquier cosa
- No necesitan ser asignados en `entity_users`
- PermissionsHelper.isAdmin() siempre retorna true

⚠️ **Entity Role en BD**
- Se guarda en tabla `public.entity_users`
- Campo `role`: 'owner'|'auditor'|'viewer'|null
- Independiente del rol global (`public.users.role`)

---

**Versión:** 1.0  
**Archivo:** `js/entity-role-manager.js`  
**Requiere:** `permissions-helpers.js`, `api-client.js`
