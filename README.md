# 🎯 CFE INSIGHT - Sistema Completo de Gestión y Auditoría

## 📊 Plataforma Integral de Auditoría, Usuarios y Gestión para CFE

> **Estado:** ✅ En Producción | **Versión:** 1.0 | **Actualización:** Enero 2026

---

## 📍 NAVEGACIÓN RÁPIDA

| Necesito... | Ir a... | Tiempo |
|---|---|---|
| 🆕 Empezar desde cero | [docs/usuarios/LEEME-PRIMERO.md](docs/usuarios/LEEME-PRIMERO.md) | 2 min |
| 🏃 Overview rápido | [docs/usuarios/QUICK-START-USUARIOS.md](docs/usuarios/QUICK-START-USUARIOS.md) | 3 min |
| 👨‍💻 Documentación técnica | [docs/usuarios/RESUMEN-FINAL-USUARIOS.md](docs/usuarios/RESUMEN-FINAL-USUARIOS.md) | 5 min |
| 🚀 Desplegar a producción | [docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md](docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md) | 10 min |
| 🧪 Testear sistema | [docs/usuarios/MODULO-USUARIOS-VERIFICACION.md](docs/usuarios/MODULO-USUARIOS-VERIFICACION.md) | 15 min |
| 🔐 Entender permisos | [docs/sistema/README-PERMISOS.md](docs/sistema/README-PERMISOS.md) | 8 min |
| 🔧 Configurar Supabase | [docs/sistema/INSTRUCCIONES-SUPABASE.md](docs/sistema/INSTRUCCIONES-SUPABASE.md) | 10 min |
| 🐛 Problemas de login | [docs/sistema/README-LOGOUT-FIX.md](docs/sistema/README-LOGOUT-FIX.md) | 5 min |
| 📚 Índice completo | [docs/README.md](docs/README.md) | Variable |

---

## 🚀 INICIO RÁPIDO (5 minutos)

### Paso 1️⃣: Abrir la aplicación
```
1. Abre: index.html en tu navegador
2. Serás redirigido a: /pages/login.html
3. Inicia sesión con tus credenciales de CFE
```

### Paso 2️⃣: Navegar por el sistema
```
✅ Si tienes permisos:
   → Verás Dashboard con módulos disponibles
   → Acceso a: Usuarios, Auditoría, Compromisos, etc.

❌ Sin permisos:
   → Contacta al administrador
   → Ver: docs/sistema/README-PERMISOS.md
```

### Paso 3️⃣: Usar los módulos
```
📊 Dashboard:    Ver estado general
👥 Usuarios:     Gestionar usuarios y roles
📝 Auditoría:    Crear/ver auditorías
📋 Compromisos:  Gestionar compromisos
🏢 Entidades:    Gestionar entidades
```

---

## 📁 ESTRUCTURA DEL PROYECTO - GUÍA COMPLETA

### 🏠 Raíz del Proyecto

```
App/
├── 📄 index.html ........................ ⭐ PUNTO DE ENTRADA
│   └─ Redirige a /pages/login.html
│
├── 📄 jsconfig.json .................... Configuración JavaScript
├── 📄 README.md ........................ Este archivo
└── 📄 .env ............................ ⚠️ NO COMMITEAR - Credenciales locales
    └─ Contiene: SUPABASE_URL, SUPABASE_KEY, etc.
```

**❌ IMPORTANTE - NO MODIFICAR:**
- `index.html` → Mantener redirección a login
- `.env` → No subir a Git (ya en .gitignore)
- `jsconfig.json` → Configuración global

---

### 📚 DOCUMENTACIÓN (`docs/`)

