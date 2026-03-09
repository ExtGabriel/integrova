/**
 * EJEMPLO DE INTEGRACIÓN: Control de Roles en Entidades
 * 
 * Este archivo muestra cómo integrar el sistema de permisos en entidades.html
 * 
 * ⚠️ NOTA: Este es un EJEMPLO. Adaptar a la estructura real de entidades.html
 * 
 * REQUISITOS:
 * 1. permissions-helpers.js está cargado ANTES que este script
 * 2. El botón "crear entidad" tiene id="createEntityBtn"
 * 3. El contenedor de entidades tiene id="entitiesList"
 */

(function () {
    'use strict';

    console.log('🏢 Ejemplo de integración de permisos en Entidades...');

    /**
     * Inicializar protección de permisos en página de entidades
     */
    async function initializePermissionsInEntities() {
        try {
            console.log('🔐 Validando acceso a módulo de entidades...');

            // CRÍTICO: Esperar a que window.currentUser esté listo
            if (window.currentUserReady && typeof window.currentUserReady.then === 'function') {
                console.log('⏳ Esperando a window.currentUserReady...');
                await window.currentUserReady;
            }

            // Verificar que currentUser esté disponible
            if (!window.currentUser) {
                console.error('❌ window.currentUser no disponible en entidades');
                showAccessDeniedUI();
                return;
            }

            console.log(`✅ Usuario cargado: ${window.currentUser.name} (${window.currentUser.role})`);

            // PASO 1: Verificar acceso al módulo completo
            const canAccess = await PermissionsHelper.canAccessModule('entidades');
            if (!canAccess) {
                console.error('❌ Acceso denegado al módulo de entidades');
                showAccessDeniedUI();
                return;
            }

            console.log('✅ Acceso a entidades PERMITIDO');

            // PASO 2: Obtener todos los permisos
            const permissions = await PermissionsHelper.getPermissions('entidades');
            console.log('📋 Tus permisos en entidades:', permissions);

            // PASO 3: Obtener rol actual (para lógica adicional)
            const currentRole = await PermissionsHelper.getCurrentRole();
            console.log(`👤 Tu rol: ${currentRole}`);

            // PASO 4: Proteger botones
            await protectEntityButtons(permissions);

            // PASO 5: Renderizar tabla con acciones condicionadas
            await renderEntitiesConditional(permissions, currentRole);

            // PASO 6: Configurar filtros visibles
            configureVisibleFilters(permissions);

            console.log('✅ Permisos de entidades configurados correctamente');

        } catch (error) {
            console.error('❌ Error inicializando permisos:', error);
            showErrorMsg('Error al cargar permisos');
        }
    }

    /**
     * Proteger botones de acción según permisos
     */
    async function protectEntityButtons(permissions) {
        try {
            // Botón CREAR
            if (!permissions.includes('crear')) {
                await PermissionsHelper.disableIfNoPermission(
                    'createEntityBtn',
                    'crear',
                    'entidades',
                    'No tienes permiso para crear entidades'
                );
                console.log('ℹ️ Botón crear entidad: DESHABILITADO');
            } else {
                console.log('✅ Botón crear entidad: HABILITADO');
            }

            // Botón EDITAR (aplicado a botones individuales en tabla)
            // Se aplica por fila, no globalmente

            // Botón ELIMINAR (si existe globalmente)
            const deleteBtn = document.getElementById('deleteEntityBtn');
            if (deleteBtn) {
                if (!permissions.includes('eliminar')) {
                    await PermissionsHelper.hideIfNoPermission(
                        'deleteEntityBtn',
                        'eliminar',
                        'entidades'
                    );
                    console.log('ℹ️ Botón eliminar entidad: OCULTO');
                }
            }

        } catch (error) {
            console.warn('⚠️ Error protegiendo botones:', error.message);
        }
    }

    /**
     * Renderizar tabla de entidades con acciones condicionadas
     */
    async function renderEntitiesConditional(permissions, currentRole) {
        try {
            const entitiesList = document.getElementById('entitiesList') ||
                document.querySelector('[data-entidades]');

            if (!entitiesList) {
                console.warn('⚠️ No se encontró contenedor de entidades');
                return;
            }

            // SIMULACIÓN: En real, estos vendrían de API.Entities.getAll()
            const entities = [
                {
                    id: 1,
                    name: 'Entidad A',
                    type: 'Regional',
                    region: 'Centro',
                    status: 'activa'
                },
                {
                    id: 2,
                    name: 'Entidad B',
                    type: 'Subestación',
                    region: 'Norte',
                    status: 'activa'
                },
                {
                    id: 3,
                    name: 'Entidad C',
                    type: 'Oficina',
                    region: 'Sur',
                    status: 'inactiva'
                }
            ];

            // Limpiar lista
            entitiesList.innerHTML = '';

            // Renderizar SOLO si puede ver
            if (permissions.includes('ver')) {
                // Crear tabla
                const table = createEntitiesTable(entities, permissions, currentRole);
                entitiesList.appendChild(table);
                console.log(`✅ ${entities.length} entidades renderizadas`);
            } else {
                entitiesList.innerHTML = `
                    <div style="text-align: center; color: #999; padding: 40px;">
                        <i class="bi bi-lock" style="font-size: 2em;"></i>
                        <p>No tienes permiso para ver entidades</p>
                    </div>
                `;
            }

        } catch (error) {
            console.warn('⚠️ Error renderizando entidades:', error.message);
        }
    }

    /**
     * Crear tabla de entidades con botones condicionados
     */
    function createEntitiesTable(entities, permissions, currentRole) {
        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Región</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        entities.forEach(entity => {
            const row = document.createElement('tr');

            // Columnas básicas
            row.innerHTML = `
                <td><strong>${entity.name}</strong></td>
                <td>${entity.type}</td>
                <td>${entity.region}</td>
                <td>
                    <span class="badge ${entity.status === 'activa' ? 'bg-success' : 'bg-danger'}">
                        ${entity.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group"></div>
                </td>
            `;

            // Grupo de botones de acciones
            const btnGroup = row.querySelector('.btn-group');

            // BOTÓN VER DETALLES (disponible para todos que puedan ver)
            if (permissions.includes('ver')) {
                const viewBtn = document.createElement('button');
                viewBtn.className = 'btn btn-outline-info';
                viewBtn.innerHTML = '<i class="bi bi-eye"></i>';
                viewBtn.title = 'Ver detalles';
                viewBtn.onclick = () => handleViewEntity(entity.id, entity.name);
                btnGroup.appendChild(viewBtn);
            }

            // BOTÓN EDITAR (si tiene permiso)
            if (permissions.includes('editar')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-outline-warning';
                editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
                editBtn.title = 'Editar entidad';
                editBtn.onclick = () => handleEditEntity(entity.id, entity.name);
                btnGroup.appendChild(editBtn);
            }

            // BOTÓN ELIMINAR (si tiene permiso - típicamente admin/programador)
            if (permissions.includes('eliminar')) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-outline-danger';
                deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                deleteBtn.title = 'Eliminar entidad';
                deleteBtn.onclick = () => handleDeleteEntity(entity.id, entity.name);
                btnGroup.appendChild(deleteBtn);
            }

            tbody.appendChild(row);
        });

        return table;
    }

    /**
     * Configurar visibilidad de filtros según rol
     * (Ej: Auditor puede filtrar pero no crear/editar)
     */
    function configureVisibleFilters(permissions) {
        try {
            // Filtro por región (visible para todos que puedan ver)
            if (permissions.includes('ver')) {
                const regionFilter = document.getElementById('regionFilter');
                if (regionFilter) {
                    regionFilter.style.display = 'block';
                }
            }

            // Filtro por estado (visible para todos que puedan ver)
            if (permissions.includes('ver')) {
                const statusFilter = document.getElementById('statusFilter');
                if (statusFilter) {
                    statusFilter.style.display = 'block';
                }
            }

            // Filtro por tipo (visible para todos que puedan ver)
            if (permissions.includes('ver')) {
                const typeFilter = document.getElementById('typeFilter');
                if (typeFilter) {
                    typeFilter.style.display = 'block';
                }
            }

        } catch (error) {
            console.warn('⚠️ Error configurando filtros:', error.message);
        }
    }

    /**
     * Handlers de acciones - Validan permisos ANTES de proceder
     */

    async function handleViewEntity(entityId, entityName) {
        // Ver no requiere confirmación especial
        console.log(`👁️ Viendo entidad ${entityName}...`);

        // Aquí iría la lógica real de ver detalles
        alert(`Detalles de: ${entityName}`);
    }

    async function handleEditEntity(entityId, entityName) {
        // VALIDACIÓN: Verificar permiso antes de proceder
        if (!PermissionsHelper.isAdmin()) {
            showErrorMsg('❌ No tienes permiso para editar entidades. Solo administradores pueden hacerlo.');
            return;
        }

        console.log(`✏️ Editando entidad ${entityName}...`);
        // Aquí iría la lógica real de edición
        alert(`Editar: ${entityName}`);
    }

    async function handleDeleteEntity(entityId, entityName) {
        // VALIDACIÓN: Verificar permiso
        if (!PermissionsHelper.isAdmin()) {
            showErrorMsg('❌ No tienes permiso para eliminar entidades. Solo administradores pueden hacerlo.');
            return;
        }

        // Confirmación adicional para operación destructiva
        if (!confirm(`¿Estás seguro de que deseas ELIMINAR "${entityName}"? Esta acción no se puede deshacer.`)) {
            console.log('❌ Eliminación cancelada por el usuario');
            return;
        }

        console.log(`🗑️ Eliminando entidad ${entityName}...`);

        // Llamar a API (que a su vez será validado por RLS en backend)
        // await API.Entities.delete(entityId);

        alert(`Entidad ${entityName} eliminada correctamente`);
    }

    /**
     * UI: Mostrar acceso denegado
     */
    function showAccessDeniedUI() {
        const container = document.getElementById('entitiesList') ||
            document.querySelector('[data-entidades]') ||
            document.body;

        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: #f8d7da; border-radius: 8px; margin: 20px;">
                <i class="bi bi-shield-exclamation" style="font-size: 3em; color: #721c24;"></i>
                <h2 style="color: #721c24; margin-top: 20px;">Acceso Denegado</h2>
                <p>No tienes permiso para acceder al módulo de entidades.</p>
                <p style="font-size: 0.9em; color: #856404;">
                    Si crees que esto es un error, contacta al administrador del sistema.
                </p>
                <a href="dashboard.html" class="btn btn-primary" style="margin-top: 20px;">
                    <i class="bi bi-arrow-left"></i> Volver al Dashboard
                </a>
            </div>
        `;
    }

    /**
     * UI: Mostrar mensaje de error
     */
    function showErrorMsg(message) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) {
            alert(message);
            return;
        }
        alertContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle"></i> <strong>Error:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    /**
     * Exportar función pública
     */
    window.initializeEntitiesPermissions = initializePermissionsInEntities;

    console.log('✅ Módulo de permisos en entidades LISTO');

})();

/**
 * USO EN HTML (entidades.html):
 * 
 * ==========================================
 * 1. Asegúrate que los scripts cargan en orden correcto:
 * 
 * <script src="js/config-supabase.js"></script>
 * <script src="js/supabaseClient.js"></script>
 * <script src="js/api-client.js"></script>
 * <script src="js/permissions-helpers.js"></script>  ← IMPORTANTE
 * <script src="js/auth-guard.js"></script>
 * <script src="js/entidades-permisos.js"></script>  ← Este archivo
 * 
 * ==========================================
 * 2. Llamar desde window.protectPage:
 * 
 * <script>
 *   window.protectPage(async () => {
 *       await window.initializeEntitiesPermissions();
 *   });
 * </script>
 */
