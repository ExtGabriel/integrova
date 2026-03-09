# ⚡ Quick Start - Integración en 5 Pasos

## Resumen
Conectar entidades con entity roles en **menos de 10 minutos**.

---

## Paso 1: Agregar Script (1 minuto)

En `entidades.html`, busca dónde cargas los scripts y agrega:

```html
<!-- ORDEN IMPORTANTE -->
<script src="js/config-supabase.js"></script>
<script src="js/supabaseClient.js"></script>
<script src="js/api-client.js"></script>
<script src="js/permissions-helpers.js"></script>

<!-- ← AGREGAR ESTA LÍNEA -->
<script src="js/entity-role-manager.js"></script>

<script src="js/auth-guard.js"></script>
<!-- ... más scripts ... -->
```

✅ **Hecho:** El módulo entity-role-manager está disponible.

---

## Paso 2: Cargar Entidad (2 minutos)

Encuentra donde tu código abre/visualiza una entidad (ej: tabla, buscar resultado).

### Antes
```javascript
async function onViewEntity(entityId) {
    showEntityDetails(entityId);
}
```

### Después
```javascript
async function onViewEntity(entityId) {
    // NUEVO: Cargar entity role
    const entity = await API.Entities.getById(entityId);
    await EntityRoleManager.loadEntity(entity);
    
    // Luego mostrar detalles (botones ya estarán protegidos)
    showEntityDetails(entityId);
}
```

✅ **Hecho:** Al cargar entidad, se obtiene automáticamente el role.

---

## Paso 3: Proteger Botones en HTML (1 minuto)

En la vista detalle de entidad, agrega `data-action` a los botones:

```html
<div class="entity-actions">
    <button class="btn btn-primary" data-action="edit" onclick="onEditEntity()">
        ✏️ Editar
    </button>
    
    <button class="btn btn-danger" data-action="delete" onclick="onDeleteEntity()">
        🗑️ Eliminar
    </button>
    
    <button class="btn btn-success" data-action="create-commitment" onclick="onCreateCommitment()">
        ➕ Crear Compromiso
    </button>
    
    <button class="btn btn-info" data-action="audit" onclick="onAuditEntity()">
        🔍 Auditar
    </button>
</div>
```

✅ **Hecho:** Los botones se deshabilitarán automáticamente según permisos.

---

## Paso 4: Validar Permisos en Acciones (3 minutos)

Para cada handler de acción, agrega una línea de validación:

### EDITAR
```javascript
async function onEditEntity() {
    // NUEVO: Validar permiso
    if (!EntityRoleManager.checkPermission('edit')) return;
    
    // ... tu lógica de edición ...
    const updated = await API.Entities.update(window.currentEntity.id, data);
}
```

### ELIMINAR
```javascript
async function onDeleteEntity() {
    // NUEVO: Validar permiso
    if (!EntityRoleManager.checkPermission('delete')) return;
    
    // ... tu lógica de eliminación ...
    await API.Entities.delete(window.currentEntity.id);
}
```

### CREAR COMPROMISO
```javascript
async function onCreateCommitment() {
    // NUEVO: Validar permiso
    if (!EntityRoleManager.checkPermission('create-commitment')) return;
    
    // ... tu lógica de crear compromiso ...
    await API.Commitments.create({
        entity_id: window.currentEntity.id,
        // ... más campos ...
    });
}
```

### AUDITAR
```javascript
async function onAuditEntity() {
    // NUEVO: Validar permiso
    if (!EntityRoleManager.checkPermission('audit')) return;
    
    // ... tu lógica de auditoría ...
    showAuditView(window.currentEntity.id);
}
```

✅ **Hecho:** Las acciones están protegidas contra usuarios sin permiso.

---

## Paso 5: Verificar en Navegador (2 minutos)

1. Abre DevTools (F12)
2. Ve a la pestaña Console
3. Deberías ver:
```
✅ entity-role-manager.js cargado
```

4. Carga una entidad y verifica:
```javascript
EntityRoleManager.getState()
```

Debería mostrar algo como:
```javascript
{
    currentEntity: { id: 1, name: "Entidad A" },
    currentEntityRole: "owner",  // o "auditor", "viewer", null
    isAdmin: false,
    permissions: {
        canEdit: true,
        canDelete: true,
        canCreateCommitment: true,
        canAudit: true
    }
}
```

✅ **Hecho:** ¡Todo está funcionando!

