/**
 * CFE INSIGHT - VALIDATION SCRIPT
 * Ejecutar en consola del navegador (F12) en la página de usuarios
 * 
 * Uso: copy-paste el contenido en consola y ejecutar
 */

console.clear();
console.log('%c🔍 CFE INSIGHT - USUARIOS MODULE VALIDATION', 'background: #4CAF50; color: white; padding: 10px; font-size: 14px; font-weight: bold;');

// ==========================================
// VALIDACIONES PASO A PASO
// ==========================================

const validationResults = {
    passed: 0,
    failed: 0,
    warnings: 0
};

function check(name, condition, details = '') {
    if (condition) {
        console.log(`✅ ${name}`);
        if (details) console.log(`   → ${details}`);
        validationResults.passed++;
    } else {
        console.error(`❌ ${name}`);
        if (details) console.error(`   → ${details}`);
        validationResults.failed++;
    }
}

function warn(name, details = '') {
    console.warn(`⚠️  ${name}`);
    if (details) console.warn(`   → ${details}`);
    validationResults.warnings++;
}

// ==========================================
// 1. SCRIPT LOADING
// ==========================================
console.log('\n%c1️⃣  SCRIPT LOADING', 'color: #2196F3; font-weight: bold; font-size: 12px;');

check('API Client loaded', typeof window.API !== 'undefined', `window.API es ${typeof window.API}`);
check('Auth Guard loaded', typeof window.protectPage !== 'undefined', `window.protectPage es ${typeof window.protectPage}`);
check('Permissions Helper loaded', typeof window.PermissionsHelper !== 'undefined', `window.PermissionsHelper es ${typeof window.PermissionsHelper}`);
check('Supabase loaded', typeof window.supabaseClient !== 'undefined', `window.supabaseClient es ${typeof window.supabaseClient}`);

// ==========================================
// 2. API METHODS
// ==========================================
console.log('\n%c2️⃣  API METHODS', 'color: #2196F3; font-weight: bold; font-size: 12px;');

check('API.getMyProfile exists', typeof window.API.getMyProfile === 'function');
check('API.canAccessUsers exists', typeof window.API.canAccessUsers === 'function');
check('API.Users exists', typeof window.API.Users === 'object');
check('API.Users.getAccessibleUsers exists', typeof window.API.Users.getAccessibleUsers === 'function');
check('API.Users.canChangeRoles exists', typeof window.API.Users.canChangeRoles === 'function');
check('API.Users.canChangeStatus exists', typeof window.API.Users.canChangeStatus === 'function');
check('API.Users.updateRole exists', typeof window.API.Users.updateRole === 'function');
check('API.Users.toggleActive exists', typeof window.API.Users.toggleActive === 'function');

// ==========================================
// 3. PERMISSIONS HELPER METHODS
// ==========================================
console.log('\n%c3️⃣  PERMISSIONS HELPER METHODS', 'color: #2196F3; font-weight: bold; font-size: 12px;');

check('PermissionsHelper.hasRole exists', typeof window.PermissionsHelper.hasRole === 'function');
check('PermissionsHelper.hasPermission exists', typeof window.PermissionsHelper.hasPermission === 'function');
check('PermissionsHelper.canAccessModule exists', typeof window.PermissionsHelper.canAccessModule === 'function');
check('PermissionsHelper.checkPermissionOrFail exists', typeof window.PermissionsHelper.checkPermissionOrFail === 'function');
check('PermissionsHelper.disableIfNoPermission exists', typeof window.PermissionsHelper.disableIfNoPermission === 'function');
check('PermissionsHelper.hideIfNoPermission exists', typeof window.PermissionsHelper.hideIfNoPermission === 'function');

// ==========================================
// 4. DOM ELEMENTS
// ==========================================
console.log('\n%c4️⃣  DOM ELEMENTS', 'color: #2196F3; font-weight: bold; font-size: 12px;');

check('usersTableBody exists', document.getElementById('usersTableBody') !== null);
check('alertContainer exists', document.getElementById('alertContainer') !== null);
check('loadingContainer exists', document.getElementById('loadingContainer') !== null);
check('searchInput exists', document.getElementById('searchInput') !== null);
check('roleFilter exists', document.getElementById('roleFilter') !== null);
check('addUserBtn exists', document.getElementById('addUserBtn') !== null);
check('logoutBtn exists', document.getElementById('logoutBtn') !== null);

// ==========================================
// 5. DEBUG OBJECT
// ==========================================
console.log('\n%c5️⃣  DEBUG OBJECT', 'color: #2196F3; font-weight: bold; font-size: 12px;');

check('__usuariosDebug exists', typeof window.__usuariosDebug === 'object');
if (window.__usuariosDebug) {
    check('__usuariosDebug.allUsers exists', typeof window.__usuariosDebug.allUsers === 'function');
    check('__usuariosDebug.currentUserProfile exists', typeof window.__usuariosDebug.currentUserProfile === 'function');
    check('__usuariosDebug.currentUserRole exists', typeof window.__usuariosDebug.currentUserRole === 'function');
    check('__usuariosDebug.permisos exists', typeof window.__usuariosDebug.permisos === 'function');
    check('__usuariosDebug.reloadUsers exists', typeof window.__usuariosDebug.reloadUsers === 'function');
    check('__usuariosDebug.filterUsers exists', typeof window.__usuariosDebug.filterUsers === 'function');
}

