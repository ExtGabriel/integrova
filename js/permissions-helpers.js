/**
 * CFE INSIGHT - SISTEMA DE PERMISOS Y ROLES (VANILLA JS)
 * 
 * Helpers CENTRALIZADOS y REUTILIZABLES para control de acceso basado en roles.
 * 
 * PRINCIPIOS:
 * ✅ Fuente de verdad: BD (window.API.getMyProfile())
 * ✅ No usar localStorage ni sessionStorage para roles
 * ✅ Frontend defensivo (UX + bloqueo de acciones)
 * ✅ Backend (RLS) es el verdadero guardián
 * 
 * REQUISITOS:
 * - api-client.js debe estar cargado (window.API)
 * - Este archivo cargarse ANTES de los módulos (usuarios, compromisos, etc)
 * 
 * INTERFAZ PÚBLICA (window.PermissionsHelper):
 * - hasRole(roles)                    → ¿Tiene uno de estos roles?
 * - hasPermission(action, resource)   → ¿Puede hacer esta acción?
 * - canAccessModule(module)           → ¿Puede acceder a este módulo?
 * - canPerformAction(action, target)  → ¿Puede hacer esta acción en este recurso?
 * - getCurrentRole()                  → Obtener rol actual
 * - disableIfNoPermission(element, permission, tooltip)
 * - checkPermissionOrFail(permission, errorMsg)
 */