```
docs/
│
├── 📖 README.md .............................. 📌 ÍNDICE CENTRAL
│   └─ Contiene tablas de navegación de TODA la documentación
│
├── 👥 usuarios/ ............................ MÓDULO DE USUARIOS (15 docs)
│   │
│   ├── ⭐ EMPEZAR POR ESTOS:
│   │   ├── LEEME-PRIMERO.md ............... 🆕 LECTURA OBLIGATORIA (2 min)
│   │   ├── QUICK-START-USUARIOS.md ....... Overview ejecutivo (3 min)
│   │   └── INDICE-RAPIDO.md ............. Búsqueda por rol (2 min)
│   │
│   ├── 👨‍💻 PARA DEVELOPERS:
│   │   ├── RESUMEN-FINAL-USUARIOS.md .... Todos los cambios técnicos (5 min)
│   │   ├── USUARIOS-MODULO-DOCUMENTACION.md  Referencia técnica (10 min)
│   │   ├── INDICE-DOCUMENTACION-USUARIOS.md  Índice detallado (5 min)
│   │   └── VALIDACION-USUARIOS.md ....... Validación de código (8 min)
│   │
│   ├── 🚀 PARA DEVOPS:
│   │   ├── USUARIOS-DEPLOYMENT-GUIDE.md . Guía de despliegue (10 min)
│   │   └── VERIFICACION-FINAL-USUARIOS.md Checklist preproducción (15 min)
│   │
│   ├── 🧪 PARA QA/TESTERS:
│   │   ├── MODULO-USUARIOS-VERIFICACION.md Casos de test (15 min)
│   │   └── USUARIOS-v2-ACTUALIZACION.md  Cambios en v2 (8 min)
│   │
│   ├── 📊 REFERENCIAS Y RESÚMENES:
│   │   ├── RESUMEN-VISUAL-USUARIOS.md ... Visual del módulo (3 min)
│   │   ├── SESION-RESUMEN-QUE-SE-LOGRO.md Logros implementados (5 min)
│   │   ├── ENTREGA-USUARIOS-v2.md ....... Entrega versión 2 (4 min)
│   │   ├── CONCLUSION-FINAL.md ......... Cierre del módulo (3 min)
│   │   └── VERIFICACION-FINAL-USUARIOS.md Verificación completa (10 min)
│
├── 🔐 sistema/ ........................... SISTEMA GENERAL (12 docs)
│   │
│   ├── 🔑 AUTENTICACIÓN Y SEGURIDAD:
│   │   ├── README-LOGOUT-FIX.md ......... Solución logout (5 min)
│   │   ├── SOLUCION-LOGOUT-LOOP.md ..... Fix específico (4 min)
│   │   └── SOLUCION-WINDOW-CURRENTUSER.md Manejo de usuario (6 min)
│   │
│   ├── 🛡️ PERMISOS Y ROLES:
│   │   ├── README-PERMISOS.md ........... Sistema de permisos (8 min)
│   │   ├── SISTEMA-ROLES-PERMISOS.md ... Matriz de permisos (10 min)
│   │   ├── SOLUCION-PERMISOS.md ........ Implementación (6 min)
│   │   └── GUIA-AUTENTICACION-Y-PERMISOS.md Guía completa (12 min)
│   │
│   ├── 🗄️ CONFIGURACIÓN:
│   │   ├── INSTRUCCIONES-SUPABASE.md ... Setup DB (10 min)
│   │   └── FIX-BUG-HASROLE-ADMIN.md ... Fix específico (3 min)
│   │
│   ├── ✅ ENTREGAS:
│   │   ├── ENTREGA-FINAL.md ........... Entrega final (5 min)
│   │   ├── IMPLEMENTACION-COMPLETADA.md Qué se hizo (6 min)
│   │   └── TRABAJO-COMPLETADO.md ..... Cierre (4 min)
│
├── 📚 guias/ ............................. GUÍAS RÁPIDAS (4 docs)
│   ├── INICIO-RAPIDO.md ................. Quick start (3 min)
│   ├── CAMBIOS-VISUALES.md ............. Cambios UI (4 min)
│   ├── RESUMEN-VISUAL.md ............... Overview visual (3 min)
│   └── VERIFICACION-RAPIDA.md ......... Verificación rápida (5 min)
│
└── 🗺️ OTRAS CARPETAS:
    └─ Pueden haber más carpetas según contexto del proyecto
```

**🎯 CÓMO NAVEGAR DOCS:**

1. **Índice general:** [docs/README.md](docs/README.md) - Tabla de contenidos de TODO
2. **Por rol:** Ver tablas en docs/README.md - encontrar tu rol
3. **Por tema:** Agrupo arriba por categoría (usuarios, sistema, guías)
4. **Búsqueda:** Usa Ctrl+F en este archivo para buscar palabras clave

---

### 💻 CÓDIGO JAVASCRIPT (`js/`)

