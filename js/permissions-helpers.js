/**
 * CFE INSIGHT - SISTEMA DE PERMISOS Y ROLES (VANILLA JS) v4
 * 
 * ARQUITECTURA:
 * - Roles globales: 'admin', 'user' (public.users.role)
 * - Roles por entidad: 'owner', 'auditor', 'viewer' (public.entity_users.role)
 * 
 * PRINCIPIOS:
 * ✅ Permisos globales: basados en users.role
 * ✅ Permisos por entidad: basados en entity_users.role
 * ✅ Admins: siempre acceso total
 * ✅ Helpers puros: sin efectos secundarios
 * ✅ Sin roles legacy
 * 
 * INTERFAZ PÚBLICA (GLOBAL):
 * - isAdmin(user?)                    → ¿Es admin?
 * - isUser(user?)                     → ¿Es user normal?
 * - requireAdmin(user?)               → Lanzar error si NO es admin
 * - hasPermission(permission, user?)  → Admins siempre true
 * - getCurrentRole()                  → Obtener rol actual
 * - getMyProfile()                    → Obtener perfil completo
 * 
 * INTERFAZ PÚBLICA (POR ENTIDAD):
 * - canViewEntity(entityRole, user?)  → ¿Ver entidad?
 * - canEditEntity(entityRole, user?)  → ¿Editar entidad?
 * - canCreateCommitment(entityRole, user?)  → ¿Crear compromisos?
 * - canAudit(entityRole, user?)       → ¿Auditar?
 */

