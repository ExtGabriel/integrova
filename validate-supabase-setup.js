/**
 * SCRIPT DE VALIDACIÓN - Supabase SDK v1
 * 
 * Lugar de uso: Ejecutar en la consola del navegador (F12 > Console)
 * 
 * Verifica que:
 * 1. SDK Supabase v1 está cargado
 * 2. Configuración existe
 * 3. Cliente está inicializado
 * 4. API está disponible
 */

(function validateSupabaseSetup() {
    console.clear();
    console.log('%c🔍 VALIDACIÓN DE SUPABASE v1', 'color: #1E90FF; font-size: 18px; font-weight: bold;');
    console.log('=' * 60);

    const checks = {
        supabaseSDK: window.supabase !== undefined && typeof window.supabase.createClient === 'function',
        config: window.SUPABASE_CONFIG !== undefined && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey,
        supabaseClient: window.supabaseClient !== undefined && window.supabaseClient !== null,
        apiMethods: window.API !== undefined &&
            typeof window.API.login === 'function' &&
            typeof window.API.getSession === 'function' &&
            typeof window.API.getMyProfile === 'function' &&
            typeof window.API.signOut === 'function'
    };

    // Mostrar resultado de cada verificación
    console.log('\n%c✅ VERIFICACIONES:', 'color: #32CD32; font-weight: bold;');

    if (checks.supabaseSDK) {
        console.log('✅ SDK Supabase v1 disponible en window.supabase');
    } else {
        console.log('%c❌ SDK Supabase NO está disponible', 'color: #FF4500;');
    }

    if (checks.config) {
        console.log('✅ Configuración Supabase presente');
        console.log('   - URL:', window.SUPABASE_CONFIG.url);
        console.log('   - Anon Key:', window.SUPABASE_CONFIG.anonKey.substring(0, 20) + '...');
    } else {
        console.log('%c❌ Configuración Supabase INCOMPLETA', 'color: #FF4500;');
    }

    if (checks.supabaseClient) {
        console.log('✅ Cliente Supabase inicializado');
        console.log('   - window.supabaseClient:', window.supabaseClient);
    } else {
        console.log('%c❌ Cliente Supabase es NULL - Espera 2 segundos e intenta de nuevo', 'color: #FF4500;');
    }

    if (checks.apiMethods) {
        console.log('✅ API centralizada disponible (window.API)');
        console.log('   - login(email, password)');
        console.log('   - getSession()');
        console.log('   - getMyProfile()');
        console.log('   - signOut()');
    } else {
        console.log('%c❌ Métodos API NO disponibles', 'color: #FF4500;');
    }

    // Resultado final
    const allPassed = Object.values(checks).every(c => c === true);
    console.log('\n' + '=' * 60);

    if (allPassed) {
        console.log('%c✅ TODAS LAS VERIFICACIONES PASARON', 'color: #00AA00; font-size: 16px; font-weight: bold;');
        console.log('%cSistema listo para usar', 'color: #00AA00; font-size: 14px;');
    } else {
        console.log('%c❌ ALGUNAS VERIFICACIONES FALLARON', 'color: #FF4500; font-size: 16px; font-weight: bold;');
        console.log('%cRevisa los errores arriba', 'color: #FF4500; font-size: 14px;');
    }

    console.log('\n%c💡 PRÓXIMOS PASOS:', 'color: #FFD700; font-weight: bold;');
    console.log('Para probar login, ejecuta:');
    console.log('  await window.API.login("tu@correo.com", "tu_contraseña")');
    console.log('\nPara obtener sesión:');
    console.log('  await window.API.getSession()');
    console.log('\nPara obtener perfil:');
    console.log('  await window.API.getMyProfile()');

    return checks;
})();

// Exportar función para reutilizar
window.validateSupabaseSetup = validateSupabaseSetup;