/**
 * CFE INSIGHT - SISTEMA DE PERMISOS Y ROLES (VANILLA JS) v2
 * 
 * ARQUITECTURA FINAL:
 * - Roles globales: 'admin', 'user'
 * - Roles por entidad: 'owner', 'auditor', 'viewer'
 * 
 * PRINCIPIOS:
 * ✅ Fuente de verdad: BD (window.currentUser)
 * ✅ No usar localStorage ni sessionStorage para roles
 * ✅ Frontend defensivo (UX + bloqueo de acciones)
 * ✅ Backend (RLS) es el verdadero guardián
 * 
 * INTERFAZ PÚBLICA (window.PermissionsHelper):
 * - isAdmin()                         → ¿Es admin?
 * - isUser()                          → ¿Es user?
 * - getCurrentRole()                  → Obtener rol actual
 * - getMyProfile()                    → Obtener perfil completo
 */

(function () {
    'use strict';

    console.log('🔐 permissions-helpers.js v2: Inicializando con arquitectura final...');

    /**
     * ==========================================
     * DEFINICIÓN DE ROLES (ARQUITECTURA FINAL)
     * ==========================================
     */

    // ROLES GLOBALES - Solo estos existen en users.role
    const GLOBAL_ROLES = ['admin', 'user'];

    // ROLES POR ENTIDAD - Solo en entity_users.role
    const ENTITY_ROLES = ['owner', 'auditor', 'viewer'];

    /**
     * ==========================================
     * FUNCIONES INTERNAS
     * ==========================================
     */

    /**
     * Obtener perfil actual (SIEMPRE desde window.currentUser)
     * FUENTE DE VERDAD: window.currentUser
     * @returns {Promise<object|null>}
     */
    async function getMyProfile() {
        try {
            // PRIORIDAD 1: Si window.currentUser ya está disponible, usarlo directamente
            if (window.currentUser && window.currentUser.role) {
                return window.currentUser;
            }

            // PRIORIDAD 2: Esperar a que currentUserReady se resuelva
            if (window.currentUserReady && typeof window.currentUserReady.then === 'function') {
                console.log('⏳ getMyProfile: Esperando window.currentUserReady...');
                await window.currentUserReady;

                if (window.currentUser && window.currentUser.role) {
                    return window.currentUser;
                }
            }

            // ÚLTIMA OPCIÓN: Intentar cargar desde API
            console.warn('⚠️ getMyProfile: window.currentUser no disponible, intentando cargar desde API...');
            if (window.API && window.API.Users && window.API.Users.getCurrent) {
                const result = await window.API.Users.getCurrent();
                if (result.success && result.data) {
                    return result.data;
                }
            }

            console.error('❌ getMyProfile: No se pudo obtener el perfil del usuario');
            return null;
        } catch (err) {
            console.error('❌ getMyProfile ERROR:', err);
            return null;
        }
    }


    /**
     * ==========================================
     * HELPERS PÚBLICOS (window.PermissionsHelper)
     * ==========================================
     */

    window.PermissionsHelper = {
        // === CONSTANTES ÚTILES ===
        GLOBAL_ROLES: GLOBAL_ROLES,
        ENTITY_ROLES: ENTITY_ROLES,

        /**
         * Verificar si el usuario es admin
         * @returns {Promise<boolean>}
         */
        async isAdmin() {
            try {
                const profile = await getMyProfile();
                if (!profile || !profile.role) {
                    console.warn('⚠️ isAdmin: No hay perfil disponible');
                    return false;
                }

                const isAdmin = profile.role === 'admin';
                console.log(`🔍 isAdmin: Usuario ${profile.name} (${profile.role}) → ${isAdmin}`);
                return isAdmin;
            } catch (err) {
                console.error('❌ PermissionsHelper.isAdmin ERROR:', err);
                return false;
            }
        },

        /**
         * Verificar si el usuario es user
         * @returns {Promise<boolean>}
         */
        async isUser() {
            try {
                const profile = await getMyProfile();
                if (!profile || !profile.role) {
                    console.warn('⚠️ isUser: No hay perfil disponible');
                    return false;
                }

                const isUser = profile.role === 'user';
                console.log(`🔍 isUser: Usuario ${profile.name} (${profile.role}) → ${isUser}`);
                return isUser;
            } catch (err) {
                console.error('❌ PermissionsHelper.isUser ERROR:', err);
                return false;
            }
        },

        /**
         * Obtener el rol actual del usuario
         * @returns {Promise<string|null>}
         */
        async getCurrentRole() {
            try {
                const profile = await getMyProfile();
                return profile?.role || null;
            } catch (err) {
                console.warn('⚠️ PermissionsHelper.getCurrentRole:', err.message);
                return null;
            }
        },

        /**
         * Obtener perfil completo del usuario
         * @returns {Promise<object|null>}
         */
        async getMyProfile() {
            return await getMyProfile();
        }
    };

    console.log('✅ permissions-helpers.js v2: Sistema de permisos cargado');
    console.log('   Roles globales:', GLOBAL_ROLES.join(', '));
    console.log('   Roles por entidad:', ENTITY_ROLES.join(', '));
    console.log('   Métodos públicos: isAdmin(), isUser(), getCurrentRole(), getMyProfile()');

})();