```
js/
│
├── 🔐 AUTENTICACIÓN Y SEGURIDAD:
│   ├── auth-guard.js ................... Protección de rutas + logout
│   ├── config-supabase.js .............. Inicialización Supabase
│   └── supabaseClient.js ............... Cliente Supabase (singleton)
│
├── 🛠️ APIS Y CLIENTE:
│   ├── api-client.js ................... ⭐ API centralizada (IMPORTANTE)
│   └── config.js ....................... Configuración global (window.APP_CONFIG)
│
├── 🔑 PERMISOS Y ROLES:
│   ├── permissions-helpers.js .......... Funciones de permisos
│   ├── entity-role-manager.js .......... Gestión de roles
│   └── compromisos-permisos.js ........ Permisos de compromisos
│
├── 👥 MÓDULO DE USUARIOS:
│   ├── usuarios.js ..................... ⭐ MÓDULO PRINCIPAL USUARIOS
│   ├── entidades-permisos.js .......... Permisos de entidades
│   └── socio-utils.js ................. Utilidades para socios
│
├── 📊 DASHBOARD Y VISUALIZACIÓN:
│   ├── dashboard.js .................... Dashboard principal
│   ├── dashboard-charts.js ............ Gráficos del dashboard
│   ├── global-search.js ............... Búsqueda global
│   ├── notifications.js ............... Sistema de notificaciones
│   └── performance.js ................. Monitoreo de performance
│
├── 📋 FORMULARIOS Y DATOS:
│   ├── audit-documents.js ............. Gestión de auditorías
│   ├── conditional-forms.js ........... Formularios condicionales
│   ├── calendar-enhanced.js ........... Calendario mejorado
│   └── entidades-example.js ........... Ejemplo de entidades
│
├── 📚 UTILIDADES:
│   └── utils.js ....................... Funciones generales
│
└── 🗂️ node-web-server/
    └─ Servidor web para desarrollo local
```

**⚠️ ARCHIVOS CRÍTICOS - NO MODIFICAR SIN RAZÓN:**

1. **auth-guard.js** ❌ Modificar → Rompe autenticación
   - Contiene: Protección de rutas, logout fix
   - Si necesitas cambiar: Leer docs/sistema/README-LOGOUT-FIX.md
   
2. **api-client.js** ❌ Modificar → Rompe APIs
   - Contiene: Cliente HTTP centralizado
   - Si necesitas cambiar: Leer docs para contexto primero
   
3. **permissions-helpers.js** ❌ Modificar → Rompe permisos
   - Contiene: Validación de permisos
   - Si necesitas cambiar: Leer docs/sistema/README-PERMISOS.md

**✅ ARCHIVOS SEGUROS PARA MODIFICAR:**

- `dashboard.js` - Lógica del dashboard
- `utils.js` - Funciones auxiliares
- `notifications.js` - Sistema de notificaciones
- Cualquier archivo específico de un módulo

---

### 🧪 SCRIPTS DE VALIDACIÓN (`scripts/`)

```
scripts/
├── usuarios-validation-script.js ......... ⭐ VALIDAR MÓDULO USUARIOS
│   └─ Ejecutar en consola (F12) cuando abras /pages/usuarios.html
│   └─ Verifica: Funcionalidad, permisos, datos
│
├── validate-logout-fix.js ............... Validar logout
│   └─ Ejecutar para verificar que el logout funciona correctamente
│
├── test-centralized-user.html .......... Página de test
│   └─ Abre en navegador para testear usuario centralizado
│
└── [Otros scripts] ..................... Validación específica de features
```

**Cómo usar scripts:**

1. Abre la página en navegador (ej: /pages/usuarios.html)
2. Abre Developer Tools: `F12` o `Ctrl+Shift+I`
3. Ve a Console
4. Copia y pega el script que necesites
5. Presiona Enter
6. Observa los resultados

---

### 🎨 ESTILOS (`css/`)

```
css/
│
├── 🎯 GLOBAL:
│   └── styles.css ..................... Estilos globales base
│
├── 📊 POR MÓDULO:
│   ├── usuarios.css ................... Estilos de módulo usuarios
│   ├── dashboard-charts.css .......... Gráficos dashboard
│   ├── compromisos.css ............... Compromisos
│   ├── compromisos-detalles.css ...... Detalles de compromisos
│   ├── entidades.css ................. Entidades
│   ├── registros.css ................. Registros
│   ├── grupos.css .................... Grupos
│   └── socio-styles.css .............. Estilos para socios
│
├── 🎨 ESPECIALES:
│   ├── calendar-enhanced.css ........ Calendario mejorado
│   ├── notifications.css ............ Notificaciones
│   ├── global-search.css ........... Búsqueda global
│   └── ayuda.css ................... Página de ayuda
```

**Convención de estilos:**

- Los estilos globales van en `styles.css`
- Los estilos específicos de módulo van en archivo separado
- Importar CSS en las HTML pages: `<link rel="stylesheet" href="../css/styles.css">`

---

### 📄 PÁGINAS HTML (`pages/`)

