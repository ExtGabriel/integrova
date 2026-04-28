/**
 * ENTITY ROLE MANAGER - Integración de Roles por Entidad
 * 
 * Propósito:
 * - Obtener y cachear el role de usuario en una entidad específica
 * - Proteger acciones críticas (editar, eliminar, crear compromisos)
 * - Habilitar/deshabilitar botones según permisos
 * 
 * Arquitectura:
 * - window.currentEntity: { id, name, ... } (entidad actual)
 * - window.currentEntityRole: 'owner'|'auditor'|'viewer'|null (role del usuario en esa entidad)
 * - Helpers: canEdit(), canCreateCommitment(), canAudit()
 * 
 * REQUISITOS:
 * - permissions-helpers.js cargado (PermissionsHelper)
 * - api-client.js cargado (API.EntityUsers)
 * - window.currentUser disponible
 */

(function () {
    'use strict';

    console.log('🔐 entity-role-manager.js: Inicializando gestor de roles por entidad...');

    /**
     * ===================================
     * ESTADO GLOBAL
     * ===================================
     */

    // Cache de roles para evitar llamadas repetidas
    // Estructura: { entityId: { userId: 'role', ... }, ... }
    const roleCache = {};

    /**
     * ===================================
     * API PÚBLICA
     * ===================================
     */

    window.EntityRoleManager = {

        /**
         * Obtener el role de usuario en una entidad
         * 
         * @param {number} entityId - ID de la entidad
         * @param {string|undefined} userId - ID del usuario (default: currentUser.id)
         * @returns {Promise<string|null>} - 'owner'|'auditor'|'viewer'|null
         * 
         * @example
         * const role = await EntityRoleManager.getEntityRole(1);
         * console.log(role); // 'owner'
         */
        async getEntityRole(entityId, userId) {
            try {
                const targetUserId = userId || window.currentUser?.id;

                if (!targetUserId) {
                    console.warn('⚠️ EntityRoleManager: No user ID available');
                    return null;
                }

                // Verificar cache primero
                if (roleCache[entityId] && roleCache[entityId][targetUserId]) {
                    console.log(`✅ EntityRoleManager: Role para entidad ${entityId} (cache)`,
                        roleCache[entityId][targetUserId]);
                    return roleCache[entityId][targetUserId];
                }

                // Consultar API
                console.log(`🔄 EntityRoleManager: Obteniendo role para entidad ${entityId}...`);
                const role = await API.EntityUsers.getUserRole(entityId, targetUserId);

                // Guardar en cache
                if (!roleCache[entityId]) {
                    roleCache[entityId] = {};
                }
                roleCache[entityId][targetUserId] = role;

                console.log(`✅ EntityRoleManager: Role obtenido para entidad ${entityId}:`, role);
                return role;

            } catch (error) {
                console.error('❌ EntityRoleManager: Error obteniendo role:', error);
                return null;
            }
        },

        /**
         * Cargar una entidad y su role
         * Establece window.currentEntity y window.currentEntityRole
         * 
         * @param {object} entity - Objeto entidad { id, name, ... }
         * @param {string|undefined} userId - ID del usuario (default: currentUser.id)
         * @returns {Promise<boolean>} - true si fue exitoso
         * 
         * @example
         * const success = await EntityRoleManager.loadEntity({ id: 1, name: 'Entidad A' });
         * if (success) {
         *     console.log(window.currentEntity);  // { id: 1, name: 'Entidad A' }
         *     console.log(window.currentEntityRole); // 'owner'
         * }
         */
        async loadEntity(entity, userId) {
            try {
                if (!entity || !entity.id) {
                    console.error('❌ EntityRoleManager: Entidad inválida');
                    return false;
                }

                // Guardar entidad actual
                window.currentEntity = entity;

                // Obtener role
                const role = await this.getEntityRole(entity.id, userId);
                window.currentEntityRole = role;

                console.log(`✅ EntityRoleManager: Entidad cargada:`, {
                    entity: window.currentEntity,
                    role: window.currentEntityRole
                });

                // Proteger botones según permisos
                await this.updateActionButtons();

                return true;

            } catch (error) {
                console.error('❌ EntityRoleManager: Error cargando entidad:', error);
                return false;
            }
        },

        /**
         * Actualizar visibilidad/estado de botones según permisos actuales
         * 
         * Busca botones con data-action:
         * - [data-action="edit"]
         * - [data-action="delete"]
         * - [data-action="create-commitment"]
         * - [data-action="audit"]
         * 
         * @returns {Promise<void>}
         * 
         * @example
         * await EntityRoleManager.updateActionButtons();
         */
        async updateActionButtons() {
            try {
                const role = window.currentEntityRole;
                const isAdmin = PermissionsHelper.isAdmin();

                // Determinar permisos
                const permissions = {
                    canEdit: isAdmin || PermissionsHelper.canEditEntity(role),
                    canCreateCommitment: isAdmin || PermissionsHelper.canCreateCommitment(role),
                    canAudit: isAdmin || PermissionsHelper.canAudit(role),
                    canDelete: isAdmin || role === PermissionsHelper.ENTITY_ROLES.OWNER
                };

                // Botones de EDITAR
                document.querySelectorAll('[data-action="edit"]').forEach(btn => {
                    btn.disabled = !permissions.canEdit;
                    if (!permissions.canEdit) {
                        btn.title = 'No tienes permiso para editar esta entidad';
                    }
                });

                // Botones de CREAR COMPROMISO
                document.querySelectorAll('[data-action="create-commitment"]').forEach(btn => {
                    btn.disabled = !permissions.canCreateCommitment;
                    if (!permissions.canCreateCommitment) {
                        btn.title = 'No tienes permiso para crear compromisos en esta entidad';
                    }
                });

                // Botones de AUDITAR
                document.querySelectorAll('[data-action="audit"]').forEach(btn => {
                    btn.disabled = !permissions.canAudit;
                    if (!permissions.canAudit) {
                        btn.title = 'No tienes permiso para auditar esta entidad';
                    }
                });

                // Botones de ELIMINAR
                document.querySelectorAll('[data-action="delete"]').forEach(btn => {
                    btn.disabled = !permissions.canDelete;
                    if (!permissions.canDelete) {
                        btn.title = 'No tienes permiso para eliminar esta entidad';
                    }
                });

                console.log('✅ EntityRoleManager: Botones actualizados:', permissions);

            } catch (error) {
                console.error('⚠️ EntityRoleManager: Error actualizando botones:', error);
            }
        },

        /**
         * Verificar permiso y mostrar mensaje si no lo tiene
         * 
         * @param {string} action - 'edit'|'delete'|'create-commitment'|'audit'
         * @returns {boolean} - true si tiene permiso
         * 
         * @example
         * if (!EntityRoleManager.checkPermission('edit')) {
         *     return;
         * }
         * // Proceder a editar
         */
        checkPermission(action) {
            const role = window.currentEntityRole;
            const isAdmin = PermissionsHelper.isAdmin();

            let hasPermission = false;

            switch (action) {
                case 'edit':
                    hasPermission = isAdmin || PermissionsHelper.canEditEntity(role);
                    break;
                case 'delete':
                    hasPermission = isAdmin || role === PermissionsHelper.ENTITY_ROLES.OWNER;
                    break;
                case 'create-commitment':
                    hasPermission = isAdmin || PermissionsHelper.canCreateCommitment(role);
                    break;
                case 'audit':
                    hasPermission = isAdmin || PermissionsHelper.canAudit(role);
                    break;
                default:
                    hasPermission = false;
            }

            // Si no tiene permiso, mostrar mensaje
            if (!hasPermission) {
                const messages = {
                    edit: '❌ No tienes permiso para editar esta entidad',
                    delete: '❌ No tienes permiso para eliminar esta entidad',
                    'create-commitment': '❌ No tienes permiso para crear compromisos en esta entidad',
                    audit: '❌ No tienes permiso para auditar esta entidad'
                };

                console.warn(messages[action] || `❌ Permiso denegado: ${action}`);
                alert(messages[action] || 'Permiso denegado');
            }

            return hasPermission;
        },

        /**
         * Limpiar estado de entidad (ej: al cerrar vista detalle)
         * 
         * @returns {void}
         * 
         * @example
         * EntityRoleManager.clearEntity();
         */
        clearEntity() {
            window.currentEntity = null;
            window.currentEntityRole = null;
            console.log('🧹 EntityRoleManager: Estado limpiado');
        },

        /**
         * Forzar actualización del cache de rol para una entidad
         * (Útil si se asignó/cambió un role)
         * 
         * @param {number} entityId - ID de la entidad
         * @param {string|undefined} userId - ID del usuario (default: currentUser.id)
         * @returns {Promise<string|null>} - Nuevo role
         * 
         * @example
         * // Después de asignar un usuario a una entidad
         * const newRole = await EntityRoleManager.refreshEntityRole(1);
         */
        async refreshEntityRole(entityId, userId) {
            try {
                const targetUserId = userId || window.currentUser?.id;

                if (!targetUserId) {
                    return null;
                }

                // Limpiar cache
                if (roleCache[entityId]) {
                    delete roleCache[entityId][targetUserId];
                }

                // Obtener nuevamente
                const role = await this.getEntityRole(entityId, targetUserId);

                // Si es la entidad actual, actualizar
                if (window.currentEntity?.id === entityId) {
                    window.currentEntityRole = role;
                    await this.updateActionButtons();
                }

                return role;

            } catch (error) {
                console.error('❌ EntityRoleManager: Error refrescando role:', error);
                return null;
            }
        },

        /**
         * Obtener estado actual (para debugging)
         * 
         * @returns {object}
         * 
         * @example
         * console.log(EntityRoleManager.getState());
         * // {
         * //   currentEntity: { id: 1, name: 'Entidad A' },
         * //   currentEntityRole: 'owner',
         * //   isAdmin: true,
         * //   permissions: { canEdit: true, canDelete: true, ... }
         * // }
         */
        getState() {
            const role = window.currentEntityRole;
            const isAdmin = PermissionsHelper.isAdmin();

            return {
                currentEntity: window.currentEntity || null,
                currentEntityRole: role,
                isAdmin: isAdmin,
                permissions: {
                    canEdit: isAdmin || PermissionsHelper.canEditEntity(role),
                    canDelete: isAdmin || role === PermissionsHelper.ENTITY_ROLES.OWNER,
                    canCreateCommitment: isAdmin || PermissionsHelper.canCreateCommitment(role),
                    canAudit: isAdmin || PermissionsHelper.canAudit(role)
                }
            };
        }
    };

    console.log('✅ entity-role-manager.js cargado');

})();