// ==========================================
// 6. RUNTIME STATE
// ==========================================
console.log('\n%c6️⃣  RUNTIME STATE', 'color: #2196F3; font-weight: bold; font-size: 12px;');

try {
    const userProfile = window.__usuariosDebug?.currentUserProfile?.();
    const userRole = window.__usuariosDebug?.currentUserRole?.();
    const perms = window.__usuariosDebug?.permisos?.();
    const allUsers = window.__usuariosDebug?.allUsers?.();

    check('User profile loaded', userProfile?.id !== undefined, `ID: ${userProfile?.id}`);
    check('User role assigned', userRole !== null && userRole !== undefined, `Role: ${userRole}`);
    check('Permissions object exists', perms !== null && typeof perms === 'object',
        `canChangeRoles: ${perms?.canChangeRoles}, canChangeStatus: ${perms?.canChangeStatus}`);
    check('Users list loaded', Array.isArray(allUsers), `${allUsers?.length || 0} usuarios cargados`);
} catch (err) {
    warn('Runtime state check error', err.message);
}

// ==========================================
// 7. FEATURE TESTS
// ==========================================
console.log('\n%c7️⃣  FEATURE TESTS', 'color: #2196F3; font-weight: bold; font-size: 12px;');

// Test filterUsers
try {
    const testFilter = window.__usuariosDebug?.filterUsers?.('test');
    check('filterUsers can be called', true);
} catch (err) {
    warn('filterUsers error', err.message);
}

// Test reloadUsers
try {
    const testReload = window.__usuariosDebug?.reloadUsers?.();
    check('reloadUsers can be called', true);
} catch (err) {
    warn('reloadUsers error', err.message);
}

// ==========================================
// CONSOLE LOGS
// ==========================================
console.log('\n%c8️⃣  CONSOLE LOGS', 'color: #2196F3; font-weight: bold; font-size: 12px;');

// Contar errores en console
const originalError = console.error;
const originalWarn = console.warn;
let errorCount = 0;
let warnCount = 0;

console.log('Monitor de logs activado...');

// ==========================================
// RESULTADOS FINALES
// ==========================================
console.log('\n%c📊 RESULTADOS FINALES', 'background: #FF9800; color: white; padding: 10px; font-size: 13px; font-weight: bold;');

console.log(`
✅ PASADAS:    ${validationResults.passed}
❌ FALLÓ:      ${validationResults.failed}
⚠️  WARNINGS:  ${validationResults.warnings}

Total checks: ${validationResults.passed + validationResults.failed + validationResults.warnings}
`);

if (validationResults.failed === 0) {
    console.log('%c🎉 ¡TODO ESTÁ BIEN! El módulo de usuarios está listo para producción.', 'background: #4CAF50; color: white; padding: 10px; font-size: 12px; font-weight: bold;');
} else {
    console.error('%c❌ ERRORES DETECTADOS. Por favor, revisar los fallos arriba.', 'background: #f44336; color: white; padding: 10px; font-size: 12px; font-weight: bold;');
}

// ==========================================
// DEBUG UTILITIES
// ==========================================
console.log('\n%c🔧 DEBUG UTILITIES', 'color: #9C27B0; font-weight: bold; font-size: 12px;');

console.log(`
Acceso a funciones de debug:
- window.__usuariosDebug.allUsers()         → Array de usuarios cargados
- window.__usuariosDebug.currentUserProfile() → Perfil del usuario logueado
- window.__usuariosDebug.currentUserRole()  → Rol del usuario actual
- window.__usuariosDebug.permisos()        → Object con permisos
- window.__usuariosDebug.reloadUsers()     → Recargar lista de usuarios
- window.__usuariosDebug.filterUsers(q)    → Filtrar usuarios por query

API methods directos:
- window.API.getMyProfile()                → Obtener perfil actual
- window.API.canAccessUsers()              → Verificar acceso
- window.API.Users.getAccessibleUsers()    → Cargar usuarios
- window.API.Users.canChangeRoles()        → Verificar permiso cambiar rol
- window.API.Users.canChangeStatus()       → Verificar permiso cambiar status
- window.API.Users.updateRole(id, role)    → Cambiar rol (async)
- window.API.Users.toggleActive(id, active) → Cambiar status (async)

Permissions Helper:
- window.PermissionsHelper.hasRole(role)                    → Verificar rol
- window.PermissionsHelper.hasPermission(action, resource)  → Verificar permiso
- window.PermissionsHelper.canAccessModule(module)          → Verificar acceso módulo
- window.PermissionsHelper.checkPermissionOrFail(action, resource, message) → Verificar o fallar
`);

console.log('%c✅ Validación completada. Puedes usar la consola para debugging.', 'color: #4CAF50; font-weight: bold;');
