# API de Entidades - Documentación Completa

## Reglas de Procesamiento Implementadas (1-20)

### Principios Fundamentales

1. **Prioridad de fuentes**: `columnas > metadata`
2. **Parseo y validación**: metadata debe ser JSON válido
3. **Normalización**: trim, lowercase (email), sanitización de caracteres
4. **Validación estricta**: email, phone, relationship_type
5. **COALESCE-style**: no sobrescribir valores existentes por defecto
6. **Construcción de partialMeta**: sincronización automática
7. **Merge seguro**: preservar claves adicionales en metadata
8. **Operación atómica**: INSERT/UPDATE en una sola transacción
9. **Manejo de errores**: 400 para validación, 500 para DB
10. **Respeto a RLS**: service_role para mantenimiento

---

## Endpoints

### 1. Crear Entidad

**Endpoint**: `POST /api/entities`

**Descripción**: Crea una nueva entidad en el sistema con validación completa.

#### Payload Correcto - Ejemplo Básico

```json
{
  "name": "Dirección General de Finanzas",
  "entity_id": "DGF-001",
  "description": "Área responsable de la gestión financiera",
  "email": "contacto@dgf.com",
  "phone": "+52 55 1234 5678",
  "country": "México",
  "address": "Av. Principal 123, Col. Centro",
  "encargado": "Juan Pérez",
  "is_group": false,
  "relationship_type": "none",
  "status": "activa"
}
```

#### Payload con Metadata Adicional

```json
{
  "name": "Gerencia de Producción",
  "entity_id": "GP-002",
  "email": "produccion@empresa.com",
  "phone": "+52 55 8765 4321",
  "country": "México",
  "is_group": false,
  "relationship_type": "none",
  "metadata": {
    "departamento": "Operaciones",
    "nivel": 2,
    "zona": "Norte",
    "custom_field": "valor personalizado"
  }
}
```

#### Payload con Grupo y Relaciones

```json
{
  "name": "Corporativo Nacional",
  "entity_id": "CORP-001",
  "email": "corporativo@empresa.com",
  "phone": "+52 55 0000 0000",
  "is_group": true,
  "relationship_type": "parent",
  "metadata": {
    "parent_id": null,
    "subsidiarias": ["SUB-001", "SUB-002"],
    "tipo_grupo": "holding"
  }
}
```

#### Respuesta Exitosa (201)

```json
{
  "success": true,
  "message": "Entidad creada exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Dirección General de Finanzas",
    "entity_id": "DGF-001",
    "description": "Área responsable de la gestión financiera",
    "email": "contacto@dgf.com",
    "phone": "+525512345678",
    "country": "México",
    "address": "Av. Principal 123, Col. Centro",
    "encargado": "Juan Pérez",
    "is_group": false,
    "relationship_type": "none",
    "status": "activa",
    "metadata": {
      "country": "México",
      "address": "Av. Principal 123, Col. Centro",
      "email": "contacto@dgf.com",
      "phone": "+525512345678",
      "encargado": "Juan Pérez",
      "es_grupo": false,
      "relationship_type": "none"
    },
    "created_at": "2024-03-15T10:30:00.000Z",
    "updated_at": "2024-03-15T10:30:00.000Z"
  }
}
```

#### Respuesta con Conflictos Detectados (200)

```json
{
  "success": true,
  "message": "Entidad creada exitosamente",
  "warning": "Se detectaron conflictos entre valores de columnas y metadata. Se priorizaron los valores de columnas.",
  "conflicts": [
    {
      "field": "email",
      "column_value": "contacto@dgf.com",
      "metadata_value": "antiguo@dgf.com",
      "resolution": "Se usó el valor de la columna"
    }
  ],
  "data": { /* ... datos de la entidad ... */ }
}
```

---

### Errores de Validación (400)

#### Error: Campos Requeridos Faltantes

**Payload**:
```json
{
  "description": "Sin nombre ni entity_id"
}
```

