/**
 * EJEMPLO DE INTEGRACIÓN - Handlers para Entidades con Entity Roles
 * 
 * USO:
 * 1. Copiar/pegar estas funciones en entidades.html (o en un script separado)
 * 2. Reemplazar los IDs y nombres de funciones según tu estructura HTML
 * 3. Proteger con EntityRoleManager.checkPermission() en cada handler
 * 
 * REQUISITOS:
 * - entity-role-manager.js cargado
 * - permissions-helpers.js cargado
 * - api-client.js cargado
 */

/**
 * VISTA DE ENTIDADES (Tabla/Lista)
 * ================================
 */

/**
 * Cuando el usuario hace clic en una entidad para verla
 * 
 * HTML:
 * <tr>
 *     <td onclick="onViewEntity(1, 'Entidad A')">Entidad A</td>
 *     ...
 * </tr>
 */
async function onViewEntity(entityId, entityName) {
    try {
        console.log(`👁️ Abriendo entidad: ${entityName} (ID: ${entityId})`);

        // 1. Obtener datos de la entidad
        const entity = await API.Entities.getById(entityId);
        if (!entity) {
            alert('Entidad no encontrada');
            return;
        }

        // 2. Cargar entity role y proteger botones
        const success = await EntityRoleManager.loadEntity(entity);
        if (!success) {
            alert('Error al cargar permisos. Contacta al administrador.');
            return;
        }

        // 3. Mostrar vista detalle
        showEntityDetailView(entity);

    } catch (error) {
        console.error('Error abriendo entidad:', error);
        alert('Error al cargar la entidad');
    }
}

/**
 * Mostrar vista detalle de la entidad
 * (Implementación mínima de ejemplo)
 */
function showEntityDetailView(entity) {
    // Actualizar encabezado
    document.getElementById('entityDetailHeader').textContent = entity.name;

    // Actualizar información
    document.getElementById('entityType').textContent = entity.type || 'N/A';
    document.getElementById('entityRegion').textContent = entity.region || 'N/A';
    document.getElementById('entityStatus').textContent = entity.status || 'N/A';

    // Mostrar estado de permisos
    displayEntityPermissionsStatus();

    // Mostrar la vista detalle (ocultar tabla, mostrar detalle)
    document.getElementById('entitiesList').style.display = 'none';
    document.getElementById('entityDetailView').style.display = 'block';
}

/**
 * Mostrar status de permisos actuales
 * (Feedback visual al usuario)
 */
function displayEntityPermissionsStatus() {
    const state = EntityRoleManager.getState();
    const statusDiv = document.getElementById('entityPermissionsStatus');

    if (!statusDiv) {
        console.warn('⚠️ No se encontró #entityPermissionsStatus');
        return;
    }

    const roleClass = state.isAdmin ? 'danger' : 'info';
    const roleLabel = state.isAdmin ? 'ADMINISTRADOR' : state.currentEntityRole?.toUpperCase() || 'SIN ASIGNAR';

    const html = `
        <div class="alert alert-${roleClass}">
            <strong>Tu Role en Esta Entidad:</strong> <span class="badge">${roleLabel}</span>
            
            <div style="margin-top: 10px; font-size: 0.9em;">
                <ul style="margin: 0; padding: 0 0 0 20px;">
                    <li>✏️  Editar: <strong>${state.permissions.canEdit ? '✅' : '❌'}</strong></li>
                    <li>➕ Crear Compromisos: <strong>${state.permissions.canCreateCommitment ? '✅' : '❌'}</strong></li>
                    <li>🔍 Auditar: <strong>${state.permissions.canAudit ? '✅' : '❌'}</strong></li>
                    <li>🗑️  Eliminar: <strong>${state.permissions.canDelete ? '✅' : '❌'}</strong></li>
                </ul>
            </div>
        </div>
    `;

    statusDiv.innerHTML = html;
}

/**
 * Volver a la vista de tabla
 */
function onBackToEntitiesList() {
    EntityRoleManager.clearEntity();
    document.getElementById('entityDetailView').style.display = 'none';
    document.getElementById('entitiesList').style.display = 'block';
}