(function () {
    'use strict';

    console.log('🔐 permissions-helpers.js v4: Inicializando con permisos globales y por entidad...');

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
     * ROLES POR ENTIDAD
     * ==========================================
     * Definidos en public.entity_users.role
     */
    const ENTITY_ROLES = {
        OWNER: 'owner',
        AUDITOR: 'auditor',
        VIEWER: 'viewer'
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
     * HELPERS DE PERMISOS POR ENTIDAD
     * ==========================================
     * Estos helpers validan permisos basados en el rol del usuario DENTRO de una entidad
     * Reglas:
     * - Si user.role === 'admin' → SIEMPRE true (acceso total)
     * - owner → acceso completo (ver, editar, auditar, crear compromisos)
     * - auditor → ver + auditar (no editar ni crear)
     * - viewer → solo ver (lectura)
     * - null (sin asignación) → false (excepto para admins)
     */

    /**
     * ¿Puede el usuario ver una entidad?
     * @param {string|null} entityRole - Rol del usuario en la entidad ('owner'|'auditor'|'viewer'|null)
     * @param {object|undefined} user - Usuario a verificar (opcional, usa window.currentUser si no se proporciona)
     * @returns {boolean}
     */
    function canViewEntity(entityRole, user) {
        const profile = getProfile(user);

        // Admins siempre pueden ver
        if (profile && profile.role === GLOBAL_ROLES.ADMIN) {
            return true;
        }

        // Si entityRole es null, no tiene acceso
        if (!entityRole) {
            return false;
        }

        // owner, auditor, viewer pueden ver
        return [ENTITY_ROLES.OWNER, ENTITY_ROLES.AUDITOR, ENTITY_ROLES.VIEWER].includes(entityRole);
    }

    /**
     * ¿Puede el usuario editar una entidad?
     * @param {string|null} entityRole - Rol del usuario en la entidad
     * @param {object|undefined} user - Usuario a verificar (opcional)
     * @returns {boolean}
     */
    function canEditEntity(entityRole, user) {
        const profile = getProfile(user);

        // Admins siempre pueden editar
        if (profile && profile.role === GLOBAL_ROLES.ADMIN) {
            return true;
        }

        // Solo owner puede editar
        return entityRole === ENTITY_ROLES.OWNER;
    }

    /**
     * ¿Puede el usuario crear compromisos en una entidad?
     * @param {string|null} entityRole - Rol del usuario en la entidad
     * @param {object|undefined} user - Usuario a verificar (opcional)
     * @returns {boolean}
     */
    function canCreateCommitment(entityRole, user) {
        const profile = getProfile(user);

        // Admins siempre pueden crear
        if (profile && profile.role === GLOBAL_ROLES.ADMIN) {
            return true;
        }

        // Solo owner puede crear compromisos
        return entityRole === ENTITY_ROLES.OWNER;
    }

    /**
     * ¿Puede el usuario auditar una entidad?
     * @param {string|null} entityRole - Rol del usuario en la entidad
     * @param {object|undefined} user - Usuario a verificar (opcional)
     * @returns {boolean}
     */
    function canAudit(entityRole, user) {
        const profile = getProfile(user);

        // Admins siempre pueden auditar
        if (profile && profile.role === GLOBAL_ROLES.ADMIN) {
            return true;
        }

        // owner y auditor pueden auditar
        return [ENTITY_ROLES.OWNER, ENTITY_ROLES.AUDITOR].includes(entityRole);
    }


    /**
     * ==========================================
     * HELPERS PÚBLICOS
     * ==========================================
     */

    window.PermissionsHelper = {
        // === CONSTANTES ===
        GLOBAL_ROLES: GLOBAL_ROLES,
        ENTITY_ROLES: ENTITY_ROLES,

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
        },

        // ===================================================
        // PERMISOS POR ENTIDAD (entity_users.role)
        // ===================================================

        /**
         * ¿Puede el usuario ver una entidad?
         * 
         * Reglas:
         * - admin → SIEMPRE true
         * - owner → true
         * - auditor → true
         * - viewer → true
         * - null → false
         * 
         * @param {string|null} entityRole - Rol en la entidad ('owner'|'auditor'|'viewer'|null)
         * @param {object|undefined} user - Usuario (opcional, usa window.currentUser)
         * @returns {boolean}
         */
        canViewEntity(entityRole, user) {
            return canViewEntity(entityRole, user);
        },

        /**
         * ¿Puede el usuario editar una entidad?
         * 
         * Reglas:
         * - admin → SIEMPRE true
         * - owner → true
         * - auditor → false
         * - viewer → false
         * - null → false
         * 
         * @param {string|null} entityRole - Rol en la entidad
         * @param {object|undefined} user - Usuario (opcional)
         * @returns {boolean}
         */
        canEditEntity(entityRole, user) {
            return canEditEntity(entityRole, user);
        },

        /**
         * ¿Puede el usuario crear compromisos en una entidad?
         * 
         * Reglas:
         * - admin → SIEMPRE true
         * - owner → true
         * - auditor → false
         * - viewer → false
         * - null → false
         * 
         * @param {string|null} entityRole - Rol en la entidad
         * @param {object|undefined} user - Usuario (opcional)
         * @returns {boolean}
         */
        canCreateCommitment(entityRole, user) {
            return canCreateCommitment(entityRole, user);
        },

        /**
         * ¿Puede el usuario auditar una entidad?
         * 
         * Reglas:
         * - admin → SIEMPRE true
         * - owner → true
         * - auditor → true
         * - viewer → false
         * - null → false
         * 
         * @param {string|null} entityRole - Rol en la entidad
         * @param {object|undefined} user - Usuario (opcional)
         * @returns {boolean}
         */
        canAudit(entityRole, user) {
            return canAudit(entityRole, user);
        }
    };

    console.log('✅ permissions-helpers.js v4: Sistema de permisos cargado');
    console.log('   Roles globales:', Object.values(GLOBAL_ROLES).join(', '));
    console.log('   Roles por entidad:', Object.values(ENTITY_ROLES).join(', '));
    console.log('   Métodos globales: isAdmin(), isUser(), requireAdmin(), hasPermission(), getCurrentRole(), getMyProfile()');
    console.log('   Métodos por entidad: canViewEntity(), canEditEntity(), canCreateCommitment(), canAudit()');
    console.log('   NOTA: Permisos por entidad basados en entity_users.role');

})();

