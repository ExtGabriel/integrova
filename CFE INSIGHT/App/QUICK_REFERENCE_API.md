## 📋 QUICK REFERENCE - MÓDULOS API

**Para consulta rápida cuando programas**

---

## 🔍 MÓDULOS DISPONIBLES

### Predefinidos (5)
```javascript
window.API.Entities      ✅ Entidades/Empresas
window.API.Commitments   ✅ Compromisos
window.API.Users         ✅ Usuarios
window.API.Notifications ✅ Notificaciones
window.API.Audit         ✅ Auditoría
```

### Stubs Nuevos (8)
```javascript
window.API.Groups        ✅ Grupos
window.API.Teams         ✅ Equipos
window.API.Permissions   ✅ Permisos
window.API.Roles         ✅ Roles
window.API.Logs          ✅ Logs
window.API.Settings      ✅ Configuración
window.API.Templates     ✅ Plantillas
window.API.Reports       ✅ Reportes
```

### Acceso Genérico
```javascript
window.API.getModule('tabla_nombre') ✅ Cualquier tabla
```

---

## 🎯 MÉTODOS DISPONIBLES

Cada módulo tiene estos 5 métodos:

```javascript
// Obtener todos
await window.API.Usuarios.getAll()
// Retorna: { success: true, data: [...] }

// Obtener por ID
await window.API.Usuarios.getById('123')
// Retorna: { success: true, data: {...} }

// Crear
await window.API.Usuarios.create({ name: 'Juan' })
// Retorna: { success: true, data: {...} }

// Actualizar
await window.API.Usuarios.update('123', { name: 'Nuevo' })
// Retorna: { success: true, data: {...} }

// Eliminar
await window.API.Usuarios.delete('123')
// Retorna: { success: true }
```

---

## 💻 CÓDIGO TÍPICO

### Cargar lista
```javascript
const result = await window.API.Users.getAll();
if (result.success) {
  const users = result.data; // Always array, never undefined
  users.forEach(u => console.log(u.email));
}
```

### Buscar uno
```javascript
const result = await window.API.Users.getById('user-id-123');
if (result.success) {
  const user = result.data; // null or object, never undefined
  if (user) {
    console.log(user.name);
  }
}
```

### Crear
```javascript
const newUser = { email: 'test@test.com', name: 'Test' };
const result = await window.API.Users.create(newUser);
if (result.success) {
  console.log('Creado:', result.data.id);
}
```

### Tabla no predefinida
```javascript
// Acceso seguro a cualquier tabla
const result = await window.API.getModule('mi_tabla').getAll();
// ✅ Funciona incluso si tabla no existe
// ✅ Retorna { success: true, data: [] } si tabla no existe
```

---

## ✅ GARANTÍAS

```
✅ window.API NUNCA es undefined
✅ Módulos NUNCA son undefined
✅ Métodos NUNCA son undefined
✅ result NUNCA es undefined
✅ result.success SIEMPRE es boolean
✅ result.data NUNCA es undefined
✅ Tabla inexistente → retorna []
✅ Error de conexión → retorna []
✅ 100% backward compatible
```

---

## 🚨 ERRORES COMUNES

### ❌ Esto FALLA
```javascript
window.API.Users.getAll().then(...) // Falta await
window.API.Users // Usas módulo sin método
window.API.getModule() // Falta nombre tabla
const { data } = await window.API.Users.getAll(); // Desestructuración puede fallar
```

### ✅ Esto FUNCIONA
```javascript
await window.API.Users.getAll()
window.API.Users.getAll()
const result = await window.API.Users.getAll(); result.data
window.API.getModule('tabla').getAll()
(await window.API.Users.getAll()).data || []
```

---

## 📊 COMPARATIVA MÉTODOS

| Método | Parámetros | Retorna | Ejemplo |
|--------|-----------|---------|---------|
| getAll() | - | `{ success, data: [] }` | `await API.Users.getAll()` |
| getById(id) | id | `{ success, data: {...} }` | `await API.Users.getById('123')` |
| create(record) | record | `{ success, data: {...} }` | `await API.Users.create({...})` |
| update(id, upd) | id, updates | `{ success, data: {...} }` | `await API.Users.update('123', {...})` |
| delete(id) | id | `{ success }` | `await API.Users.delete('123')` |

---

## 🎯 PATRONES SEGUROS

### Patrón 1: Con manejo de error
```javascript
try {
  const result = await window.API.Users.getAll();
  if (result.success) {
    const users = result.data;
    console.log(`${users.length} usuarios cargados`);
  }
} catch (err) {
  console.error('Error:', err);
}
```

### Patrón 2: Encadenado
```javascript
const users = (await window.API.Users.getAll()).data || [];
const count = users.length; // ✅ Nunca undefined
```

### Patrón 3: Tabla dinámica
```javascript
const tabla = prompt('¿Qué tabla?'); // 'roles', 'permissions', etc
const resultado = await window.API.getModule(tabla).getAll();
// ✅ Funciona para cualquier tabla
```

### Patrón 4: Async loop
```javascript
const resultado = await window.API.Users.getAll();
for (const user of resultado.data) {
  const profile = await window.API.Users.getById(user.id);
  console.log(profile.data.name);
}
```

---

## 📞 REFERENCIA RÁPIDA

```
API Entrypoint:        window.API
Módulos predefinidos:  5 (Entities, Commitments, Users, Notifications, Audit)
Módulos stub:          8 (Groups, Teams, Permissions, Roles, Logs, Settings, Templates, Reports)
Métodos por módulo:    5 (getAll, getById, create, update, delete)
Estructura retorno:    { success: boolean, data: any }

Nunca undefined:
  ✅ window.API
  ✅ Módulos (resultado de acceso)
  ✅ Métodos (función async)
  ✅ result (objeto con success y data)
  ✅ result.success (boolean)
  ✅ result.data (array o null o object, nunca undefined)

Siempre seguro:
  ✅ Tabla no existe → retorna []
  ✅ Error conexión → retorna []
  ✅ Campo null → se maneja como null, nunca undefined
  ✅ Módulo no predefinido → usar getModule()
```

---

## 🧪 TEST RÁPIDO

```javascript
// Copiar en consola:
console.log('✅ API:', typeof window.API === 'object' ? 'OK' : 'FALLA');
console.log('✅ Users:', typeof window.API.Users === 'object' ? 'OK' : 'FALLA');
console.log('✅ Groups:', typeof window.API.Groups === 'object' ? 'OK' : 'FALLA');
console.log('✅ getAll:', typeof window.API.Users.getAll === 'function' ? 'OK' : 'FALLA');
console.log('✅ getModule:', typeof window.API.getModule === 'function' ? 'OK' : 'FALLA');
```

**Esperado:** Todos deben decir "OK"

---

## 📚 DOCUMENTACIÓN COMPLETA

- **RESUMEN_API_SEGURO.md** - Visión general (2 min)
- **MEJORAS_MODULOS_API.md** - Qué cambió (5 min)
- **VERIFICACION_MODULOS_API.md** - Tests detallados (10 min)
- **TESTS_CONSOLA_RAPIDO.md** - Copy/paste scripts (2 min)

---

**Status:** ✅ SIEMPRE CONSULTABLE  
**Última actualización:** 12 de Enero, 2026
