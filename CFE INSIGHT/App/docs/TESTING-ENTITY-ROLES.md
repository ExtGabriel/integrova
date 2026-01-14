# 🧪 Testing Guide - Entity Roles Integration

## Objetivo
Verificar que los entity roles funcionan correctamente en la vista de entidades.

---

## Test 1: Verificar Carga del Módulo

**Pasos:**
1. Abrir la consola del navegador (F12)
2. Ir a cualquier página

**Esperado en consola:**
```
✅ permissions-helpers.js v4: Sistema de permisos cargado
✅ entity-role-manager.js cargado
```

**Si NO ves esto:**
- ❌ Verificar que `entity-role-manager.js` esté cargado en el HTML
- ❌ Verificar que `permissions-helpers.js` esté ANTES de `entity-role-manager.js`

---

## Test 2: Verificar Estado Inicial

**Comando en consola:**
```javascript
EntityRoleManager.getState()
```

**Esperado:**
```javascript
{
    currentEntity: null,
    currentEntityRole: null,
    isAdmin: true|false,  // Depende del usuario actual
    permissions: {
        canEdit: false,
        canDelete: false,
        canCreateCommitment: false,
        canAudit: false
    }
}
```

⚠️ Si ves error: `EntityRoleManager is not defined`
- El módulo no está cargado

---

## Test 3: Cargar una Entidad (Sin Permisos)

**Escenario:** Usuario normal (no admin) sin asignar en la entidad

**Pasos:**
1. Ir a entidades.html
2. Hacer clic en cualquier entidad
3. En la consola, ejecutar:
```javascript
EntityRoleManager.getState()
```

