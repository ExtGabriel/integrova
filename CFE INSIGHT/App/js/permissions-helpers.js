/**
 * CFE INSIGHT - SISTEMA DE PERMISOS Y ROLES (VANILLA JS) v3
 * 
 * ARQUITECTURA SIMPLIFICADA:
 * - Solo dos roles globales: 'admin', 'user'
 * - Fuente de verdad: public.users.role en BD
 * - No hay legacy roles ni entity_users en este archivo
 * 
 * PRINCIPIOS:
 * ✅ Fuente de verdad: window.currentUser (sincronizado con BD)
 * ✅ Lógica simple: 2 roles, sin complejidad innecesaria
 * ✅ Frontend defensivo (UX + bloqueo)
 * ✅ Backend (RLS) es el guardián real
 * 
 * INTERFAZ PÚBLICA:
 * - isAdmin(user?)                    → ¿Es admin?
 * - isUser(user?)                     → ¿Es user normal?
 * - requireAdmin(user?)               → Lanzar error si NO es admin
 * - hasPermission(permission, user?)  → Admins siempre true
 * - getCurrentRole()                  → Obtener rol actual
 * - getMyProfile()                    → Obtener perfil completo
 */

(function () {
    'use strict';

    console.log('🔐 permissions-helpers.js v3: Inicializando con arquitectura simplificada...');

    /**
     * ==========================================
     * DEFINICIÓN DE ROLES
     * ==========================================
     */

    const GLOBAL_ROLES = {
        ADMIN: 'admin',
        USER: 'user'
    };

    /**
     * ==========================================
     * FUNCIONES INTERNAS
     * ==========================================
     */

    /**
     * Obtener perfil actual del usuario
     * FUENTE DE VERDAD: window.currentUser (sincronizado con BD)
     * 
     * @param {object|undefined} user - Usuario a verificar (si no se proporciona, usa window.currentUser)
     * @returns {object|null} - Objeto usuario o null
     */
    function getProfile(user) {
        // Si se proporciona un usuario específico, usarlo
        if (user && typeof user === 'object') {
            return user;
        }

        // Si no, usar window.currentUser (debería estar siempre disponible)
        if (window.currentUser && typeof window.currentUser === 'object') {
            return window.currentUser;
        }

        return null;
    }

    /**
     * Validar que el rol sea válido
     * @param {string} role - Rol a validar
     * @returns {boolean}
     */
    function isValidRole(role) {
        return role === GLOBAL_ROLES.ADMIN || role === GLOBAL_ROLES.USER;
    }


    /**
     * ==========================================
     * HELPERS PÚBLICOS
     * ==========================================
     */

    window.PermissionsHelper = {
        // === CONSTANTES ===
        GLOBAL_ROLES: GLOBAL_ROLES,

        /**
         * ¿Es el usuario admin?
         * @param {object|undefined} user - Usuario a verificar (opcional)
         * @returns {boolean}
         */
        isAdmin(user) {
            const profile = getProfile(user);
            if (!profile || !profile.role) {
                return false;
            }
            return profile.role === GLOBAL_ROLES.ADMIN;
        },

        /**
         * ¿Es el usuario user normal?
         * @param {object|undefined} user - Usuario a verificar (opcional)
         * @returns {boolean}
         */
        isUser(user) {
            const profile = getProfile(user);
            if (!profile || !profile.role) {
                return false;
            }
            return profile.role === GLOBAL_ROLES.USER;
        },

        /**
         * Requiere que sea admin, si no lanza error o retorna false
         * @param {object|undefined} user - Usuario a verificar (opcional)
         * @param {boolean} throwError - Si true, lanza error; si false, retorna boolean (default: false)
         * @returns {boolean} - true si es admin
         * @throws {Error} - Si throwError=true y NO es admin
         */
        requireAdmin(user, throwError = false) {
            const isAdmin = this.isAdmin(user);

            if (!isAdmin && throwError) {
                throw new Error('Acceso denegado: Se requieren permisos de administrador');
            }

            return isAdmin;
        },

        /**
         * Verificar permisos
         * NOTA: Si el usuario es admin, siempre retorna true
         * @param {string} permission - Nombre del permiso (para uso futuro)
         * @param {object|undefined} user - Usuario a verificar (opcional)
         * @returns {boolean}
         */
        hasPermission(permission, user) {
            const profile = getProfile(user);

            if (!profile || !profile.role) {
                return false;
            }

            // Los admins siempre tienen todos los permisos
            if (profile.role === GLOBAL_ROLES.ADMIN) {
                return true;
            }

            // Por ahora, los users normales NO tienen permisos especiales
            // Esta lógica se expandirá cuando se implemente entity_users
            return false;
        },

        /**
         * Obtener el rol actual del usuario
         * @param {object|undefined} user - Usuario a verificar (opcional)
         * @returns {string|null} - Rol del usuario o null
         */
        getCurrentRole(user) {
            const profile = getProfile(user);
            return profile?.role || null;
        },

        /**
         * Obtener perfil completo del usuario actual
         * @returns {object|null} - Perfil completo o null
         */
        getMyProfile() {
            return window.currentUser || null;
        }
    };

    console.log('✅ permissions-helpers.js v3: Sistema de permisos cargado');
    console.log('   Roles soportados:', Object.values(GLOBAL_ROLES).join(', '));
    console.log('   Métodos públicos: isAdmin(), isUser(), requireAdmin(), hasPermission(), getCurrentRole(), getMyProfile()');
    console.log('   NOTA: No hay roles legacy, arquitectura simplificada a 2 roles');

})();

