/**
 * SUPABASE CLIENT - VANILLA JS (SIN MÓDULOS ES6)
 * 
 * Carga el cliente Supabase desde CDN como un script global.
 * Expone window.supabaseClient listo para usar.
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
     * Inicializar Supabase Client
     */
    function initSupabase() {
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                // Validar configuración
                if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
                    SUPABASE_URL === '__SUPABASE_URL__' ||
                    SUPABASE_ANON_KEY === '__SUPABASE_ANON_KEY__') {
                    console.error('❌ ERROR: Configuración Supabase incompleta en config-supabase.js');
                    return null;
                }

                // Cargar librería Supabase desde CDN
                const script = await loadSupabaseSDK();
                if (!script) {
                    console.error('❌ No se pudo cargar Supabase SDK desde CDN');
                    return null;
                }

                // Obtener createClient de la librería global
                if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
                    console.error('❌ Supabase SDK no está disponible en window.supabase');
                    return null;
                }

                // Crear instancia del cliente
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        storageKey: 'cfe-insight-auth'
                    }
                });

                if (!supabaseClient) {
                    console.error('❌ No se pudo crear cliente Supabase');
                    return null;
                }

                // Exponer globalmente
                window.supabaseClient = supabaseClient;
                console.log('✅ Supabase client inicializado correctamente');

                return supabaseClient;

            } catch (err) {
                console.error('❌ Error inicializando Supabase:', err);
                return null;
            }
        })();

        return initPromise;
    }

    /**
     * Cargar Supabase SDK desde CDN
     */
    function loadSupabaseSDK() {
        return new Promise((resolve, reject) => {
            // Si ya está cargado, resolver inmediatamente
            if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                resolve(true);
                return;
            }

            // Crear script tag para cargar desde CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.2/dist/module.umd.js';
            script.async = true;
            script.crossOrigin = 'anonymous';

            script.onload = () => {
                console.log('✅ Supabase SDK cargado desde CDN');
                resolve(true);
            };

            script.onerror = () => {
                console.error('❌ Error al cargar Supabase SDK desde CDN');
                reject(new Error('Failed to load Supabase SDK'));
            };

            document.head.appendChild(script);
        });
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
