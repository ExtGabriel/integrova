# 📊 Resumen: Integración de Entity Roles en Entidades

## ✅ Qué se Implementó

### 1️⃣ Módulo Entity Role Manager
**Archivo:** `js/entity-role-manager.js`

Un sistema completo para:
- ✅ Obtener y cachear roles de usuarios en entidades
- ✅ Proteger botones de acciones según permisos
- ✅ Validar permisos antes de ejecutar acciones críticas
- ✅ Limpiar estado al cambiar de entidad
- ✅ Refrescar roles si hay cambios

**API Pública:**
```javascript
await EntityRoleManager.loadEntity(entity)         // Cargar entidad + obtener role
await EntityRoleManager.getEntityRole(entityId)   // Obtener role específico
EntityRoleManager.checkPermission(action)         // Verificar + mostrar alert
await EntityRoleManager.updateActionButtons()     // Actualizar UI
EntityRoleManager.clearEntity()                   // Limpiar estado
EntityRoleManager.getState()                      // Debugging
```

### 2️⃣ Arquitectura Global
```
┌─ window.currentEntity       = { id, name, ... }
├─ window.currentEntityRole   = 'owner'|'auditor'|'viewer'|null
└─ PermissionsHelper (global) = helpers de permisos
```

### 3️⃣ Flujo de Carga de Entidad
```
1. Usuario hace clic en entidad
   ↓
2. onViewEntity(entityId)
   ↓
3. EntityRoleManager.loadEntity(entity)
   ├─ Guarda en window.currentEntity
   ├─ Consulta API.EntityUsers.getUserRole()
   ├─ Guarda role en window.currentEntityRole
   └─ Protege botones: updateActionButtons()
   ↓
4. Mostrar vista detalle con botones protegidos
```

### 4️⃣ Matriz de Permisos
| Rol | Editar | Eliminar | Crear Compromisos | Auditar |
|-----|--------|----------|-------------------|---------|
| **owner** | ✅ | ✅ | ✅ | ✅ |
| **auditor** | ❌ | ❌ | ❌ | ✅ |
| **viewer** | ❌ | ❌ | ❌ | ❌ |
| **admin** (global) | ✅ | ✅ | ✅ | ✅ |
| **sin asignar (null)** | ❌ | ❌ | ❌ | ❌ |

---

## 📁 Archivos Creados

### Módulo Principal
- **`js/entity-role-manager.js`** (362 líneas)
  - Gestor de roles por entidad
  - Caching de roles
  - Protección de botones
  - API pública completa

### Ejemplos e Integración
- **`js/entidades-example.js`** (400+ líneas)
  - Ejemplo completo de cómo usar EntityRoleManager
  - Handlers para editar, eliminar, crear compromisos, auditar
  - Funciones helper para modales
  - Copy-paste ready

### Documentación
- **`docs/ENTIDADES-ENTITY-ROLES.md`** (250+ líneas)
  - Guía completa de implementación
  - Paso a paso de integración
  - Ejemplos de código
  - Debugging

- **`docs/TESTING-ENTITY-ROLES.md`** (400+ líneas)
  - 15 tests completos
  - Checklist de implementación
  - Scripts de debugging
  - Solución de problemas

---

## 🚀 Cómo Usar

### Paso 1: Incluir en HTML
```html
<!-- En entidades.html, asegúrate del ORDEN: -->
<script src="js/config-supabase.js"></script>
<script src="js/supabaseClient.js"></script>
<script src="js/api-client.js"></script>
<script src="js/permissions-helpers.js"></script>      <!-- ANTES -->
<script src="js/entity-role-manager.js"></script>     <!-- NUEVO -->
<script src="js/auth-guard.js"></script>
<!-- ... -->
```

### Paso 2: Cargar Entidad
```javascript
async function onViewEntity(entityId, entityName) {
    const entity = await API.Entities.getById(entityId);
    await EntityRoleManager.loadEntity(entity);  // ← Esto activa todo
    showEntityDetailView(entity);
}
```

### Paso 3: Proteger Acciones
```javascript
async function onEditEntity() {
    if (!EntityRoleManager.checkPermission('edit')) return;
    // ... proceder a editar
}

async function onDeleteEntity() {
    if (!EntityRoleManager.checkPermission('delete')) return;
    // ... proceder a eliminar
}

async function onCreateCommitment() {
    if (!EntityRoleManager.checkPermission('create-commitment')) return;
    // ... proceder a crear
}

async function onAuditEntity() {
    if (!EntityRoleManager.checkPermission('audit')) return;
    // ... proceder a auditar
}
```

### Paso 4: HTML con data-action
```html
<button data-action="edit" onclick="onEditEntity()">Editar</button>
<button data-action="delete" onclick="onDeleteEntity()">Eliminar</button>
<button data-action="create-commitment" onclick="onCreateCommitment()">Crear Compromiso</button>
<button data-action="audit" onclick="onAuditEntity()">Auditar</button>
```

