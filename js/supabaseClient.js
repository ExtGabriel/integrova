// Shared Supabase client for the browser (CDN-based)
// Uses public anon key only. Do not expose service_role keys here.

// Leer configuración desde window.SUPABASE_CONFIG (debe ser inyectado antes de cargar este módulo)
const SUPABASE_URL =
    (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.url) ||
    '__SUPABASE_URL__';
const SUPABASE_ANON_KEY =
    (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.anonKey) ||
    '__SUPABASE_ANON_KEY__';

let supabaseClient = null;

const supabaseClientPromise = (async () => {
    // Validar que las credenciales estén configuradas
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
        SUPABASE_URL === '__SUPABASE_URL__' ||
        SUPABASE_ANON_KEY === '__SUPABASE_ANON_KEY__') {
        console.warn('⚠️ CONFIGURACIÓN SUPABASE FALTANTE');
        console.warn('📋 Edita /App/js/config-supabase.js con tus credenciales reales antes de desplegar.');
        console.warn('Ejemplo:');
        console.warn('  window.SUPABASE_CONFIG = {');
        console.warn('    url: "https://tu-proyecto.supabase.co",');
        console.warn('    anonKey: "eyJ..."');
        console.warn('  };');
        return null;
    }

    try {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.2/+esm');
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                storageKey: 'cfe-insight-auth'
            }
        });

        if (typeof window !== 'undefined') {
            window.supabaseClient = supabaseClient;
        }

        console.log('✅ Supabase client listo (frontend)');
        return supabaseClient;
    } catch (err) {
        console.error('No se pudo cargar @supabase/supabase-js desde CDN:', err);
        return null;
    }
})();

export { supabaseClientPromise, supabaseClient };

export async function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    supabaseClient = await supabaseClientPromise;
    return supabaseClient;
}

export async function getSupabaseSession() {
    const client = await getSupabaseClient();
    if (!client) {
        return { data: { session: null }, error: new Error('Supabase no está configurado') };
    }
    return client.auth.getSession();
}

if (typeof window !== 'undefined') {
    window.supabaseClientPromise = supabaseClientPromise;
}
