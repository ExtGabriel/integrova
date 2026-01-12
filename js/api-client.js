/**
 * CFE INSIGHT - API CLIENT (VANILLA JS) - ESTABILIZADO
 * 
 * Cliente centralizado DEFENSIVO para Supabase + APIs.
 * Expone window.API con métodos seguros.
 * 
 * CRÍTICO:
 * - supabaseClient.js DEBE cargarse antes
 * - window.API SIEMPRE existirá (nunca será undefined)
 * - Todos los módulos tienen stubs seguros
 * - No hay propiedades undefined
 */

(function () {
    'use strict';

    console.log('⏳ api-client.js: Inicializando...');

    /**
     * ==========================================
     * INICIALIZACIÓN
     * ==========================================
     */

    // Esperar a que Supabase esté inicializado
    let supabaseReady = window.supabaseReady || Promise.resolve();
    if (!supabaseReady || !supabaseReady.then) {
        supabaseReady = Promise.resolve();
    }

    // Estado global
    let currentSession = null;
    let currentProfile = null;

    /**
     * Helper: Validar que Supabase está disponible
     */
    async function getSupabaseClient() {
        if (window.getSupabaseClient) {
            return await window.getSupabaseClient();
        }
        console.error('❌ api-client.js: getSupabaseClient no disponible');
        return null;
    }

    /**
     * ==========================================
     * FUNCIONES CORE DE SESIÓN Y PERFIL
     * ==========================================
     */

    /**
     * Obtener sesión actual desde Supabase
     */
    async function getSession() {
        try {
            if (!window.getSupabaseSession) {
                console.warn('⚠️ getSupabaseSession no disponible');
                return null;
            }

            const { data, error } = await window.getSupabaseSession();
            if (error || !data.session) {
                return null;
            }

            currentSession = data.session;
            return currentSession;
        } catch (err) {
            console.error('❌ Error obteniendo sesión:', err);
            return null;
        }
    }

    /**
     * Obtener perfil del usuario autenticado
     */
    async function getMyProfile() {
        try {
            const client = await getSupabaseClient();
            if (!client) {
                console.error('❌ Supabase no disponible para getMyProfile');
                return null;
            }

            // Obtener usuario autenticado
            const { data: { user }, error: userError } = await client.auth.getUser();
            if (userError || !user) {
                console.error('❌ No hay usuario autenticado:', userError?.message);
                return null;
            }

            // Obtener perfil de users table
            const { data, error } = await client
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('❌ Error cargando perfil:', error);
                return null;
            }

            currentProfile = data;
            return data;
        } catch (err) {
            console.error('❌ Error en getMyProfile:', err);
            return null;
        }
    }

    /**
     * Cerrar sesión
     */
    async function signOut() {
        try {
            const client = await getSupabaseClient();
            if (client) {
                await client.auth.signOut();
            }
            currentSession = null;
            currentProfile = null;
            sessionStorage.removeItem('userUI');
            return { success: true };
        } catch (err) {
            console.error('❌ Error cerrando sesión:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Iniciar sesión
     */
    async function login(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email y contraseña son requeridos');
            }

            const client = await getSupabaseClient();
            if (!client) {
                throw new Error('Supabase no está inicializado');
            }

            const { data, error } = await client.auth.signInWithPassword({ email, password });

            if (error) {
                throw error;
            }

            if (!data || !data.session) {
                throw new Error('No se pudo establecer la sesión');
            }

            currentSession = data.session;
            return { success: true, session: data.session };
        } catch (err) {
            console.error('❌ Error en login:', err);
            return { success: false, error: err.message || err };
        }
    }

    /**
     * ==========================================
     * MÓDULOS DE API - STUBS SEGUROS
     * ==========================================
     */

    /**
     * Módulo: Entidades
     */
    const EntitiesModule = {
        async getAll() {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: false, data: [], error: 'Supabase no disponible' };

                const { data, error } = await client.from('entities').select('*');
                if (error) throw error;
                return { success: true, data: data || [] };
            } catch (err) {
                console.error('❌ Error en Entities.getAll:', err);
                return { success: false, data: [], error: err.message };
            }
        },

        async getById(id) {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: false, data: null, error: 'Supabase no disponible' };

                const { data, error } = await client.from('entities').select('*').eq('id', id).single();
                if (error) throw error;
                return { success: true, data };
            } catch (err) {
                console.error('❌ Error en Entities.getById:', err);
                return { success: false, data: null, error: err.message };
            }
        }
    };

    /**
     * Módulo: Compromisos
     */
    const CommitmentsModule = {
        async getAll() {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: false, data: [], error: 'Supabase no disponible' };

                const { data, error } = await client.from('commitments').select('*');
                if (error) throw error;
                return { success: true, data: data || [] };
            } catch (err) {
                console.error('❌ Error en Commitments.getAll:', err);
                return { success: false, data: [], error: err.message };
            }
        },

        async getById(id) {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: false, data: null, error: 'Supabase no disponible' };

                const { data, error } = await client.from('commitments').select('*').eq('id', id).single();
                if (error) throw error;
                return { success: true, data };
            } catch (err) {
                console.error('❌ Error en Commitments.getById:', err);
                return { success: false, data: null, error: err.message };
            }
        }
    };

    /**
     * Módulo: Usuarios
     */
    const UsersModule = {
        async getAll() {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: false, data: [], error: 'Supabase no disponible' };

                const { data, error } = await client.from('users').select('*');
                if (error) throw error;
                return { success: true, data: data || [] };
            } catch (err) {
                console.error('❌ Error en Users.getAll:', err);
                return { success: false, data: [], error: err.message };
            }
        },

        async getById(id) {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: false, data: null, error: 'Supabase no disponible' };

                const { data, error } = await client.from('users').select('*').eq('id', id).single();
                if (error) throw error;
                return { success: true, data };
            } catch (err) {
                console.error('❌ Error en Users.getById:', err);
                return { success: false, data: null, error: err.message };
            }
        }
    };

    /**
     * Módulo: Notificaciones
     */
    const NotificationsModule = {
        async getAll() {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: false, data: [], error: 'Supabase no disponible' };

                const { data, error } = await client.from('notifications').select('*');
                if (error) throw error;
                return { success: true, data: data || [] };
            } catch (err) {
                console.error('⚠️ Notificaciones no disponibles (OK en demo):', err.message);
                return { success: true, data: [] }; // Retornar lista vacía en lugar de error
            }
        }
    };

    /**
     * Módulo: Auditoría
     */
    const AuditModule = {
        async getAll() {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: false, data: [], error: 'Supabase no disponible' };

                const { data, error } = await client.from('audit_logs').select('*');
                if (error) throw error;
                return { success: true, data: data || [] };
            } catch (err) {
                console.error('⚠️ Auditoría no disponible (OK en demo):', err.message);
                return { success: true, data: [] };
            }
        }
    };

    /**
     * ==========================================
     * API GLOBAL CENTRALIZADA (NUNCA SERÁ UNDEFINED)
     * ==========================================
     */

    window.API = {
        // === Sesión y Autenticación ===
        login,
        getSession,
        getMyProfile,
        signOut,
        supabase: window.supabaseClient || null, // Cliente Supabase directo si lo necesitan

        // === Módulos de datos ===
        Entities: EntitiesModule,
        Commitments: CommitmentsModule,
        Users: UsersModule,
        Notifications: NotificationsModule,
        Audit: AuditModule,

        // === Funciones auxiliares de UI ===
        showError(message, containerId = 'alertContainer') {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('❌ Container no encontrado:', containerId);
                alert(message);
                return;
            }
            container.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="bi bi-exclamation-triangle"></i> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            setTimeout(() => { container.innerHTML = ''; }, 5000);
        },

        showSuccess(message, containerId = 'alertContainer') {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('❌ Container no encontrado:', containerId);
                alert(message);
                return;
            }
            container.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="bi bi-check-circle"></i> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            setTimeout(() => { container.innerHTML = ''; }, 3000);
        },

        showLoading(show, containerId = 'loadingContainer') {
            const container = document.getElementById(containerId);
            if (!container) return;
            if (show) {
                container.innerHTML = `
                    <div class="text-center my-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="mt-2">Cargando datos...</p>
                    </div>
                `;
                container.style.display = 'block';
            } else {
                container.innerHTML = '';
                container.style.display = 'none';
            }
        }
    };

    console.log('✅ api-client.js: API Client inicializado (window.API SIEMPRE disponible)');

})();