```
pages/
│
├── 🔐 ACCESO:
│   └── login.html ..................... Página de login
│
├── 📊 PRINCIPALES:
│   ├── dashboard.html ................ Dashboard principal
│   ├── usuarios.html ................. Gestión de usuarios ⭐
│   ├── ayuda.html ................... Ayuda del sistema
│   └── soporte_ia.html .............. Soporte con IA
│
├── 📋 AUDITORÍA:
│   ├── audit-documents.html ......... Documentos de auditoría
│   ├── compromisos.html ............ Gestión de compromisos
│   ├── compromisos-detalles.html ... Detalles de compromisos
│   ├── crear-compromiso.html ....... Crear nuevos compromisos
│   ├── entidades.html .............. Gestión de entidades
│   ├── registros.html .............. Registros
│   └── grupos.html ................. Gestión de grupos
│
├── 📅 HERRAMIENTAS:
│   ├── calendario.html ............. Calendario básico
│   ├── calendario-mejorado.html .... Calendario mejorado
│   ├── chat.html ................... Chat
│   └── revisiones-finales.html ..... Revisiones finales
│
└── 🧪 TESTING:
    ├── test-permisos.html .......... Test de permisos
    ├── debug-forms.html ........... Debug de formularios
    └── [Otras páginas de test]
```

**Estructura de una página HTML típica:**

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Meta y título -->
    <title>Mi Página</title>
    
    <!-- Bootstrap -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    
    <!-- Estilos globales -->
    <link rel="stylesheet" href="../css/styles.css">
    
    <!-- Estilos específicos -->
    <link rel="stylesheet" href="../css/mi-modulo.css">
</head>
<body>
    <!-- Contenido -->
    <div class="container">
        <!-- Tu HTML aquí -->
    </div>
    
    <!-- Scripts - ORDEN IMPORTANTE:
         1. Config primero
         2. Supabase client
         3. Auth guard
         4. APIs y helpers
         5. Lógica específica del módulo
    -->
    <script src="../js/config.js"></script>
    <script src="../js/supabaseClient.js"></script>
    <script src="../js/auth-guard.js"></script>
    <script src="../js/api-client.js"></script>
    <script src="../js/permissions-helpers.js"></script>
    <script src="../js/mi-modulo.js"></script>
</body>
</html>
```

**❌ NO HACER:**
- Cambiar orden de scripts - causa errores
- Poner lógica directa en HTML - ponerla en JS
- Olvidar incluir auth-guard - la página no será protegida

---

### 🖼️ ASSETS (`assets/`)

```
assets/
└── [Imágenes, iconos, etc.]
    └── Recursos estáticos del sistema
```

**Cómo referenciar:**
```html
<img src="../assets/mi-imagen.png" alt="Descripción">
```

---

### 📋 FORMULARIOS DE AUDITORÍA (`audit/`)

```
audit/
├── a100.html, a145s.html, a150.html, ... (100+ formularios)
├── b020.html, b030.html, b031.html, ...
├── c100.html, c105q.html, c145.html, ...
├── d100.html, d120.html, d140.html, ...
└── [Otros formularios por categoría]

Estructura:
- a*** = Categoría A (ej: Administración)
- b*** = Categoría B (ej: Operaciones)
- c*** = Categoría C (ej: Comercial)
- d*** = Categoría D (ej: Datos)
```

**Cómo agregar nuevo formulario:**

1. Crear archivo: `audit/aNNN.html` (donde NNN es el número)
2. Seguir estructura de otros formularios
3. Incluir protección de auth-guard
4. Enviar datos a API

---

### 🗄️ MIGRACIONES SUPABASE (`supabase-migrations/`)

```
supabase-migrations/
└── [Scripts SQL de migraciones]
    └── Ejecutar en Supabase Dashboard si hay cambios de schema
