# 🎨 Ejemplos Visuales - Entity Roles en UI

## Escenario 1: Usuario como OWNER

### Estado
```javascript
{
    currentEntity: { id: 1, name: "Entidad Regional Centro" },
    currentEntityRole: "owner",
    isAdmin: false,
    permissions: {
        canEdit: true,
        canDelete: true,
        canCreateCommitment: true,
        canAudit: true
    }
}
```

### Vista
```
┌─────────────────────────────────────────────┐
│ Entidad Regional Centro                     │
├─────────────────────────────────────────────┤
│                                             │
│ ℹ️  Tu Role en Esta Entidad: [OWNER]       │
│     ✏️  Editar: ✅                          │
│     ➕ Crear Compromisos: ✅               │
│     🔍 Auditar: ✅                         │
│     🗑️  Eliminar: ✅                       │
│                                             │
├─────────────────────────────────────────────┤
│ [✏️ Editar] [➕ Crear Compromiso]          │
│ [🔍 Auditar] [🗑️ Eliminar]                │
├─────────────────────────────────────────────┤
│ Compromisos (3)                             │
│ ├─ Proyecto A     [COMPLETADO]             │
│ ├─ Proyecto B     [EN PROGRESO]            │
│ └─ Proyecto C     [VENCIDO]                │
└─────────────────────────────────────────────┘

✅ Todos los botones HABILITADOS
```

---

## Escenario 2: Usuario como AUDITOR

### Estado
```javascript
{
    currentEntity: { id: 1, name: "Entidad Regional Centro" },
    currentEntityRole: "auditor",
    isAdmin: false,
    permissions: {
        canEdit: false,
        canDelete: false,
        canCreateCommitment: false,
        canAudit: true
    }
}
```

### Vista
```
┌─────────────────────────────────────────────┐
│ Entidad Regional Centro                     │
├─────────────────────────────────────────────┤
│                                             │
│ ℹ️  Tu Role en Esta Entidad: [AUDITOR]     │
│     ✏️  Editar: ❌                          │
│     ➕ Crear Compromisos: ❌               │
│     🔍 Auditar: ✅                         │
│     🗑️  Eliminar: ❌                       │
│                                             │
├─────────────────────────────────────────────┤
│ [✏️ Editar] [➕ Crear Compromiso]          │
│   (deshabilitado)      (deshabilitado)     │
│ [🔍 Auditar] [🗑️ Eliminar]                │
│ (habilitado)        (deshabilitado)        │
├─────────────────────────────────────────────┤
│ Compromisos (3)                             │
│ ├─ Proyecto A     [COMPLETADO]             │
│ ├─ Proyecto B     [EN PROGRESO]            │
│ └─ Proyecto C     [VENCIDO]                │
└─────────────────────────────────────────────┘

🔒 Solo AUDITAR habilitado
```

---

## Escenario 3: Usuario como VIEWER

### Estado
```javascript
{
    currentEntity: { id: 1, name: "Entidad Regional Centro" },
    currentEntityRole: "viewer",
    isAdmin: false,
    permissions: {
        canEdit: false,
        canDelete: false,
        canCreateCommitment: false,
        canAudit: false
    }
}
```

### Vista
```
┌─────────────────────────────────────────────┐
│ Entidad Regional Centro                     │
├─────────────────────────────────────────────┤
│                                             │
│ ⚠️  Tu Role en Esta Entidad: [VIEWER]      │
│     ✏️  Editar: ❌                          │
│     ➕ Crear Compromisos: ❌               │
│     🔍 Auditar: ❌                         │
│     🗑️  Eliminar: ❌                       │
│                                             │
├─────────────────────────────────────────────┤
│ [✏️ Editar] [➕ Crear Compromiso]          │
│   (deshabilitado)      (deshabilitado)     │
│ [🔍 Auditar] [🗑️ Eliminar]                │
│ (deshabilitado)     (deshabilitado)        │
├─────────────────────────────────────────────┤
│ Compromisos (3)  [SOLO LECTURA]            │
│ ├─ Proyecto A     [COMPLETADO]             │
│ ├─ Proyecto B     [EN PROGRESO]            │
│ └─ Proyecto C     [VENCIDO]                │
└─────────────────────────────────────────────┘

🔒 TODO deshabilitado (solo ver)
```

---

## Escenario 4: Usuario SIN ASIGNAR (null)

### Estado
```javascript
{
    currentEntity: { id: 1, name: "Entidad Regional Centro" },
    currentEntityRole: null,  // Sin asignar
    isAdmin: false,
    permissions: {
        canEdit: false,
        canDelete: false,
        canCreateCommitment: false,
        canAudit: false
    }
}
```