---

## Verificación Rápida

Prueba en la consola del navegador después de cargar una entidad:

```javascript
// 1. Ver estado
EntityRoleManager.getState()

// 2. Probar protección
EntityRoleManager.checkPermission('edit')
// Si no tiene permiso: Alert + false
// Si tiene permiso: true

// 3. Ver botones (deben estar disabled)
document.querySelector('[data-action="edit"]').disabled
// true o false

// 4. Ver logs
// Busca en Console: "✅ EntityRoleManager: Role obtenido"
```

---

## Troubleshooting Rápido

### ❌ "EntityRoleManager is not defined"
```
✓ Verifica que entity-role-manager.js está en el HTML
✓ Verifica que VIENE DESPUÉS de permissions-helpers.js
✓ Recarga la página (Ctrl+Shift+R)
```

### ❌ Botones no se deshabilitan
```
✓ Verifica que tienen data-action="edit" etc
✓ Abre Console y ejecuta:
  document.querySelectorAll('[data-action]')
  (debe mostrar los 4 botones)
```

### ❌ Role es siempre null
```
✓ Verifica que existen datos en BD: SELECT * FROM entity_users;
✓ Verifica que el usuario está asignado a esa entidad
✓ Verifica permisos de RLS en Supabase
```

### ❌ Error en API.EntityUsers
```
✓ Verifica que API.EntityUsers.getUserRole() existe en api-client.js
✓ Abre Network tab en DevTools y mira la llamada API
✓ Verifica respuesta (debe ser 200 OK)
```

---

## Próximo Paso (Opcional)

Mostrar feedback visual del rol actual:

```html
<div id="entityPermissionsStatus"></div>
```

```javascript
async function onViewEntity(entityId) {
    const entity = await API.Entities.getById(entityId);
    await EntityRoleManager.loadEntity(entity);
    
    // NUEVO: Mostrar status de permisos
    displayPermissionsStatus();
    
    showEntityDetails(entityId);
}

function displayPermissionsStatus() {
    const state = EntityRoleManager.getState();
    const div = document.getElementById('entityPermissionsStatus');
    
    div.innerHTML = `
        <div class="alert alert-${state.isAdmin ? 'danger' : 'info'}">
            <strong>Tu Role:</strong> 
            ${state.currentEntityRole || 'SIN ASIGNAR'}
            ${state.isAdmin ? '(ADMINISTRADOR)' : ''}
        </div>
    `;
}
```

---

## Checklist Final

- [x] Script `entity-role-manager.js` agregado al HTML
- [x] DESPUÉS de `permissions-helpers.js`
- [x] Función `onViewEntity()` llama a `EntityRoleManager.loadEntity()`
- [x] Botones tienen `data-action="..."`
- [x] Cada handler tiene `EntityRoleManager.checkPermission()`
- [x] Console muestra "✅ entity-role-manager.js cargado"
- [x] `EntityRoleManager.getState()` muestra datos correctos
- [x] Botones se deshabilitan según role

**¡LISTO!** 🎉 Ya tienes entity roles funcionando.

---

## Resumen de Cambios

**Archivos nuevos:**
- `js/entity-role-manager.js` - El módulo (copy-paste, no editar)

**Cambios en entidades.html:**
1. Agregar `<script src="js/entity-role-manager.js"></script>`
2. Modificar `onViewEntity()` para llamar `EntityRoleManager.loadEntity()`
3. Agregar `data-action="..."` a botones
4. Agregar `EntityRoleManager.checkPermission()` en cada handler

**Total de líneas a escribir:** ~20 líneas
**Tiempo estimado:** 5-10 minutos

---

## Documentación Completa

Si necesitas más detalles, ve a:
- [RESUMEN-ENTITY-ROLES.md](RESUMEN-ENTITY-ROLES.md) - Visión general
- [ENTIDADES-ENTITY-ROLES.md](ENTIDADES-ENTITY-ROLES.md) - Guía completa
- [EJEMPLOS-VISUALES-ENTITY-ROLES.md](EJEMPLOS-VISUALES-ENTITY-ROLES.md) - Mockups
- [TESTING-ENTITY-ROLES.md](TESTING-ENTITY-ROLES.md) - Tests

---

**¡Listo para integrar!** 🚀

Si tienes dudas o algo no funciona, revisa la consola del navegador (F12) para ver los logs de `EntityRoleManager`.
