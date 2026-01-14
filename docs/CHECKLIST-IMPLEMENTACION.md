# ✅ Checklist de Implementación

## Pre-Implementación

### Verificaciones Iniciales
- [ ] Tengo acceso a entidades.html
- [ ] Tengo acceso a modificar archivos js/
- [ ] permissions-helpers.js ya está cargado en entidades.html
- [ ] api-client.js ya está cargado en entidades.html
- [ ] API.EntityUsers.getUserRole() existe y funciona
- [ ] public.entity_users existe en BD con datos

### Documentación Leída
- [ ] QUICK-START-ENTITY-ROLES.md (5 min)
- [ ] RESUMEN-ENTITY-ROLES.md (15 min)
- [ ] ENTIDADES-ENTITY-ROLES.md (30 min)

---

## Paso 1: Script de Carga

### HTML Modification
```html
<!-- En entidades.html, busca esta sección: -->
<script src="js/permissions-helpers.js"></script>
<script src="js/auth-guard.js"></script>

<!-- Agrega AQUÍ (entre permissions-helpers y auth-guard): -->
<script src="js/entity-role-manager.js"></script>
```

### Verificación
```javascript
// En Console del navegador:
EntityRoleManager
// Debería mostrar un objeto con métodos
```

**Checklist:**
- [ ] `entity-role-manager.js` está en js/ folder
- [ ] Script tag agregado en entidades.html
- [ ] DESPUÉS de permissions-helpers.js
- [ ] ANTES de scripts que lo usen
- [ ] Página recargada (Ctrl+Shift+R)
- [ ] Console muestra "✅ entity-role-manager.js cargado"

---

## Paso 2: Cargar Entidades

### Ubicación: Función que abre/visualiza entidad

### Antes
```javascript
// Búscalo en tu entidades.html o js
async function onViewEntity(entityId, entityName) {
    // ... código antiguo ...
    showEntityDetailView(entity);
}
```

### Después
```javascript
async function onViewEntity(entityId, entityName) {
    try {
        // 1. Obtener datos
        const entity = await API.Entities.getById(entityId);
        
        // 2. NUEVO: Cargar entity role
        await EntityRoleManager.loadEntity(entity);
        
        // 3. Mostrar detalles
        showEntityDetailView(entity);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar la entidad');
    }
}
```

**Checklist:**
- [ ] Función `onViewEntity()` encontrada
- [ ] `EntityRoleManager.loadEntity(entity)` agregado
- [ ] Código dentro de try-catch
- [ ] Probado en navegador sin errores

---

## Paso 3: HTML de Botones

### Ubicación: Vista detalle de entidad

### Estructura HTML
```html
<!-- Busca o crea esta estructura -->
<div id="entityDetailView">
    <h2 id="entityName"></h2>
    
    <!-- STATUS DE PERMISOS (opcional) -->
    <div id="entityPermissionsStatus"></div>
    
    <!-- BOTONES DE ACCIONES -->
    <div class="entity-actions">
        <button class="btn btn-primary" data-action="edit" onclick="onEditEntity()">
            <i class="bi bi-pencil"></i> Editar
        </button>
        
        <button class="btn btn-danger" data-action="delete" onclick="onDeleteEntity()">
            <i class="bi bi-trash"></i> Eliminar
        </button>
        
        <button class="btn btn-success" data-action="create-commitment" onclick="onCreateCommitment()">
            <i class="bi bi-plus"></i> Crear Compromiso
        </button>
        
        <button class="btn btn-info" data-action="audit" onclick="onAuditEntity()">
            <i class="bi bi-clipboard-check"></i> Auditar
        </button>
    </div>
    
    <!-- TABLA DE COMPROMISOS -->
    <table id="commitmentsTable">
        <tbody></tbody>
    </table>
</div>
```

**Checklist:**
- [ ] 4 botones tienen `data-action="..."`
- [ ] Valores: "edit", "delete", "create-commitment", "audit"
- [ ] Cada botón tiene `onclick="handler()"`
- [ ] IDs de handlers coinciden (onEditEntity, etc)

---

## Paso 4: Handlers de Acciones

### Patrón General
```javascript
async function onActionName() {
    // 1. VALIDAR
    if (!EntityRoleManager.checkPermission('action')) return;
    
    // 2. PROCEDER
    // ... tu lógica ...
}
```

### EDITAR
```javascript
async function onEditEntity() {
    if (!EntityRoleManager.checkPermission('edit')) return;
    
    try {
        // Abrir modal o form
        openEditEntityModal(window.currentEntity);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
```

- [ ] Función existe
- [ ] Comienza con `checkPermission('edit')`
- [ ] Implementar lógica de edición
- [ ] Catch blocks para errores