Los botones se **deshabilitan automáticamente** según permisos.

---

## 📊 Características

### ✅ Caching Inteligente
- Los roles se cachean para evitar llamadas repetidas a API
- Cache se limpia si refrescas manualmente

### ✅ Protección Automática de UI
- Botones con `data-action` se deshabilitan automáticamente
- Se añade tooltip con mensaje de permiso denegado

### ✅ Validación de Acciones
- `checkPermission()` valida y muestra alert al usuario
- Las acciones se bloquean si no hay permiso

### ✅ Admin Override
- Los admins (global role = 'admin') pueden hacer CUALQUIER COSA
- No necesitan ser asignados en entity_users

### ✅ Debugging Fácil
- `EntityRoleManager.getState()` muestra todo el estado actual
- Logs automáticos de EntityRoleManager en consola
- Matriz de permisos visible en estado

### ✅ Sin Efectos Secundarios
- Todos los métodos son puros (no modifican datos globales)
- Excepto `loadEntity()` y `clearEntity()` que por diseño sí lo hacen

---

## 🧪 Testing Rápido

**En la consola del navegador:**

```javascript
// 1. Ver si está cargado
EntityRoleManager  // debe mostrar el objeto

// 2. Ver estado actual
EntityRoleManager.getState()

// 3. Simular cargar entidad (como dueño)
await EntityRoleManager.loadEntity({ id: 1, name: 'Test' });
EntityRoleManager.getState()  // Verificar role

// 4. Verificar matrix de permisos
PermissionsHelper.canEditEntity('owner')        // true
PermissionsHelper.canEditEntity('auditor')      // false
PermissionsHelper.canAudit('auditor')           // true
```

---

## ⚠️ Notas Importantes

### Frontend vs Backend
- Este sistema **protege la UI** (bloquea botones)
- El backend RLS de Supabase es la **fuente de verdad**
- Siempre asumir que el backend rechazará operaciones no autorizadas

### Dependencias
- Requiere `permissions-helpers.js` ✅ (ya implementado)
- Requiere `api-client.js` ✅ (ya implementado)
- Requiere `API.EntityUsers.getUserRole()` ✅ (ya implementado)

### Orden de Carga
- `entity-role-manager.js` DEBE cargar DESPUÉS de:
  - `permissions-helpers.js`
  - `api-client.js`

### Admin Override
- Los admins (global role = 'admin') **siempre tienen acceso**
- No necesitan estar asignados en entity_users
- `PermissionsHelper.isAdmin()` retorna true

### Entity Role en BD
- Se guarda en `public.entity_users.role`
- Valores: 'owner' | 'auditor' | 'viewer' | null
- Independiente del rol global (public.users.role)

---

## 📋 Próximos Pasos (Opcionales)

Si quieres expandir esto:

1. **Mostrar status visual** - Mostrar badge con role actual del usuario
2. **Historial de auditoría** - Log de quién hizo qué y cuándo
3. **Cambiar roles en tiempo real** - Sin refrescar página
4. **Exportar reportes** - Solo usuarios con permiso de auditor+
5. **Notificaciones** - Alertar cuando se cambien permisos del usuario

---

## 📚 Documentos Relacionados

- [PERMISOS-REFERENCIA.md](PERMISOS-REFERENCIA.md) - Sistema de permisos global
- [ENTIDADES-ENTITY-ROLES.md](ENTIDADES-ENTITY-ROLES.md) - Guía de integración
- [TESTING-ENTITY-ROLES.md](TESTING-ENTITY-ROLES.md) - Tests y debugging

---

## ❓ FAQ

**P: ¿Qué pasa si un usuario es removido de una entidad mientras la está viendo?**
R: El role seguirá siendo el que se cacheó. Usar `EntityRoleManager.refreshEntityRole()` para forzar recarga.

**P: ¿Puedo tener múltiples entidades abiertas?**
R: `window.currentEntity` solo guarda una. Para múltiples, extender el módulo o mantener referencias separadas.

**P: ¿Qué pasa si API.EntityUsers.getUserRole() falla?**
R: Retorna `null`, por lo que todos los botones se deshabilitan (seguridad por defecto).

**P: ¿Los admins pueden ver todas las entidades?**
R: Depende de tu API. Este módulo solo valida permisos de ACCIONES. Para listar, usar `API.Entities.getAll()`.

**P: ¿Cómo actualizo el UI si cambio el role de un usuario?**
R: `await EntityRoleManager.refreshEntityRole(entityId)` recarga del servidor y actualiza botones.

---

**Versión:** 1.0  
**Fecha:** 2024  
**Estado:** ✅ Completo y listo para integrar