/**
 * ACCIONES DE ENTIDAD
 * ====================
 */

/**
 * EDITAR ENTIDAD
 * 
 * HTML:
 * <button data-action="edit" onclick="onEditEntity()">
 *     <i class="bi bi-pencil"></i> Editar
 * </button>
 */
async function onEditEntity() {
    // VALIDACIÓN: Verificar permiso
    if (!EntityRoleManager.checkPermission('edit')) {
        return; // Usuario ya vio el alert
    }

    try {
        const entity = window.currentEntity;
        console.log(`✏️ Editando entidad: ${entity.name}`);

        // Abrir modal de edición (reemplazar con tu implementación)
        openEditEntityModal(entity);

    } catch (error) {
        console.error('Error editando entidad:', error);
        alert('Error al editar la entidad');
    }
}

/**
 * GUARDAR CAMBIOS DE ENTIDAD
 * (Después de abrir modal de edición)
 */
async function onSaveEntityChanges(formData) {
    try {
        const entityId = window.currentEntity.id;

        console.log(`💾 Guardando cambios de entidad ${entityId}...`);

        // Llamar API para actualizar
        const updated = await API.Entities.update(entityId, formData);

        alert('✅ Entidad actualizada correctamente');

        // Actualizar vista
        window.currentEntity = updated;
        showEntityDetailView(updated);

        // Cerrar modal
        closeEditEntityModal();

    } catch (error) {
        console.error('Error guardando entidad:', error);
        alert('❌ Error al guardar: ' + error.message);
    }
}

/**
 * ELIMINAR ENTIDAD
 * 
 * HTML:
 * <button data-action="delete" onclick="onDeleteEntity()">
 *     <i class="bi bi-trash"></i> Eliminar
 * </button>
 */
async function onDeleteEntity() {
    // VALIDACIÓN: Verificar permiso
    if (!EntityRoleManager.checkPermission('delete')) {
        return;
    }

    try {
        const entity = window.currentEntity;

        // Confirmación adicional (doble protección)
        const confirmed = confirm(
            `⚠️ ¿Estás seguro de que quieres eliminar la entidad "${entity.name}"?\n\n` +
            '⚠️ Esta acción no se puede deshacer.'
        );
        if (!confirmed) {
            return;
        }

        console.log(`🗑️ Eliminando entidad: ${entity.name}`);

        // Llamar API
        await API.Entities.delete(entity.id);

        alert('✅ Entidad eliminada correctamente');

        // Limpiar estado
        EntityRoleManager.clearEntity();

        // Volver a tabla
        onBackToEntitiesList();

        // Recargar tabla
        loadEntities();

    } catch (error) {
        console.error('Error eliminando entidad:', error);
        alert('❌ Error al eliminar: ' + error.message);
    }
}

/**
 * CREAR COMPROMISO EN ENTIDAD
 * 
 * HTML:
 * <button data-action="create-commitment" onclick="onCreateCommitmentInEntity()">
 *     <i class="bi bi-plus"></i> Crear Compromiso
 * </button>
 */
async function onCreateCommitmentInEntity() {
    // VALIDACIÓN: Verificar permiso
    if (!EntityRoleManager.checkPermission('create-commitment')) {
        return;
    }

    try {
        const entityId = window.currentEntity.id;
        console.log(`➕ Creando compromiso en entidad ${entityId}...`);

        // Abrir modal para crear compromiso
        openCreateCommitmentModal(entityId);

    } catch (error) {
        console.error('Error creando compromiso:', error);
        alert('Error al crear compromiso');
    }
}

/**
 * GUARDAR NUEVO COMPROMISO
 * (Después de llenar formulario)
 */
async function onSaveNewCommitment(commitmentData) {
    try {
        const entityId = window.currentEntity.id;

        console.log(`💾 Guardando compromiso en entidad ${entityId}...`);

        // Agregar entity_id a los datos
        commitmentData.entity_id = entityId;

        // Llamar API
        const commitment = await API.Commitments.create(commitmentData);

        alert('✅ Compromiso creado correctamente');

        // Cerrar modal
        closeCreateCommitmentModal();

        // Refrescar tabla de compromisos
        await loadEntityCommitments(entityId);

    } catch (error) {
        console.error('Error guardando compromiso:', error);
        alert('❌ Error al guardar: ' + error.message);
    }
}

