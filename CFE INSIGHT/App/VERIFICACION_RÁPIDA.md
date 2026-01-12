## VERIFICACIÓN RÁPIDA - ESTABILIZACIÓN

Ejecuta esto en la consola del navegador mientras estés en CUALQUIER página protegida:

### 1. Verificar stubs de UI existen
```javascript
console.log('✅ showLoading:', typeof window.showLoading === 'function' ? 'OK' : '❌ NOT FOUND');
console.log('✅ showError:', typeof window.showError === 'function' ? 'OK' : '❌ NOT FOUND');
console.log('✅ showSuccess:', typeof window.showSuccess === 'function' ? 'OK' : '❌ NOT FOUND');
```

### 2. Verificar API Client existe con stubs defensivos
```javascript
console.log('✅ API.Entities:', typeof API?.Entities?.getAll === 'function' ? 'OK' : '❌ NOT FOUND');
console.log('✅ API.Commitments:', typeof API?.Commitments?.getAll === 'function' ? 'OK' : '❌ NOT FOUND');
console.log('✅ API.Users:', typeof API?.Users?.getAll === 'function' ? 'OK' : '❌ NOT FOUND');
```

### 3. Verificar Auth Guard existe
```javascript
console.log('✅ protectPage:', typeof window.protectPage === 'function' ? 'OK' : '❌ NOT FOUND');
console.log('✅ logout:', typeof window.logout === 'function' ? 'OK' : '❌ NOT FOUND');
console.log('✅ getUserUI:', typeof window.getUserUI === 'function' ? 'OK' : '❌ NOT FOUND');
```

### 4. Verificar Supabase está inicializado
```javascript
console.log('✅ getSupabaseClient:', typeof window.getSupabaseClient === 'function' ? 'OK' : '❌ NOT FOUND');
console.log('✅ getSupabaseSession:', typeof window.getSupabaseSession === 'function' ? 'OK' : '❌ NOT FOUND');
```

### 5. Probar API con tolerancia a tablas inexistentes
```javascript
// Esto NO debe tirar error, debe retornar array vacío
API.Entities.getAll().then(result => {
    console.log('✅ API.Entities.getAll() retorna:', result);
    console.log('   - success:', result.success);
    console.log('   - data es array:', Array.isArray(result.data));
});

API.Commitments.getAll().then(result => {
    console.log('✅ API.Commitments.getAll() retorna:', result);
    console.log('   - success:', result.success);
    console.log('   - data es array:', Array.isArray(result.data));
});
```

### 6. Verificar usuario autenticado
```javascript
const userUI = window.getUserUI();
console.log('✅ Usuario autenticado:', userUI ? `${userUI.name} (${userUI.role})` : 'NO');
```

---

## PRUEBAS DE FLUJO

### Test 1: Navegar a página protegida
✅ Debería mantener sesión sin redireccionar a login

### Test 2: Recargar página
✅ Debería mantener sesión (protectPage ejecuta callback nuevamente)

### Test 3: Hacer logout
✅ Debería redirigir a login.html
✅ Sesión debe limpiarse

### Test 4: Intentar entrar a página protegida sin autenticación
✅ Debería redirigir inmediatamente a login.html

### Test 5: Verificar consola
✅ Debe haber logs como:
```
🔐 protectPage: Validando autenticación...
✅ protectPage: Sesión válida. Usuario autenticado.
✅ protectPage: Perfil de usuario cargado: [nombre]
🎬 protectPage: Ejecutando callback de inicialización...
```

---

## SI ALGO NO FUNCIONA

### Error: "showLoading is not defined"
- Verificar que `js/utils.js` se carga ANTES de scripts de página
- Verificar orden en HTML (debe ser #5 después de Supabase)

### Error: "API is not defined"
- Verificar que `js/api-client.js` se carga DESPUÉS de Supabase
- Verificar que `js/supabaseClient.js` se cargó correctamente

### Página redirige al login incorrectamente
- Verificar en consola: `Auth State Changed: SIGNED_OUT`
- Verificar que existe sesión válida en Supabase
- Probar con `window.getSessionSilent()` en consola

### API retorna error en lugar de array vacío
- Verificar consola por mensajes de tabla no encontrada
- Verificar que error es PGRST205 (tabla no existe)
- Si es otro error, buscar en consola detalles

---

## ESTADOS ESPERADOS

### ✅ CORRECTO: Dashboard cargando
```
API.Entities.getAll() retorna: { success: true, data: [] }
API.Commitments.getAll() retorna: { success: true, data: [] }
API.Users.getAll() retorna: { success: true, data: [] }
showLoading(true) muestra spinner
showError('mensaje') muestra toast rojo
```

### ❌ INCORRECTO: Ver en consola
```
ReferenceError: showLoading is not defined
ReferenceError: API is not defined
Redirección a login sin motivo aparente
PGRST205 error no capturado
```

---

**Última actualización:** 12 de Enero, 2026
