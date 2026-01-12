/**
 * CFE INSIGHT - Auth Guard Module (VANILLA JS, SIN MÓDULOS ES6)
 * Verifica autenticación con Supabase y protege rutas
 * 
 * REQUISITO: supabaseClient.js debe cargarse ANTES de este archivo
 */

(function () {
    'use strict';

    const USER_UI_KEY = 'userUI';

    /**
     * Verifica si el usuario tiene sesión activa en Supabase
     * Redirige a login si no está autenticado
     * @param {boolean} redirect - Si debe redirigir automáticamente (default: true)
     * @returns {Promise<object|null>} Sesión de Supabase o null
     */
    async function requireAuth(redirect = true) {
        try {
            const supabase = await window.getSupabaseClient();
            if (!supabase) {
                console.error('❌ Supabase no configurado');
                if (redirect) {
                    window.location.href = 'login.html';
                }
                return null;
            }

            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('❌ Error al verificar sesión:', error);
                if (redirect) {
                    window.location.href = 'login.html';
                }
                return null;
            }

            if (!session) {
                console.warn('⚠️ No hay sesión activa');
                if (redirect) {
                    window.location.href = 'login.html';
                }
                return null;
            }

            return session;
        } catch (error) {
            console.error('❌ Error crítico en auth guard:', error);
            if (redirect) {
                window.location.href = 'login.html';
            }
            return null;
        }
    }

    /**
     * Obtiene los datos de UI del usuario desde sessionStorage
     * @returns {object|null} Datos de UI o null
     */
    function getUserUI() {
        try {
            const userUIStr = sessionStorage.getItem(USER_UI_KEY);
            return userUIStr ? JSON.parse(userUIStr) : null;
        } catch (error) {
            console.error('Error al obtener userUI:', error);
            return null;
        }
    }

    /**
     * Cierra la sesión de Supabase y limpia sessionStorage
     */
    async function logout() {
        try {
            // Limpiar sessionStorage
            sessionStorage.removeItem(USER_UI_KEY);

            // Cerrar sesión en Supabase
            const supabase = await window.getSupabaseClient();
            const { error } = supabase ? await supabase.auth.signOut() : { error: null };
            if (error) {
                console.error('Error al cerrar sesión en Supabase:', error);
            }

            // Redirigir a login
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error crítico en logout:', error);
            // Forzar redirección incluso si hay error
            window.location.href = 'login.html';
        }
    }

    /**
     * Inicializa el guard de autenticación en la página
     * Verifica sesión y configura el botón de logout
     * @param {string} logoutBtnId - ID del botón de logout (default: 'logoutBtn')
     * @returns {Promise<object|null>} Sesión de Supabase
     */
    async function initAuthGuard(logoutBtnId = 'logoutBtn') {
        // Verificar autenticación
        const session = await requireAuth();

        if (!session) {
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

        return session;
    }

    /**
     * Carga el perfil del usuario desde la tabla `users` usando id
     * @param {boolean} persist - Si debe almacenarse en sessionStorage
     * @returns {Promise<object|null>} Datos básicos de UI o null
     */
    async function ensureUserProfile(persist = true) {
        try {
            const cached = getUserUI();
            if (cached) {
                return cached;
            }

            const supabase = await window.getSupabaseClient();
            if (!supabase) {
                return null;
            }

            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                return null;
            }

            const { data, error: profileError } = await supabase
                .from('users')
                .select('id, full_name, email, role, username, phone, groups')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profileError) {
                console.error('Error al obtener perfil de usuario:', profileError);
                return null;
            }

            if (!data) {
                console.warn('No se encontró registro en tabla users para el id actual');
                return null;
            }

            const uiData = {
                id: data.id,
                name: data.full_name || session.user?.user_metadata?.full_name || session.user?.email || 'Usuario',
                email: data.email || session.user?.email || '',
                role: data.role || 'usuario',
                username: data.username || session.user?.user_metadata?.username || null,
                phone: data.phone ?? null,
                groups: Array.isArray(data.groups)
                    ? data.groups
                    : data.groups
                        ? [data.groups]
                        : []
            };

            if (persist) {
                sessionStorage.setItem(USER_UI_KEY, JSON.stringify(uiData));
            }

            return uiData;
        } catch (error) {
            console.error('❌ Error crítico al cargar perfil de usuario:', error);
            return null;
        }
    }

    /**
     * Exponer funciones globalmente
     */
    window.requireAuth = requireAuth;
    window.getUserUI = getUserUI;
    window.logout = logout;
    window.initAuthGuard = initAuthGuard;
    window.ensureUserProfile = ensureUserProfile;
    window.USER_UI_KEY = USER_UI_KEY;

    console.log('✅ Auth Guard inicializado (vanilla JS, sin módulos)');

})();
