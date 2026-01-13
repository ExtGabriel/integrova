# 🎯 CFE INSIGHT - Sistema de Auditoría

## 📊 Sistema completo de gestión y auditoría para CFE

---

## 🚀 INICIO RÁPIDO

### Si es tu primera vez aquí:
1. 📖 Lee: [`docs/usuarios/LEEME-PRIMERO.md`](docs/usuarios/LEEME-PRIMERO.md) (2 min)
2. 🔍 Explora: [`docs/README.md`](docs/README.md) - Índice de toda la documentación

### Si necesitas usar el sistema:
- 🌐 Abre: `index.html` en tu navegador
- 🔐 Login: Ingresa tus credenciales
- 📊 Dashboard: Accede a tus módulos según permisos

---

## 📁 ESTRUCTURA DEL PROYECTO

```
App/
├── 🏠 index.html ................. Página principal
├── 📄 .env ....................... Configuración (no commitear)
│
├── 📚 docs/ ...................... TODA LA DOCUMENTACIÓN
│   ├── usuarios/ ................. Módulo de usuarios
│   ├── sistema/ .................. Sistema general
│   └── guias/ .................... Guías rápidas
│
├── 💻 js/ ........................ Código JavaScript (producción)
│   ├── api-client.js ............. API centralizada
│   ├── auth-guard.js ............. Autenticación
│   ├── permissions-helpers.js .... Permisos
│   ├── usuarios.js ............... Módulo usuarios
│   └── ...
│
├── 🧪 scripts/ ................... Utilidades y testing
│   ├── usuarios-validation-script.js
│   ├── validate-logout-fix.js
│   └── ...
│
├── 🎨 css/ ....................... Estilos
├── 📄 pages/ ..................... Páginas HTML
├── 🖼️ assets/ ................... Recursos estáticos
├── 📋 audit/ ..................... Formularios de auditoría
└── 🗄️ supabase-migrations/ ...... Migraciones DB
```

---

## 🎯 MÓDULOS PRINCIPALES

### 1. **Sistema de Usuarios** ✅ COMPLETO
- Gestión de usuarios y roles
- Control de acceso basado en permisos
- Activar/desactivar usuarios
- Cambio de roles (admin/programador)

**Documentación:** [`docs/usuarios/`](docs/usuarios/)

### 2. **Sistema de Permisos** ✅ COMPLETO
- 7 roles: admin, programador, socio, supervisor, auditor_senior, auditor, cliente
- Permisos granulares por módulo
- 3 capas de seguridad (UI + API + RLS)

**Documentación:** [`docs/sistema/README-PERMISOS.md`](docs/sistema/README-PERMISOS.md)

### 3. **Autenticación** ✅ COMPLETO
- Login/Logout seguro
- Protección contra loops
- Sesiones con Supabase

**Documentación:** [`docs/sistema/README-LOGOUT-FIX.md`](docs/sistema/README-LOGOUT-FIX.md)

### 4. **Auditoría**
- Formularios dinámicos
- Compromisos
- Entidades
- Registros

---

## 🔧 TECNOLOGÍAS

- **Frontend:** Vanilla JavaScript (sin frameworks)
- **UI:** Bootstrap 5.3.0
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Security:** Row-Level Security (RLS)
- **Architecture:** Multi-Page Application (MPA)

---

## 📖 DOCUMENTACIÓN

### Por Tema
- 👥 **Módulo Usuarios:** [`docs/usuarios/`](docs/usuarios/)
- 🔐 **Sistema General:** [`docs/sistema/`](docs/sistema/)
- 📚 **Guías Rápidas:** [`docs/guias/`](docs/guias/)

### Por Tipo
- 🚀 **Inicio Rápido:** [`docs/usuarios/LEEME-PRIMERO.md`](docs/usuarios/LEEME-PRIMERO.md)
- 🔧 **Deployment:** [`docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md`](docs/usuarios/USUARIOS-DEPLOYMENT-GUIDE.md)
- 🧪 **Testing:** [`docs/usuarios/MODULO-USUARIOS-VERIFICACION.md`](docs/usuarios/MODULO-USUARIOS-VERIFICACION.md)

---

## 🛠️ DESARROLLO

### Requisitos
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conexión a internet (Supabase)
- Editor de código (VS Code recomendado)

### Instalación
1. Clonar/descargar proyecto
2. Configurar `.env` con credenciales Supabase
3. Abrir `index.html` en navegador
4. ¡Listo! No requiere build

### Testing
- Scripts disponibles en `scripts/`
- Ejecutar en consola del navegador (F12)
- Ver [`docs/usuarios/`](docs/usuarios/) para guías

---

## 🔒 SEGURIDAD

- ✅ 3 capas de validación (UI + API + Database)
- ✅ Row-Level Security en Supabase
- ✅ Tokens seguros (sessionStorage)
- ✅ Sin contraseñas en código
- ✅ HTTPS obligatorio en producción

---

## 📞 SOPORTE

### Problemas comunes
1. **Error de login:** Ver [`docs/sistema/README-LOGOUT-FIX.md`](docs/sistema/README-LOGOUT-FIX.md)
2. **Sin permisos:** Ver [`docs/sistema/README-PERMISOS.md`](docs/sistema/README-PERMISOS.md)
3. **Módulo usuarios:** Ver [`docs/usuarios/QUICK-START-USUARIOS.md`](docs/usuarios/QUICK-START-USUARIOS.md)

### Debugging
- Scripts de validación en `scripts/`
- Debug object: `window.__usuariosDebug` (en módulo usuarios)
- DevTools (F12) → Console/Network

---

## 📋 ESTADO DEL PROYECTO

```
✅ Sistema de usuarios ........... 100% completo
✅ Sistema de permisos ........... 100% completo
✅ Autenticación ................. 100% completo
✅ Documentación ................. 100% completa (3000+ líneas)
🔄 Módulos de auditoría .......... En desarrollo
🔄 Dashboard ..................... En desarrollo
```

---

## 👥 CONTRIBUIR

1. Leer documentación en `docs/`
2. Seguir convenciones de código existente
3. Probar con scripts de validación
4. Documentar cambios

---

## 📄 LICENCIA

© 2026 CFE INSIGHT - Todos los derechos reservados

---

**Versión:** 1.0  
**Última actualización:** Enero 2026  
**Status:** ✅ Producción