### Vista
```
┌─────────────────────────────────────────────┐
│ Entidad Regional Centro                     │
├─────────────────────────────────────────────┤
│                                             │
│ 🚫 Tu Role en Esta Entidad: [SIN ASIGNAR] │
│     ✏️  Editar: ❌                          │
│     ➕ Crear Compromisos: ❌               │
│     🔍 Auditar: ❌                         │
│     🗑️  Eliminar: ❌                       │
│                                             │
├─────────────────────────────────────────────┤
│ [✏️ Editar] [➕ Crear Compromiso]          │
│   (deshabilitado)      (deshabilitado)     │
│ [🔍 Auditar] [🗑️ Eliminar]                │
│ (deshabilitado)     (deshabilitado)        │
├─────────────────────────────────────────────┤
│ ⚠️  No tienes acceso a esta entidad        │
│ Solicita permiso al administrador           │
└─────────────────────────────────────────────┘

❌ TODO deshabilitado (sin asignar)
```

---

## Escenario 5: ADMINISTRADOR

### Estado
```javascript
{
    currentEntity: { id: 1, name: "Entidad Regional Centro" },
    currentEntityRole: null,  // No importa, es admin
    isAdmin: true,
    permissions: {
        canEdit: true,        // ✅ SIEMPRE
        canDelete: true,      // ✅ SIEMPRE
        canCreateCommitment: true,  // ✅ SIEMPRE
        canAudit: true        // ✅ SIEMPRE
    }
}
```

### Vista
```
┌─────────────────────────────────────────────┐
│ Entidad Regional Centro                     │
├─────────────────────────────────────────────┤
│                                             │
│ 🔴 Tu Role en Esta Entidad: [ADMINISTRADOR]│
│     ✏️  Editar: ✅ (SIEMPRE)                │
│     ➕ Crear Compromisos: ✅ (SIEMPRE)    │
│     🔍 Auditar: ✅ (SIEMPRE)               │
│     🗑️  Eliminar: ✅ (SIEMPRE)             │
│                                             │
├─────────────────────────────────────────────┤
│ [✏️ Editar] [➕ Crear Compromiso]          │
│   (HABILITADO)      (HABILITADO)           │
│ [🔍 Auditar] [🗑️ Eliminar]                │
│ (HABILITADO)     (HABILITADO)              │
├─────────────────────────────────────────────┤
│ Compromisos (3) [Acceso total]             │
│ ├─ Proyecto A     [COMPLETADO] [Editar]   │
│ ├─ Proyecto B     [EN PROGRESO] [Editar]  │
│ └─ Proyecto C     [VENCIDO] [Editar]      │
└─────────────────────────────────────────────┘

🔓 TODO habilitado (admin override)
```

---

## Interacción: Intento de Editar sin Permiso

### Usuario es VIEWER

```
Hace clic en botón "Editar"
         ↓
┌─────────────────────────────────┐
│ ❌ No tienes permiso para       │
│ editar esta entidad             │
└─────────────────────────────────┘
         ↓
  [Aceptar]
         ↓
Nada sucede (handler retorna early)
```

### En la consola:
```
❌ EntityRoleManager: No tienes permiso para editar esta entidad
```

---

## Interacción: Editar como OWNER

### Usuario es OWNER

```
Hace clic en botón "Editar"
         ↓
EntityRoleManager.checkPermission('edit') retorna true
         ↓
Abre modal de edición
┌─────────────────────────────────────┐
│ Editar Entidad                      │
├─────────────────────────────────────┤
│ Nombre: [Entidad Regional Centro]   │
│ Tipo: [Regional              ]      │
│ Región: [Centro             ]       │
│ Status: [Activa             ]       │
│                                     │
│ [Guardar] [Cancelar]                │
└─────────────────────────────────────┘
```

### En la consola:
```
✏️ Editando entidad: Entidad Regional Centro
💾 Guardando cambios de entidad 1...
✅ Entidad actualizada correctamente
```

---

## Interacción: Cambiar de Entidad

### Usuario cambia de entidad

```
Usuario está viendo: Entidad A (role = 'owner')
         ↓
Hace clic en: Entidad B
         ↓
onViewEntity(2, 'Entidad B')
         ↓
EntityRoleManager.clearEntity()  // Limpiar estado de Entidad A
         ↓
EntityRoleManager.loadEntity(entityB)  // Cargar Entidad B
         ↓
API.EntityUsers.getUserRole(2, userId)
         ↓
Entidad B role = 'auditor'
         ↓
Actualizar botones:
   ✏️ Editar: deshabilitado
   ➕ Crear: deshabilitado
   🔍 Auditar: habilitado
   🗑️ Eliminar: deshabilitado
```

