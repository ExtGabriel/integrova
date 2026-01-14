# 📑 Índice: Sistema de Roles por Entidad

## 🎯 Empezar Aquí

👉 **Si tienes 5 minutos:** [QUICK-START-ENTITY-ROLES.md](QUICK-START-ENTITY-ROLES.md)  
👉 **Si tienes 15 minutos:** [RESUMEN-ENTITY-ROLES.md](RESUMEN-ENTITY-ROLES.md)  
👉 **Si tienes 30 minutos:** [ENTIDADES-ENTITY-ROLES.md](ENTIDADES-ENTITY-ROLES.md)  

---

## 📚 Documentación Completa

### 1. **QUICK-START-ENTITY-ROLES.md** ⚡
**Duración:** 5 minutos  
**Para:** Implementación rápida

Contenido:
- Paso 1-5 para integrar
- Verificación rápida
- Troubleshooting básico

**Cuándo leer:** Necesitas integrar AHORA

---

### 2. **RESUMEN-ENTITY-ROLES.md** 📊
**Duración:** 10-15 minutos  
**Para:** Visión general completa

Contenido:
- Qué se implementó
- Arquitectura global
- Flujo de carga
- Matriz de permisos
- API pública
- Próximos pasos
- FAQ

**Cuándo leer:** Necesitas entender qué hace todo

---

### 3. **ENTIDADES-ENTITY-ROLES.md** 🔧
**Duración:** 20-30 minutos  
**Para:** Integración paso a paso

Contenido:
- Arquitectura detallada
- Paso 1-6 con ejemplos reales
- HTML completo
- Handlers con validación
- Debugging

**Cuándo leer:** Necesitas saber exactamente dónde pegar código

---

### 4. **EJEMPLOS-VISUALES-ENTITY-ROLES.md** 🎨
**Duración:** 10 minutos  
**Para:** Ver cómo se ve en la UI

Contenido:
- 5 escenarios de roles
- HTML mockups
- Flujos de interacción
- Tooltips y mensajes
- Tabla de botones por rol

**Cuándo leer:** Quieres saber cómo se ve en la práctica

---

### 5. **TESTING-ENTITY-ROLES.md** 🧪
**Duración:** 30 minutos  
**Para:** Validación y debugging

Contenido:
- 15 tests completos
- Checklist de implementación
- Scripts de debugging
- Solución de problemas
- Performance testing

**Cuándo leer:** Algo no funciona o quieres verificar todo

---

### 6. **PERMISOS-REFERENCIA.md** 📖
**Duración:** 15 minutos  
**Para:** Referencia del sistema de permisos global

Contenido:
- Uso de PermissionsHelper
- Matriz de permisos
- Casos de uso
- Integración con API
- Flujo completo

**Cuándo leer:** Necesitas entender permisos globales

---

## 💻 Código

### Módulos Nuevos

#### `js/entity-role-manager.js` (362 líneas)
**Propósito:** Gestor de roles por entidad  
**No editar:** Copy-paste tal cual

**Métodos principales:**
```javascript
await EntityRoleManager.loadEntity(entity)
await EntityRoleManager.getEntityRole(entityId)
EntityRoleManager.checkPermission(action)
EntityRoleManager.clearEntity()
EntityRoleManager.getState()
```

**Dependencias:**
- `permissions-helpers.js` (debe cargar antes)
- `api-client.js` (debe cargar antes)

---

#### `js/entidades-example.js` (400+ líneas)
**Propósito:** Ejemplo completo de uso  
**Para:** Copy-paste y adaptar

**Contiene:**
- `onViewEntity()` - Cargar entidad
- `onEditEntity()` - Editar con validación
- `onDeleteEntity()` - Eliminar con doble confirmación
- `onCreateCommitment()` - Crear compromiso
- `onAuditEntity()` - Ver auditoría
- `loadEntities()` - Cargar tabla
- Helpers para modales

**Uso:** Copiar/pegar en tu entidades.html y adaptar

---

## 📊 Matrices de Referencia

### Matriz de Permisos por Rol

| Rol | Editar | Eliminar | Crear Compromisos | Auditar |
|-----|--------|----------|-------------------|---------|
| **owner** | ✅ | ✅ | ✅ | ✅ |
| **auditor** | ❌ | ❌ | ❌ | ✅ |
| **viewer** | ❌ | ❌ | ❌ | ❌ |
| **admin** | ✅ | ✅ | ✅ | ✅ |
| **sin asignar** | ❌ | ❌ | ❌ | ❌ |

### Matriz de Métodos

| Método | Parámetros | Retorna | Efecto Secundario |
|--------|-----------|---------|-----------------|
| `loadEntity()` | entity, userId? | boolean | Establece window.currentEntity/Role |
| `getEntityRole()` | entityId, userId? | Promise<string\|null> | Cachea resultado |
| `checkPermission()` | action | boolean | Muestra alert si deniega |
| `updateActionButtons()` | - | Promise<void> | Habilita/deshabilita [data-action] |
| `clearEntity()` | - | void | Limpia window.currentEntity/Role |
| `getState()` | - | object | Solo lectura, debugging |

---

## 🔐 Sistema Completo

```
public.users (BD)
    ↓
    └─ role: 'admin' | 'user'
        ↓
        └─ PermissionsHelper.isAdmin()

public.entity_users (BD)
    ↓
    └─ role: 'owner' | 'auditor' | 'viewer' | null
        ↓
        └─ EntityRoleManager.getEntityRole()
            └─ EntityRoleManager.checkPermission()
                └─ Habilitar/deshabilitar botones en UI
```