(function () {
    'use strict';

    console.log('🔐 permissions-helpers.js: Inicializando sistema de permisos...');

    /**
     * ==========================================
     * DEFINICIÓN DE ROLES Y PERMISOS
     * ==========================================
     */

    // Roles válidos en el sistema
    const VALID_ROLES = {
        ADMIN: 'administrador',
        PROGRAMADOR: 'programador',
        AUDITOR: 'auditor',
        AUDITOR_SENIOR: 'auditor_senior',
        SUPERVISOR: 'supervisor',
        SOCIO: 'socio',
        CLIENTE: 'cliente'
    };

    // Mapeo de alias de roles (para compatibilidad)
    const ROLE_ALIASES = {
        'admin': 'administrador',
        'administrador': 'administrador',
        'programmer': 'programador',
        'programador': 'programador',
        'auditor': 'auditor',
        'auditor_senior': 'auditor_senior',
        'supervisor': 'supervisor',
        'socio': 'socio',
        'partner': 'socio',
        'cliente': 'cliente',
        'client': 'cliente'
    };

    // Jerarquía de roles (de mayor a menor permiso)
    const ROLE_HIERARCHY = {
        [VALID_ROLES.ADMIN]: 100,
        [VALID_ROLES.PROGRAMADOR]: 90,
        [VALID_ROLES.SOCIO]: 80,
        [VALID_ROLES.SUPERVISOR]: 70,
        [VALID_ROLES.AUDITOR_SENIOR]: 60,
        [VALID_ROLES.AUDITOR]: 50,
        [VALID_ROLES.CLIENTE]: 10
    };

    // Permisos por rol (matriz de control de acceso)
    const PERMISSIONS_MATRIX = {
        // === USUARIOS ===
        usuarios: {
            [VALID_ROLES.ADMIN]: ['ver', 'crear', 'editar', 'cambiar_rol', 'activar_desactivar', 'eliminar'],
            [VALID_ROLES.PROGRAMADOR]: ['ver', 'crear', 'editar', 'cambiar_rol', 'activar_desactivar'],
            [VALID_ROLES.SUPERVISOR]: ['ver', 'activar_desactivar'],
            [VALID_ROLES.SOCIO]: ['ver'],
            [VALID_ROLES.AUDITOR_SENIOR]: ['ver'],
            [VALID_ROLES.AUDITOR]: ['ver'],
            [VALID_ROLES.CLIENTE]: [] // Sin acceso
        },

        // === ENTIDADES ===
        entidades: {
            [VALID_ROLES.ADMIN]: ['ver', 'crear', 'editar', 'eliminar'],
            [VALID_ROLES.PROGRAMADOR]: ['ver', 'crear', 'editar'],
            [VALID_ROLES.SUPERVISOR]: ['ver', 'editar'],
            [VALID_ROLES.SOCIO]: ['ver', 'editar'],
            [VALID_ROLES.AUDITOR_SENIOR]: ['ver'],
            [VALID_ROLES.AUDITOR]: ['ver'],
            [VALID_ROLES.CLIENTE]: ['ver'] // Lectura
        },

        // === COMPROMISOS ===
        compromisos: {
            [VALID_ROLES.ADMIN]: ['ver', 'crear', 'editar', 'eliminar', 'cambiar_estado'],
            [VALID_ROLES.PROGRAMADOR]: ['ver', 'crear', 'editar', 'cambiar_estado'],
            [VALID_ROLES.SUPERVISOR]: ['ver', 'editar', 'cambiar_estado'],
            [VALID_ROLES.SOCIO]: ['ver', 'editar', 'cambiar_estado'],
            [VALID_ROLES.AUDITOR_SENIOR]: ['ver'],
            [VALID_ROLES.AUDITOR]: ['ver'],
            [VALID_ROLES.CLIENTE]: ['ver'] // Lectura
        },

        // === REPORTES ===
        reportes: {
            [VALID_ROLES.ADMIN]: ['ver', 'crear', 'exportar'],
            [VALID_ROLES.PROGRAMADOR]: ['ver', 'crear', 'exportar'],
            [VALID_ROLES.SUPERVISOR]: ['ver', 'exportar'],
            [VALID_ROLES.SOCIO]: ['ver', 'exportar'],
            [VALID_ROLES.AUDITOR_SENIOR]: ['ver', 'exportar'],
            [VALID_ROLES.AUDITOR]: ['ver'],
            [VALID_ROLES.CLIENTE]: [] // Sin acceso
        },

        // === AUDITORÍA ===
        auditoria: {
            [VALID_ROLES.ADMIN]: ['ver', 'exportar'],
            [VALID_ROLES.PROGRAMADOR]: ['ver', 'exportar'],
            [VALID_ROLES.SUPERVISOR]: ['ver'],
            [VALID_ROLES.SOCIO]: ['ver'],
            [VALID_ROLES.AUDITOR_SENIOR]: ['ver', 'exportar'],
            [VALID_ROLES.AUDITOR]: ['ver'],
            [VALID_ROLES.CLIENTE]: [] // Sin acceso
        }
    };

    // Módulos que requieren autenticación específica
    const MODULES_ACCESS = {
        usuarios: ['administrador', 'programador', 'supervisor', 'socio'],
        entidades: ['administrador', 'programador', 'supervisor', 'socio', 'auditor', 'auditor_senior', 'cliente'],
        compromisos: ['administrador', 'programador', 'supervisor', 'socio', 'auditor', 'auditor_senior', 'cliente'],
        reportes: ['administrador', 'programador', 'supervisor', 'socio', 'auditor', 'auditor_senior'],
        auditoria: ['administrador', 'programador', 'supervisor', 'socio', 'auditor', 'auditor_senior'],
        dashboard: ['administrador', 'programador', 'supervisor', 'socio', 'auditor', 'auditor_senior', 'cliente']
    };

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
     * Normalizar nombre de rol (minúsculas, sin espacios) y resolver alias
     * @param {string} role
     * @returns {string}
     */
    function normalizeRole(role) {
        if (!role) return '';
        const normalized = String(role).toLowerCase().trim();
        // Resolver alias (ej: 'admin' -> 'administrador')
        return ROLE_ALIASES[normalized] || normalized;
    }

    /**
     * Obtener permisos de un rol para un módulo/recurso
     * @param {string} role - Rol del usuario
     * @param {string} resource - Módulo/recurso (entidades, compromisos, etc)
     * @returns {Array<string>} Lista de permisos
     */
    function getPermissionsForRole(role, resource) {
        const normalizedRole = normalizeRole(role);
        const resourceKey = (resource || '').toLowerCase();

        if (!PERMISSIONS_MATRIX[resourceKey]) {
            console.warn(`⚠️ Recurso "${resourceKey}" no definido en matriz de permisos`);
            return [];
        }

        return PERMISSIONS_MATRIX[resourceKey][normalizedRole] || [];
    }

    /**
     * ==========================================
     * HELPERS PÚBLICOS (window.PermissionsHelper)
     * ==========================================
     */

    window.PermissionsHelper = {
        // === CONSTANTES ÚTILES ===
        ROLES: VALID_ROLES,
        MODULES: Object.keys(MODULES_ACCESS),

        /**
         * Verificar si el usuario tiene UN O VARIOS de estos roles
         * 
         * Uso:
         *   await hasRole('admin')          // soporta alias
         *   await hasRole('administrador')  // nombre completo
         *   await hasRole(['admin', 'programador'])
         *   await hasRole('socio')
         * 
         * @param {string|Array} roles - Rol(es) a verificar
         * @returns {Promise<boolean>}
         */
        async hasRole(roles) {
            try {
                // PASO 1: Obtener usuario actual (prioriza window.currentUser)
                let currentUser = window.currentUser;

                // Si no está disponible, esperar a la promesa
                if (!currentUser && window.currentUserReady) {
                    console.log('⏳ hasRole: Esperando window.currentUserReady...');
                    await window.currentUserReady;
                    currentUser = window.currentUser;
                }

                // PASO 2: Validar que tengamos un usuario
                if (!currentUser || !currentUser.role) {
                    console.warn('⚠️ hasRole: window.currentUser no disponible o sin rol');
                    console.log('   window.currentUser:', currentUser);
                    return false;
                }

                // PASO 3: Normalizar el rol del usuario (resuelve alias)
                const userRole = normalizeRole(currentUser.role);
                console.log(`🔍 hasRole: Usuario actual tiene rol: "${currentUser.role}" (normalizado: "${userRole}")`);

                // PASO 4: Normalizar los roles a verificar
                const rolesToCheck = Array.isArray(roles) ? roles : [roles];
                const normalizedRolesToCheck = rolesToCheck.map(r => normalizeRole(r));

                console.log(`🔍 hasRole: Verificando si "${userRole}" está en [${normalizedRolesToCheck.join(', ')}]`);

                // PASO 5: Verificar si el usuario tiene alguno de los roles
                const hasPermission = normalizedRolesToCheck.includes(userRole);

                if (hasPermission) {
                    console.log(`✅ hasRole: Usuario ${currentUser.name} (${userRole}) TIENE rol requerido`);
                } else {
                    console.log(`🔒 hasRole: Usuario ${currentUser.name} (${userRole}) NO tiene rol(es): [${normalizedRolesToCheck.join(', ')}]`);
                }

                return hasPermission;
            } catch (err) {
                console.error('❌ PermissionsHelper.hasRole ERROR:', err);
                console.log('   window.currentUser:', window.currentUser);
                return false;
            }
        },

        /**
         * Verificar si el usuario tiene TODOS estos roles (conjunción)
         * 
         * Uso: await hasAllRoles(['admin', 'supervisor']) → solo true si tiene ambos (improbable)
         * 
         * @param {Array} roles
         * @returns {Promise<boolean>}
         */
        async hasAllRoles(roles) {
            try {
                const profile = await getMyProfile();
                if (!profile || !profile.role) return false;

                const userRole = normalizeRole(profile.role);
                const rolesToCheck = Array.isArray(roles) ? roles : [roles];

                return rolesToCheck.every(r => normalizeRole(r) === userRole);
            } catch (err) {
                console.warn('⚠️ PermissionsHelper.hasAllRoles:', err.message);
                return false;
            }
        },

        /**
         * Verificar si el usuario PUEDE hacer una acción en un recurso
         * 
         * Uso:
         *   await hasPermission('crear', 'usuarios')
         *   await hasPermission('editar', 'entidades')
         *   await hasPermission('ver', 'compromisos')
         * 
         * @param {string} action - Acción (ver, crear, editar, eliminar, etc)
         * @param {string} resource - Recurso (usuarios, entidades, compromisos, etc)
         * @returns {Promise<boolean>}
         */
        async hasPermission(action, resource) {
            try {
                const profile = await getMyProfile();
                if (!profile || !profile.role) {
                    console.warn('⚠️ No hay perfil para validar permiso');
                    return false;
                }

                const userRole = normalizeRole(profile.role);
                const perms = getPermissionsForRole(userRole, resource);

                return perms.includes(action.toLowerCase());
            } catch (err) {
                console.warn(`⚠️ PermissionsHelper.hasPermission(${action}, ${resource}):`, err.message);
                return false;
            }
        },

        /**
         * Verificar si el usuario PUEDE acceder a un módulo completo
         * 
         * Uso:
         *   await canAccessModule('usuarios')
         *   await canAccessModule('reportes')
         * 
         * @param {string} module - Nombre del módulo
         * @returns {Promise<boolean>}
         */
        async canAccessModule(module) {
            try {
                const profile = await getMyProfile();
                if (!profile || !profile.role) return false;

                const userRole = normalizeRole(profile.role);
                const moduleName = (module || '').toLowerCase();

                if (!MODULES_ACCESS[moduleName]) {
                    console.warn(`⚠️ Módulo "${moduleName}" no definido`);
                    return false;
                }

                return MODULES_ACCESS[moduleName].includes(userRole);
            } catch (err) {
                console.warn(`⚠️ PermissionsHelper.canAccessModule(${module}):`, err.message);
                return false;
            }
        },

        /**
         * Verificar si el rol es superior o igual a otro en la jerarquía
         * 
         * Uso:
         *   await isRoleHigherOrEqual('admin', 'supervisor')  → true
         *   await isRoleHigherOrEqual('cliente', 'admin')     → false
         * 
         * @param {string} role1 - Rol a comparar
         * @param {string} role2 - Rol de referencia
         * @returns {Promise<boolean>} true si role1 >= role2 en jerarquía
         */
        async isRoleHigherOrEqual(role1, role2) {
            try {
                const r1 = normalizeRole(role1);
                const r2 = normalizeRole(role2);

                const score1 = ROLE_HIERARCHY[r1] || 0;
                const score2 = ROLE_HIERARCHY[r2] || 0;

                return score1 >= score2;
            } catch (err) {
                console.warn('⚠️ PermissionsHelper.isRoleHigherOrEqual:', err.message);
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
         * Obtener todos los permisos del usuario para un recurso
         * 
         * Uso:
         *   const perms = await getPermissions('entidades')
         *   if (perms.includes('crear')) { mostrar botón crear }
         * 
         * @param {string} resource
         * @returns {Promise<Array<string>>}
         */
        async getPermissions(resource) {
            try {
                const profile = await getMyProfile();
                if (!profile || !profile.role) return [];

                const userRole = normalizeRole(profile.role);
                return getPermissionsForRole(userRole, resource);
            } catch (err) {
                console.warn(`⚠️ PermissionsHelper.getPermissions(${resource}):`, err.message);
                return [];
            }
        },

        /**
         * UTILIDAD: Deshabilitar elemento si NO tiene permiso
         * 
         * Uso en HTML:
         *   <button id="deleteBtn" onclick="handleDelete()">Eliminar</button>
         *   <script>
         *     PermissionsHelper.disableIfNoPermission('deleteBtn', 'eliminar', 'entidades', 
         *       'No tienes permiso para eliminar entidades');
         *   </script>
         * 
         * @param {string|Element} element - ID del elemento o elemento DOM
         * @param {string} action - Acción requerida
         * @param {string} resource - Recurso
         * @param {string} tooltipText - Texto del tooltip al deshabilitar
         */
        async disableIfNoPermission(element, action, resource, tooltipText) {
            try {
                const el = typeof element === 'string'
                    ? document.getElementById(element)
                    : element;

                if (!el) {
                    console.warn(`⚠️ Elemento no encontrado: ${element}`);
                    return;
                }

                const hasPermission = await this.hasPermission(action, resource);
                if (!hasPermission) {
                    el.disabled = true;
                    el.title = tooltipText || `No tienes permiso para ${action}`;
                    el.style.opacity = '0.5';
                    el.style.cursor = 'not-allowed';
                }
            } catch (err) {
                console.warn('⚠️ PermissionsHelper.disableIfNoPermission:', err.message);
            }
        },

        /**
         * UTILIDAD: Ocultar elemento si NO tiene permiso
         * 
         * Uso en HTML:
         *   <button id="adminBtn">Panel de Administración</button>
         *   <script>
         *     PermissionsHelper.hideIfNoPermission('adminBtn', 'ver', 'usuarios');
         *   </script>
         * 
         * @param {string|Element} element - ID del elemento o elemento DOM
         * @param {string} action - Acción requerida
         * @param {string} resource - Recurso
         */
        async hideIfNoPermission(element, action, resource) {
            try {
                const el = typeof element === 'string'
                    ? document.getElementById(element)
                    : element;

                if (!el) {
                    console.warn(`⚠️ Elemento no encontrado: ${element}`);
                    return;
                }

                const hasPermission = await this.hasPermission(action, resource);
                if (!hasPermission) {
                    el.style.display = 'none';
                }
            } catch (err) {
                console.warn('⚠️ PermissionsHelper.hideIfNoPermission:', err.message);
            }
        },

        /**
         * UTILIDAD: Verificar permiso y lanzar error si no lo tiene
         * 
         * Uso:
         *   const can = await checkPermissionOrFail('crear', 'usuarios', 
         *     '❌ No tienes permiso para crear usuarios');
         *   if (can) { hacer acción }
         * @param { string } action
         * @param { string } resource
         * @param { string } errorMsg - Mensaje a mostrar si NO tiene permiso
         * @returns { Promise < boolean >} true si tiene permiso, false si no
        **/
        async checkPermissionOrFail(action, resource, errorMsg) {
            try {
                const hasPermission = await this.hasPermission(action, resource);
                if (!hasPermission) {
                    console.warn(`🚫 Permiso denegado: ${action} en ${resource}`);
                    if (errorMsg && window.API?.showError) {
                        window.API.showError(errorMsg);
                    } else if (errorMsg) {
                        alert(errorMsg);
                    }
                    return false;
                }
                return true;
            } catch (err) {
                console.warn('⚠️ PermissionsHelper.checkPermissionOrFail:', err.message);
                return false;
            }
        },

        /**
         * UTILIDAD: Mostrar "acceso denegado" si no tiene acceso al módulo
         * 
         * Uso:
         *   const hasAccess = await requireModuleAccess('usuarios');
         *   if (!hasAccess) { return; } // Página se bloquea
         * 
         * @param {string} module - Nombre del módulo
         * @param {string} containerId - ID del container para mostrar error
         * @returns {Promise<boolean>}
         */
        async requireModuleAccess(module, containerId = 'alertContainer') {
            try {
                const hasAccess = await this.canAccessModule(module);
                if (!hasAccess) {
                    console.error(`❌ Acceso denegado al módulo: ${module}`);
                    if (window.API?.showError) {
                        window.API.showError(`❌ No tienes permiso para acceder a ${module}`, containerId);
                    }
                    return false;
                }
                return true;
            } catch (err) {
                console.warn('⚠️ PermissionsHelper.requireModuleAccess:', err.message);
                return false;
            }
        }
    };

    console.log('✅ permissions-helpers.js: Sistema de permisos cargado (window.PermissionsHelper SIEMPRE disponible)');
    console.log('   Roles válidos:', Object.keys(VALID_ROLES).map(k => VALID_ROLES[k]).join(', '));
    console.log('   Métodos públicos:', ['hasRole()', 'hasPermission()', 'canAccessModule()', 'getCurrentRole()', 'disableIfNoPermission()', 'hideIfNoPermission()', 'checkPermissionOrFail()'].join(', '));

})();