**Respuesta (400)**:
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Los datos proporcionados no son válidos",
  "fields": {
    "name": "El nombre es requerido",
    "entity_id": "El ID de entidad es requerido"
  },
  "example": {
    "name": "Dirección General de Finanzas",
    "entity_id": "DGF-001",
    "email": "contacto@dgf.com",
    "phone": "+52 55 1234 5678",
    "country": "México",
    "address": "Av. Principal 123",
    "is_group": false,
    "relationship_type": "none"
  }
}
```

#### Error: Formato de Email Inválido

**Payload**:
```json
{
  "name": "Test Entity",
  "entity_id": "TEST-001",
  "email": "email-invalido",
  "phone": "+52 55 1234 5678"
}
```

**Respuesta (400)**:
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Los datos proporcionados no son válidos",
  "fields": {
    "email": "Formato de email inválido"
  },
  "example": { /* ... */ }
}
```

#### Error: Formato de Teléfono Inválido

**Payload**:
```json
{
  "name": "Test Entity",
  "entity_id": "TEST-001",
  "email": "test@example.com",
  "phone": "123"
}
```

**Respuesta (400)**:
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Los datos proporcionados no son válidos",
  "fields": {
    "phone": "Formato de teléfono inválido (debe tener entre 7 y 20 dígitos)"
  },
  "example": { /* ... */ }
}
```

#### Error: Metadata JSON Inválido

**Payload**:
```json
{
  "name": "Test Entity",
  "entity_id": "TEST-001",
  "email": "test@example.com",
  "phone": "+52 55 1234 5678",
  "metadata": "esto no es JSON válido"
}
```

**Respuesta (400)**:
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Los datos proporcionados no son válidos",
  "fields": {
    "metadata": "metadata debe ser un objeto JSON válido"
  },
  "example": { /* ... */ }
}
```

#### Error: Relationship Type Inválido

**Payload**:
```json
{
  "name": "Test Entity",
  "entity_id": "TEST-001",
  "email": "test@example.com",
  "phone": "+52 55 1234 5678",
  "relationship_type": "invalid_type"
}
```

**Respuesta (400)**:
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Los datos proporcionados no son válidos",
  "fields": {
    "relationship_type": "relationship_type debe ser \"parent\", \"child\" o \"none\""
  },
  "example": { /* ... */ }
}
```

---

### 2. Actualizar Entidad

**Endpoint**: `PUT /api/entities/:id`

**Descripción**: Actualiza una entidad existente. Por defecto usa COALESCE-style (no sobrescribe valores existentes con null).

#### Payload Correcto - Actualización Parcial

```json
{
  "email": "nuevo@dgf.com",
  "phone": "+52 55 9999 8888"
}
```

**Nota**: Solo se actualizan los campos proporcionados. Los demás se mantienen.

#### Payload con Force Overwrite

```json
{
  "email": "nuevo@dgf.com",
  "phone": null,
  "force_overwrite": true
}
```

**Nota**: Con `force_overwrite: true`, el teléfono se establecerá a `null` aunque existiera un valor.

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Entidad actualizada exitosamente",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Dirección General de Finanzas",
    "entity_id": "DGF-001",
    "email": "nuevo@dgf.com",
    "phone": "+525599998888",
    /* ... otros campos ... */
    "updated_at": "2024-03-15T11:45:00.000Z"
  }
}
```

#### Error: Entidad No Encontrada (404)

**Respuesta (404)**:
```json
{
  "success": false,
  "error": "not_found",
  "message": "No se encontró entidad con ID abc-123-invalid"
}
```

---

### Errores de Base de Datos (500)

#### Error Genérico de Base de Datos

**Respuesta (500)**:
```json
{
  "success": false,
  "error": "database_error",
  "message": "Error al guardar la entidad en la base de datos",
  "debug": "duplicate key value violates unique constraint \"entities_entity_id_key\""
}
```

**Nota**: El campo `debug` solo aparece en modo desarrollo (`NODE_ENV=development`).

---

## Normalización Automática

El sistema aplica estas transformaciones automáticamente:

### Email
- **Trim**: `"  email@test.com  "` → `"email@test.com"`
- **Lowercase**: `"Email@Test.COM"` → `"email@test.com"`

### Phone
- **Eliminar espacios**: `"+52 55 1234 5678"` → `"+525512345678"`
- **Eliminar guiones**: `"+52-55-1234-5678"` → `"+525512345678"`
- **Eliminar paréntesis**: `"+52 (55) 1234 5678"` → `"+525512345678"`

### Relationship Type
- **Normalización**: `"PARENT"` → `"parent"`
- **Traducción**: `"padre"` → `"parent"`, `"hijo"` → `"child"`
- **Default**: Si `is_group=false`, siempre se establece a `"none"`

