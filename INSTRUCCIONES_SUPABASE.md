# 📋 Instrucciones para Configurar Base de Datos en Supabase

## CFE INSIGHT - Sistema de Auditoría

---

## 🎯 Objetivo
Crear y configurar todas las tablas necesarias en Supabase para que la aplicación CFE INSIGHT funcione correctamente.

---

## ✅ Estado Actual (Según Pruebas)

### Conexión
- ✅ **Conexión exitosa** a Supabase
- URL: `https://ffefbeamhilqpvwutzri.supabase.co`

### Tablas Existentes
- ✅ **users** - Existe (2 registros)
  - ⚠️ **FALTA**: Columna `groups` (array de enteros)

### Tablas Faltantes
- ❌ **entities** - No existe
- ❌ **commitments** - No existe
- ❌ **work_groups** - No existe
- ❌ **records** - No existe
- ❌ **audit_forms** - No existe (Formularios de auditoría)
- ❌ **audit_reviews** - No existe (Revisiones de formularios)

---

## 🚀 Pasos para Configurar

### Paso 1: Acceder a Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: **CFE INSIGHT**

### Paso 2: Abrir el SQL Editor

1. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
2. Haz clic en **"New query"** (Nueva consulta)

### Paso 3: Ejecutar el Script SQL

1. Abre el archivo `setup-database.sql` que se encuentra en la raíz del proyecto
2. **Copia TODO el contenido** del archivo
3. **Pega** el contenido en el SQL Editor de Supabase
4. Haz clic en el botón **"Run"** (Ejecutar) o presiona `Ctrl + Enter`

### Paso 4: Verificar la Ejecución

Deberías ver mensajes de éxito en la parte inferior del editor. Si hay errores:
- Lee el mensaje de error
- Verifica que no haya tablas duplicadas
- Intenta ejecutar el script por secciones

### Paso 5: Verificar las Tablas Creadas

1. En el menú lateral, haz clic en **"Table Editor"**
2. Deberías ver las siguientes tablas:
   - ✅ users
   - ✅ entities
   - ✅ commitments
   - ✅ work_groups
   - ✅ records

### Paso 6: Ejecutar Pruebas

Vuelve a tu terminal y ejecuta:

```bash
node test-supabase.js
```

Esto generará un nuevo reporte HTML con el estado actualizado.

---

## 📊 Estructura de las Tablas