```

**Cuándo ejecutar:**
- Cuando el equipo de DB realiza cambios
- Cuando actualizas el proyecto
- Solo por DevOps/Admin

---

## 🎯 FLUJOS DE TRABAJO COMUNES

### 🆕 Workflow: Agregar Nuevo Usuario

**Dónde:** `/pages/usuarios.html`

1. Click en "Nuevo Usuario"
2. Llenar formulario:
   - Email (único)
   - Nombre
   - Rol (admin/programador/socio/etc)
3. Click "Guardar"
4. Sistema envía a Supabase vía `api-client.js`
5. Verificar permisos con `permissions-helpers.js`
6. Usuario creado

**Archivos involucrados:**
- `js/usuarios.js` - Lógica del módulo
- `js/api-client.js` - Comunicación con API
- `js/permissions-helpers.js` - Validación de permisos

---

### 🔐 Workflow: Cambiar Rol de Usuario

1. En `/pages/usuarios.html`
2. Buscar usuario
3. Click en "Editar"
4. Cambiar rol
5. Click "Guardar"
6. Sistema valida:
   - ¿Tienes permiso? (permissions-helpers.js)
   - ¿Datos válidos? (api-client.js)
7. Se actualiza en Supabase

**Puntos críticos:**
- ❌ NO usar la DB directamente - usar API
- ✅ Sistema valida permisos automáticamente
- ✅ Cambios se registran en logs

---

### 🧪 Workflow: Testear Módulo de Usuarios

1. Abre `/pages/usuarios.html`
2. Abre DevTools: `F12`
3. Ve a Console
4. Copia contenido de `scripts/usuarios-validation-script.js`
5. Pega en consola y presiona Enter
6. Revisa resultados
7. Si hay ❌, ver docs/usuarios/MODULO-USUARIOS-VERIFICACION.md

**Alternativa - Test visual:**

1. Abre `/pages/test-permisos.html`
2. Prueba casos: crear, editar, eliminar, cambiar rol
3. Verifica que solo aparezcan opciones según permisos

---

### 🚀 Workflow: Desplegar a Producción

1. Leer: [docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md](docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md)
2. Checklist:
   - ✅ Actualizar `.env` con URLs de producción
   - ✅ Ejecutar tests (`scripts/`)
   - ✅ Revisar logs de consola (F12)
   - ✅ Probar login/logout 3 veces
   - ✅ Crear usuario test y cambiar rol
3. Subir a servidor
4. Verificar en producción

**Comando para tests rápidos:**
```javascript
// En consola del navegador
// Validar módulo usuarios
await window.testUsuariosModule();
```

---

### 🐛 Workflow: Debuggear Problema

**Problema: "No veo el botón de crear usuario"**

1. Abre DevTools: `F12`
2. Console → Busca errores rojo
3. Revisa Network → ¿Falla API?
4. Si es permiso → Ver permisos en BD
5. Si es código → Ver `js/usuarios.js`

**Comando de debug:**
```javascript
// Ver debug info del módulo usuarios
console.log(window.__usuariosDebug);

// Ver usuario actual
console.log(window.currentUser);

// Ver sesión
console.log(await window.getSupabaseSession());
```

---

## 🔒 SEGURIDAD - COSAS QUE NO SE DEBEN CAMBIAR

### ⚠️ CRÍTICO - No tocar bajo ninguna circunstancia:

**1. Loop de Logout (auth-guard.js)**
```javascript
// ❌ NO CAMBIAR ESTO:
if (typeof window.__MANUAL_LOGOUT__ === 'undefined') {
    window.__MANUAL_LOGOUT__ = false; // Flag que previene re-login automático
}
```
**Por qué:** Si lo cambias, los usuarios quedarán en loop de logout

**Si necesitas entender:** [docs/sistema/README-LOGOUT-FIX.md](docs/sistema/README-LOGOUT-FIX.md)

---

**2. Row-Level Security en Supabase**
```sql
-- ❌ NO MODIFICAR en Supabase Console
-- Los permisos están implementados aquí
```
**Por qué:** Si lo cambias, habrá brechas de seguridad

**Si necesitas entender:** [docs/sistema/README-PERMISOS.md](docs/sistema/README-PERMISOS.md)

---

**3. Orden de Scripts en HTML**
```html
<!-- ❌ NO CAMBIAR ESTE ORDEN:
1. config.js
2. supabaseClient.js
3. auth-guard.js
4. api-client.js
5. permissions-helpers.js
6. Mi módulo
-->
```
**Por qué:** Cada script depende del anterior

---

**4. Variables Globales de Autenticación**
```javascript
// ❌ NO SOBRESCRIBIR:
window.currentUserReady
window.__MANUAL_LOGOUT__
window.getSupabaseSession
window.protectPage
```
**Por qué:** Son críticas para autenticación

---

### ⚠️ IMPORTANTE - Cambiar solo si sabes qué haces:

**1. Permisos en permissions-helpers.js**
- ✅ Agregar nuevos roles: OK si lees docs primero
- ✅ Agregar nuevos permisos: OK si actualizas BD también
- ❌ Cambiar lógica existente: Muy arriesgado

**2. Estructura de BD en Supabase**
- ✅ Agregar columnas: OK con migración
- ✅ Crear tablas nuevas: OK con documentación
- ❌ Cambiar tablas existentes: Necesita coordinación

**3. API endpoints en api-client.js**
- ✅ Agregar nuevos endpoints: OK
- ❌ Cambiar endpoints existentes: Rompe todo

---

## 🔧 CÓMO FUNCIONAN LAS COSAS

### 1️⃣ Autenticación - El Flujo

```
Usuario abre index.html
    ↓
index.html redirige a /pages/login.html
    ↓
login.html carga:
  - config.js (configuración)
  - supabaseClient.js (cliente Supabase)
  - auth-guard.js (protección de rutas)
    ↓
auth-guard.js verifica sesión:
  - ¿Hay token en Supabase?
    → Sí: Obtener usuario, guardar en sessionStorage
    → No: Mostrar login
    ↓