### ELIMINAR
```javascript
async function onDeleteEntity() {
    if (!EntityRoleManager.checkPermission('delete')) return;
    
    try {
        if (!confirm('¿Estás seguro?')) return;
        
        await API.Entities.delete(window.currentEntity.id);
        alert('✅ Eliminado');
        
        EntityRoleManager.clearEntity();
        loadEntities();  // Recargar lista
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
```

- [ ] Función existe
- [ ] Comienza con `checkPermission('delete')`
- [ ] Confirmación antes de eliminar
- [ ] EntityRoleManager.clearEntity() al final

### CREAR COMPROMISO
```javascript
async function onCreateCommitment() {
    if (!EntityRoleManager.checkPermission('create-commitment')) return;
    
    try {
        openCreateCommitmentModal(window.currentEntity.id);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
```

- [ ] Función existe
- [ ] Comienza con `checkPermission('create-commitment')`
- [ ] Pasa window.currentEntity.id al modal

### AUDITAR
```javascript
async function onAuditEntity() {
    if (!EntityRoleManager.checkPermission('audit')) return;
    
    try {
        showAuditView(window.currentEntity.id, window.currentEntity.name);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
```

- [ ] Función existe
- [ ] Comienza con `checkPermission('audit')`
- [ ] Implementar vista de auditoría

---

## Paso 5: Verificación en Navegador

### Console Tests
```javascript
// 1. Módulo cargado
EntityRoleManager  // Debería mostrar objeto
// ✅ Si: Continúa
// ❌ Si: Error - revisar script tag

// 2. Cargar entidad
await EntityRoleManager.loadEntity({ id: 1, name: 'Test' })
// ✅ Si: Sin error - Continúa
// ❌ Si: Error - revisar API.EntityUsers.getUserRole

// 3. Ver estado
EntityRoleManager.getState()
// ✅ Si: Muestra objeto con currentEntity, currentEntityRole, etc
// ❌ Si: Error - revisar módulo

// 4. Verificar permisos
PermissionsHelper.canEditEntity('owner')  // true
PermissionsHelper.canEditEntity('viewer') // false
// ✅ Si: Correcto
// ❌ Si: Revisar permissions-helpers.js
```

**Checklist:**
- [ ] EntityRoleManager está disponible
- [ ] loadEntity() funciona sin error
- [ ] getState() retorna objeto correcto
- [ ] Permisos retornan boolean correcto

### UI Tests
1. Abre entidades.html
2. Carga una entidad (como viewer)
3. Verifica:
   - [ ] Botón EDIT: deshabilitado
   - [ ] Botón DELETE: deshabilitado
   - [ ] Botón CREATE-COMMITMENT: deshabilitado
   - [ ] Botón AUDIT: deshabilitado (si viewer)
   - [ ] Tooltip muestra mensaje

4. Carga otra entidad (como owner)
5. Verifica:
   - [ ] Botón EDIT: habilitado
   - [ ] Botón DELETE: habilitado
   - [ ] Botón CREATE-COMMITMENT: habilitado
   - [ ] Botón AUDIT: habilitado

### BD Tests
```sql
-- Verificar que hay datos en entity_users
SELECT * FROM public.entity_users 
WHERE user_id = 'current-user-id'
LIMIT 5;

-- Debería mostrar:
-- | entity_id | user_id | role |
-- | 1 | user-123 | owner |
-- | 2 | user-123 | auditor |
-- etc
```

**Checklist:**
- [ ] entity_users tiene datos
- [ ] El usuario actual está asignado a al menos una entidad
- [ ] Los roles son válidos (owner, auditor, viewer)

---

## Paso 6: Testing Completo

### Test 1: Admin Override
- [ ] Cambiar user.role a 'admin' en BD
- [ ] Cargar cualquier entidad
- [ ] Verificar todos los botones habilitados
- [ ] Revertir cambio en BD

### Test 2: Sin Asignar
- [ ] Usuario sin asignación en entity_users
- [ ] Cargar entidad
- [ ] Todos los botones deshabilitados
- [ ] EntityRoleManager.getState() muestra role=null

### Test 3: Owner
- [ ] Asignar usuario como 'owner'
- [ ] Todos los botones habilitados
- [ ] Puede editar, eliminar, crear, auditar

### Test 4: Auditor
- [ ] Asignar usuario como 'auditor'
- [ ] Solo botón AUDIT habilitado
- [ ] Los otros deshabilitados

### Test 5: Viewer
- [ ] Asignar usuario como 'viewer'
- [ ] Todos los botones deshabilitados
- [ ] Puede ver pero no actuar