**Esperado:**
```javascript
{
    currentEntity: { id: 1, name: "Entidad A", ... },
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

**Verificar botones:**
- ❌ Botón EDITAR: deshabilitado + tooltip "No tienes permiso..."
- ❌ Botón CREAR COMPROMISO: deshabilitado + tooltip
- ❌ Botón AUDITAR: deshabilitado + tooltip
- ❌ Botón ELIMINAR: deshabilitado + tooltip

---

## Test 4: Cargar una Entidad (Como OWNER)

**Escenario:** Usuario asignado como OWNER

**Setup:**
1. En la BD, asignar usuario a entidad como owner:
```sql
INSERT INTO public.entity_users (entity_id, user_id, role)
VALUES (1, 'user-uuid', 'owner')
ON CONFLICT (entity_id, user_id) DO UPDATE SET role = 'owner';
```

2. Ir a entidades.html y cargar la entidad

**Esperado:**
```javascript
{
    currentEntity: { id: 1, name: "Entidad A", ... },
    currentEntityRole: "owner",
    isAdmin: false,
    permissions: {
        canEdit: true,      // ✅ Owner puede editar
        canDelete: true,    // ✅ Owner puede eliminar
        canCreateCommitment: true,  // ✅ Owner puede crear
        canAudit: true      // ✅ Owner puede auditar
    }
}
```

**Verificar botones:**
- ✅ EDITAR: habilitado
- ✅ CREAR COMPROMISO: habilitado
- ✅ AUDITAR: habilitado
- ✅ ELIMINAR: habilitado

---

## Test 5: Cargar una Entidad (Como AUDITOR)

**Setup:**
```sql
UPDATE public.entity_users
SET role = 'auditor'
WHERE entity_id = 1 AND user_id = 'user-uuid';
```

**Esperado:**
```javascript
{
    currentEntityRole: "auditor",
    permissions: {
        canEdit: false,      // ❌ Auditor NO edita
        canDelete: false,    // ❌ Auditor NO elimina
        canCreateCommitment: false,  // ❌ Auditor NO crea
        canAudit: true       // ✅ Auditor SÍ audita
    }
}
```

---

## Test 6: Cargar una Entidad (Como VIEWER)

**Setup:**
```sql
UPDATE public.entity_users
SET role = 'viewer'
WHERE entity_id = 1 AND user_id = 'user-uuid';
```

**Esperado:**
```javascript
{
    currentEntityRole: "viewer",
    permissions: {
        canEdit: false,
        canDelete: false,
        canCreateCommitment: false,
        canAudit: false  // ❌ Viewer NO puede auditar (solo ver)
    }
}
```

---

## Test 7: Admin Override

**Escenario:** Usuario es ADMIN (global role = 'admin')

**Setup:**
```sql
UPDATE public.users
SET role = 'admin'
WHERE id = 'user-uuid';
```

**Esperado (sin importar entity role):**
```javascript
{
    isAdmin: true,
    currentEntityRole: null,  // Puede ser null, no importa
    permissions: {
        canEdit: true,      // ✅ SIEMPRE
        canDelete: true,    // ✅ SIEMPRE
        canCreateCommitment: true,  // ✅ SIEMPRE
        canAudit: true      // ✅ SIEMPRE
    }
}
```

**Verificar:**
- Admin puede hacer CUALQUIER COSA aunque no esté asignado a la entidad

---

## Test 8: Verificar Cache de Roles

**Objetivo:** Verificar que el cache funciona (no hace llamadas repetidas a API)

**Pasos:**
1. Abrir DevTools → Network tab
2. Cargar entidad por primera vez
3. Observar llamada a `API.EntityUsers.getUserRole`
4. En la consola, ejecutar:
```javascript
// Obtener role dos veces
await EntityRoleManager.getEntityRole(1);  // Llamada 1 - va a API
await EntityRoleManager.getEntityRole(1);  // Llamada 2 - debería ser de cache
```

**Esperado en logs:**
```
🔄 EntityRoleManager: Obteniendo role para entidad 1...  (Primera vez)
✅ EntityRoleManager: Role para entidad 1 (cache)       (Segunda vez - CACHE)
```

**En Network:**
- Primera llamada: hay request HTTP
- Segunda llamada: no hay request (cache)

---

## Test 9: Refrescar Role Después de Cambios

**Escenario:** Cambiar el role de usuario en una entidad desde otra página

**Pasos:**
1. En entidades.html, cargar entidad (role = 'viewer')
2. Verificar permisos (solo puede ver)
3. En otra ventana, cambiar role a 'owner'
4. En entidades.html, refrescar:
```javascript
const newRole = await EntityRoleManager.refreshEntityRole(1);
console.log('Nuevo role:', newRole);  // 'owner'
```

**Esperado:**
- El cache se limpia
- Se obtiene el nuevo role de la API
- Los botones se actualizan automáticamente

---

## Test 10: Protección en Acciones

**Escenario:** Intentar editar sin permiso

**Pasos:**
1. Cargar entidad como VIEWER (sin permisos)
2. Hacer clic en botón "Editar"
3. Observar console

**Esperado:**
```
❌ EntityRoleManager: No tienes permiso para editar esta entidad
```

Y un alert al usuario:
```
❌ No tienes permiso para editar esta entidad
```

La acción **NO se ejecuta** (return en handler)

---

## Test 11: Limpiar Estado

**Pasos:**
1. En consola:
```javascript
EntityRoleManager.clearEntity();
```

**Esperado:**
```
🧹 EntityRoleManager: Estado limpiado
```

Y verificar:
```javascript
EntityRoleManager.getState()
// {
//   currentEntity: null,
//   currentEntityRole: null,
//   ...
// }
```

---

## Test 12: Caso de Error - API Inaccesible

**Escenario:** API.EntityUsers.getUserRole falla

**Pasos:**
1. Simular error desactivando API (comentar endpoint)
2. Intentar cargar entidad
3. Observar console y UI

**Esperado:**
```
❌ EntityRoleManager: Error obteniendo role: [error details]
✅ EntityRoleManager: Role obtenido para entidad 1: null
```

Buttons se deshabilitan (role = null = sin permisos)

---

## Test 13: Compatibilidad con Diferentes Browsers

**Verificar en:**
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

**Puntos a verificar:**
- Logs aparecen en consola
- Buttons se deshabilitan/habilitan
- Alerts se muestran
- Modales funcionan correctamente

---

## Test 14: Performance - Carga Masiva

**Escenario:** Cargar muchas entidades rápidamente

**Pasos:**
1. Cargar 10 entidades diferentes en poco tiempo
```javascript
for (let i = 1; i <= 10; i++) {
    await EntityRoleManager.loadEntity({ id: i, name: `Entidad ${i}` });
}
```

**Esperado:**
- No hay race conditions
- Cache funciona correctamente
- Performance aceptable (< 100ms por entidad)

---

## Test 15: Matriz Completa de Permisos

**Ejecutar este script:**
```javascript
// Definir roles a probar
const roles = ['owner', 'auditor', 'viewer', null];
const actions = ['canEdit', 'canDelete', 'canCreateCommitment', 'canAudit'];