Usuario ingresa email + contraseña
    ↓
Supabase valida credenciales
    ↓
Supabase devuelve token + datos usuario
    ↓
auth-guard.js guarda en sessionStorage
    ↓
Usuario redirigido a dashboard
    ↓
Todas las APIs incluyen token automáticamente
```

**Archivos clave:**
- `js/supabaseClient.js` - Inicializa cliente Supabase
- `js/auth-guard.js` - Protege rutas y maneja logout
- `js/config.js` - Configuración global

---

### 2️⃣ Permisos - El Sistema

```
Usuario autenticado
    ↓
auth-guard.js carga datos del usuario:
  - ID
  - Email
  - Rol
  - Permisos asociados
    ↓
Al acceder a una página protegida:
  
  Capa 1 - UI (JavaScript):
    - permissions-helpers.js verifica permiso
    - Si No: Oculta botones/campos
    
  Capa 2 - API (Backend):
    - api-client.js valida permiso antes de enviar
    - Si No: Rechaza request
    
  Capa 3 - Database (Supabase RLS):
    - Row-Level Security valida en BD
    - Si No: No devuelve datos
```

**Archivos clave:**
- `js/permissions-helpers.js` - Funciones de permiso
- `js/api-client.js` - Validación en API
- Supabase RLS - Validación en BD

---

### 3️⃣ Creación de Usuario - El Flujo

```
Usuario admin abre /pages/usuarios.html
    ↓
usuarios.js carga y protege página
    ↓
auth-guard verifica: ¿Es admin? Sí → OK
    ↓
Usuario rellena formulario:
  - Email
  - Nombre
  - Rol
    ↓
Click "Guardar"
    ↓
usuarios.js valida datos:
  - ¿Email válido?
  - ¿Nombre no vacío?
  - ¿Rol válido?
    ↓
Si OK: Llama api-client.js
    ↓
api-client.js:
  - Agrega token de autenticación
  - Envía POST a /api/usuarios/create
    ↓
Backend (Supabase Functions):
  - Valida permiso del usuario
  - Crea nuevo usuario en tabla
  - Asigna rol
    ↓
Supabase RLS:
  - Valida que solo admin pueda crear
  - Inserta registro
    ↓
Respuesta: {"success": true, "usuario": {...}}
    ↓
usuarios.js recibe respuesta
    ↓
Actualiza tabla en UI
    ↓
Muestra mensaje "Usuario creado"
```

**Archivos involucrados:**
- `pages/usuarios.html` - Formulario
- `js/usuarios.js` - Lógica
- `js/api-client.js` - HTTP requests
- `js/permissions-helpers.js` - Validación
- Supabase BD - Almacenamiento

---

### 4️⃣ API - Cómo Funcionan

**Todas las APIs pasan por `api-client.js`:**

```javascript
// Ejemplo: Crear usuario
const response = await api.post('/usuarios/create', {
  email: 'nuevo@cfe.mx',
  nombre: 'Juan',
  rol: 'programador'
});

// Internamente api-client.js:
// 1. Obtiene token de sessionStorage
// 2. Agrega header: Authorization: Bearer {token}
// 3. Valida permiso con permissions-helpers.js
// 4. Envía a Supabase/Backend
// 5. Procesa respuesta
// 6. Si error: Maneja y devuelve
```

**Ventajas:**
- ✅ Token se agrega automáticamente
- ✅ Manejo centralizado de errores
- ✅ Validación de permisos antes de enviar
- ✅ Logging automático

---

### 5️⃣ Sesión - Dónde Se Almacena

```
Navegador:

┌─ sessionStorage (se borra al cerrar pestaña)
│  ├─ userUI: {id, email, nombre, rol, permisos}
│  └─ supabase.auth.token (token JWT)
│
└─ Supabase (servidor)
   └─ Tabla auth.users: {email, password_hash, ...}
```

**Flujo:**

1. Usuario hace login
2. Supabase devuelve token + datos
3. auth-guard.js guarda en sessionStorage
4. Al cerrar navegador: sessionStorage se borra
5. Al abrir de nuevo: auth-guard.js pide nuevo login

**Esto es seguro porque:**
- ✅ El token expira (por defecto 1 hora)
- ✅ No se guarda en localStorage (menos seguro)
- ✅ Se borra al cerrar navegador
- ✅ Se transmite por HTTPS

---

## 📊 ESTADO DEL PROYECTO

### ✅ COMPLETADO - 100%

```
Módulo de Usuarios
├─ ✅ Crear usuarios
├─ ✅ Editar usuarios
├─ ✅ Cambiar rol
├─ ✅ Activar/Desactivar
├─ ✅ Búsqueda y filtros
├─ ✅ Exportar datos
└─ ✅ Documentación completa