---

## Tabla de Botones por Rol

### HTML Base
```html
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
```

### Resultado por Rol

| Rol | Editar | Eliminar | Crear Compromiso | Auditar |
|-----|--------|----------|------------------|---------|
| **owner** | ✅ enabled | ✅ enabled | ✅ enabled | ✅ enabled |
| **auditor** | ❌ disabled | ❌ disabled | ❌ disabled | ✅ enabled |
| **viewer** | ❌ disabled | ❌ disabled | ❌ disabled | ❌ disabled |
| **sin asignar** | ❌ disabled | ❌ disabled | ❌ disabled | ❌ disabled |
| **admin** | ✅ enabled | ✅ enabled | ✅ enabled | ✅ enabled |

---

## Flujo Completo: Crear Compromiso

### 1. Usuario es OWNER
```
Vista de Entidad:
[✏️ Editar] [➕ Crear Compromiso] [🔍 Auditar] [🗑️ Eliminar]
           (habilitado)
```

### 2. Hace clic en "Crear Compromiso"
```
onCreateCommitment()
  ↓
EntityRoleManager.checkPermission('create-commitment')
  ├─ window.currentEntityRole = 'owner'
  ├─ PermissionsHelper.canCreateCommitment('owner') = true
  └─ Retorna true
  ↓
Abre modal
┌─────────────────────────────────┐
│ Crear Compromiso                │
├─────────────────────────────────┤
│ Entidad: Entidad Regional Centro│
│ Título: [                    ]  │
│ Descripción: [             ]    │
│ Vencimiento: [            ]     │
│                                 │
│ [Crear] [Cancelar]              │
└─────────────────────────────────┘
```

### 3. Llena el formulario y guarda
```
onSaveNewCommitment(data)
  ↓
API.Commitments.create({ ...data, entity_id: 1 })
  ↓
✅ Compromiso creado
  ↓
Tabla se actualiza:
┌─────────────────────────────────┐
│ Compromisos (4)                 │
│ ├─ Proyecto A   [COMPLETADO]   │
│ ├─ Proyecto B   [EN PROGRESO]  │
│ ├─ Proyecto C   [VENCIDO]      │
│ └─ NUEVO        [PENDIENTE] ✨ │
└─────────────────────────────────┘
```

---

## Tooltip en Botones Deshabilitados

Cuando un botón se deshabilita, automáticamente se agrega un tooltip:

### HTML
```html
<button class="btn btn-primary" data-action="edit" disabled title="No tienes permiso para editar esta entidad">
    <i class="bi bi-pencil"></i> Editar
</button>
```

### Visual (hover en botón deshabilitado)
```
[✏️ Editar]
    ↓
  ↳ "No tienes permiso para editar esta entidad"
```

### Mensajes por acción
- **edit**: "No tienes permiso para editar esta entidad"
- **delete**: "No tienes permiso para eliminar esta entidad"
- **create-commitment**: "No tienes permiso para crear compromisos en esta entidad"
- **audit**: "No tienes permiso para auditar esta entidad"

---

## Cascada de CSS (Opcional)

```css
/* Botones deshabilitados visualmente claros */
button[data-action][disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #e9ecef;
    color: #6c757d;
}

button[data-action][disabled]:hover {
    background-color: #e9ecef;
    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25);
}

/* Tooltip */
button[data-action][disabled][title]:hover::after {
    content: attr(title);
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
}
```

---

## Estado de Permisos (Alert Opcional)

Mostrar un mensaje amigable cuando se carga una entidad:

```html
<div id="entityPermissionsStatus"></div>
```

```javascript
function displayEntityPermissionsStatus() {
    const state = EntityRoleManager.getState();
    const statusDiv = document.getElementById('entityPermissionsStatus');
    
    const html = `
        <div class="alert alert-${state.isAdmin ? 'danger' : 'info'}">
            <strong>Tu Role:</strong> ${state.currentEntityRole || 'SIN ASIGNAR'}
            ${state.isAdmin ? ' <strong class="text-danger">(ADMINISTRADOR)</strong>' : ''}
        </div>
    `;
    
    statusDiv.innerHTML = html;
}
```

**Visual:**
```
┌─────────────────────────────────┐
│ ℹ️  Tu Role: owner              │
└─────────────────────────────────┘

O si es admin:

┌─────────────────────────────────┐
│ 🔴 Tu Role: (ADMINISTRADOR)     │
└─────────────────────────────────┘

O si sin asignar:

┌─────────────────────────────────┐
│ ⚠️  Tu Role: SIN ASIGNAR        │
└─────────────────────────────────┘
```

---

**Versión:** 1.0  
**Fecha:** 2024
