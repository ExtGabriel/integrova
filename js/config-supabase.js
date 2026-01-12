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
if (typeof window !== 'undefined' &&
    (window.SUPABASE_CONFIG.url === 'https://xtrsmplqcczubdygftfm.supabase.co' ||
    window.SUPABASE_CONFIG.anonKey === 'sb_publishable_CFXd3_PcdLHy3FRmg_Bpbg_uSGjoD8z')) {
    console.warn('🔧 CONFIGURACIÓN PENDIENTE: Edita /App/js/config-supabase.js con tus credenciales reales.');
}
