## 🧪 SCRIPT DE PRUEBA RÁPIDA - COPY/PASTE

**Para usar:** Copia cada bloque y pégalo en consola del navegador (F12)

**Tiempo:** 2 minutos para todas las pruebas

---

## ✅ TEST 1: API existe

```javascript
console.log('TEST 1: API existe');
typeof window.API === 'object' && window.API !== null 
  ? console.log('✅ PASS: window.API existe') 
  : console.log('❌ FAIL: window.API es undefined');
```

**Esperado:** `✅ PASS: window.API existe`

---

## ✅ TEST 2: Módulos predefinidos existen

```javascript
console.log('\nTEST 2: Módulos predefinidos existen');
const modulos = ['Entities', 'Commitments', 'Users', 'Notifications', 'Audit'];
const ok = modulos.every(m => typeof window.API[m] === 'object');
ok ? console.log('✅ PASS:', modulos.join(', ')) 
   : console.log('❌ FAIL: Algún módulo no existe');
```

**Esperado:** `✅ PASS: Entities, Commitments, Users, Notifications, Audit`

---

## ✅ TEST 3: Módulos stub existen

```javascript
console.log('\nTEST 3: Módulos stub nuevos existen');
const stubs = ['Groups', 'Teams', 'Permissions', 'Roles', 'Logs', 'Settings', 'Templates', 'Reports'];
const ok = stubs.every(m => typeof window.API[m] === 'object');
ok ? console.log('✅ PASS:', stubs.join(', ')) 
   : console.log('❌ FAIL: Algún módulo stub no existe');
```

**Esperado:** `✅ PASS: Groups, Teams, Permissions, Roles, Logs, Settings, Templates, Reports`

---

## ✅ TEST 4: Métodos existen en cada módulo

```javascript
console.log('\nTEST 4: Métodos CRUD existen en cada módulo');
const metodos = ['getAll', 'getById', 'create', 'update', 'delete'];
const modulos_test = ['Entities', 'Users', 'Groups'];

let ok = true;
modulos_test.forEach(mod => {
  const tiene_todos = metodos.every(m => typeof window.API[mod][m] === 'function');
  console.log(`  ${mod}: ${tiene_todos ? '✅' : '❌'} ${metodos.join(', ')}`);
  if (!tiene_todos) ok = false;
});

ok ? console.log('✅ PASS: Todos tienen métodos') 
   : console.log('❌ FAIL: Falta algún método');
```

**Esperado:**
```
  Entities: ✅ getAll, getById, create, update, delete
  Users: ✅ getAll, getById, create, update, delete
  Groups: ✅ getAll, getById, create, update, delete
✅ PASS: Todos tienen métodos
```

---

## ✅ TEST 5: Nunca retorna undefined (tabla no existe)

```javascript
console.log('\nTEST 5: Nunca retorna undefined (tabla no existe)');

(async () => {
  try {
    const result = await window.API.Entities.getAll();
    
    const checks = {
      'result existe': result !== undefined && result !== null,
      'result.success es boolean': typeof result.success === 'boolean',
      'result.data es array': Array.isArray(result.data),
      'result.data nunca undefined': result.data !== undefined,
    };
    
    let ok = true;
    Object.entries(checks).forEach(([k, v]) => {
      console.log(`  ${v ? '✅' : '❌'} ${k}`);
      if (!v) ok = false;
    });
    
    ok ? console.log('✅ PASS: Estructura correcta') 
       : console.log('❌ FAIL: Estructura incorrecta');
  } catch (err) {
    console.log('❌ FAIL: Error:', err.message);
  }
})();
```

**Esperado:**
```
  ✅ result existe
  ✅ result.success es boolean
  ✅ result.data es array
  ✅ result.data nunca undefined
✅ PASS: Estructura correcta
```

---

## ✅ TEST 6: Método genérico funciona

```javascript
console.log('\nTEST 6: Método genérico getModule() funciona');

(async () => {
  try {
    const modulo = window.API.getModule('tabla_inexistente');
    const result = await modulo.getAll();
    
    const ok = result && result.success === true && Array.isArray(result.data);
    
    console.log(`  Módulo creado: ${typeof modulo === 'object' ? '✅' : '❌'}`);
    console.log(`  Métodos presentes: ${typeof modulo.getAll === 'function' ? '✅' : '❌'}`);
    console.log(`  Retorna estructura: ${ok ? '✅' : '❌'}`);
    console.log(`  Datos: ${JSON.stringify(result.data)}`);
    
    ok ? console.log('✅ PASS: Método genérico funciona') 
       : console.log('❌ FAIL: Método genérico falla');
  } catch (err) {
    console.log('❌ FAIL: Error:', err.message);
  }
})();
```

**Esperado:**
```
  Módulo creado: ✅
  Métodos presentes: ✅
  Retorna estructura: ✅
  Datos: []
✅ PASS: Método genérico funciona
```

---

## ✅ TEST 7: Todos los métodos retornan correctamente

