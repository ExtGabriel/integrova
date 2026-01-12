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
    // ⚠️ REEMPLAZA CON TU CLAVE REAL - Las claves de Supabase son tokens JWT largos que empiezan con "eyJ"
    // Ejemplo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cnNtcGxxY2N6dWJkeWdmdGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODkxNjA1MjcsImV4cCI6MjAwNDczNjUyN30.abc123...'
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cnNtcGxxY2N6dWJkeWdmdGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODkxNjA1MjcsImV4cCI6MjAwNDczNjUyN30.REEMPLAZA_ESTE_TOKEN_CON_TU_CLAVE_REAL'
};

// Validación automática en desarrollo
if (typeof window !== 'undefined') {
    const isPlaceholder =
        window.SUPABASE_CONFIG.anonKey.includes('sb_publishable_CFXd3_PcdLHy3FRmg_Bpbg_uSGjoD8z') ||
        window.SUPABASE_CONFIG.anonKey === 'sb_publishable_CFXd3_PcdLHy3FRmg_Bpbg_uSGjoD8z' ||
        !window.SUPABASE_CONFIG.anonKey.startsWith('eyJ');

    if (isPlaceholder) {
        console.error('❌ CONFIGURACIÓN INVÁLIDA: La anonKey de Supabase no es válida.');
        console.error('📋 PASOS PARA CONFIGURAR:');
        console.error('1. Ve a https://supabase.com/dashboard');
        console.error('2. Selecciona tu proyecto "xtrsmplqcczubdygftfm"');
        console.error('3. Settings > API');
        console.error('4. Copia la "anon public" key (un token JWT largo que empieza con eyJ)');
        console.error('5. Reemplaza la anonKey en /App/js/config-supabase.js');
    }
}