Sistema de Permisos
├─ ✅ 7 roles implementados
├─ ✅ Permisos granulares
├─ ✅ 3 capas de validación
├─ ✅ RLS en Supabase
└─ ✅ Documentación completa

Autenticación
├─ ✅ Login seguro
├─ ✅ Logout sin loops
├─ ✅ Sesiones válidas
├─ ✅ Token management
└─ ✅ Documentación completa

Documentación
├─ ✅ 28 documentos completos
├─ ✅ 5000+ líneas de documentación
├─ ✅ Guías por rol
├─ ✅ Ejemplos de código
└─ ✅ Troubleshooting
```

### 🔄 EN DESARROLLO

```
Módulos de Auditoría
├─ 🔄 Formularios dinámicos
├─ 🔄 Validación de datos
├─ 🔄 Almacenamiento
└─ 🔄 Reportes

Dashboard
├─ 🔄 Gráficos
├─ 🔄 Estadísticas
├─ 🔄 KPIs
└─ 🔄 Filtros

Sistema de Compromisos
├─ 🔄 Creación
├─ 🔄 Seguimiento
├─ 🔄 Reportes
└─ 🔄 Notificaciones
```

---

## 🛠️ DESARROLLO LOCAL

### Requisitos

```
✅ Navegador moderno (Chrome, Firefox, Edge, Safari)
✅ Conexión a internet (para Supabase)
✅ Editor de código (VS Code recomendado)
❌ NO necesitas Node.js/npm (es Vanilla JS)
❌ NO necesitas build tools (sin webpack/bundlers)
```

### Instalación

**Opción 1 - Simple (Recomendado):**

```
1. Descargar proyecto
2. Crear archivo .env en raíz:
   SUPABASE_URL=https://[tu-proyecto].supabase.co
   SUPABASE_KEY=eyJ...
3. Abrir index.html en navegador
4. ¡Listo! Accede a http://localhost:5500 (si usas Live Server)
```

**Opción 2 - Con servidor local:**

```
1. En carpeta del proyecto:
   node js/node-web-server/server.js
2. Accede a: http://localhost:3000
3. Accede a: index.html
```

### Variables de Entorno (.env)

```
# REQUERIDAS:
SUPABASE_URL=https://[tu-proyecto].supabase.co
SUPABASE_KEY=eyJ...

# OPCIONALES:
APP_ENV=development|production
DEBUG=true|false
```

**❌ IMPORTANTE:**
- NO subir `.env` a Git (está en .gitignore)
- NO compartir SUPABASE_KEY por email
- Para producción: Usar variables de entorno del servidor

---

## 🧪 TESTING

### Tests Automatizados

**Módulo de Usuarios:**

1. Abre `/pages/usuarios.html`
2. Consola (F12)
3. Pega:
```javascript
// Copiar contenido de: scripts/usuarios-validation-script.js
```

**Autenticación:**

1. Abre cualquier página
2. Consola (F12)
3. Pega:
```javascript
// Copiar contenido de: scripts/validate-logout-fix.js
```

---

### Tests Manuales

**Crear Usuario:**

1. Login como admin
2. Ir a `/pages/usuarios.html`
3. Click "Nuevo Usuario"
4. Llenar formulario
5. Guardar
6. ✅ Usuario debe aparecer en lista

**Cambiar Rol:**

1. En usuarios, buscar usuario
2. Click "Editar"
3. Cambiar rol
4. Guardar
5. ✅ Rol debe actualizarse

**Logout:**

1. Click "Salir" (logout)
2. Debe ir a login sin errors
3. ✅ Puede login de nuevo inmediatamente

---

## 📞 SOLUCIÓN DE PROBLEMAS

### ❌ "Error: No puedo login"

**Pasos:**

1. ¿Email correcto? → Revisa credenciales
2. ¿Cuenta existe? → Admin debe crear usuario primero
3. Ver: [docs/sistema/README-LOGOUT-FIX.md](docs/sistema/README-LOGOUT-FIX.md)
4. En consola:
```javascript
console.log(await window.getSupabaseSession());
```

---

### ❌ "No veo botones de crear/editar"

**Pasos:**

1. Probablemente es permiso
2. En consola:
```javascript
console.log(window.currentUser); // Ver rol actual
```
3. Si no eres admin, no puedes crear usuarios
4. Ver: [docs/sistema/README-PERMISOS.md](docs/sistema/README-PERMISOS.md)

---

### ❌ "Queda en loop de logout"

**Pasos:**

1. Limpiar sessionStorage:
```javascript
sessionStorage.clear();
location.reload();
```
2. Login de nuevo
3. Si persiste: Ver [docs/sistema/README-LOGOUT-FIX.md](docs/sistema/README-LOGOUT-FIX.md)

---

### ❌ "API devuelve 403 Forbidden"

**Significa:** No tienes permiso

1. Verificar rol en BD
2. Verificar RLS en Supabase
3. Ver: [docs/sistema/README-PERMISOS.md](docs/sistema/README-PERMISOS.md)

---

### ❌ "Código no se actualiza"

**Hard refresh:**

```
Windows: Ctrl+Shift+R
Mac: Cmd+Shift+R
```

O limpiar caché:

```javascript
// En consola
localStorage.clear();
sessionStorage.clear();
// Luego F5 para recargar
```

---

## 👥 CONTRIBUIR AL PROYECTO

### Antes de cambiar código:

1. ✅ Lee documentación relevante en `docs/`
2. ✅ Entiende qué hace el código
3. ✅ Prueba en desarrollo
4. ✅ Ejecuta tests
5. ✅ Documenta cambios

### Workflow de cambios:

```
1. Lee documentación
2. Entiende el flujo actual
3. Haz el cambio en tu rama
4. Prueba localmente
5. Ejecuta scripts de validación
6. Documenta qué cambió
7. Commit + Push
8. Solicita review
```

### Convenciones de código:

- Nombrar variables en inglés: `const userName = ...`
- Comentar código complejo
- No usar variables globales (excepto window.*)
- Usar async/await (no callbacks)
- Validar input siempre

---

## 📚 DOCUMENTACIÓN ADICIONAL

**Ver [docs/README.md](docs/README.md) para:**

- Índice completo de documentación
- Tablas de navegación por rol
- Rutas de lectura recomendadas
- Búsqueda de documentos específicos

**Por tema:**

- **Usuarios:** [docs/usuarios/](docs/usuarios/)
- **Permisos:** [docs/sistema/README-PERMISOS.md](docs/sistema/README-PERMISOS.md)
- **Autenticación:** [docs/sistema/README-LOGOUT-FIX.md](docs/sistema/README-LOGOUT-FIX.md)
- **Deployment:** [docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md](docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md)

---

## 🔧 TECNOLOGÍAS

```
Frontend:
├─ HTML5
├─ CSS3 (con Bootstrap 5.3.0)
├─ Vanilla JavaScript (Sin frameworks)
└─ Responsive design

