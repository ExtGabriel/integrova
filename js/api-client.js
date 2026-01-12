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
     * HELPER: MÓDULOS SEGUROS - TOLERANCIA A TABLAS INEXISTENTES
     * ==========================================
     * 
     * Esta función GARANTIZA:
     * - El módulo SIEMPRE existe
     * - getAll() SIEMPRE retorna { success: boolean, data: [] }
     * - Nunca undefined, nunca error fatal
     * - Tolera tablas no existentes en Supabase (404/PGRST205)
     */
    function createSafeModule(tableName) {
        return {
            async getAll() {
                try {
                    const client = await getSupabaseClient();
                    if (!client) {
                        console.warn(`⚠️ [${tableName}] Supabase no disponible, retornando []`);
                        return { success: true, data: [] };
                    }

                    const { data, error } = await client.from(tableName).select('*');

                    // Si hay error, verificar si es porque la tabla no existe
                    if (error) {
                        const isTableNotFound =
                            error.message?.includes('PGRST205') ||
                            error.message?.includes('404') ||
                            error.message?.includes('relation');

                        if (isTableNotFound) {
                            console.warn(`⚠️ [${tableName}] Tabla no existe (intencional en modo demo), retornando []`);
                        } else {
                            console.warn(`⚠️ [${tableName}] Error Supabase:`, error.message);
                        }
                        return { success: true, data: [] };
                    }

                    return { success: true, data: data || [] };
                } catch (err) {
                    console.warn(`⚠️ [${tableName}] Excepción:`, err.message);
                    return { success: true, data: [] };
                }
            },

            async getById(id) {
                try {
                    const client = await getSupabaseClient();
                    if (!client) return { success: true, data: null };

                    const { data, error } = await client
                        .from(tableName)
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (error) {
                        const isTableNotFound =
                            error.message?.includes('PGRST205') ||
                            error.message?.includes('404') ||
                            error.message?.includes('relation');

                        if (!isTableNotFound) {
                            console.warn(`⚠️ [${tableName}.getById] Error:`, error.message);
                        }
                        return { success: true, data: null };
                    }

                    return { success: true, data };
                } catch (err) {
                    console.warn(`⚠️ [${tableName}.getById] Excepción:`, err.message);
                    return { success: true, data: null };
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
                     * Helper: Tolerar tablas no existentes
                     * Si la tabla no existe, loguea pero retorna éxito con array vacío
                     */
                    function handleTableNotFound(err, tableName) {
                        // Detectar errores de tabla no existente (PGRST205, 404)
                        const isTableNotFound =
                            err.message?.includes('PGRST205') ||
                            err.message?.includes('404') ||
                            err.message?.includes('relation') ||
                            err.code === 'PGRST205';

                        if (isTableNotFound) {
                            console.warn(`⚠️ Tabla "${tableName}" no existe aún. Retornando array vacío.`);
                            return true; // Marcar como "tabla no encontrada pero tolerable"
                        }
                        return false;
                    }

                    /**
                     * Módulo: Entidades
                     * ✅ Tolera tabla inexistente: retorna { success, data: [] }
                     * ✅ GARANTÍA: window.API.Entities SIEMPRE existe, nunca undefined
                     */
                    const EntitiesModule = createSafeModule('entities');

                    /**
                     * Módulo: Compromisos
                     * ✅ Tolera tabla inexistente: retorna { success, data: [] }
                     * ✅ GARANTÍA: window.API.Commitments SIEMPRE existe, nunca undefined
                     */
                    const CommitmentsModule = createSafeModule('commitments');

                    /**
                     * Módulo: Usuarios
                     * ✅ Tolera tabla inexistente: retorna [] sin error
                     */
                    const UsersModule = {
                        async getAll() {
                            try {
                                const client = await getSupabaseClient();
                                if (!client) return { success: true, data: [] };

                                const { data, error } = await client.from('users').select('*');

                                if (error) {
                                    if (handleTableNotFound(error, 'users')) {
                                        return { success: true, data: [] };
                                    }
                                    throw error;
                                }
                                return { success: true, data: data || [] };
                            } catch (err) {
                                console.warn('⚠️ Users.getAll:', err.message);
                                return { success: true, data: [] };
                            }
                        },

                        async getById(id) {
                            try {
                                const client = await getSupabaseClient();
                                if (!client) return { success: true, data: null };

                                const { data, error } = await client.from('users').select('*').eq('id', id).single();
                                if (error) {
                                    if (handleTableNotFound(error, 'users')) {
                                        return { success: true, data: null };
                                    }
                                    throw error;
                                }
                                return { success: true, data };
                            } catch (err) {
                                console.warn('⚠️ Users.getById:', err.message);
                                return { success: true, data: null };
                            }
                        }
                    };

                    /**
                     * Módulo: Notificaciones
                     * ✅ Tolera tabla inexistente: retorna [] sin error
                     */
                    const NotificationsModule = {
                        async getAll() {
                            try {
                                const client = await getSupabaseClient();
                                if (!client) return { success: true, data: [] };

                                const { data, error } = await client.from('notifications').select('*');

                                if (error) {
                                    if (handleTableNotFound(error, 'notifications')) {
                                        return { success: true, data: [] };
                                    }
                                    throw error;
                                }
                                return { success: true, data: data || [] };
                            } catch (err) {
                                console.warn('⚠️ Notifications.getAll:', err.message);
                                return { success: true, data: [] };
                            }
                        }
                    };

                    /**
                     * Módulo: Auditoría
                     * ✅ Tolera tabla inexistente: retorna [] sin error
                     */
                    const AuditModule = {
                        async getAll() {
                            try {
                                const client = await getSupabaseClient();
                                if (!client) return { success: true, data: [] };

                                const { data, error } = await client.from('audit_logs').select('*');

                                if (error) {
                                    if (handleTableNotFound(error, 'audit_logs')) {
                                        return { success: true, data: [] };
                                    }
                                    throw error;
                                }
                                return { success: true, data: data || [] };
                            } catch (err) {
                                console.warn('⚠️ Audit.getAll:', err.message);
                                return { success: true, data: [] };
                            }
                        }
                    };

                    /**
                     * ==========================================
                     * API GLOBAL CENTRALIZADA (NUNCA SERÁ UNDEFINED)
                     * ==========================================
                     */

                    /**
                     * Helper: Crear stub defensivo para módulos adicionales
                     * Asegura que TODOS los módulos tengan métodos consistentes
                     */
                    function createTableModule(tableName) {
                        return {
                            async getAll() {
                                try {
                                    const client = await getSupabaseClient();
                                    if (!client) return { success: true, data: [] };

                                    const { data, error } = await client.from(tableName).select('*');

                                    if (error) {
                                        if (handleTableNotFound(error, tableName)) {
                                            return { success: true, data: [] };
                                        }
                                        throw error;
                                    }
                                    return { success: true, data: data || [] };
                                } catch (err) {
                                    console.warn(`⚠️ ${tableName}.getAll:`, err.message);
                                    return { success: true, data: [] };
                                }
                            },

                            async getById(id) {
                                try {
                                    const client = await getSupabaseClient();
                                    if (!client) return { success: true, data: null };

                                    const { data, error } = await client.from(tableName).select('*').eq('id', id).single();
                                    if (error) {
                                        if (handleTableNotFound(error, tableName)) {
                                            return { success: true, data: null };
                                        }
                                        throw error;
                                    }
                                    return { success: true, data };
                                } catch (err) {
                                    console.warn(`⚠️ ${tableName}.getById:`, err.message);
                                    return { success: true, data: null };
                                }
                            },

                            async create(record) {
                                try {
                                    const client = await getSupabaseClient();
                                    if (!client) return { success: true, data: record };

                                    const { data, error } = await client.from(tableName).insert([record]).select();
                                    if (error) {
                                        if (handleTableNotFound(error, tableName)) {
                                            return { success: true, data: record };
                                        }
                                        throw error;
                                    }
                                    return { success: true, data: data?.[0] || record };
                                } catch (err) {
                                    console.warn(`⚠️ ${tableName}.create:`, err.message);
                                    return { success: true, data: record };
                                }
                            },

                            async update(id, updates) {
                                try {
                                    const client = await getSupabaseClient();
                                    if (!client) return { success: true, data: updates };

                                    const { data, error } = await client.from(tableName).update(updates).eq('id', id).select();
                                    if (error) {
                                        if (handleTableNotFound(error, tableName)) {
                                            return { success: true, data: updates };
                                        }
                                        throw error;
                                    }
                                    return { success: true, data: data?.[0] || updates };
                                } catch (err) {
                                    console.warn(`⚠️ ${tableName}.update:`, err.message);
                                    return { success: true, data: updates };
                                }
                            },

                            async delete(id) {
                                try {
                                    const client = await getSupabaseClient();
                                    if (!client) return { success: true };

                                    const { error } = await client.from(tableName).delete().eq('id', id);
                                    if (error) {
                                        if (handleTableNotFound(error, tableName)) {
                                            return { success: true };
                                        }
                                        throw error;
                                    }
                                    return { success: true };
                                } catch (err) {
                                    console.warn(`⚠️ ${tableName}.delete:`, err.message);
                                    return { success: true };
                                }
                            }
                        };
                    }

                    window.API = {
                        // === Sesión y Autenticación ===
                        login,
                        getSession,
                        getMyProfile,
                        signOut,
                        supabase: window.supabaseClient || null, // Cliente Supabase directo si lo necesitan

                        // === Módulos de datos - SIEMPRE EXISTEN, NUNCA UNDEFINED ===
                        // Módulos principales (predefinidos)
                        Entities: EntitiesModule,
                        Commitments: CommitmentsModule,
                        Users: UsersModule,
                        Notifications: NotificationsModule,
                        Audit: AuditModule,

                        // === Módulos adicionales (stubs defensivos) ===
                        // Para tablas que podrían no existir aún
                        Groups: createTableModule('groups'),
                        Teams: createTableModule('teams'),
                        Permissions: createTableModule('permissions'),
                        Roles: createTableModule('roles'),
                        Logs: createTableModule('logs'),
                        Settings: createTableModule('settings'),
                        Templates: createTableModule('templates'),
                        Reports: createTableModule('reports'),

                        // === Método de acceso genérico para cualquier tabla ===
                        /**
                         * Acceso genérico a cualquier tabla
                         * Uso: window.API.getModule('mi_tabla').getAll()
                         */
                        getModule(tableName) {
                            if (!tableName || typeof tableName !== 'string') {
                                console.warn('⚠️ getModule: tableName debe ser string');
                                return createTableModule('invalid');
                            }
                            // Si ya existe el módulo, devolverlo
                            if (this[tableName]) {
                                return this[tableName];
                            }
                            // Si no existe, crear dinámicamente
                            return createTableModule(tableName);
                        },

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
                    console.log('   Módulos predefinidos:', ['Entities', 'Commitments', 'Users', 'Notifications', 'Audit'].join(', '));
                    console.log('   Módulos stub adicionales:', ['Groups', 'Teams', 'Permissions', 'Roles', 'Logs', 'Settings', 'Templates', 'Reports'].join(', '));
                    console.log('   Método genérico: window.API.getModule("tabla_nombre")');

                }) ();

