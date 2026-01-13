# 🚀 INICIO RÁPIDO: Sistema de Permisos CFE INSIGHT

## ¿Qué se implementó?

✅ **Sistema centralizado de control de roles** en 1 archivo nuevo + extensiones  
✅ **No rompe nada existente** - Arquitectura MPA se mantiene  
✅ **Defensivo y reutilizable** - Lógica en un solo lugar  
✅ **Integración gradual** - Adaptar módulos existentes sin urgencia  

---

## 📦 Archivos Nuevos

```
js/
  ├─ permissions-helpers.js       ← NUEVO (Sistema de permisos)
  ├─ compromisos-permisos.js      ← NUEVO (Ejemplo de integración)
  ├─ entidades-permisos.js        ← NUEVO (Ejemplo de integración)
  ├─ api-client.js                ← EXTENDIDO (métodos nuevos)
  └─ usuarios.js                  ← SIN CAMBIOS (ya funciona)
  
SISTEMA-ROLES-PERMISOS.md         ← NUEVO (Documentación completa)
INICIO-RAPIDO.md                  ← TÚ ESTÁS AQUÍ
```

---

## 🎯 3 Pasos para Usar

### Paso 1️⃣: Orden Correcto de Scripts

En **TODA** página HTML que use permisos, cargar en este orden:

```html
<head>
  <!-- Configuración Supabase -->
  <script src="js/config-supabase.js"></script>
  <script src="js/supabaseClient.js"></script>
  
  <!-- API Client -->
  <script src="js/api-client.js"></script>
  
  <!-- NUEVO: Sistema de Permisos ⭐ IMPORTANTE -->
  <script src="js/permissions-helpers.js"></script>
  
  <!-- Auth Guard (sin cambios) -->
  <script src="js/auth-guard.js"></script>
</head>
```

### Paso 2️⃣: Proteger la Página

```html
<script>
// Esto SIEMPRE va al final del body
window.protectPage(async () => {
  // ✅ Usuario autenticado aquí
  
  // Ejemplo 1: Deshabilitar botón
  await PermissionsHelper.disableIfNoPermission(
    'deleteBtn',           // ID del botón
    'eliminar',            // Acción requerida
    'entidades',           // Recurso
    'No tienes permiso'    // Mensaje
  );
  
  // Ejemplo 2: Ocultar sección
  await PermissionsHelper.hideIfNoPermission(
    'adminPanel',
    'ver',
    'usuarios'
  );
});
</script>
```

### Paso 3️⃣: Validar Acciones

```javascript
// Antes de ejecutar acción peligrosa
async function deleteEntity(id) {
  // Verificar permiso + mostrar error automático
  const canDelete = await PermissionsHelper.checkPermissionOrFail(
    'eliminar',
    'entidades',
    '❌ No puedes eliminar'
  );
  
  if (!canDelete) return; // Ya mostró error
  
  // Proceder...
  await API.Entities.delete(id);
}
```

---

## 💡 Casos de Uso Comunes

### ✅ Caso 1: Página de Usuarios

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Scripts en orden -->
  <script src="js/config-supabase.js"></script>
  <script src="js/supabaseClient.js"></script>
  <script src="js/api-client.js"></script>
  <script src="js/permissions-helpers.js"></script>
  <script src="js/auth-guard.js"></script>
  <script src="js/usuarios.js"></script>
</head>
<body>
  <button id="createUserBtn" onclick="createUser()">Crear Usuario</button>
  <div id="usersTable"></div>

  <script>
    async function initPage() {
      // Bloquear botón de crear si no tiene permiso
      await PermissionsHelper.disableIfNoPermission(
        'createUserBtn',
        'crear',
        'usuarios',
        'Solo admin puede crear usuarios'
      );
      
      // Cargar tabla (usuarios.js ya lo hace)
    }
    
    // ✅ window.protectPage ya está en usuarios.js
    // ✅ Listo
  </script>
</body>
</html>
```

### ✅ Caso 2: Página de Compromisos

```html
<head>
  <script src="js/config-supabase.js"></script>
  <script src="js/supabaseClient.js"></script>
  <script src="js/api-client.js"></script>
  <script src="js/permissions-helpers.js"></script>  ← NUEVO
  <script src="js/auth-guard.js"></script>
</head>
<body>
  <button id="createCommitmentBtn">Crear Compromiso</button>
  <div id="commitmentsList"></div>

  <script>
    window.protectPage(async () => {
      // Usar permisos helpers aquí
      const permissions = await PermissionsHelper.getPermissions('compromisos');
      console.log('Mis permisos:', permissions);
      
      if (permissions.includes('crear')) {
        // Botón habilitado por defecto
      } else {
        await PermissionsHelper.disableIfNoPermission(
          'createCommitmentBtn', 'crear', 'compromisos'
        );
      }
      
      // Cargar y renderizar compromisos...
    });
  </script>
