/**
 * CFE INSIGHT - Auth Guard Module (VANILLA JS, SIN MÓDULOS ES6)
 * 
 * Verifica autenticación con Supabase y protege rutas de forma DEFENSIVA.
 * 
 * ✅ CORRECCIÓN DEL LOOP DE LOGOUT:
 * - Implementa flag window.__MANUAL_LOGOUT__ para bloquear rehidratación
 * - SIGNED_OUT tiene prioridad absoluta
 * - INITIAL_SESSION no reinyecta sesión después de logout manual
 * - UNA SOLA llamada a onAuthStateChange en todo el proyecto
 * 
 * REQUISITO: supabaseClient.js debe cargarse ANTES de este archivo
 * 
 * INTERFAZ PÚBLICA:
 * - window.protectPage(callback)  → Proteger página con callback único
 * - window.logout()                → Cerrar sesión y redirigir a login
 * - window.getUserUI()             → Obtener datos de UI del usuario
 */

(function () {
    'use strict';

    const USER_UI_KEY = 'userUI';
    let authStateInitialized = false;

    // 🔒 FLAG DE LOGOUT MANUAL - PREVIENE RE-LOGIN AUTOMÁTICO
    // Este flag se setea antes de signOut() y bloquea cualquier rehidratación
    if (typeof window.__MANUAL_LOGOUT__ === 'undefined') {
        window.__MANUAL_LOGOUT__ = false;
    }

    /**
     * ==========================================
     * AUTENTICACIÓN - FUNCIONES INTERNAS
     * ==========================================
     */

    /**
     * Obtener sesión actual sin redirigir
     * @returns {Promise<object|null>} Sesión de Supabase o null
     */
    async function getSessionSilent() {
        try {
            if (!window.getSupabaseSession) {
                console.warn('⚠️ getSupabaseSession no disponible');
                return null;
            }

            const { data, error } = await window.getSupabaseSession();
            if (error || !data.session) {
                return null;
            }

            return data.session;
        } catch (err) {
            console.error('❌ Error obteniendo sesión:', err.message);
            return null;
        }
    }

    /**
     * Obtener los datos de UI del usuario desde sessionStorage
     * @returns {object|null} Datos de UI o null
     */
    function getUserUI() {
        try {
            const userUIStr = sessionStorage.getItem(USER_UI_KEY);
            return userUIStr ? JSON.parse(userUIStr) : null;
        } catch (error) {
            console.warn('⚠️ Error al obtener userUI:', error.message);
            return null;
        }
    }

    /**
     * Cargar perfil del usuario desde tabla users
     * Maneja gracefully si la tabla no existe aún
     * @returns {Promise<object|null>} Datos de UI o null
     */
    async function loadUserProfile() {
        try {
            const client = await window.getSupabaseClient();
            if (!client) {
                console.warn('⚠️ Cliente Supabase no disponible para cargar perfil');
                return null;
            }

            // Obtener usuario autenticado
            const { data: { user }, error: userError } = await client.auth.getUser();
            if (userError || !user) {
                console.warn('⚠️ No hay usuario autenticado:', userError?.message);
                return null;
            }

            // Intentar obtener perfil de users table
            const { data, error } = await client
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                // Si la tabla no existe, crear un perfil básico desde el usuario de auth
                console.warn('⚠️ Error cargando perfil (tabla users puede no existir):', error.message);
                const fallbackProfile = {
                    id: user.id,
                    email: user.email,
                    name: user.email?.split('@')[0] || 'Usuario',
                    role: 'cliente'
                };
                sessionStorage.setItem(USER_UI_KEY, JSON.stringify(fallbackProfile));
                return fallbackProfile;
            }

            // Guardar en sessionStorage
            sessionStorage.setItem(USER_UI_KEY, JSON.stringify(data));
            return data;
        } catch (err) {
            console.error('❌ Error en loadUserProfile:', err.message);
            return null;
        }
    }

    /**
     * ==========================================
     * FUNCIONES PÚBLICAS GLOBALES
     * ==========================================
     */

    /**
     * Cierra la sesión de Supabase y redirige a login
     * ✅ CORRECCIÓN: Implementa flag de logout manual
     * Función global: window.logout()
     */
    async function logout() {
        try {
            console.log('🔓 logout(): Iniciando cierre de sesión...');

            // 🔒 PASO 1: ACTIVAR FLAG DE LOGOUT MANUAL
            // Este flag previene que INITIAL_SESSION reinyecte la sesión
            window.__MANUAL_LOGOUT__ = true;
            console.log('🚫 Flag __MANUAL_LOGOUT__ activado - Bloqueando rehidratación');

            // PASO 2: Limpiar sessionStorage
            sessionStorage.removeItem(USER_UI_KEY);
            sessionStorage.removeItem('userSession');

            // PASO 3: Limpiar estado del cliente
            if (window.appSession) {
                window.appSession = null;
            }
            if (window.readNotificationsCache) {
                window.readNotificationsCache = [];
            }
            // Limpiar window.currentUser
            if (window.currentUser) {
                window.currentUser = null;
                console.log('🗑️ window.currentUser limpiado');
            }

            // PASO 4: Cerrar sesión en Supabase
            if (window.getSupabaseClient) {
                const client = await window.getSupabaseClient();
                if (client) {
                    console.log('📤 Ejecutando client.auth.signOut()...');
                    await client.auth.signOut().catch(err => {
                        console.warn('⚠️ Error al signOut (no crítico):', err.message);
                    });
                }
            }

            // PASO 5: Redirigir a login
            console.log('➡️ Redirigiendo a login...');
            window.location.href = 'login.html';
        } catch (error) {
            console.warn('⚠️ Error en logout:', error.message);
            // Asegurar flag y redirección incluso si hay error
            window.__MANUAL_LOGOUT__ = true;
            window.location.href = 'login.html';
        }
    }

    /**
     * FUNCIÓN PRINCIPAL: Proteger página con callback único
     * 
     * Uso:
     *   protectPage(() => {
     *       initializePage();
     *   });
     * 
     * Comportamiento:
     * - Valida que el usuario esté autenticado
     * - Ejecuta callback SOLO UNA VEZ cuando hay sesión válida
     * - Redirige a login SOLO cuando el usuario hace logout o expira sesión
     * - NO ejecuta nada si Supabase no está listo
     * 
     * @param {Function} callback - Función a ejecutar cuando autenticado
     */
    window.protectPage = async function (callback) {
        if (typeof callback !== 'function') {
            console.error('❌ protectPage: callback debe ser una función');
            return;
        }

        try {
            console.log('🔐 protectPage: Validando autenticación...');

            // ✅ VERIFICAR FLAG DE LOGOUT MANUAL
            // Si el usuario hizo logout manual, NO continuar con la página
            if (window.__MANUAL_LOGOUT__) {
                console.warn('🚫 protectPage: Logout manual detectado, redirigiendo...');
                window.location.href = 'login.html';
                return;
            }

            // PASO 1: Esperar a que Supabase esté inicializado
            if (!window.getSupabaseClient) {
                console.warn('⚠️ getSupabaseClient no disponible aún');
                setTimeout(() => window.protectPage(callback), 100);
                return;
            }

            // PASO 2: Obtener sesión actual
            const session = await getSessionSilent();
            if (!session) {
                console.warn('⚠️ protectPage: No hay sesión activa. Redirigiendo a login...');
                window.location.href = 'login.html';
                return;
            }

            console.log('✅ protectPage: Sesión válida. Usuario autenticado.');

            // PASO 3: Cargar perfil del usuario Y SETEAR window.currentUser
            const userUI = await loadUserProfile();
            if (userUI) {
                console.log(`✅ protectPage: Perfil de usuario cargado: ${userUI.name}`);
            }

            // PASO 3.5: ASEGURAR que window.currentUser esté listo
            // Esperar a que la API esté disponible y cargar currentUser
            if (window.API && window.API.Users && window.API.Users.getCurrent) {
                console.log('🔄 protectPage: Verificando window.currentUser...');

                if (!window.currentUser) {
                    const result = await window.API.Users.getCurrent();
                    if (!result.success || !result.data) {
                        console.error('❌ protectPage: Error cargando usuario actual:', result.error);
                        alert(result.error || 'Error cargando datos de usuario. Por favor, recarga la página.');
                        window.location.href = 'login.html';
                        return;
                    }
                }
                console.log(`✅ window.currentUser listo: ${window.currentUser?.name} (${window.currentUser?.role})`);
            } else {
                console.warn('⚠️ protectPage: API.Users.getCurrent no disponible todavía');
            }

            // PASO 4: Ejecutar callback UNA SOLA VEZ
            console.log('🎬 protectPage: Ejecutando callback de inicialización...');
            callback();

            // PASO 5: Escuchar cambios de autenticación (logout)
            setupAuthStateListener();

        } catch (error) {
            console.error('❌ protectPage: Error crítico:', error.message);
            window.location.href = 'login.html';
        }
    };

    /**
     * Configurar listener de cambios de estado de autenticación
     * ✅ CORRECCIÓN: Respeta flag de logout manual
     * Redirige a login SOLO cuando el usuario hace logout
     */
    function setupAuthStateListener() {
        if (authStateInitialized) {
            return; // Ya está configurado
        }

        authStateInitialized = true;

        try {
            if (!window.getSupabaseClient) {
                return;
            }

            // Esperar a que Supabase esté listo
            window.getSupabaseClient().then(client => {
                if (!client) return;

                // 🎯 ÚNICA LLAMADA A onAuthStateChange EN TODO EL PROYECTO
                client.auth.onAuthStateChange((event, session) => {
                    console.log(`🔔 Auth State Changed: ${event}`, session ? '✅ Con sesión' : '❌ Sin sesión');

                    // ✅ BLOQUEO 1: Si hay logout manual, ignorar INITIAL_SESSION
                    if (window.__MANUAL_LOGOUT__) {
                        if (event === 'INITIAL_SESSION') {
                            console.log('🚫 INITIAL_SESSION ignorado - Logout manual activo');
                            return; // NO hacer nada, el usuario cerró sesión manualmente
                        }
                    }

                    // ✅ BLOQUEO 2: SIGNED_OUT tiene prioridad absoluta
                    if (event === 'SIGNED_OUT' || (event === 'USER_UPDATED' && !session)) {
                        console.log('🔓 Usuario desconectado. Limpiando estado...');
                        window.__MANUAL_LOGOUT__ = true; // Asegurar que está bloqueado
                        sessionStorage.removeItem(USER_UI_KEY);
                        sessionStorage.removeItem('userSession');

                        // Redirigir SOLO una vez
                        if (window.location.pathname.toLowerCase().indexOf('login.html') === -1) {
                            console.log('➡️ Redirigiendo a login...');
                            window.location.href = 'login.html';
                        }
                    }

                    // ✅ BLOQUEO 3: TOKEN_REFRESHED y USER_UPDATED no deben reloguear
                    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                        console.log(`ℹ️ Evento ${event} - No se requiere acción`);
                        // NO redirigir, NO recargar página
                    }
                });

            }).catch(err => {
                console.warn('⚠️ Error configurando auth listener:', err.message);
            });

        } catch (error) {
            console.warn('⚠️ Error en setupAuthStateListener:', error.message);
        }
    }

    /**
     * ==========================================
     * COMPATIBILIDAD CON CÓDIGO EXISTENTE
     * ==========================================
     */

    // Funciones públicas
    window.getUserUI = getUserUI;
    window.logout = logout;
    window.getSessionSilent = getSessionSilent;

    /**
     * initAuthGuard: Legacy, ahora usa protectPage
     * @deprecated Usar window.protectPage() en su lugar
     */
    window.initAuthGuard = async function (logoutBtnId = 'logoutBtn') {
        console.warn('⚠️ initAuthGuard is deprecated. Use protectPage() instead.');

        const session = await getSessionSilent();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }

        // Configurar botón de logout si existe
        const logoutBtn = document.getElementById(logoutBtnId);
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }

        setupAuthStateListener();
        return session;
    };

    /**
     * ensureUserProfile: Legacy
     * @deprecated
     */
    window.ensureUserProfile = async function (persist = true) {
        console.warn('⚠️ ensureUserProfile is deprecated. Use protectPage() instead.');
        return await loadUserProfile();
    };

    /**
     * requireAuth: Legacy
     * @deprecated
     */
    window.requireAuth = async function (redirect = true) {
        console.warn('⚠️ requireAuth is deprecated. Use protectPage() instead.');
        const session = await getSessionSilent();
        if (!session && redirect) {
            window.location.href = 'login.html';
        }
        return session;
    };

    console.log('✅ Auth Guard inicializado (vanilla JS)');
    console.log('🔒 Logout loop protection: ACTIVADO');
    console.log('📌 Usar: window.protectPage(() => { initializePage(); })');

})();
