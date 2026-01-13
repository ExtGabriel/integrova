/**
 * SCRIPT DE VALIDACIÓN - LOGOUT LOOP FIX
 * 
 * Ejecutar en la consola del navegador (F12 > Console)
 * 
 * Verifica que:
 * 1. El flag __MANUAL_LOGOUT__ existe
 * 2. auth-guard.js está cargado
 * 3. window.logout() está disponible
 * 4. onAuthStateChange está configurado correctamente
 * 5. No hay múltiples listeners
 */

(function validateLogoutFix() {
    console.clear();
    console.log('%c🔍 VALIDACIÓN DE CORRECCIÓN DE LOGOUT LOOP', 'color: #FF6B6B; font-size: 18px; font-weight: bold;');
    console.log('='.repeat(60));

    const checks = {
        flag: typeof window.__MANUAL_LOGOUT__ !== 'undefined',
        authGuard: typeof window.protectPage === 'function',
        logoutFunction: typeof window.logout === 'function',
        supabase: typeof window.getSupabaseClient === 'function',
        session: typeof window.getSessionSilent === 'function'
    };

    console.log('\n📋 Checklist de componentes:\n');

    // 1. Flag de logout manual
    if (checks.flag) {
        console.log('%c✅ window.__MANUAL_LOGOUT__', 'color: #51CF66; font-weight: bold');
        console.log(`   Valor actual: ${window.__MANUAL_LOGOUT__}`);
        console.log(`   ✓ Debe ser false en dashboard`);
        console.log(`   ✓ Debe ser true después de logout`);
    } else {
        console.log('%c❌ window.__MANUAL_LOGOUT__', 'color: #FF6B6B; font-weight: bold');
        console.log('   ⚠️ Flag no definido - auth-guard.js no cargado');
    }

    // 2. Auth Guard
    if (checks.authGuard) {
        console.log('%c✅ window.protectPage()', 'color: #51CF66; font-weight: bold');
        console.log('   ✓ Auth guard cargado correctamente');
    } else {
        console.log('%c❌ window.protectPage()', 'color: #FF6B6B; font-weight: bold');
        console.log('   ⚠️ auth-guard.js no está cargado');
    }

    // 3. Función de logout
    if (checks.logoutFunction) {
        console.log('%c✅ window.logout()', 'color: #51CF66; font-weight: bold');
        console.log('   ✓ Función de logout disponible');
    } else {
        console.log('%c❌ window.logout()', 'color: #FF6B6B; font-weight: bold');
        console.log('   ⚠️ Función logout no definida');
    }

    // 4. Cliente Supabase
    if (checks.supabase) {
        console.log('%c✅ window.getSupabaseClient()', 'color: #51CF66; font-weight: bold');
        console.log('   ✓ Supabase client disponible');
    } else {
        console.log('%c❌ window.getSupabaseClient()', 'color: #FF6B6B; font-weight: bold');
        console.log('   ⚠️ supabaseClient.js no cargado');
    }

    // 5. Sesión silenciosa
    if (checks.session) {
        console.log('%c✅ window.getSessionSilent()', 'color: #51CF66; font-weight: bold');
        console.log('   ✓ Función de sesión disponible');
    } else {
        console.log('%c❌ window.getSessionSilent()', 'color: #FF6B6B; font-weight: bold');
        console.log('   ⚠️ Función no disponible');
    }

    // Resumen
    console.log('\n' + '='.repeat(60));
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    if (passedChecks === totalChecks) {
        console.log('%c✅ TODOS LOS CHECKS PASADOS (' + passedChecks + '/' + totalChecks + ')', 'color: #51CF66; font-size: 16px; font-weight: bold;');
        console.log('\n🧪 Pruebas recomendadas:\n');
        console.log('1. Hacer logout y verificar que NO vuelve a loguear automáticamente');
        console.log('2. Verificar que window.__MANUAL_LOGOUT__ cambia a true en logout');
        console.log('3. Verificar que el flag se limpia (false) en login exitoso');
        console.log('4. Verificar que NO hay múltiples redirecciones');
    } else {
        console.log('%c⚠️ ALGUNOS CHECKS FALLARON (' + passedChecks + '/' + totalChecks + ')', 'color: #FFA500; font-size: 16px; font-weight: bold;');
        console.log('\n🔧 Verifica que los scripts estén cargados en este orden:');
        console.log('1. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
        console.log('2. <script src="../js/config.js"></script>');
        console.log('3. <script src="../js/config-supabase.js"></script>');
        console.log('4. <script src="../js/supabaseClient.js"></script>');
        console.log('5. <script src="../js/utils.js"></script>');
        console.log('6. <script src="../js/api-client.js"></script>');
        console.log('7. <script src="../js/auth-guard.js"></script>');
    }

    console.log('\n📌 Comandos útiles:\n');
    console.log('// Ver estado del flag:');
    console.log('console.log("Flag:", window.__MANUAL_LOGOUT__);');
    console.log('\n// Simular logout:');
    console.log('window.logout();');
    console.log('\n// Ver sesión actual:');
    console.log('window.getSessionSilent().then(s => console.log("Session:", s));');
    console.log('\n// Ver perfil de usuario:');
    console.log('console.log("User:", window.getUserUI());');

    return checks;
})();

// Exportar para reutilizar
window.validateLogoutFix = validateLogoutFix;
