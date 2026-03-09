# 📋 README - Instrucciones para IA de Supabase: Modificar y Arreglar Base de Datos CFE INSIGHT

## 🤖 Propósito de este Documento

Este documento proporciona instrucciones **detalladas y claras** para que la IA de Supabase pueda modificar y arreglar automáticamente la base de datos del proyecto CFE INSIGHT. Las instrucciones están diseñadas para ser ejecutadas paso a paso por una IA, con verificaciones en cada etapa.

---

## 🎯 Objetivo Final

Configurar completamente la base de datos de Supabase para que la aplicación CFE INSIGHT funcione correctamente, incluyendo:

- ✅ Todas las tablas necesarias creadas
- ✅ Columnas faltantes agregadas
- ✅ Índices de rendimiento configurados
- ✅ Políticas de seguridad (RLS) implementadas
- ✅ Triggers automáticos para timestamps
- ✅ Datos de ejemplo insertados
- ✅ Verificación completa de funcionalidad

---

## 📊 Estado Actual de la Base de Datos (Antes de Ejecutar)

### ✅ Lo que YA existe:
- **Tabla `users`**: Existe con 2 registros
- **Conexión a Supabase**: Funcionando correctamente
- **URL del proyecto**: `https://ffefbeamhilqpvwutzri.supabase.co`

### ❌ Lo que FALTA o está MAL:
- **Columna `groups`** en tabla `users` (tipo INTEGER[])
- **Tabla `entities`**: No existe
- **Tabla `commitments`**: No existe
- **Tabla `work_groups`**: No existe
- **Tabla `records`**: No existe
- **Políticas RLS**: No configuradas
- **Triggers automáticos**: No existen
- **Índices de rendimiento**: No existen

---

## 🚀 INSTRUCCIONES PASO A PASO PARA LA IA

### PASO 1: Verificar Conexión y Estado Inicial

**Acción:** Ejecuta una consulta SQL para verificar el estado actual:

```sql
-- Verificar tablas existentes
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN ('users', 'entities', 'commitments', 'work_groups', 'records')
ORDER BY table_name;

-- Verificar estructura de users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Verificación Esperada:**
- Solo `users` debe aparecer en la primera consulta
- En la segunda consulta, NO debe aparecer la columna `groups`

---

### PASO 2: Ejecutar Script de Configuración Principal

**Archivo a usar:** `setup-database.sql` (ubicado en la raíz del proyecto)

**Acción:** Copia TODO el contenido del archivo `setup-database.sql` y ejecútalo completo en el SQL Editor de Supabase.

**Contenido clave del script que ejecutarás:**

1. **Agregar columna `groups` a `users`** (si no existe)
2. **Crear tabla `entities`** con índices
3. **Crear tabla `commitments`** con índices y foreign key
4. **Crear tabla `work_groups`** con índices
5. **Crear tabla `records`** con índices GIN para JSONB
6. **Crear función y triggers** para `updated_at` automático
7. **Insertar datos de ejemplo** (3 entidades, 3 compromisos, 3 grupos)
8. **Configurar RLS** en todas las tablas
9. **Crear políticas de seguridad** detalladas

**Verificación después de ejecutar:**
```sql
-- Verificar que todas las tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
AND table_name IN ('users', 'entities', 'commitments', 'work_groups', 'records');

-- Debe retornar 5 filas: users, entities, commitments, work_groups, records
```

---

### PASO 3: Verificar Estructura de Tablas Creadas

**Acción:** Ejecuta consultas de verificación para cada tabla:

```sql
-- Verificar users tiene la columna groups
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'groups';

-- Verificar entities
SELECT COUNT(*) as entities_count FROM entities;
-- Debe ser >= 3 (datos de ejemplo)

-- Verificar commitments
SELECT COUNT(*) as commitments_count FROM commitments;
-- Debe ser >= 3 (datos de ejemplo)

-- Verificar work_groups
SELECT COUNT(*) as work_groups_count FROM work_groups;
-- Debe ser >= 3 (datos de ejemplo)

-- Verificar records (puede estar vacío inicialmente)
SELECT COUNT(*) as records_count FROM records;
```

---

### PASO 4: Verificar Políticas RLS

**Acción:** Verifica que RLS esté habilitado:

```sql
-- Verificar RLS habilitado en todas las tablas
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'entities', 'commitments', 'work_groups', 'records');

-- Todas deben tener rowsecurity = 't' (true)
```

---

### PASO 5: Verificar Triggers Automáticos

**Acción:** Prueba que los triggers funcionan:

```sql
-- Insertar un registro de prueba en entities
INSERT INTO entities (name, entity_id, description)
VALUES ('Prueba Trigger', 'TEST-001', 'Entidad de prueba');

-- Verificar que updated_at se actualizó automáticamente
SELECT name, entity_id, created_at, updated_at
FROM entities WHERE entity_id = 'TEST-001';

