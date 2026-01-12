# 🚨 SOLUCIÓN AL ERROR 404 DE SUPABASE

## Problema Detectado
```
Could not find the table 'public.entities'
Could not find the table 'public.commitments'
```

## Causa Raíz
**Las tablas NO existen en tu base de datos Supabase.**

El frontend las está buscando en:
- `/rest/v1/entities?select=*`
- `/rest/v1/commitments?select=*`

Pero PostgREST devuelve 404 porque no las encuentra en el esquema `public`.

---

## ✅ SOLUCIÓN (3 PASOS)

### PASO 1: Acceder a Supabase Dashboard
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto CFE INSIGHT
3. En el menú lateral, haz clic en **SQL Editor**

### PASO 2: Ejecutar Script SQL
1. Haz clic en **"New Query"**
2. Abre el archivo: `supabase-migrations/01-create-tables.sql`
3. **Copia TODO el contenido** del archivo
4. **Pégalo** en el editor SQL de Supabase
5. Haz clic en **"RUN"** (botón verde abajo a la derecha)

### PASO 3: Verificar
Ejecuta esta query en SQL Editor para confirmar:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('entities', 'commitments');
```

**Deberías ver:**
```
table_name
----------
entities
commitments
```

---

## 🧪 VERIFICACIÓN EN FRONTEND

1. **Refresca tu navegador** (F5)
2. Abre DevTools (F12) > Console
3. Deberías ver:
   ```
   ✅ api-client.js: API Client inicializado
   ✅ Tabla entities: X registros cargados
   ✅ Tabla commitments: X registros cargados
   ```

4. **YA NO deberías ver:**
   ```
   ❌ Could not find the table 'public.entities'
   ❌ Could not find the table 'public.commitments'
   ```

---

## 📊 DATOS DE PRUEBA (Opcional)

Si quieres insertar datos de ejemplo, ejecuta en SQL Editor:

```sql
INSERT INTO public.entities (name, responsible) VALUES 
('Entidad de Prueba 1', 'Juan Pérez'),
('Entidad de Prueba 2', 'María García');

INSERT INTO public.commitments (description, entity, status, deadline) VALUES 
('Compromiso de prueba 1', 'Entidad de Prueba 1', 'pendiente', now() + interval '7 days'),
('Compromiso de prueba 2', 'Entidad de Prueba 2', 'en proceso', now() + interval '14 days');
```

---

## 🔒 SEGURIDAD (RLS)

El script ya configuró Row Level Security con políticas para usuarios autenticados:
- ✅ SELECT, INSERT, UPDATE, DELETE permitidos para usuarios con sesión
- ✅ RLS activo
- ✅ Solo usuarios autenticados pueden acceder

---

## ❓ Si Sigue Fallando

1. **Verifica que estés autenticado** en la app
2. **Revisa la configuración de Supabase** en `js/config.js`:
   - `SUPABASE_URL` debe coincidir con tu proyecto
   - `SUPABASE_ANON_KEY` debe ser válida
3. **Verifica en Network tab** (DevTools > Network):
   - Filtrar por "entities"
   - Status debería ser **200 OK**, no 404

---

## 📝 SIGUIENTE PASO

Una vez ejecutado el script SQL:
1. Refresca el navegador
2. Dime qué aparece en la consola
