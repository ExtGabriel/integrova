# 📌 CHEAT SHEET - Entity Roles Integration

## ⚡ Quick Reference (Copy-Paste)

### 1. HTML Script (Add Once)
```html
<script src="js/entity-role-manager.js"></script>
```

### 2. Cargar Entidad (Modify 1 Function)
```javascript
async function onViewEntity(entityId) {
    const entity = await API.Entities.getById(entityId);
    await EntityRoleManager.loadEntity(entity);  // ← Agregar esta línea
    showEntityDetailView(entity);
}
```

### 3. HTML Buttons (Add data-action)
```html
<button data-action="edit" onclick="onEditEntity()">Editar</button>
<button data-action="delete" onclick="onDeleteEntity()">Eliminar</button>
<button data-action="create-commitment" onclick="onCreateCommitment()">Crear</button>
<button data-action="audit" onclick="onAuditEntity()">Auditar</button>
```

### 4. Protect Handlers (Add 1 Line)
```javascript
async function onEditEntity() {
    if (!EntityRoleManager.checkPermission('edit')) return;  // ← Add this
    // ... tu código ...
}

async function onDeleteEntity() {
    if (!EntityRoleManager.checkPermission('delete')) return;  // ← Add this
    // ... tu código ...
}

async function onCreateCommitment() {
    if (!EntityRoleManager.checkPermission('create-commitment')) return;  // ← Add this
    // ... tu código ...
}

async function onAuditEntity() {
    if (!EntityRoleManager.checkPermission('audit')) return;  // ← Add this
    // ... tu código ...
}
```

---

## 🔍 Quick Debug (Paste in Console)

```javascript
// Ver estado actual
EntityRoleManager.getState()

// Cargar entidad de prueba
await EntityRoleManager.loadEntity({ id: 1, name: 'Test' })

// Verificar permisos
PermissionsHelper.canEditEntity('owner')        // true
PermissionsHelper.canEditEntity('viewer')       // false

// Ver rol actual
console.log(window.currentEntityRole)

// Ver si es admin
console.log(PermissionsHelper.isAdmin())

// Limpiar estado
EntityRoleManager.clearEntity()
```

---

## 📊 Matriz Rápida

| Rol | Edit | Delete | Create | Audit |
|-----|------|--------|--------|-------|
| owner | ✅ | ✅ | ✅ | ✅ |
| auditor | ❌ | ❌ | ❌ | ✅ |
| viewer | ❌ | ❌ | ❌ | ❌ |
| admin | ✅ | ✅ | ✅ | ✅ |
| null | ❌ | ❌ | ❌ | ❌ |

---

## 📍 Archivos Clave

| Archivo | Contenido | Líneas |
|---------|-----------|--------|
| entity-role-manager.js | Módulo principal | 362 |
| entidades-example.js | Código de ejemplo | 400+ |
| QUICK-START | 5 pasos en 5 min | - |
| CHECKLIST | Checklist completo | - |

---

## 🎯 5-Step Integration

```
Step 1: <script src="js/entity-role-manager.js"></script>
         ↓
Step 2: await EntityRoleManager.loadEntity(entity)
         ↓
Step 3: Add data-action to buttons
         ↓
Step 4: Add checkPermission() to handlers
         ↓
Step 5: Test in browser
```

---

## ✅ Final Verification

```javascript
// En Console, después de cargar entidad:

// 1. Check module
EntityRoleManager  // Should show object

// 2. Check state
EntityRoleManager.getState()  // Should show entity + role

// 3. Check permissions
PermissionsHelper.canEditEntity('owner')  // true
PermissionsHelper.canEditEntity('viewer')  // false

// 4. Check buttons
document.querySelector('[data-action="edit"]').disabled  // true/false

// All ✅ = Implementación correcta!
```

---

## 🐛 3 Most Common Issues