-- Los campos created_at y updated_at deben tener timestamps
```

---

### PASO 6: Verificar Índices de Rendimiento

**Acción:** Verifica que los índices se crearon:

```sql
-- Verificar índices creados
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'entities', 'commitments', 'work_groups', 'records')
ORDER BY tablename, indexname;
```

**Índices esperados:**
- `idx_entities_entity_id`, `idx_entities_status`
- `idx_commitments_status`, `idx_commitments_entity_id`, `idx_commitments_dates`
- `idx_work_groups_name`
- `idx_records_username`, `idx_records_action`, `idx_records_timestamp`, `idx_records_details`

---

### PASO 7: Probar Inserciones y Relaciones

**Acción:** Ejecuta pruebas de integridad:

```sql
-- Probar foreign key constraint
INSERT INTO commitments (name, description, start_date, end_date, status, entity_id, created_by)
VALUES ('Compromiso de Prueba', 'Descripción', '2025-01-01', '2025-12-31', 'activo', 999, 'admin');
-- DEBE FALLAR porque entity_id=999 no existe

-- Probar inserción correcta
INSERT INTO commitments (name, description, start_date, end_date, status, entity_id, created_by)
VALUES ('Compromiso de Prueba', 'Descripción', '2025-01-01', '2025-12-31', 'activo', 1, 'admin');
-- DEBE FUNCIONAR

-- Verificar inserción
SELECT c.name, e.name as entity_name
FROM commitments c
JOIN entities e ON c.entity_id = e.id
WHERE c.name = 'Compromiso de Prueba';
```

---

### PASO 8: Limpiar Datos de Prueba

**Acción:** Elimina los registros de prueba:

```sql
-- Eliminar entidad de prueba
DELETE FROM entities WHERE entity_id = 'TEST-001';

-- Eliminar compromiso de prueba
DELETE FROM commitments WHERE name = 'Compromiso de Prueba';
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS COMUNES

### Problema: "relation already exists"
**Solución:** Las tablas ya existen. Verifica cuáles faltan realmente:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

### Problema: "column already exists"
**Solución:** La columna `groups` ya existe. El script usa `IF NOT EXISTS`, pero si falla, ejecuta solo:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS groups INTEGER[] DEFAULT '{}';
```

### Problema: Error en foreign key
**Solución:** Asegúrate de que las entidades existen antes de crear compromisos. Ejecuta primero la sección 2 del script.

### Problema: Políticas RLS no se crean
**Solución:** Verifica permisos. Asegúrate de usar la `SUPABASE_SERVICE_KEY` (service_role).

---

## ✅ CHECKLIST FINAL DE VERIFICACIÓN

Después de completar todos los pasos, verifica:

- [ ] **5 tablas existen**: users, entities, commitments, work_groups, records
- [ ] **Columna groups** en users (tipo INTEGER[])
- [ ] **RLS habilitado** en todas las tablas
- [ ] **Triggers funcionando** (updated_at automático)
- [ ] **Índices creados** (al menos 10 índices)
- [ ] **Datos de ejemplo insertados** (3+ entidades, 3+ compromisos, 3+ grupos)
- [ ] **Foreign keys funcionando** (commitments.entity_id → entities.id)
- [ ] **Políticas de seguridad activas** (usuarios solo ven sus datos)

---

## 🧪 PRUEBAS DE INTEGRACIÓN

### Ejecutar Pruebas Automáticas

Después de configurar la base de datos, ejecuta las pruebas del proyecto:

```bash
# En la terminal del proyecto CFE INSIGHT
node test-supabase.js
```

Esto generará un archivo `test-results.html` con el estado completo.

### Verificar desde la Aplicación

1. Inicia el servidor backend: `node server.js`
2. Abre la aplicación en el navegador
3. Intenta hacer login con credenciales existentes
4. Verifica que se carguen entidades, compromisos y grupos

---

## 📞 CONTACTO Y SOPORTE

Si encuentras errores que no se resuelven con estas instrucciones:

1. **Revisa logs de Supabase** en el dashboard
2. **Verifica el archivo `test-results.html`** generado por las pruebas
3. **Consulta la documentación oficial** de Supabase
4. **Reporta el error específico** con el mensaje completo

---

## 🎉 ÉXITO

Cuando completes todas las verificaciones, la base de datos estará **100% lista** para:

- ✅ Autenticación de usuarios
- ✅ Gestión de entidades auditadas
- ✅ Creación y seguimiento de compromisos
- ✅ Organización en equipos de trabajo
- ✅ Registro de actividades (auditoría)
- ✅ Sincronización multi-usuario
- ✅ Escalabilidad en la nube

**¡La aplicación CFE INSIGHT puede migrar completamente de localStorage a Supabase!**

---

*Documento creado específicamente para IA de Supabase - Versión 1.0 - CFE INSIGHT*