</body>
</html>
```

### ✅ Caso 3: Tabla Dinámica Condicionada

```javascript
async function renderTable(items) {
  const permissions = await PermissionsHelper.getPermissions('entidades');
  
  items.forEach(item => {
    const row = `
      <tr>
        <td>${item.name}</td>
        <td>
          ${permissions.includes('editar') ? '<button>Editar</button>' : ''}
          ${permissions.includes('eliminar') ? '<button>Eliminar</button>' : ''}
        </td>
      </tr>
    `;
    // Agregar a tabla...
  });
}
```

---

## 🔑 Métodos Principales

### `hasRole(roles)`
¿Tiene este rol?

```javascript
const isAdmin = await PermissionsHelper.hasRole('administrador');
const isSupervisor = await PermissionsHelper.hasRole(['admin', 'supervisor']);
```

### `hasPermission(action, resource)`
¿Puede hacer esto?

```javascript
const canCreate = await PermissionsHelper.hasPermission('crear', 'usuarios');
const canDelete = await PermissionsHelper.hasPermission('eliminar', 'entidades');
```

### `getPermissions(resource)`
Listar todos mis permisos

```javascript
const perms = await PermissionsHelper.getPermissions('compromisos');
console.log(perms); // ['ver', 'crear', 'editar']
```

### `disableIfNoPermission(element, action, resource, tooltip)`
Deshabilitar botón

```javascript
await PermissionsHelper.disableIfNoPermission(
  'deleteBtn',
  'eliminar',
  'usuarios',
  'No tienes permiso'
);
```

### `hideIfNoPermission(element, action, resource)`
Ocultar elemento

```javascript
await PermissionsHelper.hideIfNoPermission(
  'adminPanel',
  'ver',
  'usuarios'
);
```

### `checkPermissionOrFail(action, resource, errorMsg)`
Validar o bloquear

```javascript
const ok = await PermissionsHelper.checkPermissionOrFail(
  'cambiar_rol',
  'usuarios',
  '❌ No puedes cambiar roles'
);
if (!ok) return; // Ya mostró error
```

---

## 🚦 Roles y Acceso

| Rol | Usuarios | Entidades | Compromisos | Reportes | Auditoría |
|-----|----------|-----------|-------------|----------|-----------|
| **admin** | ✅ Todos | ✅ Todos | ✅ Todos | ✅ Todos | ✅ Todos |
| **programador** | ✅ Todos | ✅ Ver/Crear/Edit | ✅ Ver/Crear/Edit | ✅ Ver/Crear | ✅ Ver |
| **socio** | Ver | Ver/Edit | Ver/Edit | Ver | Ver |
| **supervisor** | Ver/Status | Ver/Edit | Ver/Edit | Ver | Ver |
| **auditor_senior** | Ver | Ver | Ver | Ver | Ver |
| **auditor** | Ver | Ver | Ver | - | Ver |
| **cliente** | - | Ver | Ver | - | - |

---

## ⚠️ IMPORTANTE: Cargar en Orden Correcto

```
❌ INCORRECTO:
  <script src="auth-guard.js"></script>      ← Carga primero
  <script src="permissions-helpers.js"></script>  ← Después

✅ CORRECTO:
  <script src="config-supabase.js"></script>
  <script src="supabaseClient.js"></script>
  <script src="api-client.js"></script>
  <script src="permissions-helpers.js"></script>  ← AQUÍ
  <script src="auth-guard.js"></script>
```

Si cambias el orden → Error: "PermissionsHelper is undefined"

---

## 🐛 Troubleshooting

### Problema: "PermissionsHelper is undefined"
```
✅ Solución: Verificar orden de scripts (ver arriba)
```

### Problema: Botón no se deshabilita
```javascript
// ❌ Incorrecto
disableIfNoPermission('myBtn', 'editar', 'usuarios');

// ✅ Correcto
await PermissionsHelper.disableIfNoPermission('myBtn', 'editar', 'usuarios');
```

### Problema: Permiso dice "no" pero debería decir "sí"
```
✅ Solución: Recargar página (F5) para actualizar caché
```

### Problema: Rol no se actualiza después de cambiar en BD
```
✅ Solución: El rol se cachea. Recargar página para actualizar.
```

---

## 📋 Checklist de Migración

- [ ] Agregar `permissions-helpers.js` a proyecto
- [ ] Extender scripts orden en HTML principal
- [ ] Probar usuarios.html (ya tiene integración)
- [ ] Probar login/logout (sin cambios)
- [ ] Opcionalmente: integrar en compromisos.html
- [ ] Opcionalmente: integrar en entidades.html
- [ ] Validar sin errores en consola (F12)
- [ ] Testing: cambiar rol en BD, ver cambios en UI

---

## 🔗 Referencias Rápidas

- **Documentación Completa:** [SISTEMA-ROLES-PERMISOS.md](./SISTEMA-ROLES-PERMISOS.md)
- **Ejemplo Compromisos:** [compromisos-permisos.js](./js/compromisos-permisos.js)
- **Ejemplo Entidades:** [entidades-permisos.js](./js/entidades-permisos.js)
- **Fuente de Permisos:** [permissions-helpers.js](./js/permissions-helpers.js)

---

## ✅ ¿Listo?

1. Copiar `permissions-helpers.js` al proyecto
2. Cargar script en orden correcto
3. Usar `PermissionsHelper.xxx()` en páginas
4. Listo ✨

---

**Última actualización:** 2025-01-13  
**Versión:** 1.0  
**Status:** ✅ Listo para Producción