/**
 * AUDITAR ENTIDAD
 * 
 * HTML:
 * <button data-action="audit" onclick="onAuditEntity()">
 *     <i class="bi bi-clipboard-check"></i> Auditar
 * </button>
 */
async function onAuditEntity() {
    // VALIDACIÓN: Verificar permiso
    if (!EntityRoleManager.checkPermission('audit')) {
        return;
    }

    try {
        const entityId = window.currentEntity.id;
        const entityName = window.currentEntity.name;

        console.log(`🔍 Abriendo auditoría de entidad: ${entityName}`);

        // Cargar vista de auditoría
        showAuditView(entityId, entityName);

    } catch (error) {
        console.error('Error en auditoría:', error);
        alert('Error al abrir auditoría');
    }
}

/**
 * UTILITY FUNCTIONS
 * =================
 */

/**
 * Cargar todos las entidades en la tabla
 * (Con handlers para ver cada una)
 */
async function loadEntities() {
    try {
        console.log('📋 Cargando entidades...');

        // Obtener de API
        const entities = await API.Entities.getAll();

        // Construir tabla HTML
        const tbody = document.querySelector('#entitiesTable tbody');
        if (!tbody) {
            console.warn('⚠️ No se encontró tabla de entidades');
            return;
        }

        tbody.innerHTML = '';

        entities.forEach(entity => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td onclick="onViewEntity(${entity.id}, '${entity.name}')" style="cursor: pointer;">
                    <strong>${entity.name}</strong>
                </td>
                <td>${entity.type || 'N/A'}</td>
                <td>${entity.region || 'N/A'}</td>
                <td>
                    <span class="badge bg-${entity.status === 'activa' ? 'success' : 'secondary'}">
                        ${entity.status || 'N/A'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });

        console.log(`✅ Cargadas ${entities.length} entidades`);

    } catch (error) {
        console.error('Error cargando entidades:', error);
        alert('Error al cargar entidades');
    }
}

/**
 * Cargar compromisos de una entidad
 * (Para mostrar en tabla de detalles)
 */
async function loadEntityCommitments(entityId) {
    try {
        console.log(`📋 Cargando compromisos de entidad ${entityId}...`);

        const commitments = await API.Commitments.getByEntity(entityId);

        const tbody = document.querySelector('#commitmentsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        commitments.forEach(commitment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${commitment.title}</td>
                <td>${commitment.status}</td>
                <td>${commitment.deadline || 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });

        console.log(`✅ Cargados ${commitments.length} compromisos`);

    } catch (error) {
        console.error('Error cargando compromisos:', error);
    }
}

/**
 * MODAL HELPERS
 * (Reemplazar con tu implementación real)
 */

function openEditEntityModal(entity) {
    // Implementar según tu estructura de modales
    console.log('📝 Abriendo modal de edición:', entity);
}

function closeEditEntityModal() {
    console.log('❌ Cerrando modal de edición');
}

function openCreateCommitmentModal(entityId) {
    console.log('📝 Abriendo modal de crear compromiso para entidad:', entityId);
}

function closeCreateCommitmentModal() {
    console.log('❌ Cerrando modal de crear compromiso');
}

function showAuditView(entityId, entityName) {
    console.log('📊 Abriendo vista de auditoría:', { entityId, entityName });
}

/**
 * INICIALIZACIÓN (Llamar cuando entidades.html carga)
 */

(function () {
    console.log('🚀 Inicializando handlers de entidades con entity roles...');

    // Esperar a que DOM esté listo
    document.addEventListener('DOMContentLoaded', async function () {
        try {
            // Verificar que EntityRoleManager esté disponible
            if (!window.EntityRoleManager) {
                console.error('❌ EntityRoleManager no cargado. Verifica que entity-role-manager.js esté en el HTML');
                return;
            }

            console.log('✅ EntityRoleManager disponible');

            // Cargar entidades iniciales
            await loadEntities();

        } catch (error) {
            console.error('Error en inicialización:', error);
        }
    });

})();
