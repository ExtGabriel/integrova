/**
 * SUPABASE CLIENT - VANILLA JS v2 (SIN MÓDULOS ES6)
 * 
 * CRÍTICO: El script de Supabase v2 DEBE estar cargado ANTES de este archivo
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 * 
 * Este archivo inicializa el cliente Supabase usando la librería ya cargada en window.supabase.
 * Expone:
 * - window.supabaseClient: cliente Supabase listo para usar
 * - window.supabaseReady: promise que resuelve cuando Supabase está inicializado
 * - window.getSupabaseClient(): función para obtener el cliente
 * - window.getSupabaseSession(): función para obtener la sesión
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
    let initError = null;

    /**
     * Inicializar Supabase Client usando librería ya cargada
     */
    function initSupabase() {
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                // PASO 1: Esperar a que el SDK esté disponible
                console.log('🔄 Esperando Supabase SDK v2...');
                let attempts = 0;
                while (typeof window.supabase === 'undefined' && attempts < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                // PASO 2: Validar que Supabase SDK cargó correctamente
                if (typeof window.supabase === 'undefined') {
                    const error = '❌ CRÍTICO: Supabase SDK v2 NO CARGÓ';
                    console.error(error);
                    console.error('❌ Verifica que este script está en HTML ANTES de config-supabase.js y supabaseClient.js:');
                    console.error('   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
                    console.error('❌ Estado actual:');
                    console.error('   - window.supabase:', typeof window.supabase);
                    console.error('   - Supabase keys en window:', Object.keys(window).filter(k => k.toLowerCase().includes('supabase')));
                    initError = new Error(error);
                    throw initError;
                }

                if (!window.supabase.createClient || typeof window.supabase.createClient !== 'function') {
                    const error = '❌ CRÍTICO: window.supabase.createClient no es una función';
                    console.error(error);
                    console.error('❌ window.supabase:', window.supabase);
                    initError = new Error(error);
                    throw initError;
                }

                console.log('✅ Supabase SDK v2 disponible correctamente');

                // PASO 3: Validar configuración
                if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
                    const error = '❌ CRÍTICO: Configuración Supabase incompleta (config-supabase.js)';
                    console.error(error);
                    console.error('   - SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'MISSING');
                    console.error('   - SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'OK' : 'MISSING');
                    initError = new Error(error);
                    throw initError;
                }

                if (SUPABASE_URL === '__SUPABASE_URL__' || SUPABASE_ANON_KEY === '__SUPABASE_ANON_KEY__') {
                    const error = '❌ CRÍTICO: Configuración Supabase no reemplazada (placeholders todavía presentes)';
                    console.error(error);
                    initError = new Error(error);
                    throw initError;
                }

                // PASO 4: Crear instancia del cliente
                console.log('🔄 Creando cliente Supabase v2...');
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        storageKey: 'integrova-auth'
                    }
                });

                if (!supabaseClient) {
                    const error = '❌ No se pudo crear cliente Supabase';
                    console.error(error);
                    initError = new Error(error);
                    throw initError;
                }

                // PASO 5: Exponer globalmente
                window.supabaseClient = supabaseClient;
                console.log('✅ Supabase v2 client inicializado correctamente');
                console.log('📊 Configuración Supabase:');
                console.log('   - URL:', SUPABASE_URL);
                console.log('   - AnnonKey (primeros 20 chars):', SUPABASE_ANON_KEY?.substring(0, 20) + '...');
                console.log('   - Storage Key: integrova-auth');

                return supabaseClient;

            } catch (err) {
                console.error('❌ Error CRÍTICO inicializando Supabase:', err.message || err);
                initError = err;
                return null;
            }
        })();

        return initPromise;
    }

    /**
     * Obtener cliente Supabase (esperar si no está listo)
     * Retorna null si hay error
     */
    window.getSupabaseClient = async function () {
        if (supabaseClient) {
            return supabaseClient;
        }

        // Si ya intentamos inicializar y falló
        if (initError) {
            console.error('❌ Supabase inicialización falló previamente:', initError.message);
            return null;
        }

        // Esperar inicialización
        const result = await initSupabase();
        return result;
    };

    /**
     * Obtener sesión actual
     */
    window.getSupabaseSession = async function () {
        const client = await window.getSupabaseClient();
        if (!client) {
            console.error('❌ No se puede obtener sesión: Supabase no inicializado');
            return { data: { session: null }, error: new Error('Supabase no inicializado') };
        }
        try {
            return await client.auth.getSession();
        } catch (err) {
            console.error('❌ Error obteniendo sesión:', err);
            return { data: { session: null }, error: err };
        }
    };

    /**
     * PUNTO DE ENTRADA: Iniciar Supabase cuando el script carga
     */
    console.log('⏳ supabaseClient.js cargado. Iniciando Supabase...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM está listo. Inicializando Supabase...');
            initSupabase();
        });
    } else {
        console.log('📄 DOM ya está listo. Inicializando Supabase...');
        initSupabase();
    }

    // Exponer promesa de inicialización para otros scripts
    window.supabaseReady = initSupabase();

})();
