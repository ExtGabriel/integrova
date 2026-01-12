/**
 * CONFIGURACIÓN SUPABASE - FRONTEND ESTÁTICO
 * 
 * ⚠️ REEMPLAZA LOS PLACEHOLDERS ANTES DE DESPLEGAR A PRODUCCIÓN
 * 
 * Este archivo debe cargarse ANTES de supabaseClient.js en todas las páginas.
 * Solo usa la ANON KEY (pública), nunca la SERVICE_ROLE KEY.
 * 
 * Dónde encontrar tus credenciales:
 * 1. Ve a https://supabase.com/dashboard
 * 2. Selecciona tu proyecto
 * 3. Settings > API
 * 4. Copia:
 *    - Project URL (URL en "Config")
 *    - anon public key (en "Project API keys")
 */

window.SUPABASE_CONFIG = {
    // URL de tu proyecto Supabase (ejemplo: https://abcdefgh.supabase.co)
    url: 'https://xtrsmplqcczubdygftfm.supabase.co',

    // Clave pública "anon" (segura para exponer en frontend)
    anonKey: 'sb_publishable_CFXd3_PcdLHy3FRmg_Bpbg_uSGjoD8z'
};

// Validación automática en desarrollo
if (typeof window !== 'undefined') {
    const isPlaceholder =
        window.SUPABASE_CONFIG.anonKey.includes('REEMPLAZA_ESTE_TOKEN') ||
        !window.SUPABASE_CONFIG.anonKey.trim();

    if (isPlaceholder) {
        console.error('❌ CONFIGURACIÓN INVÁLIDA: La anonKey de Supabase no es válida.');
        console.error('📋 PASOS PARA CONFIGURAR:');
        console.error('1️⃣  Ve a https://supabase.com/dashboard');
        console.error('2️⃣  Inicia sesión con tu cuenta (la que creó el proyecto xtrsmplqcczubdygftfm)');
        console.error('3️⃣  Selecciona el proyecto "xtrsmplqcczubdygftfm"');
        console.error('4️⃣  Ve a Settings > API');
        console.error('5️⃣  En "Project API keys", busca la sección "anon public"');
        console.error('6️⃣  Copia la clave completa');
        console.error('7️⃣  Reemplaza la anonKey en /App/js/config-supabase.js');
        console.error('');
        console.error('⚠️  Sin una clave válida, no podrás iniciar sesión.');
    } else {
        console.log('✅ Configuración de Supabase cargada correctamente');
    }
}
