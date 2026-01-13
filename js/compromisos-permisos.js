/**
 * EJEMPLO DE INTEGRACIÓN: Control de Roles en Compromisos
 * 
 * Este archivo muestra cómo integrar el sistema de permisos en compromisos.html
 * 
 * ⚠️ NOTA: Este es un EJEMPLO. Adaptar a la estructura real de compromisos.html
 * 
 * REQUISITOS:
 * 1. permissions-helpers.js está cargado ANTES que este script
 * 2. El botón "crear compromiso" tiene id="createCommitmentBtn"
 * 3. El contenedor de compromisos tiene id="commitmentsList"
 */

(function () {
    'use strict';

    console.log('📋 Ejemplo de integración de permisos en Compromisos...');

    /**
     * Inicializar protección de permisos en página de compromisos
     * 
     * Esta función DEBE llamarse desde window.protectPage()
     */
    async function initializePermissionsInCommitments() {
        try {
            console.log('🔐 Validando acceso a módulo de compromisos...');

            // PASO 1: Verificar acceso al módulo completo
            const canAccess = await PermissionsHelper.canAccessModule('compromisos');
            if (!canAccess) {
                console.error('❌ Acceso denegado al módulo de compromisos');
                showAccessDeniedUI();
                return;
            }

            console.log('✅ Acceso a compromisos PERMITIDO');

            // PASO 2: Obtener todos los permisos del usuario en este módulo
            const permissions = await PermissionsHelper.getPermissions('compromisos');
            console.log('📋 Tus permisos en compromisos:', permissions);

            // PASO 3: Proteger botones según permisos
            await protectCommitmentButtons(permissions);

            // PASO 4: Renderizar tabla con acciones condicionadas
            await renderCommitmentsConditional(permissions);

            console.log('✅ Permisos de compromisos configurados correctamente');

        } catch (error) {
            console.error('❌ Error inicializando permisos:', error);
            showErrorMsg('Error al cargar permisos');
        }
    }

    /**
     * Proteger botones de acción según permisos
     */
    async function protectCommitmentButtons(permissions) {
        try {
            // Botón CREAR
            if (!permissions.includes('crear')) {
                await PermissionsHelper.disableIfNoPermission(
                    'createCommitmentBtn',
                    'crear',
                    'compromisos',
                    'No tienes permiso para crear compromisos'
                );
                console.log('ℹ️ Botón crear: DESHABILITADO');
            } else {
                console.log('✅ Botón crear: HABILITADO');
            }

            // Botón CAMBIAR ESTADO (si existe en HTML)
            const changeStateBtn = document.getElementById('changeStateBtn');
            if (changeStateBtn) {
                if (!permissions.includes('cambiar_estado')) {
                    await PermissionsHelper.disableIfNoPermission(
                        'changeStateBtn',
                        'cambiar_estado',
                        'compromisos',
                        'No tienes permiso para cambiar estado'
                    );
                    console.log('ℹ️ Botón cambiar estado: DESHABILITADO');
                }
            }

            // Botón EDITAR (si existe)
            const editBtn = document.getElementById('editCommitmentBtn');
            if (editBtn) {
                if (!permissions.includes('editar')) {
                    await PermissionsHelper.disableIfNoPermission(
                        'editCommitmentBtn',
                        'editar',
                        'compromisos',
                        'No tienes permiso para editar compromisos'
                    );
                    console.log('ℹ️ Botón editar: DESHABILITADO');
                }
            }

            // Botón ELIMINAR (si existe) - Típicamente más restrictivo
            const deleteBtn = document.getElementById('deleteCommitmentBtn');
            if (deleteBtn) {
                if (!permissions.includes('eliminar')) {
                    // Ocultar completamente si no puede eliminar
                    await PermissionsHelper.hideIfNoPermission(
                        'deleteCommitmentBtn',
                        'eliminar',
                        'compromisos'
                    );
                    console.log('ℹ️ Botón eliminar: OCULTO');
                }
            }

        } catch (error) {
            console.warn('⚠️ Error protegiendo botones:', error.message);
        }
    }

    /**
     * Renderizar tabla de compromisos con acciones condicionadas
     */
    async function renderCommitmentsConditional(permissions) {
        try {
            const commitmentsList = document.getElementById('commitmentsList');
            if (!commitmentsList) {
                console.warn('⚠️ No se encontró #commitmentsList');
                return;
            }

            // SIMULACIÓN: En real, estos vendrían de API.Commitments.getAll()
            const commitments = [
                {
                    id: 1,
                    name: 'Compromiso A',
                    status: 'pendiente',
                    dueDate: '2025-02-15'
                },
                {
                    id: 2,
                    name: 'Compromiso B',
                    status: 'en_progreso',
                    dueDate: '2025-02-28'
                }
            ];

            // Limpiar lista
            commitmentsList.innerHTML = '';

            // Renderizar tarjeta SOLO si puede verlas
            if (permissions.includes('ver')) {
                commitments.forEach(commitment => {
                    const card = createCommitmentCard(commitment, permissions);
                    commitmentsList.appendChild(card);
                });
                console.log(`✅ ${commitments.length} compromisos renderizados`);
            } else {
                commitmentsList.innerHTML = `
                    <div style="text-align: center; color: #999; padding: 40px;">
                        <i class="bi bi-lock" style="font-size: 2em;"></i>
                        <p>No tienes permiso para ver compromisos</p>
                    </div>
                `;
            }

        } catch (error) {
            console.warn('⚠️ Error renderizando compromisos:', error.message);
        }
    }

    /**
     * Crear tarjeta de compromiso con botones condicionados
     */
    function createCommitmentCard(commitment, permissions) {
        const card = document.createElement('div');
        card.className = 'commitment-card';
        card.style.border = '1px solid #ddd';
        card.style.borderRadius = '8px';
        card.style.padding = '15px';
        card.style.marginBottom = '10px';

        // Contenido básico (visible para todos con permiso 'ver')
        card.innerHTML = `
            <h5>${commitment.name}</h5>
            <p>Estado: <span class="badge bg-info">${commitment.status}</span></p>
            <p>Vencimiento: ${commitment.dueDate}</p>
            <div class="card-actions" style="margin-top: 10px;">
        `;

        // BOTÓN EDITAR (si tiene permiso)
        if (permissions.includes('editar')) {
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-sm btn-warning';
            editBtn.innerHTML = '<i class="bi bi-pencil"></i> Editar';
            editBtn.onclick = () => handleEditCommitment(commitment.id);
            card.querySelector('.card-actions').appendChild(editBtn);
        }

        // BOTÓN CAMBIAR ESTADO (si tiene permiso)
        if (permissions.includes('cambiar_estado')) {
            const stateBtn = document.createElement('button');
            stateBtn.className = 'btn btn-sm btn-info';
            stateBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Cambiar Estado';
            stateBtn.onclick = () => handleChangeState(commitment.id);
            card.querySelector('.card-actions').appendChild(stateBtn);
        }

        // BOTÓN ELIMINAR (si tiene permiso - típicamente admin)
        if (permissions.includes('eliminar')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-danger';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Eliminar';
            deleteBtn.onclick = () => handleDeleteCommitment(commitment.id);
            card.querySelector('.card-actions').appendChild(deleteBtn);
        }

        card.innerHTML += '</div>'; // Cerrar div de acciones

        return card;
    }

    /**
     * Handlers de acciones - Validan permisos ANTES de proceder
     */

    async function handleEditCommitment(commitmentId) {
        // VALIDACIÓN: Verificar permiso antes de proceder
        const canEdit = await PermissionsHelper.checkPermissionOrFail(
            'editar',
            'compromisos',
            '❌ No tienes permiso para editar compromisos'
        );

        if (!canEdit) return; // Bloqueado

        console.log(`✏️ Editando compromiso ${commitmentId}...`);
        // Aquí iría la lógica real de edición
        alert(`Editar compromiso ${commitmentId}`);
    }

    async function handleChangeState(commitmentId) {
        const canChange = await PermissionsHelper.checkPermissionOrFail(
            'cambiar_estado',
            'compromisos',
            '❌ No tienes permiso para cambiar estado de compromisos'
        );

        if (!canChange) return;

        console.log(`🔄 Cambiando estado de compromiso ${commitmentId}...`);
        alert(`Cambiar estado de compromiso ${commitmentId}`);
    }

    async function handleDeleteCommitment(commitmentId) {
        const canDelete = await PermissionsHelper.checkPermissionOrFail(
            'eliminar',
            'compromisos',
            '❌ No tienes permiso para eliminar compromisos'
        );

        if (!canDelete) return;

        // Confirmación extra para eliminación
        if (!confirm(`¿Estás seguro de que deseas eliminar este compromiso?`)) {
            return;
        }

        console.log(`🗑️ Eliminando compromiso ${commitmentId}...`);
        alert(`Eliminar compromiso ${commitmentId}`);
    }

    /**
     * UI: Mostrar acceso denegado
     */
    function showAccessDeniedUI() {
        const container = document.getElementById('commitmentsList') || document.body;
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="bi bi-shield-exclamation" style="font-size: 3em; color: #dc3545;"></i>
                <h2 style="color: #dc3545; margin-top: 20px;">Acceso Denegado</h2>
                <p>No tienes permiso para acceder al módulo de compromisos.</p>
                <p>Contacta al administrador si crees que esto es un error.</p>
                <a href="dashboard.html" class="btn btn-primary" style="margin-top: 20px;">
                    Volver al Dashboard
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
                <i class="bi bi-exclamation-triangle"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    /**
     * Exportar función pública para ser llamada desde HTML
     */
    window.initializeCommitmentsPermissions = initializePermissionsInCommitments;

    console.log('✅ Módulo de permisos en compromisos LISTO');

})();

/**
 * USO EN HTML (compromisos.html):
 * 
 * ==========================================
 * 1. Asegúrate que los scripts cargan en orden correcto:
 * 
 * <script src="js/config-supabase.js"></script>
 * <script src="js/supabaseClient.js"></script>
 * <script src="js/api-client.js"></script>
 * <script src="js/permissions-helpers.js"></script>  ← IMPORTANTE
 * <script src="js/auth-guard.js"></script>
 * <script src="js/compromisos-permisos.js"></script>  ← Este archivo
 * 
 * ==========================================
 * 2. Llamar desde window.protectPage:
 * 
 * <script>
 *   window.protectPage(async () => {
 *       await window.initializeCommitmentsPermissions();
 *   });
 * </script>
 */