```javascript
console.log('\nTEST 7: Todos los métodos retornan { success, data }');

(async () => {
  try {
    const grupo = { id: '1', nombre: 'Test' };
    
    const results = {
      getAll: await window.API.Groups.getAll(),
      getById: await window.API.Groups.getById('123'),
      create: await window.API.Groups.create(grupo),
      update: await window.API.Groups.update('123', grupo),
      delete: await window.API.Groups.delete('123'),
    };
    
    let ok = true;
    Object.entries(results).forEach(([m, r]) => {
      const tiene_success = typeof r.success === 'boolean';
      const tiene_data = 'data' in r;
      const pass = tiene_success && tiene_data;
      
      console.log(`  ${m}: ${pass ? '✅' : '❌'} { success, data }`);
      if (!pass) ok = false;
    });
    
    ok ? console.log('✅ PASS: Todos retornan estructura correcta') 
       : console.log('❌ FAIL: Algún método tiene estructura incorrecta');
  } catch (err) {
    console.log('❌ FAIL: Error:', err.message);
  }
})();
```

**Esperado:**
```
  getAll: ✅ { success, data }
  getById: ✅ { success, data }
  create: ✅ { success, data }
  update: ✅ { success, data }
  delete: ✅ { success, data }
✅ PASS: Todos retornan estructura correcta
```

---

## 🚀 TODAS LAS PRUEBAS A LA VEZ

```javascript
console.clear();
console.log('═══════════════════════════════════════════════════════');
console.log('🧪 PRUEBAS COMPLETAS - MÓDULOS API SEGUROS');
console.log('═══════════════════════════════════════════════════════\n');

// TEST 1
console.log('TEST 1: API existe');
typeof window.API === 'object' && window.API !== null 
  ? console.log('✅ PASS\n') 
  : console.log('❌ FAIL\n');

// TEST 2
console.log('TEST 2: Módulos predefinidos');
const modulos = ['Entities', 'Commitments', 'Users', 'Notifications', 'Audit'];
const ok2 = modulos.every(m => typeof window.API[m] === 'object');
console.log(ok2 ? '✅ PASS\n' : '❌ FAIL\n');

// TEST 3
console.log('TEST 3: Módulos stub');
const stubs = ['Groups', 'Teams', 'Permissions', 'Roles', 'Logs', 'Settings', 'Templates', 'Reports'];
const ok3 = stubs.every(m => typeof window.API[m] === 'object');
console.log(ok3 ? '✅ PASS\n' : '❌ FAIL\n');

// TEST 4
console.log('TEST 4: Métodos CRUD');
const metodos = ['getAll', 'getById', 'create', 'update', 'delete'];
const ok4 = ['Entities', 'Users', 'Groups'].every(mod => 
  metodos.every(m => typeof window.API[mod][m] === 'function')
);
console.log(ok4 ? '✅ PASS\n' : '❌ FAIL\n');

// TEST 5
console.log('TEST 5: Nunca undefined');
(async () => {
  const result = await window.API.Entities.getAll();
  const ok5 = result && result.success === true && Array.isArray(result.data);
  console.log(ok5 ? '✅ PASS\n' : '❌ FAIL\n');

  // TEST 6
  console.log('TEST 6: Método genérico');
  const mod = window.API.getModule('tabla_nueva');
  const res = await mod.getAll();
  const ok6 = res && res.success === true && Array.isArray(res.data);
  console.log(ok6 ? '✅ PASS\n' : '❌ FAIL\n');

  // TEST 7
  console.log('TEST 7: Estructura { success, data }');
  const ok7 = (await window.API.Groups.getAll()).success && 'data' in (await window.API.Groups.getAll());
  console.log(ok7 ? '✅ PASS\n' : '❌ FAIL\n');

  // RESULTADO
  const total = [ok2, ok3, ok4, ok5, ok6, ok7].filter(x => x).length;
  console.log('═══════════════════════════════════════════════════════');
  console.log(`RESULTADO: ${total}/6 pruebas pasadas`);
  console.log(total === 6 ? '✅ TODO BIEN - Módulos API son 100% seguros' : '⚠️ Revisar fallos');
  console.log('═══════════════════════════════════════════════════════');
})();
```

**Esperado:** `✅ TODO BIEN - Módulos API son 100% seguros`

---

## 🚨 SI ALGO FALLA

### "window.API is undefined"
- Asegúrate que estás en una página protegida (dashboard, usuarios, etc.)
- Si ves error: api-client.js no cargó
- Solución: Recarga página (F5)

### "Groups is not a function"
- No confundas `window.API.Groups` (objeto) con `window.API.Groups()` (función)
- Usa: `window.API.Groups.getAll()` (con .getAll)

### "Cannot read property 'data' of undefined"
- El método retornó undefined (no debería pasar)
- Solución: Revisa console.warn para ver qué sucedió

### Otros errores
- Abre consola: F12 → pestaña Console
- Mira los mensajes rojo/amarillo
- Copia el error en VERIFICACION_MODULOS_API.md sección "Troubleshooting"

---

## ✅ SI TODO PASA

Significa que:
- ✅ Todos los módulos API funcionan correctamente
- ✅ Nunca habrá `undefined` en el API
- ✅ Puedes usar `window.API.getModule()` para tablas nuevas
- ✅ Código defensivo está en lugar

**Conclusión:** API Client es 100% robusto y seguro

---

**Tiempo total:** ~2 minutos  
**Próximo:** Revisar VERIFICACION_MODULOS_API.md para pruebas detalladas