### Test 6: Protección de Acciones
- [ ] Como VIEWER, intentar editar
- [ ] Alert: "No tienes permiso"
- [ ] Modal de edición NO abre
- [ ] Handler retorna early

### Test 7: Cache
- [ ] Cargar entidad (primera vez, va a API)
- [ ] Logs: "🔄 Obteniendo role..."
- [ ] Cargar misma entidad (segunda vez, cache)
- [ ] Logs: "✅ Role (cache)"

### Test 8: Refrescar Role
- [ ] Cargar entidad como viewer
- [ ] En otra ventana, cambiar a owner
- [ ] En consola: `await EntityRoleManager.refreshEntityRole(1)`
- [ ] Botones se actualizan automáticamente

**Checklist:**
- [ ] Test 1: Admin override ✅
- [ ] Test 2: Sin asignar ✅
- [ ] Test 3: Owner ✅
- [ ] Test 4: Auditor ✅
- [ ] Test 5: Viewer ✅
- [ ] Test 6: Protección ✅
- [ ] Test 7: Cache ✅
- [ ] Test 8: Refrescar ✅

---

## Paso 7: Optimizaciones (Opcional)

### Mostrar Status de Permisos
```javascript
async function onViewEntity(entityId) {
    const entity = await API.Entities.getById(entityId);
    await EntityRoleManager.loadEntity(entity);
    
    // NUEVO: Mostrar status
    displayPermissionsStatus();
    
    showEntityDetailView(entity);
}

function displayPermissionsStatus() {
    const state = EntityRoleManager.getState();
    const div = document.getElementById('entityPermissionsStatus');
    
    div.innerHTML = `
        <div class="alert alert-${state.isAdmin ? 'danger' : 'info'}">
            <strong>Tu Role:</strong> ${state.currentEntityRole || 'SIN ASIGNAR'}
            ${state.isAdmin ? '(ADMINISTRADOR)' : ''}
        </div>
    `;
}
```

- [ ] HTML tiene `<div id="entityPermissionsStatus"></div>`
- [ ] Función displayPermissionsStatus() implementada
- [ ] Llamada en onViewEntity()

### Refrescar en Tiempo Real
```javascript
// En página de usuarios, después de asignar:
async function onAssignUserToEntity(entityId, userId, role) {
    await API.EntityUsers.assign(entityId, userId, role);
    
    // Si el usuario es el actual, refrescar
    if (userId === window.currentUser.id && window.currentEntity?.id === entityId) {
        await EntityRoleManager.refreshEntityRole(entityId);
    }
}
```

- [ ] Implementado en página de usuarios
- [ ] Refrescar automático después de asignar

---

## Finalización

### Documentación
- [ ] Actualizar README del proyecto
- [ ] Agregar link a ENTITY-ROLES-INDEX.md
- [ ] Documentar en Wiki interna (si aplica)

### Cleanup
- [ ] Eliminar archivos de prueba (si los hay)
- [ ] Verificar que no hay errores en console
- [ ] Commit a git: `Feat: Integrate entity role management`

### Deploy
- [ ] Pushear a dev
- [ ] Testear en dev
- [ ] Pushear a prod
- [ ] Verificar en producción

---

## Post-Implementación

### Monitoreo
- [ ] Revisar logs de EntityRoleManager en producción
- [ ] Verificar que botones se deshabilitan correctamente
- [ ] Monitorear errores en API.EntityUsers

### Feedback
- [ ] Pedir feedback a usuarios (testing)
- [ ] Documentar problemas encontrados
- [ ] Iterar si es necesario

### Documentación Actualizada
- [ ] Agregar screenshots a guías
- [ ] Documentar procesos en Wiki
- [ ] Crear guía para usuarios finales

---

## Resumen Rápido

| Paso | Tarea | Tiempo | Estado |
|------|-------|--------|--------|
| 1 | Agregar script | 1 min | - |
| 2 | Modificar onViewEntity() | 2 min | - |
| 3 | HTML data-action | 2 min | - |
| 4 | Handlers con checkPermission | 5 min | - |
| 5 | Verificar en navegador | 5 min | - |
| 6 | Testing (8 tests) | 10 min | - |
| 7 | Optimizaciones (opt) | 5 min | - |
| **TOTAL** | | **30 min** | |

---

## ✅ Listo para Producción

Cuando todos los items estén checked:
- [ ] Todos los pasos completados
- [ ] Todos los tests pasando
- [ ] Sin errores en console
- [ ] Documentación actualizada
- [ ] Ready for deployment

**¡FELICIDADES! 🎉 Entity Roles está completamente integrado.**

---

**Versión:** 1.0  
**Última actualización:** 2024  
**Imprimible:** Sí (copy a Excel o Notion)
