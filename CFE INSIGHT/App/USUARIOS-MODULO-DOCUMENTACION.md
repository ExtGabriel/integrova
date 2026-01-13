MÓDULO DE USUARIOS - DOCUMENTACIÓN TÉCNICA
===========================================

## 📋 Resumen de Cambios

Se ha refactorizado y estabilizado completamente el módulo de USUARIOS para cumplir con los requerimientos de producción:

### ✅ Cambios Realizados

#### 1. Ampliación del API.Users en api-client.js
- ✅ Método `updateRole(userId, newRole)` - Cambiar rol de usuario
- ✅ Método `toggleActive(userId, isActive)` - Activar/desactivar usuario
- ✅ Método `canChangeRoles()` - Validar permiso de cambiar roles
- ✅ Método `canChangeStatus()` - Validar permiso de cambiar estado
- ✅ Método `getAccessibleUsers()` - Obtener usuarios según permisos

#### 2. Nuevos Helpers Globales en window.API
- ✅ `hasRole(requiredRole)` - Verificar si usuario tiene rol
- ✅ `canAccessUsers()` - Verificar acceso al módulo de usuarios
- ✅ `getCurrentRole()` - Obtener rol del usuario actual
- ✅ `getCurrentUserName()` - Obtener nombre del usuario actual

#### 3. Manejo de Errores Robusto
- ✅ Detecta y maneja errores 401 (No autorizado)
- ✅ Detecta y maneja errores 403 (Acceso denegado)
- ✅ Detecta tabla inexistente sin fallar
- ✅ Muestra mensajes claros en la UI (no solo console.log)

#### 4. Refactorización de usuarios.html/usuarios.js
- ✅ Extracto código inline a archivo usuarios.js separado
- ✅ Implementó validación defensiva de permisos
- ✅ Bloqueó UI si el usuario no tiene permisos
- ✅ Agregó selectores de rol (si tiene permiso)
- ✅ Agregó botones de estado (si tiene permiso)
- ✅ Mejora visual y UX

---

## 🔒 Seguridad y Permisos

### Matriz de Permisos

| Rol | Ver Usuarios | Cambiar Rol | Cambiar Estado |
|-----|:------------:|:-----------:|:--------------:|
| Administrador | ✅ | ✅ | ✅ |
| Programador | ✅ | ✅ | ❌ |
| Supervisor | ✅ | ❌ | ✅ |
| Socio | ✅ | ✅ | ❌ |
| Auditor Senior | ❌ | ❌ | ❌ |
| Auditor | ❌ | ❌ | ❌ |
| Cliente | ❌ | ❌ | ❌ |

### Bloqueo de UI Automático

Si el usuario NO tiene permiso para ver usuarios:
- ✅ Página muestra mensaje de error: "No tienes permiso para acceder"
- ✅ Tabla vacía con indicador de acceso denegado
- ✅ Botones deshabilitados con tooltips informativos

---

## 🚀 Uso de la API

### Cargar Usuarios (según permisos)

```javascript
const result = await API.Users.getAccessibleUsers();
if (result.success) {
    console.log('Usuarios:', result.data);
}
```

### Cambiar Rol de Usuario

```javascript
// Validar permiso primero
const canChange = await API.Users.canChangeRoles();
if (!canChange) {
    console.error('No tienes permiso para cambiar roles');
    return;
}

// Cambiar rol
const result = await API.Users.updateRole(userId, 'supervisor');
if (result.success) {
    console.log('✅ Rol actualizado:', result.data);
} else {
    console.error('❌ Error:', result.error);
}
```

### Cambiar Estado del Usuario

```javascript
// Validar permiso
const canChange = await API.Users.canChangeStatus();
if (!canChange) {
    console.error('No tienes permiso para cambiar estado');
    return;
}

// Activar/desactivar
const result = await API.Users.toggleActive(userId, true);
if (result.success) {
    console.log('✅ Usuario activado');
} else {
    console.error('❌ Error:', result.error);
}
```

### Validar Acceso

```javascript
// ¿Puedo acceder a la gestión de usuarios?
const hasAccess = await API.canAccessUsers();

// ¿Cuál es mi rol?
const myRole = await API.getCurrentRole();

// ¿Tengo rol específico?
const isAdmin = await API.hasRole('administrador');
const isEditor = await API.hasRole(['administrador', 'programador']);
```

---

