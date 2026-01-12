/**
 * CFE INSIGHT - Auth Guard Module (VANILLA JS, SIN MÓDULOS ES6)
 * 
 * Verifica autenticación con Supabase y protege rutas de forma DEFENSIVA.
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
            console.warn('⚠️ Error obteniendo sesión silenciosamente:', err.message);
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
            // Verificar si ya está en sessionStorage (caché)
            const cached = getUserUI();
            if (cached && cached.id) {
                return cached;
            }

            // Obtener sesión actual
            const session = await getSessionSilent();
            if (!session || !session.user) {
                return null;
            }

            // Intentar cargar desde tabla users (puede no existir aún)
            if (!window.API || !window.API.Users || !window.API.Users.getById) {
                console.warn('⚠️ API.Users no disponible');
                // Retornar datos mínimos del usuario de Supabase
                return {
                    id: session.user.id,
                    name: session.user.email || 'Usuario',
                    email: session.user.email,
                    role: 'usuario'
                };
            }

            const result = await window.API.Users.getById(session.user.id);
            if (!result.success || !result.data) {
                // Tabla no existe o usuario no encontrado - retornar datos de Supabase
                return {
                    id: session.user.id,
                    name: session.user.email || 'Usuario',
                    email: session.user.email,
                    role: 'usuario'
                };
            }

            // Construir datos de UI desde tabla users
            const uiData = {
                id: result.data.id,
                name: result.data.full_name || session.user.email || 'Usuario',
                email: result.data.email || session.user.email,
                role: result.data.role || 'usuario',
                username: result.data.username || null,
                phone: result.data.phone || null,
                groups: Array.isArray(result.data.groups) ? result.data.groups : []
            };

            // Guardar en sessionStorage
            sessionStorage.setItem(USER_UI_KEY, JSON.stringify(uiData));
            return uiData;

        } catch (err) {
            console.warn('⚠️ Error cargando perfil de usuario:', err.message);
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
     * Función global: window.logout()
     */
    async function logout() {
        try {
            // Limpiar sessionStorage
            sessionStorage.removeItem(USER_UI_KEY);

            // Cerrar sesión en Supabase
            if (window.getSupabaseClient) {
                const client = await window.getSupabaseClient();
                if (client) {
                    await client.auth.signOut().catch(err => {
                        console.warn('⚠️ Error al signOut:', err.message);
                    });
                }
            }

            // Redirigir a login
            window.location.href = 'login.html';
        } catch (error) {
            console.warn('⚠️ Error en logout:', error.message);
            // Forzar redirección incluso si hay error
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

            // PASO 3: Cargar perfil del usuario
            const userUI = await loadUserProfile();
            if (userUI) {
                console.log(`✅ protectPage: Perfil de usuario cargado: ${userUI.name}`);
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

                // Escuchar eventos de autenticación
                client.auth.onAuthStateChange((event, session) => {
                    console.log(`🔔 Auth State Changed: ${event}`, session ? '✅ Signed in' : '❌ Signed out');

                    // SOLO redirigir cuando el evento es SIGNED_OUT
                    if (event === 'SIGNED_OUT' || (event === 'USER_UPDATED' && !session)) {
                        console.log('🔓 Usuario desconectado. Redirigiendo a login...');
                        sessionStorage.removeItem(USER_UI_KEY);
                        window.location.href = 'login.html';
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
    console.log('📌 Usar: window.protectPage(() => { initializePage(); })');

})();