### Issue 1: "EntityRoleManager is not defined"
```
✓ Check: <script src="js/entity-role-manager.js"></script> in HTML
✓ Check: After permissions-helpers.js
✓ Solution: Reload page (Ctrl+Shift+R)
```

### Issue 2: "Buttons don't disable"
```
✓ Check: Button has data-action="edit" attribute
✓ Check: Spelling matches exactly
✓ Solution: Manually run EntityRoleManager.updateActionButtons()
```

### Issue 3: "Role is always null"
```
✓ Check: API.EntityUsers.getUserRole() exists
✓ Check: User assigned in entity_users table
✓ Check: No RLS permission errors
✓ Solution: See TESTING-ENTITY-ROLES.md troubleshooting
```

---

## 📚 Documentation by Time

| Time | Document | Purpose |
|------|----------|---------|
| 5 min | QUICK-START | Implement fast |
| 10 min | RESUMEN | Understand what |
| 15 min | CHECKLIST | Step-by-step |
| 30 min | ENTIDADES-ENTITY-ROLES | Full integration |

---

## 🔒 Security Reminders

✅ Frontend: UX defensiva (botones deshabilitados)  
✅ Backend: RLS es la autoridad (DB valida todo)  
✅ Admin: Global role='admin' tiene acceso total  
✅ Safe by Default: Sin permiso → Sin acceso  

---

## 💾 Key Variables

```javascript
window.currentEntity      // { id, name, ... }
window.currentEntityRole  // 'owner'|'auditor'|'viewer'|null
window.currentUser        // { id, email, role: 'admin'|'user' }

PermissionsHelper.GLOBAL_ROLES    // { ADMIN: 'admin', USER: 'user' }
PermissionsHelper.ENTITY_ROLES    // { OWNER, AUDITOR, VIEWER }
```

---

## 🎓 API Reference (Short)

```javascript
// LOAD
await EntityRoleManager.loadEntity(entity)
await EntityRoleManager.getEntityRole(entityId)

// CHECK
EntityRoleManager.checkPermission('edit'|'delete'|'create-commitment'|'audit')
PermissionsHelper.canEditEntity(entityRole)
PermissionsHelper.canAudit(entityRole)

// UPDATE
await EntityRoleManager.updateActionButtons()
await EntityRoleManager.refreshEntityRole(entityId)

// CLEAN
EntityRoleManager.clearEntity()

// DEBUG
EntityRoleManager.getState()
```

---

## 🧪 Test Template

```javascript
// Quick Test
async function testEntityRoles() {
    // Load test entity
    await EntityRoleManager.loadEntity({ id: 1, name: 'Test' });
    
    // Check state
    console.log('State:', EntityRoleManager.getState());
    
    // Check permissions
    console.log('Can Edit:', PermissionsHelper.canEditEntity(window.currentEntityRole));
    
    // Check buttons
    console.log('Edit Button Disabled:', document.querySelector('[data-action="edit"]').disabled);
}

testEntityRoles();
```

---

## 📱 Mobile Friendly?

✅ Yes! All flexbox, responsive  
✅ Tooltips work on long-press  
✅ Tested on iOS and Android  

---

## 🌍 Browser Support

✅ Chrome 60+  
✅ Firefox 55+  
✅ Safari 11+  
✅ Edge 79+  
❌ IE (no support)  

---

## 🚀 Next Steps

1. Read QUICK-START (5 min)
2. Integrate (10 min)
3. Test (5 min)
4. Deploy (0 min)

**Total: 20 minutes** ⚡

---

## 🎯 Success Criteria

- [ ] No errors in console
- [ ] Buttons enable/disable correctly
- [ ] Can't click disabled buttons
- [ ] Permissions work per role
- [ ] Admin has full access
- [ ] Alerts show on deny

---

**Print this page for quick reference!** 📄

Ver archivo completo: [ENTITY-ROLES-INDEX.md](ENTITY-ROLES-INDEX.md)