## 🎯 Funcionalidades Implementadas

### ✅ Listar Usuarios
- Filtra según permisos del usuario actual
- Muestra columnas: Usuario, Nombre, Correo, Teléfono, Rol, Equipo, Estado, Contraseña
- Acciones deshabilitadas (solo lectura)

### ✅ Cambiar Rol (si tiene permiso)
- Selector dropdown en columna "Rol"
- Actualización en tiempo real via API
- Manejo de errores 403 con mensaje claro

### ✅ Cambiar Estado (si tiene permiso)
- Botón en columna "Estado"
- Activo/Inactivo con visual claro
- Manejo de errores con rollback

### ✅ Búsqueda y Filtros
- Buscar por: Usuario, Nombre, Correo, Teléfono
- Filtro por Rol

### ✅ Protección de Datos
- Botón "Ver/Ocultar" para datos sensibles
- Estado legible en UI

---

## 🔍 Manejo de Errores

### Errores Detectados y Manejados

```javascript
// 401 - No autorizado
if (error.code === '401' || error.message.includes('401')) {
    return { success: false, error: '❌ No autorizado (401): Necesitas autenticarte' };
}

// 403 - Acceso denegado
if (error.code === 'PGRST301') {
    return { success: false, error: '❌ Acceso denegado (403): No tienes permiso' };
}

// Tabla no existe
if (error.message.includes('PGRST205') || error.message.includes('relation')) {
    return { success: false, error: '❌ Tabla de usuarios no existe' };
}
```

### Mensajes en UI

Todos los errores se muestran en el `#alertContainer` con:
- ✅ Icono visual (exclamation-triangle)
- ✅ Mensaje claro y descriptivo
- ✅ Botón de cierre
- ✅ Auto-desaparece en 5 segundos

---

## 📊 Estado de Implementación

### Completado ✅
- [x] Métodos robustos en API.Users
- [x] Helpers globales de permisos
- [x] Validación defensiva
- [x] Manejo de errores 401/403
- [x] Bloqueo de UI por permisos
- [x] Mensajes claros en UI
- [x] Sin código duplicado
- [x] Compatible con MPA
- [x] Sin frameworks adicionales

### Testing Manual

Para probar en diferentes roles:

1. **Admin**: Ver todos usuarios, cambiar roles, cambiar estado ✅
2. **Programador**: Ver usuarios, cambiar roles, NO estado ✅
3. **Supervisor**: Ver usuarios, NO roles, cambiar estado ✅
4. **Cliente/Auditor**: Acceso denegado ✅

---

## 🐛 Debugging

### Ver estado actual

```javascript
// En consola del navegador
window.__usuariosDebug.allUsers()
window.__usuariosDebug.currentUserProfile()
window.__usuariosDebug.permisos()
```

### Ver logs

```javascript
// Logs automáticos en consola:
// ✅ usuarios.js: Inicializando módulo de usuarios...
// ✅ Acceso validado. Permisos: { canChangeRoles, canChangeStatus, userRole }
// ✅ X usuarios cargados
```

---

## 📁 Archivos Modificados

1. **js/api-client.js**
   - Amplió UsersModule con 5 nuevos métodos
   - Agregó 4 helpers globales de permisos

2. **js/usuarios.js** (NUEVO)
   - Módulo completo de usuarios en archivo separado
   - ~400 líneas de código defensivo

3. **pages/usuarios.html**
   - Agregó contenedores de alerta y carga
   - Cambió script inline a referencia externa

---

## 🚨 Notas Importantes

### Permisos en Base de Datos

Los permisos se validan contra:
- Campo `role` del usuario en tabla `users`
- Roles esperados: cliente, auditor, auditor_senior, supervisor, socio, administrador, programador

### Tabla de Usuarios

Se espera tabla `users` con campos:
- `id` (UUID)
- `email` (string)
- `username` (string)
- `full_name` (string)
- `phone` (string)
- `role` (string)
- `active` (boolean)
- `groups` (array o string)
- `created_at` (timestamp)

Si falta algún campo, el módulo lo maneja gracefully sin fallar.

---

## 🎓 Próximos Pasos (Futuros)

- [ ] Agregar creación de usuarios (si se requiere)
- [ ] Agregar edición de perfiles
- [ ] Agregar exportación a CSV
- [ ] Agregar auditoría de cambios
- [ ] Integrar con roles_permissions table