### Is Group
- **Conversión a boolean**: `"true"`, `1`, `"1"` → `true`
- **Conversión a boolean**: `"false"`, `0`, `"0"` → `false`

### Texto
- **Trim**: Se aplica a todos los campos de texto
- **Truncado**: Campos que excedan 1024 caracteres se truncan automáticamente

---

## Sanitización y Límites

| Campo | Longitud Máxima | Acción si se excede |
|-------|-----------------|---------------------|
| `name` | 255 caracteres | Truncar y advertir |
| `entity_id` | 100 caracteres | Truncar y advertir |
| `description` | 1024 caracteres | Truncar y advertir |
| `country` | 100 caracteres | Truncar y advertir |
| `address` | 1024 caracteres | Truncar y advertir |
| `encargado` | 255 caracteres | Truncar y advertir |
| `email` | Sin límite* | Validar formato |
| `phone` | 20 dígitos | Rechazar |

\* El email debe cumplir el formato estándar (máx ~320 caracteres prácticamente)

---

## Flags Especiales

### `force_overwrite`

**Uso**: Forzar la sobrescritura de todos los campos, incluso con valores `null`.

**Ejemplo**:
```json
{
  "email": null,
  "force_overwrite": true
}
```

**Resultado**: El email se establecerá a `null`, eliminando cualquier valor previo.

### `force_from_metadata`

**Uso**: Invertir la prioridad y usar metadata como fuente primaria (requiere privilegios).

**Ejemplo**:
```json
{
  "metadata": {
    "email": "metadata@example.com"
  },
  "email": "column@example.com",
  "force_from_metadata": true
}
```

**Resultado**: Se usará `"metadata@example.com"` en lugar de `"column@example.com"`.

---

## Conflictos entre Columnas y Metadata

Cuando el payload incluye tanto valores directos en columnas como en metadata, el sistema:

1. **Prioriza las columnas**: Siempre usa el valor de la columna directa
2. **Detecta el conflicto**: Compara valores normalizados
3. **Registra el conflicto**: En logs del servidor
4. **Informa al cliente**: Incluye array `conflicts` en la respuesta

### Ejemplo de Conflicto

**Payload**:
```json
{
  "name": "Test Entity",
  "entity_id": "TEST-001",
  "email": "column@example.com",
  "phone": "+52 55 1234 5678",
  "metadata": {
    "email": "metadata@example.com",
    "custom_field": "valor"
  }
}
```

**Respuesta**:
```json
{
  "success": true,
  "warning": "Se detectaron conflictos entre valores de columnas y metadata. Se priorizaron los valores de columnas.",
  "conflicts": [
    {
      "field": "email",
      "column_value": "column@example.com",
      "metadata_value": "metadata@example.com",
      "resolution": "Se usó el valor de la columna"
    }
  ],
  "data": {
    "email": "column@example.com",
    "metadata": {
      "email": "column@example.com",
      "custom_field": "valor",
      /* ... campos sincronizados ... */
    }
  }
}
```

---

## Auditoría

Si la variable de entorno `ENABLE_AUDIT_LOG=true` está configurada, el sistema registra automáticamente:

- **Usuario**: ID del usuario que realiza la operación
- **Acción**: `create_entity` o `update_entity`
- **Cambios**: Estado anterior y posterior (solo en actualizaciones)
- **Timestamp**: Fecha y hora exactas

La auditoría se guarda en la tabla `audit_logs`.

---

## Casos de Uso Comunes

### Caso 1: Crear Entidad Simple

```bash
curl -X POST http://localhost:3001/api/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Departamento de TI",
    "entity_id": "TI-001",
    "email": "ti@empresa.com",
    "phone": "+52 55 5555 5555"
  }'
```

### Caso 2: Actualizar Solo Email

```bash
curl -X PUT http://localhost:3001/api/entities/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo-ti@empresa.com"
  }'
```

### Caso 3: Crear Grupo Corporativo

```bash
curl -X POST http://localhost:3001/api/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Holding Corporativo",
    "entity_id": "HOLD-001",
    "email": "holding@corp.com",
    "phone": "+52 55 0000 0000",
    "is_group": true,
    "relationship_type": "parent"
  }'
```

### Caso 4: Actualizar con Metadata Personalizada