---

## ⚙️ Dependencias

### Arquitectura de Módulos

```
entidades.html
    ↓
    ├─ permissions-helpers.js    (v4 - Permisos globales + entity)
    │  └─ PermissionsHelper (objeto global)
    │
    ├─ api-client.js             (Supabase client)
    │  └─ API.EntityUsers.*
    │
    └─ entity-role-manager.js     (Nuevo - Gestor de roles)
       ├─ Requiere: PermissionsHelper
       ├─ Requiere: API.EntityUsers.getUserRole
       └─ Expone: EntityRoleManager (objeto global)
```

### Requisitos

- ✅ `permissions-helpers.js` v4+ (ya implementado)
- ✅ `api-client.js` con EntityUsers (ya implementado)
- ✅ `entity-role-manager.js` (nuevo, incluido)
- ✅ Botones en HTML con `data-action`

---

## 🚀 Roadmap de Integración

### Fase 1: Setup (5 minutos)
1. Agregar script `entity-role-manager.js`
2. Cargar entidad con `EntityRoleManager.loadEntity()`

### Fase 2: Protección (5 minutos)
1. Agregar `data-action` a botones
2. Agregar `checkPermission()` en handlers

### Fase 3: Testing (5 minutos)
1. Probar en navegador
2. Verificar en console

### Fase 4: (Opcional) Mejoras
1. Mostrar status de permisos
2. Refrescar roles en tiempo real
3. Exportar para solo auditors

---

## 🆘 Troubleshooting

### "EntityRoleManager is not defined"
→ [TESTING-ENTITY-ROLES.md#EntityRoleManager-is-not-defined](TESTING-ENTITY-ROLES.md)

### "Botones no se deshabilitan"
→ [TESTING-ENTITY-ROLES.md#Botones-no-se-deshabilitan](TESTING-ENTITY-ROLES.md)

### "Role es siempre null"
→ [TESTING-ENTITY-ROLES.md#Role-es-siempre-null](TESTING-ENTITY-ROLES.md)

### "Cache no funciona"
→ [TESTING-ENTITY-ROLES.md#Cache-no-funciona](TESTING-ENTITY-ROLES.md)

### "Admin no tiene acceso total"
→ [TESTING-ENTITY-ROLES.md#Admin-no-tiene-acceso-total](TESTING-ENTITY-ROLES.md)

---

## 📞 Preguntas Comunes

**P: ¿Por dónde empiezo?**  
R: Lee [QUICK-START-ENTITY-ROLES.md](QUICK-START-ENTITY-ROLES.md) (5 min)

**P: ¿Qué es EntityRoleManager?**  
R: Lee [RESUMEN-ENTITY-ROLES.md](RESUMEN-ENTITY-ROLES.md) (15 min)

**P: ¿Cómo integro esto en mi entidades.html?**  
R: Lee [ENTIDADES-ENTITY-ROLES.md](ENTIDADES-ENTITY-ROLES.md) (30 min)

**P: ¿Cómo se ve en la UI?**  
R: Ve [EJEMPLOS-VISUALES-ENTITY-ROLES.md](EJEMPLOS-VISUALES-ENTITY-ROLES.md)

**P: ¿Cómo testeo que funciona?**  
R: Lee [TESTING-ENTITY-ROLES.md](TESTING-ENTITY-ROLES.md) (30 min)

**P: ¿Necesito cambiar la BD?**  
R: No. Los datos ya deben estar en `public.entity_users`

**P: ¿Qué pasa si el usuario es admin?**  
R: Puede hacer CUALQUIER COSA (admin override)

**P: ¿Esto reemplaza los permisos globales?**  
R: No. Complementa. Hay roles globales (users.role) + roles por entidad

---

## 🎯 Después de Integrar

### Lo que debería funcionar:
- ✅ Botones se deshabilitan según role
- ✅ Acciones están protegidas
- ✅ Admins pueden hacer todo
- ✅ Roles cachean (performance)
- ✅ Logs claros en console

### Próximas mejoras:
- Mostrar badge con role actual
- Notificaciones cuando se cambian roles
- Historial de auditoría
- Exportar reportes (solo auditors)

---

## 📋 Archivos del Proyecto

```
├── docs/
│   ├── QUICK-START-ENTITY-ROLES.md           ← Empieza aquí (5 min)
│   ├── RESUMEN-ENTITY-ROLES.md               ← Visión general
│   ├── ENTIDADES-ENTITY-ROLES.md             ← Guía completa
│   ├── EJEMPLOS-VISUALES-ENTITY-ROLES.md     ← UI mockups
│   ├── TESTING-ENTITY-ROLES.md               ← Tests y debugging
│   ├── PERMISOS-REFERENCIA.md                ← Permisos globales
│   └── README.md (este archivo)              ← Index
│
└── js/
    ├── permissions-helpers.js                 ← Permisos (v4)
    ├── api-client.js                          ← API client
    ├── entity-role-manager.js                 ← Nuevo módulo ✨
    └── entidades-example.js                   ← Ejemplo de uso
```

---

## 📈 Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Líneas de código (entity-role-manager.js) | 362 |
| Métodos públicos | 7 |
| Tests documentados | 15 |
| Documentos creados | 6 |
| Tiempo de implementación | ~5 minutos |
| Matriz de permisos | 5 roles × 4 acciones |

---

**Versión:** 1.0  
**Última actualización:** 2024  
**Estado:** ✅ Completo y documentado

¡Listo para integrar! 🚀