Backend:
├─ Supabase (PostgreSQL)
├─ Supabase Auth
├─ Row-Level Security (RLS)
└─ Supabase Storage

DevOps:
├─ HTTPS (obligatorio en prod)
├─ Sessions con Supabase
├─ Environment variables
└─ No necesita build tools
```

---

## 📞 CONTACTO Y SOPORTE

Si después de leer todo tienes preguntas:

1. **Busca en docs/README.md** - Índice centralizado
2. **Ejecuta scripts de validación** - scripts/
3. **Revisa la consola (F12)** - Errores claros ahí
4. **Lee documento específico** - Según tu tema

---

## 📄 INFORMACIÓN DEL PROYECTO

```
📦 Proyecto:     CFE INSIGHT
🎯 Propósito:    Sistema de Auditoría y Gestión
📍 Ubicación:    App/
🌐 Tipo:         Multi-Page Application (MPA)
⚙️ Stack:        Vanilla JS + Bootstrap + Supabase
📝 Versión:      1.0
📅 Último update: Enero 2026
✅ Status:       En Producción
```

---

## 📋 MAPA MENTAL RÁPIDO

```
Si necesito...              Ir a...
─────────────────────────────────────────────────────────
Empezar                     docs/usuarios/LEEME-PRIMERO.md
Entender estructura         Este README (leyendo arriba ↑)
Entender permisos           docs/sistema/README-PERMISOS.md
Saber qué no tocar          Sección "SEGURIDAD" arriba ↑
Agregar usuario             pages/usuarios.html
Cambiar rol                 pages/usuarios.html
Desplegar                   docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md
Testear                     scripts/usuarios-validation-script.js
Debuggear                   Consola (F12) + documentos
Compilar código             NO SE COMPILA - Es Vanilla JS
Instalar dependencias       NO NECESITA - Es Vanilla JS
Entender seguridad          docs/sistema/
Ver todos los docs          docs/README.md
```

---

**🎉 ¡Bienvenido a CFE INSIGHT! 🎉**

Ahora tienes todo lo que necesitas para trabajar con el sistema.

**Próximo paso:** 📖 Lee [docs/usuarios/LEEME-PRIMERO.md](docs/usuarios/LEEME-PRIMERO.md) (2 min)

---

**Versión:** 1.0  
**Última actualización:** 15 de Enero 2026  
**Status:** ✅ Producción Activa