```bash
curl -X PUT http://localhost:3001/api/entities/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "presupuesto_anual": 5000000,
      "empleados": 50,
      "area_responsable": "Operaciones"
    }
  }'
```

---

## Testing Recomendado

### Tests Unitarios Sugeridos

1. **Validación de Email**
   - Email válido
   - Email inválido
   - Email con espacios (debe trimarse)
   - Email con mayúsculas (debe normalizarse)

2. **Validación de Phone**
   - Teléfono válido
   - Teléfono muy corto (< 7 dígitos)
   - Teléfono muy largo (> 20 dígitos)
   - Teléfono con formato (debe normalizarse)

3. **Priorización Columnas > Metadata**
   - Columna presente, metadata ausente
   - Columna ausente, metadata presente
   - Ambos presentes (debe usar columna)
   - Ambos presentes con conflicto (debe detectarlo)

4. **COALESCE-style en Updates**
   - Actualizar campo a null sin force_overwrite (debe mantener valor)
   - Actualizar campo a null con force_overwrite (debe establecer null)
   - Actualizar solo algunos campos (otros deben mantenerse)

5. **Metadata Merge**
   - Metadata con claves de columna (deben sincronizarse)
   - Metadata con claves adicionales (deben preservarse)
   - Metadata con estructura compleja (debe mantenerse)

---

## Solución de Problemas

### Problema: "metadata debe ser un objeto JSON válido"

**Causa**: Estás enviando metadata como string o con formato JSON inválido.

**Solución**: Asegúrate de enviar metadata como objeto JSON:
```json
// ❌ Incorrecto
"metadata": "{\"key\": \"value\"}"

// ✅ Correcto
"metadata": {"key": "value"}
```

### Problema: "Formato de email inválido"

**Causa**: El email no cumple el formato estándar.

**Solución**: Verifica que el email tenga formato `usuario@dominio.ext`:
```json
// ❌ Incorrecto
"email": "email.invalido"

// ✅ Correcto
"email": "usuario@dominio.com"
```

### Problema: Campos no se actualizan a null

**Causa**: El comportamiento COALESCE-style previene sobrescribir con null por defecto.

**Solución**: Usa el flag `force_overwrite`:
```json
{
  "phone": null,
  "force_overwrite": true
}
```

### Problema: Conflictos entre columnas y metadata

**Causa**: Estás enviando valores diferentes en columnas directas y metadata.

**Solución**: Decide qué valor usar:
- **Opción 1**: Envía solo valores en columnas directas (recomendado)
- **Opción 2**: Usa `force_from_metadata: true` para priorizar metadata
- **Opción 3**: Acepta el conflicto y revisa el array `conflicts` en la respuesta

---

## Mejores Prácticas

1. **Usa columnas directas para datos estructurados**: email, phone, country, etc.
2. **Usa metadata para datos adicionales no estructurados**: campos personalizados, configuraciones específicas
3. **No envíes valores null sin intención**: El sistema los ignorará por defecto
4. **Verifica el array `conflicts`**: Si aparece en la respuesta, revisa tu payload
5. **Implementa reintentos**: Para errores 500 (database_error)
6. **Valida en el cliente**: Antes de enviar, valida formato de email y phone
7. **Usa IDs únicos**: Para `entity_id`, asegúrate de que sean únicos en todo el sistema
8. **Loguea las respuestas**: Especialmente los warnings y conflicts para debugging

---

## Variables de Entorno Relacionadas

```bash
# Habilitar auditoría de cambios
ENABLE_AUDIT_LOG=true

# Modo de desarrollo (incluye debug info en errores)
NODE_ENV=development

# Configuración de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

---

## Changelog de Reglas

### Versión 2.0 (Actual)
- ✅ Prioridad columnas > metadata
- ✅ Validación y parseo de metadata JSON
- ✅ Normalización automática de valores
- ✅ COALESCE-style para updates
- ✅ Detección de conflictos
- ✅ Sanitización y límites de longitud
- ✅ Flags force_overwrite y force_from_metadata
- ✅ Auditoría opcional
- ✅ Manejo de errores mejorado

### Versión 1.0 (Anterior)
- Validación básica
- Sin priorización de fuentes
- Sin detección de conflictos
- Sin COALESCE-style

---

**Documentación generada**: Diciembre 2024  
**Versión de API**: 2.0  
**Compatibilidad**: Backend server.js v2.0+