### 1. **users** (Usuarios del Sistema)
```sql
- id: SERIAL PRIMARY KEY
- username: VARCHAR(50) UNIQUE NOT NULL
- password: VARCHAR(255) NOT NULL
- name: VARCHAR(100) NOT NULL
- email: VARCHAR(100) UNIQUE NOT NULL
- phone: VARCHAR(20)
- role: VARCHAR(50) NOT NULL
- groups: INTEGER[] (NUEVO)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Roles disponibles:**
- `cliente` - Usuario básico
- `auditor` - Auditor estándar
- `auditor_senior` - Auditor senior con permisos extendidos
- `supervisor` - Supervisor con permisos de revisión de documentos
- `socio` - Socio con permisos de revisión final (opcional)
- `administrador` - Administrador del sistema
- `programador` - Desarrollador con acceso completo

### 2. **entities** (Entidades Auditadas)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(200) NOT NULL
- entity_id: VARCHAR(50) UNIQUE NOT NULL
- description: TEXT
- status: VARCHAR(50) DEFAULT 'activo'
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 3. **commitments** (Compromisos/Auditorías)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(200) NOT NULL
- description: TEXT
- start_date: DATE NOT NULL
- end_date: DATE NOT NULL
- status: VARCHAR(50) NOT NULL
- entity_id: INTEGER (FK a entities)
- created_by: VARCHAR(50)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

**Estados disponibles:**
- `activo` - En progreso
- `pendiente` - Por iniciar
- `completado` - Finalizado

### 4. **work_groups** (Equipos de Trabajo)
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(100) NOT NULL
- description: TEXT
- members: VARCHAR(50)[] (array de usernames)
- commitments: INTEGER[] (array de IDs de compromisos)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 5. **records** (Registros de Acciones/Logs)
```sql
- id: SERIAL PRIMARY KEY
- username: VARCHAR(50) NOT NULL
- action: VARCHAR(100) NOT NULL
- entity: VARCHAR(200)
- commitment: VARCHAR(200)
- details: JSONB
- timestamp: TIMESTAMP
```

### 6. **audit_forms** (Formularios de Auditoría)
```sql
- id: SERIAL PRIMARY KEY
- form_type: VARCHAR(50) NOT NULL
- user_id: VARCHAR(50) NOT NULL
- data: JSONB NOT NULL
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()
```

**Tipos de formulario disponibles:**
- `a100` - Planificación de la auditoría
- `a101` - Evaluación de riesgos
- `a200` - Pruebas de controles
- `a201` - Pruebas sustantivas
- `a300` - Conclusiones de auditoría
- `a302` - Comunicación de hallazgos
- `a400` - Informe de auditoría
- `a401` - Carta de representación

### 7. **audit_reviews** (Revisiones de Formularios)
```sql
- id: SERIAL PRIMARY KEY
- form_id: INTEGER NOT NULL (FK a audit_forms)
- question_id: VARCHAR(100) NOT NULL
- reviewed: BOOLEAN DEFAULT FALSE
- reviewed_by: VARCHAR(50)
- reviewed_at: TIMESTAMP
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()
```

---

## 🔒 Seguridad (Row Level Security - RLS)

El script configura automáticamente políticas de seguridad:

### Políticas de `users`:
- Los usuarios pueden ver su propia información
- Administradores y programadores pueden ver/editar todos los usuarios

### Políticas de `entities`:
- Todos pueden ver entidades
- Solo administradores, auditores senior y programadores pueden modificar

### Políticas de `commitments`:
- Todos pueden ver compromisos
- Solo administradores, auditores senior y programadores pueden modificar

### Políticas de `work_groups`:
- Todos pueden ver grupos
- Solo administradores y programadores pueden modificar

### Políticas de `records`:
- Todos pueden crear registros
- Los usuarios solo ven sus propios registros
- Administradores, auditores senior y programadores ven todos

---

## 📝 Datos de Ejemplo

El script incluye datos de ejemplo que se insertarán automáticamente:

### Entidades:
1. Departamento de Finanzas (FIN-001)
2. Departamento de RRHH (RRHH-001)
3. Departamento de TI (TI-001)

### Compromisos:
1. Auditoría Financiera Q1 2025
2. Evaluación de Desempeño
3. Actualización de Sistemas

### Equipos de Trabajo:
1. Equipo de Auditoría Financiera
2. Equipo de RRHH
3. Equipo de TI

**Nota:** Si no deseas estos datos de ejemplo, comenta la sección 8 del script SQL antes de ejecutarlo.

---

## 🔧 Características Adicionales

### Triggers Automáticos
El script crea triggers que actualizan automáticamente la columna `updated_at` cuando se modifica un registro.

### Índices
Se crean índices en columnas frecuentemente consultadas para mejorar el rendimiento:
- Índices en `entity_id`, `status`, `username`, `action`, etc.
- Índice GIN en `details` (JSONB) para búsquedas rápidas

---

## ❓ Solución de Problemas

### Error: "relation already exists"
**Solución:** La tabla ya existe. Puedes:
1. Eliminar la tabla existente primero (⚠️ perderás los datos)
2. O comentar esa sección del script

### Error: "column already exists"
**Solución:** La columna ya existe. El script usa `IF NOT EXISTS` para evitar esto, pero si persiste, comenta esa línea.

### Error: "permission denied"
**Solución:** Asegúrate de estar usando el `SUPABASE_SERVICE_KEY` (service_role) y no el `SUPABASE_ANON_KEY`.

### Las políticas RLS no funcionan
**Solución:** 
1. Verifica que RLS esté habilitado en cada tabla
2. Revisa que las políticas estén correctamente configuradas
3. Usa el service_role key para operaciones administrativas

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa el archivo `test-results.html` generado por las pruebas
2. Verifica los logs en la consola de Supabase
3. Consulta la documentación de Supabase: [https://supabase.com/docs](https://supabase.com/docs)

---

## ✅ Checklist Final

Antes de continuar con la migración de la aplicación, verifica:

- [ ] Todas las 7 tablas existen en Supabase (users, entities, commitments, work_groups, records, audit_forms, audit_reviews)
- [ ] La tabla `users` tiene la columna `groups`
- [ ] Las pruebas (`node test-supabase.js`) pasan exitosamente
- [ ] RLS está habilitado en todas las tablas
- [ ] Los datos de ejemplo se insertaron correctamente (opcional)
- [ ] El reporte HTML muestra "✓ Base de Datos Lista"

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu base de datos estará lista para:
1. Migrar la aplicación web de localStorage a Supabase
2. Implementar autenticación real
3. Sincronizar datos entre usuarios
4. Escalar la aplicación

**Siguiente paso:** Ejecutar `node test-supabase.js` para confirmar que todo está correcto.
