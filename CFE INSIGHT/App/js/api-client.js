/**
 * CFE INSIGHT - API CLIENT (VANILLA JS) - ESTABILIZADO v2
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

    console.log('⏳ api-client.js v2: Inicializando con API.Entities.delete()...');

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
                }
            }
        };
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
     * ✅ Implementación completa con RLS activo
     * ✅ list(), create(), assignUser()
     * ✅ Patrón defensivo: verifica permisos y disponibilidad
     * ✅ GARANTÍA: window.API.Entities SIEMPRE existe, nunca undefined
     */
    const EntitiesModule = {
        /**
         * Listar todas las entidades visibles para el usuario actual
         * RLS filtra automáticamente según permisos
         * @returns {Promise<{data: Array, error: null|string}>}
         */
        async list() {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    console.error('❌ [Entities.list] Supabase no disponible');
                    return { data: [], error: 'Supabase no disponible' };
                }

                // RLS aplica automáticamente los filtros
                const { data, error } = await client
                    .from('entities')
                    .select('*')
                    .order('name', { ascending: true });

                if (error) {
                    // Tolerar tabla inexistente en desarrollo
                    if (handleTableNotFound(error, 'entities')) {
                        return { data: [], error: null };
                    }
                    console.error('❌ [Entities.list] Error Supabase:', error.message);
                    return { data: [], error: error.message };
                }

                // Garantizar que siempre retornamos un array
                return { data: data || [], error: null };
            } catch (err) {
                console.error('❌ [Entities.list] Excepción:', err);
                return { data: [], error: err.message };
            }
        },

        /**
         * Crear una nueva entidad (solo admins)
         * @param {Object} data - { name: string, responsible: string }
         * @returns {Promise<{data: Object|null, error: null|string}>}
         */
        async create(data) {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    console.error('❌ [Entities.create] Supabase no disponible');
                    return { data: null, error: 'Supabase no disponible' };
                }

                // Verificar permisos de administrador
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    console.error('❌ [Entities.create] Usuario no autenticado');
                    return { data: null, error: 'Usuario no autenticado' };
                }

                const userRole = window.currentUser.role.toLowerCase().trim();
                const adminRoles = ['administrador', 'programador', 'socio', 'admin'];

                if (!adminRoles.includes(userRole)) {
                    console.error('❌ [Entities.create] Permiso denegado. Rol:', userRole);
                    return { data: null, error: 'Solo administradores pueden crear entidades' };
                }

                // Validar datos requeridos
                if (!data || !data.name) {
                    console.error('❌ [Entities.create] Nombre es requerido');
                    return { data: null, error: 'El nombre de la entidad es requerido' };
                }

                // Preparar datos para inserción
                const entityData = {
                    name: data.name,
                    responsible: data.responsible || null
                    // created_by se llena automáticamente por trigger
                };

                const { data: newEntity, error } = await client
                    .from('entities')
                    .insert(entityData)
                    .select()
                    .single();

                if (error) {
                    console.error('❌ [Entities.create] Error Supabase:', error.message);
                    return { data: null, error: error.message };
                }

                console.log('✅ [Entities.create] Entidad creada:', newEntity);
                return { data: newEntity, error: null };
            } catch (err) {
                console.error('❌ [Entities.create] Excepción:', err);
                return { data: null, error: err.message };
            }
        },

        /**
         * Asignar un usuario a una entidad (solo admins)
         * @param {string|number} entityId - ID de la entidad
         * @param {string} userId - ID del usuario
         * @param {string} role - Rol del usuario en la entidad
         * @returns {Promise<{data: Object|null, error: null|string}>}
         */
        async assignUser(entityId, userId, role = 'member') {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    console.error('❌ [Entities.assignUser] Supabase no disponible');
                    return { data: null, error: 'Supabase no disponible' };
                }

                // Verificar permisos de administrador
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    console.error('❌ [Entities.assignUser] Usuario no autenticado');
                    return { data: null, error: 'Usuario no autenticado' };
                }

                const userRole = window.currentUser.role.toLowerCase().trim();
                const adminRoles = ['administrador', 'programador', 'socio', 'admin'];

                if (!adminRoles.includes(userRole)) {
                    console.error('❌ [Entities.assignUser] Permiso denegado. Rol:', userRole);
                    return { data: null, error: 'Solo administradores pueden asignar usuarios' };
                }

                // Validar parámetros
                if (!entityId || !userId) {
                    console.error('❌ [Entities.assignUser] entityId y userId son requeridos');
                    return { data: null, error: 'entityId y userId son requeridos' };
                }

                // Insertar en entity_users
                const assignmentData = {
                    entity_id: entityId,
                    user_id: userId,
                    role: role
                };

                const { data: assignment, error } = await client
                    .from('entity_users')
                    .insert(assignmentData)
                    .select()
                    .single();

                if (error) {
                    console.error('❌ [Entities.assignUser] Error Supabase:', error.message);
                    return { data: null, error: error.message };
                }

                console.log('✅ [Entities.assignUser] Usuario asignado:', assignment);
                return { data: assignment, error: null };
            } catch (err) {
                console.error('❌ [Entities.assignUser] Excepción:', err);
                return { data: null, error: err.message };
            }
        },

        // Mantener compatibilidad con el patrón anterior
        async getAll() {
            const result = await this.list();
            return { success: !result.error, data: result.data };
        },

        async getById(id) {
            try {
                const client = await getSupabaseClient();
                if (!client) return { success: true, data: null };

                const { data, error } = await client
                    .from('entities')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    const isTableNotFound =
                        error.message?.includes('PGRST205') ||
                        error.message?.includes('404') ||
                        error.message?.includes('relation');

                    if (!isTableNotFound) {
                        console.warn('⚠️ [Entities.getById] Error:', error.message);
                    }
                    return { success: true, data: null };
                }

                return { success: true, data };
            } catch (err) {
                console.warn('⚠️ [Entities.getById] Excepción:', err.message);
                return { success: true, data: null };
            }
        },

        /**
         * Actualizar una entidad existente (solo admins)
         * @param {string|number} entityId - ID de la entidad
         * @param {Object} updates - Datos a actualizar
         * @returns {Promise<{data: Object|null, error: null|string}>}
         */
        async update(entityId, updates) {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    console.error('❌ [Entities.update] Supabase no disponible');
                    return { data: null, error: 'Supabase no disponible' };
                }

                // Verificar permisos de administrador
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    console.error('❌ [Entities.update] Usuario no autenticado');
                    return { data: null, error: 'Usuario no autenticado' };
                }

                const userRole = window.currentUser.role.toLowerCase().trim();
                const adminRoles = ['administrador', 'programador', 'socio', 'admin'];

                if (!adminRoles.includes(userRole)) {
                    console.error('❌ [Entities.update] Permiso denegado. Rol:', userRole);
                    return { data: null, error: 'Solo administradores pueden actualizar entidades' };
                }

                // Validar parámetros
                if (!entityId) {
                    console.error('❌ [Entities.update] ID es requerido');
                    return { data: null, error: 'El ID de la entidad es requerido' };
                }

                if (!updates || typeof updates !== 'object') {
                    console.error('❌ [Entities.update] Datos de actualización inválidos');
                    return { data: null, error: 'Datos de actualización inválidos' };
                }

                const { data, error } = await client
                    .from('entities')
                    .update(updates)
                    .eq('id', entityId)
                    .select()
                    .single();

                if (error) {
                    console.error('❌ [Entities.update] Error Supabase:', error.message);
                    return { data: null, error: error.message };
                }

                console.log('✅ [Entities.update] Entidad actualizada:', data);
                return { data: data, error: null };
            } catch (err) {
                console.error('❌ [Entities.update] Excepción:', err);
                return { data: null, error: err.message };
            }
        },

        /**
         * Eliminar una entidad (solo admins)
         * @param {string} entityId - ID de la entidad
         * @returns {Promise<{data: Object|null, error: null|string}>}
         */
        async delete(entityId) {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    console.error('❌ [Entities.delete] Supabase no disponible');
                    return { data: null, error: 'Supabase no disponible' };
                }

                // Verificar permisos de administrador
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    console.error('❌ [Entities.delete] Usuario no autenticado');
                    return { data: null, error: 'Usuario no autenticado' };
                }

                const userRole = window.currentUser.role.toLowerCase().trim();
                const adminRoles = ['administrador', 'programador', 'socio', 'admin'];

                if (!adminRoles.includes(userRole)) {
                    console.error('❌ [Entities.delete] Permiso denegado. Rol:', userRole);
                    return { data: null, error: 'Solo administradores pueden eliminar entidades' };
                }

                // Validar ID
                if (!entityId) {
                    console.error('❌ [Entities.delete] ID es requerido');
                    return { data: null, error: 'El ID de la entidad es requerido' };
                }

                const { data, error } = await client
                    .from('entities')
                    .delete()
                    .eq('id', entityId)
                    .select()
                    .single();

                if (error) {
                    console.error('❌ [Entities.delete] Error Supabase:', error.message);
                    return { data: null, error: error.message };
                }

                console.log('✅ [Entities.delete] Entidad eliminada:', entityId);
                return { data: data || { id: entityId }, error: null };
            } catch (err) {
                console.error('❌ [Entities.delete] Excepción:', err);
                return { data: null, error: err.message };
            }
        }
    };

    /**
     * Módulo: Entity Users (Usuarios asignados a entidades)
     * ✅ Gestiona la tabla entity_users con RLS
     */
    const EntityUsersModule = {
        /**
         * Listar usuarios asignados a una entidad específica
         * @param {string|number} entityId - ID de la entidad
         * @returns {Promise<{data: Array, error: null|string}>}
         */
        async listByEntity(entityId) {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    console.error('❌ [EntityUsers.listByEntity] Supabase no disponible');
                    return { data: [], error: 'Supabase no disponible' };
                }

                if (!entityId) {
                    console.error('❌ [EntityUsers.listByEntity] entityId es requerido');
                    return { data: [], error: 'entityId es requerido' };
                }

                // Unir entity_users con users para obtener información completa
                const { data, error } = await client
                    .from('entity_users')
                    .select(`
                        id,
                        entity_id,
                        user_id,
                        role,
                        created_at,
                        users:user_id (
                            id,
                            name,
                            email,
                            role
                        )
                    `)
                    .eq('entity_id', entityId);

                if (error) {
                    // Tolerar tabla inexistente
                    if (handleTableNotFound(error, 'entity_users')) {
                        return { data: [], error: null };
                    }
                    console.error('❌ [EntityUsers.listByEntity] Error Supabase:', error.message);
                    return { data: [], error: error.message };
                }

                // Transformar datos para compatibilidad
                const transformedData = (data || []).map(item => ({
                    id: item.id,
                    entity_id: item.entity_id,
                    user_id: item.user_id,
                    role: item.role,
                    created_at: item.created_at,
                    user_name: item.users?.name || 'Usuario desconocido',
                    user_email: item.users?.email || '',
                    user_role: item.users?.role || ''
                }));

                return { data: transformedData, error: null };
            } catch (err) {
                console.error('❌ [EntityUsers.listByEntity] Excepción:', err);
                return { data: [], error: err.message };
            }
        },

        /**
         * Asignar un usuario a una entidad
         * @param {string|number} entityId - ID de la entidad
         * @param {string} userId - ID del usuario
         * @param {string} role - Rol del usuario en la entidad (ej: 'admin', 'member', 'viewer')
         * @returns {Promise<{data: Object|null, error: null|string}>}
         */
        async create(entityId, userId, role = 'member') {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    console.error('❌ [EntityUsers.create] Supabase no disponible');
                    return { data: null, error: 'Supabase no disponible' };
                }

                // Validar parámetros
                if (!entityId || !userId) {
                    console.error('❌ [EntityUsers.create] entityId y userId son requeridos');
                    return { data: null, error: 'entityId y userId son requeridos' };
                }

                // Verificar permisos de administrador
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    console.error('❌ [EntityUsers.create] Usuario no autenticado');
                    return { data: null, error: 'Usuario no autenticado' };
                }

                const userRole = window.currentUser.role.toLowerCase().trim();
                const adminRoles = ['administrador', 'programador', 'socio', 'admin'];

                if (!adminRoles.includes(userRole)) {
                    console.error('❌ [EntityUsers.create] Permiso denegado. Rol:', userRole);
                    return { data: null, error: 'Solo administradores pueden asignar usuarios' };
                }

                // Insertar en entity_users
                const assignmentData = {
                    entity_id: entityId,
                    user_id: userId,
                    role: role
                };

                const { data, error } = await client
                    .from('entity_users')
                    .insert(assignmentData)
                    .select()
                    .single();

                if (error) {
                    console.error('❌ [EntityUsers.create] Error Supabase:', error.message);
                    return { data: null, error: error.message };
                }

                console.log('✅ [EntityUsers.create] Usuario asignado:', data);
                return { data: data, error: null };
            } catch (err) {
                console.error('❌ [EntityUsers.create] Excepción:', err);
                return { data: null, error: err.message };
            }
        }
    };

    /**
     * Módulo: Compromisos
     * ✅ Tolera tabla inexistente: retorna { success, data: [] }
     * ✅ GARANTÍA: window.API.Commitments SIEMPRE existe, nunca undefined
     */
    const CommitmentsModule = createSafeModule('commitments');

    /**
     * Módulo: Usuarios
     * ✅ Tolera tabla inexistente: retorna [] sin error
     * ✅ Métodos defensivos para cambiar roles, estado, permisos
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
                    // Log más detallado del error
                    console.error('❌ Users.getAll error:', {
                        message: error.message,
                        code: error.code,
                        details: error.details,
                        hint: error.hint
                    });
                    throw error;
                }
                return { success: true, data: data || [] };
            } catch (err) {
                console.error('⚠️ Users.getAll excepción:', err.message, err);
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
        },

        /**
         * Crear un nuevo usuario
         * @param {Object} userData - { email, password, name, role, phone, team }
         * @returns {Promise<{success: boolean, data: *, error: *}>}
         */
        async create(userData) {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    return { success: false, error: 'Supabase no disponible' };
                }

                // Verificar permisos de administrador
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    return { success: false, error: 'Usuario no autenticado' };
                }

                const userRole = window.currentUser.role.toLowerCase().trim();
                const adminRoles = ['administrador', 'programador', 'socio', 'admin'];

                if (!adminRoles.includes(userRole)) {
                    return { success: false, error: 'Solo administradores pueden crear usuarios' };
                }

                // Validar datos requeridos
                if (!userData.email || !userData.password || !userData.name || !userData.role) {
                    return { success: false, error: 'Email, contraseña, nombre y rol son requeridos' };
                }

                // Crear usuario en Auth
                const { data: authData, error: authError } = await client.auth.signUp({
                    email: userData.email,
                    password: userData.password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            name: userData.name,
                            role: userData.role
                        }
                    }
                });

                if (authError) {
                    console.error('❌ Users.create auth error:', authError);
                    return { success: false, error: authError.message || 'Error al crear usuario en Auth' };
                }

                // Insertar/actualizar en tabla users
                const userRecord = {
                    id: authData.user.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role.toLowerCase(),
                    phone: userData.phone || null,
                    team: userData.team || null,
                    active: true,
                    username: userData.email.split('@')[0]
                };

                const { data: dbData, error: dbError } = await client
                    .from('users')
                    .upsert(userRecord)
                    .select()
                    .single();

                if (dbError) {
                    console.error('❌ Users.create DB error:', dbError);
                    return { success: false, error: dbError.message || 'Error al guardar usuario en BD' };
                }

                console.log('✅ Usuario creado exitosamente:', dbData);
                return { success: true, data: dbData };
            } catch (err) {
                console.error('❌ Users.create excepción:', err);
                return { success: false, error: err.message || 'Error desconocido al crear usuario' };
            }
        },

        /**
         * Cambiar rol de un usuario
         * @param {string} userId - ID del usuario
         * @param {string} newRole - Nuevo rol (cliente, auditor, supervisor, etc.)
         * @returns {Promise<{success: boolean, data: *, error: *}>}
         */
        async updateRole(userId, newRole) {
            try {
                if (!userId || !newRole || typeof newRole !== 'string') {
                    return {
                        success: false,
                        error: 'userId y newRole son requeridos y newRole debe ser string'
                    };
                }

                const client = await getSupabaseClient();
                if (!client) {
                    return { success: false, error: 'Supabase no disponible' };
                }

                const { data, error } = await client
                    .from('users')
                    .update({ role: newRole.toLowerCase() })
                    .eq('id', userId)
                    .select();

                if (error) {
                    // Log detallado del error
                    console.error('❌ Users.updateRole error completo:', {
                        message: error.message,
                        code: error.code,
                        details: error.details,
                        hint: error.hint
                    });

                    // Manejo de errores específicos
                    if (error.code === 'PGRST301' || error.code === '42501') {
                        return { success: false, error: '❌ Acceso denegado: No tienes permiso para cambiar roles' };
                    }
                    if (error.code === '401' || error.message?.includes('401')) {
                        return { success: false, error: '❌ No autorizado: Necesitas autenticarte' };
                    }
                    if (error.code === 'PGRST116' || error.code === '42P01') {
                        return { success: false, error: '❌ Tabla de usuarios no existe' };
                    }
                    // Error 400 - probablemente validación de datos
                    if (error.code === '400' || error.message?.includes('400')) {
                        return { success: false, error: `❌ Datos inválidos: ${error.message}` };
                    }

                    // Error genérico con mensaje real
                    return { success: false, error: error.message || 'Error al cambiar rol' };
                }

                console.log(`✅ Rol actualizado para usuario ${userId} → ${newRole}`);
                return { success: true, data: data?.[0] || null };
            } catch (err) {
                console.error('❌ Users.updateRole excepción:', err.message);
                return { success: false, error: err.message };
            }
        },

        /**
         * Activar/desactivar usuario
         * @param {string} userId - ID del usuario
         * @param {boolean} isActive - true para activar, false para desactivar
         * @returns {Promise<{success: boolean, data: *, error: *}>}
         */
        async toggleActive(userId, isActive) {
            try {
                if (!userId || typeof isActive !== 'boolean') {
                    return {
                        success: false,
                        error: 'userId y isActive (boolean) son requeridos'
                    };
                }

                const client = await getSupabaseClient();
                if (!client) {
                    return { success: false, error: 'Supabase no disponible' };
                }

                const { data, error } = await client
                    .from('users')
                    .update({ active: isActive })
                    .eq('id', userId)
                    .select();

                if (error) {
                    if (error.code === 'PGRST301') {
                        return { success: false, error: '❌ Acceso denegado (403): No tienes permiso para cambiar estado' };
                    }
                    if (error.code === '401' || error.message?.includes('401')) {
                        return { success: false, error: '❌ No autorizado (401)' };
                    }
                    console.error('❌ Users.toggleActive error:', error);
                    return { success: false, error: error.message || 'Error al cambiar estado' };
                }

                const status = isActive ? 'activado' : 'desactivado';
                console.log(`✅ Usuario ${userId} ${status}`);
                return { success: true, data: data?.[0] || null };
            } catch (err) {
                console.error('❌ Users.toggleActive excepción:', err.message);
                return { success: false, error: err.message };
            }
        },

        /**
         * Validar si el usuario actual puede cambiar roles
         * Basado en su rol actual
         * @returns {Promise<boolean>}
         */
        async canChangeRoles() {
            try {
                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    return false;
                }

                const userRole = window.currentUser.role.toLowerCase().trim();

                // Roles que CAN cambiar otros roles
                const adminRoles = ['administrador', 'programador', 'socio', 'admin'];
                return adminRoles.includes(userRole);
            } catch (err) {
                console.error('❌ Users.canChangeRoles ERROR:', err);
                return false;
            }
        },

        /**
         * Validar si el usuario actual puede cambiar estado (activo/inactivo)
         * @returns {Promise<boolean>}
         */
        async canChangeStatus() {
            try {
                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    return false;
                }

                const userRole = window.currentUser.role.toLowerCase().trim();

                // Roles que CAN cambiar estado de usuarios
                const adminRoles = ['administrador', 'programador', 'supervisor', 'admin'];
                return adminRoles.includes(userRole);
            } catch (err) {
                console.error('❌ Users.canChangeStatus ERROR:', err);
                return false;
            }
        },

        /**
         * MÉTODO CRÍTICO: Obtener usuario actual autenticado
         * 
         * Este método:
         * 1. Lee auth.getUser() para obtener el uid
         * 2. Consulta public.users para obtener el perfil completo
         * 3. Normaliza el role (trim + lowercase)
         * 4. Valida is_active
         * 5. Setea window.currentUser
         * 
         * @returns {Promise<{success: boolean, data: object|null, error?: string}>}
         */
        async getCurrent() {
            try {
                const client = await getSupabaseClient();
                if (!client) {
                    const error = 'Cliente Supabase no disponible';
                    console.error('❌ Users.getCurrent:', error);
                    return { success: false, data: null, error };
                }

                // PASO 1: Obtener usuario autenticado de Supabase Auth
                const { data: { user }, error: authError } = await client.auth.getUser();

                if (authError) {
                    console.error('❌ Users.getCurrent - Error de autenticación:', authError.message);
                    return { success: false, data: null, error: authError.message };
                }

                if (!user || !user.id) {
                    const error = 'No hay usuario autenticado';
                    console.warn('⚠️ Users.getCurrent:', error);
                    return { success: false, data: null, error };
                }

                console.log(`🔍 Users.getCurrent: Buscando perfil para uid=${user.id}`);

                // PASO 2: Consultar tabla public.users
                const { data: profile, error: dbError } = await client
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (dbError) {
                    // Si la tabla no existe, crear perfil básico desde auth
                    if (handleTableNotFound(dbError, 'users')) {
                        const basicProfile = {
                            id: user.id,
                            email: user.email,
                            name: user.email?.split('@')[0] || 'Usuario',
                            role: 'cliente',
                            is_active: true
                        };
                        console.warn('⚠️ Tabla users no existe, usando perfil básico');
                        window.currentUser = basicProfile;
                        return { success: true, data: basicProfile };
                    }

                    const error = `Usuario ${user.email} no existe en tabla public.users. Contacta al administrador.`;
                    console.error('❌ Users.getCurrent:', error, dbError);
                    return { success: false, data: null, error };
                }

                if (!profile) {
                    const error = `Usuario ${user.email} no encontrado en base de datos. Contacta al administrador.`;
                    console.error('❌ Users.getCurrent:', error);
                    return { success: false, data: null, error };
                }

                // PASO 3: Normalizar y validar role
                if (!profile.role) {
                    const error = 'Usuario sin rol asignado. Contacta al administrador.';
                    console.error('❌ Users.getCurrent:', error);
                    return { success: false, data: null, error };
                }

                profile.role = String(profile.role).trim().toLowerCase();

                // PASO 4: Validar is_active
                if (profile.is_active === false) {
                    const error = 'Usuario inactivo. Contacta al administrador.';
                    console.error('❌ Users.getCurrent:', error);
                    return { success: false, data: null, error };
                }

                // PASO 4.5: Agregar alias 'name' para compatibilidad
                // La BD usa 'full_name', pero el código usa 'name'
                profile.name = profile.full_name || profile.username || profile.email?.split('@')[0] || 'Usuario';

                // PASO 5: Setear window.currentUser
                window.currentUser = profile;
                console.log(`✅ Users.getCurrent: Usuario cargado - ${profile.name} (${profile.role})`);

                return { success: true, data: profile };
            } catch (err) {
                const error = `Error inesperado: ${err.message}`;
                console.error('❌ Users.getCurrent excepción:', err);
                return { success: false, data: null, error };
            }
        },

        /**
         * Obtener lista de usuarios según permisos del usuario actual
         * Usuarios con rol admin ven todos los usuarios
         * Usuarios con otros roles ven solo usuarios de su grupo
         * @returns {Promise<{success: boolean, data: Array}>}
         */
        async getAccessibleUsers() {
            try {
                const allUsers = await this.getAll();
                if (!allUsers.success) return allUsers;

                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser) {
                    console.warn('⚠️ Users.getAccessibleUsers: window.currentUser no disponible');
                    return allUsers; // Retornar todos si no hay perfil
                }

                const userRole = window.currentUser.role.toLowerCase().trim();

                // Administrador ve todos
                if (userRole === 'administrador') {
                    return allUsers;
                }

                // Otros roles ven solo su grupo (si aplica)
                const userGroup = window.currentUser.groups?.[0] || window.currentUser.group;
                if (!userGroup) {
                    return allUsers; // Si no hay grupo, ver todos
                }

                const filtered = (allUsers.data || []).filter(u => {
                    const uGroups = Array.isArray(u.groups) ? u.groups : (u.group ? [u.group] : []);
                    return uGroups.includes(userGroup);
                });

                return { success: true, data: filtered };
            } catch (err) {
                console.error('❌ Users.getAccessibleUsers:', err.message);
                return { success: true, data: [] };
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
        EntityUsers: EntityUsersModule,
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

        // === HELPERS DEFENSIVOS DE ROLES Y PERMISOS ===
        /**
         * Verificar si el usuario tiene un rol específico
         * @param {string|Array} requiredRole - Rol o array de roles requeridos
         * @returns {Promise<boolean>}
         */
        async hasRole(requiredRole) {
            try {
                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    return false;
                }

                const userRole = window.currentUser.role.toLowerCase().trim();

                if (typeof requiredRole === 'string') {
                    return userRole === requiredRole.toLowerCase().trim();
                }

                if (Array.isArray(requiredRole)) {
                    return requiredRole.some(r => userRole === r.toLowerCase());
                }

                return false;
            } catch (err) {
                console.warn('⚠️ API.hasRole:', err.message);
                return false;
            }
        },

        /**
         * Verificar si el usuario puede acceder a usuarios
         * @returns {Promise<boolean>}
         */
        async canAccessUsers() {
            try {
                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    console.warn('⚠️ canAccessUsers: window.currentUser no disponible');
                    return false;
                }

                const userRole = window.currentUser.role.toLowerCase().trim();
                console.log(`🔍 canAccessUsers: Verificando rol "${userRole}"`);

                // Roles que CAN acceder al módulo de usuarios
                const accessRoles = ['administrador', 'programador', 'supervisor', 'socio'];
                const hasAccess = accessRoles.includes(userRole);

                console.log(`${hasAccess ? '✅' : '🔒'} canAccessUsers: ${hasAccess ? 'PERMITIDO' : 'DENEGADO'} para rol "${userRole}"`);

                return hasAccess;
            } catch (err) {
                console.error('❌ API.canAccessUsers ERROR:', err);
                return false;
            }
        },

        /**
         * Verificar si el usuario puede acceder a entidades
         * @returns {Promise<boolean>}
         */
        async canAccessEntities() {
            try {
                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    console.warn('⚠️ canAccessEntities: window.currentUser no disponible');
                    return false;
                }

                const userRole = window.currentUser.role.toLowerCase().trim();

                // Roles que CAN acceder al módulo de entidades
                const accessRoles = ['administrador', 'programador', 'supervisor', 'socio', 'auditor', 'auditor_senior', 'cliente'];
                return accessRoles.includes(userRole);
            } catch (err) {
                console.error('❌ API.canAccessEntities ERROR:', err);
                return false;
            }
        },

        /**
         * Verificar si el usuario puede acceder a compromisos
         * @returns {Promise<boolean>}
         */
        async canAccessCommitments() {
            try {
                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser || !window.currentUser.role) {
                    console.warn('⚠️ canAccessCommitments: window.currentUser no disponible');
                    return false;
                }

                const userRole = window.currentUser.role.toLowerCase().trim();

                // Roles que CAN acceder al módulo de compromisos
                const accessRoles = ['administrador', 'programador', 'supervisor', 'socio', 'auditor', 'auditor_senior', 'cliente'];
                return accessRoles.includes(userRole);
            } catch (err) {
                console.error('❌ API.canAccessCommitments ERROR:', err);
                return false;
            }
        },

        /**
             * Verificar si el usuario puede acceder a un módulo específico
             * @param {string} moduleName - Nombre del módulo (usuarios, entidades, compromisos, etc)
             * @returns {Promise<boolean>}
             */
        async canAccessModule(moduleName) {
            try {
                if (!moduleName) return false;
                const method = `canAccess${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;
                if (this[method] && typeof this[method] === 'function') {
                    return await this[method]();
                }
                console.warn(`⚠️ Método ${method} no existe para validar acceso`);
                return false;
            } catch (err) {
                console.warn(`⚠️ API.canAccessModule(${moduleName}):`, err.message);
                return false;
            }
        },

        /**
         * Obtener el rol actual del usuario
         * @returns {Promise<string|null>}
         */
        async getCurrentRole() {
            try {
                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                return window.currentUser?.role || null;
            } catch (err) {
                console.error('❌ API.getCurrentRole ERROR:', err);
                return null;
            }
        },

        /**
         * Obtener el nombre del usuario actual
         * @returns {Promise<string|null>}
         */
        async getCurrentUserName() {
            try {
                // Esperar a que currentUser esté listo
                if (window.currentUserReady) {
                    await window.currentUserReady;
                }

                if (!window.currentUser) {
                    return null;
                }

                return window.currentUser.full_name || window.currentUser.name || window.currentUser.email || null;
            } catch (err) {
                console.error('❌ API.getCurrentUserName ERROR:', err);
                return null;
            }
        },

        /**
         * Obtener módulo dinámico por nombre de tabla
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
    console.log('   Helpers de permisos:', ['hasRole()', 'canAccessUsers()', 'getCurrentRole()', 'getCurrentUserName()'].join(', '));
    console.log('   Métodos genéricos: window.API.getModule("tabla_nombre")');

    /**
     * ==========================================
     * INICIALIZACIÓN DE window.currentUser
     * ==========================================
     * 
     * IMPORTANTE: window.currentUser y window.currentUserReady
     * se inicializan EXCLUSIVAMENTE en auth-guard.js
     * dentro de la función protectPage().
     * 
     * NO se inicializan automáticamente aquí para evitar
     * condiciones de carrera y problemas de arquitectura.
     */
    if (typeof window.currentUser === 'undefined') {
        window.currentUser = null;
    }

    console.log('✅ api-client.js: Listo. window.currentUser se cargará desde auth-guard.js');

})();
