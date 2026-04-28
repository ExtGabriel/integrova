# 🔧 SOLUCIÓN AL ERROR DE PERMISOS

## Error Recibido
```
ERROR: 42501: permission denied for schema public
```

## Causa
Estás ejecutando el SQL con un rol sin permisos suficientes.

---

## ✅ SOLUCIÓN OPCIÓN 1: Cambiar Rol en SQL Editor

1. **Abre SQL Editor** en Supabase Dashboard
2. **Mira la parte inferior derecha** del editor
3. Verás algo como: **"Run as: authenticated"** o **"Run as: anon"**
4. **Haz clic** en ese selector
5. **Cambia a: "postgres"** (superusuario)
6. Ahora **pega y ejecuta** el script `01-create-tables.sql`

---

## ✅ SOLUCIÓN OPCIÓN 2: Usar Table Editor (Más Fácil)

Si el cambio de rol no funciona, crea las tablas manualmente:

### Crear tabla `entities`
1. Ve a **Table Editor** (menú lateral)
2. Click en **"Create a new table"**
3. Configura:
   - **Name**: `entities`
   - **Schema**: `public`
   - **Enable Row Level Security (RLS)**: ✅ Activar

4. Agrega estas columnas:

| Name | Type | Default Value | Primary | Nullable |
|------|------|---------------|---------|----------|
| id | uuid | gen_random_uuid() | ✅ | ❌ |
| name | text | - | ❌ | ❌ |
| responsible | text | - | ❌ | ✅ |
| created_at | timestamptz | now() | ❌ | ❌ |
| updated_at | timestamptz | now() | ❌ | ❌ |

5. Click **Save**

### Crear tabla `commitments`
1. Click en **"Create a new table"** otra vez
2. Configura:
   - **Name**: `commitments`
   - **Schema**: `public`
   - **Enable Row Level Security (RLS)**: ✅ Activar

3. Agrega estas columnas:

| Name | Type | Default Value | Primary | Nullable |
|------|------|---------------|---------|----------|
| id | uuid | gen_random_uuid() | ✅ | ❌ |
| description | text | - | ❌ | ❌ |
| entity | text | - | ❌ | ✅ |
| status | text | 'pendiente' | ❌ | ✅ |
| deadline | timestamptz | - | ❌ | ✅ |
| created_at | timestamptz | now() | ❌ | ❌ |
| updated_at | timestamptz | now() | ❌ | ❌ |

4. Click **Save**

### Configurar Políticas RLS
Para cada tabla (`entities` y `commitments`):

1. Ve a **Authentication > Policies**
2. Selecciona la tabla
3. Click **"New Policy"**
4. Elige **"Enable read access for authenticated users only"**
5. Repite para **"Enable insert access..."**, **"Enable update access..."**, **"Enable delete access..."**

O ejecuta este SQL (ahora SÍ funcionará porque las tablas ya existen):

```sql
-- Policies para entities
CREATE POLICY "allow_authenticated_all_entities"
ON public.entities
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policies para commitments
CREATE POLICY "allow_authenticated_all_commitments"
ON public.commitments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

---

## 🧪 VERIFICACIÓN

Una vez creadas las tablas, ejecuta en SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('entities', 'commitments');
```

Deberías ver:
```
entities
commitments
```

Luego **refresca tu dashboard** (F5) y los errores 404 desaparecerán.

---

## 📝 ¿Cuál opción prefieres?

- **Opción 1** (SQL Editor con rol postgres): Más rápido si tienes acceso
- **Opción 2** (Table Editor manual): Más visual y siempre funciona