// Matriz esperada
const expected = {
    owner: { canEdit: true, canDelete: true, canCreateCommitment: true, canAudit: true },
    auditor: { canEdit: false, canDelete: false, canCreateCommitment: false, canAudit: true },
    viewer: { canEdit: false, canDelete: false, canCreateCommitment: false, canAudit: false },
    null: { canEdit: false, canDelete: false, canCreateCommitment: false, canAudit: false }
};

// Verificar cada combinación
for (const role of roles) {
    const state = EntityRoleManager.getState();
    console.log(`Testing role: ${role || 'null'}`);
    
    actions.forEach(action => {
        const actual = PermissionsHelper[action](role);
        const exp = expected[role][action];
        const pass = actual === exp ? '✅' : '❌';
        console.log(`  ${pass} ${action}: ${actual}`);
    });
}
```

**Esperado:** Todos los ✅

---

## Checklist de Implementación Completa

### Módulos Cargados
- [ ] permissions-helpers.js (antes de entity-role-manager.js)
- [ ] api-client.js (antes de entity-role-manager.js)
- [ ] entity-role-manager.js

### Funciones Implementadas
- [ ] onViewEntity(entityId, entityName)
- [ ] onEditEntity()
- [ ] onDeleteEntity()
- [ ] onCreateCommitmentInEntity()
- [ ] onAuditEntity()

### HTML
- [ ] Botones tienen `data-action="edit|delete|create-commitment|audit"`
- [ ] Existe `#entityDetailView` para ver detalles
- [ ] Existe `#entityPermissionsStatus` para mostrar permisos

### Tests Pasados
- [ ] Test 1: Módulos cargados ✅
- [ ] Test 2: Estado inicial ✅
- [ ] Test 3: Sin permisos ✅
- [ ] Test 4: Owner ✅
- [ ] Test 5: Auditor ✅
- [ ] Test 6: Viewer ✅
- [ ] Test 7: Admin override ✅
- [ ] Test 8: Cache funciona ✅
- [ ] Test 9: Refrescar role ✅
- [ ] Test 10: Protección en acciones ✅
- [ ] Test 11: Limpiar estado ✅
- [ ] Test 12: Manejo de errores ✅
- [ ] Test 13: Multi-browser ✅
- [ ] Test 14: Performance ✅
- [ ] Test 15: Matriz de permisos ✅

---

## Scripts de Debugging Útiles

```javascript
// 1. Ver estado actual
EntityRoleManager.getState()

// 2. Ver permisos de un role específico
console.log({
    owner: {
        canEdit: PermissionsHelper.canEditEntity('owner'),
        canAudit: PermissionsHelper.canAudit('owner'),
        canCreateCommitment: PermissionsHelper.canCreateCommitment('owner'),
    }
});

// 3. Simular cargar entidad
await EntityRoleManager.loadEntity({ id: 1, name: 'Test' });

// 4. Ver cache de roles
// (Privado, pero puedes verificar llamando getEntityRole)
await EntityRoleManager.getEntityRole(1);

// 5. Simular usuario actual
console.log(window.currentUser);

// 6. Ver si es admin
console.log(PermissionsHelper.isAdmin());

// 7. Ver constantes
console.log(PermissionsHelper.GLOBAL_ROLES);
console.log(PermissionsHelper.ENTITY_ROLES);
```

---

## Solución de Problemas

### ❌ "EntityRoleManager is not defined"
```
Solución: Verificar que entity-role-manager.js está en el HTML
         y que se carga DESPUÉS de permissions-helpers.js
```

### ❌ Botones no se deshabilitan
```
Solución: Verificar que los botones tienen data-action="..."
         Los IDs en updateActionButtons() deben coincidir
```

### ❌ Role es siempre null
```
Solución: Verificar que API.EntityUsers.getUserRole existe
         Verificar que hay datos en BD (entity_users)
         Verificar permisos de RLS en Supabase
```

### ❌ Cache no funciona
```
Solución: Abrir DevTools → Network
         Primera llamada debe ir a API
         Segunda llamada debe omitirse (cache)
         Ver logs de EntityRoleManager en consola
```

### ❌ Admin no tiene acceso total
```
Solución: Verificar que user.role = 'admin' en BD (public.users)
         PermissionsHelper.isAdmin() debe retornar true
         Ver PermissionsHelper.getState() para verificar
```

---

**Última actualización:** 2024
**Versión:** 1.0
