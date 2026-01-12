/**
 * SUPABASE CLIENT - VANILLA JS v2 (SIN MÓDULOS ES6)
 * 
 * ⚠️ REQUISITO: El script de Supabase v2 debe estar cargado ANTES de este archivo
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * 
 * Este archivo inicializa el cliente Supabase usando la librería ya cargada en window.supabase.
 * Expone window.supabaseClient y funciones de helper para acceder a sesiones.
 */

(function () {
    'use strict';

    // Leer configuración desde window.SUPABASE_CONFIG (inyectado por config-supabase.js)
    const SUPABASE_URL =
        (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.url) ||
        '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY =
        (typeof window !== 'undefined' && window.SUPABASE_CONFIG?.anonKey) ||
        '__SUPABASE_ANON_KEY__';

    let supabaseClient = null;
    let initPromise = null;

    /**
     * Inicializar Supabase Client usando librería ya cargada
     */
    function initSupabase() {
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                // Esperar a que el SDK esté disponible
                let attempts = 0;
                while (typeof window.supabase === 'undefined' && attempts < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
                    console.error('❌ ERROR: Supabase SDK v2 no está disponible en window.supabase');
                    console.error('❌ Verifica que el script se cargó correctamente en el HTML:');
                    console.error('   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
                    console.error('❌ El script debe cargarse ANTES de config-supabase.js y supabaseClient.js');
                    console.error('🔍 Verificando disponibilidad...');
                    console.error('   window.supabase:', typeof window.supabase);
                    console.error('   Object.keys(window):', Object.keys(window).filter(k => k.toLowerCase().includes('supabase')));
                    return null;
                }

                console.log('✅ Supabase SDK v2 cargado correctamente');

                // Validar configuración
                if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
                    SUPABASE_URL === '__SUPABASE_URL__' ||
                    SUPABASE_ANON_KEY === '__SUPABASE_ANON_KEY__') {
                    console.error('❌ ERROR: Configuración Supabase incompleta en config-supabase.js');
                    return null;
                }

                // Crear instancia del cliente usando v2
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        storageKey: 'integrova-auth'
                    }
                });

                if (!supabaseClient) {
                    console.error('❌ No se pudo crear cliente Supabase');
                    return null;
                }

                // Exponer globalmente
                window.supabaseClient = supabaseClient;
                console.log('✅ Supabase v2 client inicializado correctamente');
                console.log('📊 Configuración:', {
                    url: SUPABASE_URL,
                    hasAnonKey: !!SUPABASE_ANON_KEY,
                    keyFormat: SUPABASE_ANON_KEY?.substring(0, 20) + '...'
                });

                return supabaseClient;

            } catch (err) {
                console.error('❌ Error inicializando Supabase:', err);
                return null;
            }
        })();

        return initPromise;
    }

    /**
     * Obtener cliente Supabase (esperar si no está listo)
     */
    window.getSupabaseClient = async function () {
        if (supabaseClient) {
            return supabaseClient;
        }
        return await initSupabase();
    };

    /**
     * Obtener sesión actual
     */
    window.getSupabaseSession = async function () {
        const client = await window.getSupabaseClient();
        if (!client) {
            return { data: { session: null }, error: new Error('Supabase no inicializado') };
        }
        try {
            return await client.auth.getSession();
        } catch (err) {
            return { data: { session: null }, error: err };
        }
    };

    /**
     * Iniciar Supabase al cargar el script
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSupabase);
    } else {
        initSupabase();
    }

    // Exponer promesa de inicialización
    window.supabaseReady = initSupabase();

})();
