/**
 * ============================================
 * UTILIDADES PARA ROL DE SOCIO
 * CFE INSIGHT - Sistema de Auditoría
 * ============================================
 * 
 * Este archivo contiene funciones JavaScript para manejar
 * la funcionalidad del rol de Socio en el frontend
 */

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

const FINAL_REVIEW_STATUSES = {
    NO_REQUERIDO: 'no_requerido',
    PENDIENTE: 'pendiente',
    EN_REVISION: 'en_revision',
    APROBADO: 'aprobado',
    RECHAZADO: 'rechazado',
    CON_OBSERVACIONES: 'con_observaciones'
};

const STATUS_COLORS = {
    [FINAL_REVIEW_STATUSES.NO_REQUERIDO]: '#6B7280',
    [FINAL_REVIEW_STATUSES.PENDIENTE]: '#F59E0B',
    [FINAL_REVIEW_STATUSES.EN_REVISION]: '#3B82F6',
    [FINAL_REVIEW_STATUSES.APROBADO]: '#10B981',
    [FINAL_REVIEW_STATUSES.RECHAZADO]: '#EF4444',
    [FINAL_REVIEW_STATUSES.CON_OBSERVACIONES]: '#8B5CF6'
};

const STATUS_LABELS = {
    [FINAL_REVIEW_STATUSES.NO_REQUERIDO]: 'No Requiere Revisión',
    [FINAL_REVIEW_STATUSES.PENDIENTE]: 'Pendiente Revisión Final',
    [FINAL_REVIEW_STATUSES.EN_REVISION]: 'En Revisión',
    [FINAL_REVIEW_STATUSES.APROBADO]: 'Aprobado',
    [FINAL_REVIEW_STATUSES.RECHAZADO]: 'Rechazado',
    [FINAL_REVIEW_STATUSES.CON_OBSERVACIONES]: 'Con Observaciones'
};

const API_BASE_URL = window.location.origin;

// ============================================
// FUNCIONES DE VALIDACIÓN DE ROL
// ============================================

/**
 * Verifica si el usuario es admin
 */
function isSocio() {
    const session = getCurrentSession();
    return session && session.role === 'admin';
}

/**
 * Verifica si el usuario es admin (alias)
 */
function isSocioOrAdmin() {
    const session = getCurrentSession();
    return session && session.role === 'admin';
}

/**
 * Muestra/oculta elementos según el rol de socio
 */
function toggleSocioUI() {
    const socioElements = document.querySelectorAll('[data-role="socio"]');
    const isAdmin = isSocio();

    socioElements.forEach(element => {
        // Solo admins pueden ver elementos de socio
        element.style.display = isAdmin ? 'block' : 'none';
    });
}

// ============================================
// API CALLS - REVISIONES FINALES
// ============================================

/**
 * Obtiene formularios pendientes de revisión final
 */
async function getPendingFinalReviews() {
    try {
        const session = getCurrentSession();
        const response = await fetch(`${API_BASE_URL}/api/audit/final-reviews/pending`, {
            headers: {
                'Content-Type': 'application/json',
                'user-role': session.role,
                'user-id': session.username
            }
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo formularios pendientes');
        }

        return result.data;
    } catch (error) {
        console.error('Error en getPendingFinalReviews:', error);
        throw error;
    }
}

/**
 * Obtiene las revisiones finales de un formulario
 */
async function getFinalReviewsByFormId(formId) {
    try {
        const session = getCurrentSession();
        const response = await fetch(`${API_BASE_URL}/api/audit/final-reviews/${formId}`, {
            headers: {
                'Content-Type': 'application/json',
                'user-role': session.role,
                'user-id': session.username
            }
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo revisiones finales');
        }

        return result.data;
    } catch (error) {
        console.error('Error en getFinalReviewsByFormId:', error);
        throw error;
    }
}

/**
 * Crea o actualiza una revisión final
 */
async function saveFinalReview(formId, commitmentId, reviewStatus, comments = '', observations = {}) {
    try {
        const session = getCurrentSession();

        const response = await fetch(`${API_BASE_URL}/api/audit/final-reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-role': session.role,
                'user-id': session.username
            },
            body: JSON.stringify({
                formId,
                commitmentId,
                reviewedBy: session.username,
                reviewStatus,
                comments,
                observations
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Error guardando revisión final');
        }

        return result.data;
    } catch (error) {
        console.error('Error en saveFinalReview:', error);
        throw error;
    }
}

/**
 * Marca un formulario como requiere revisión final
 */
async function setRequiresFinalReview(formId, requires = true) {
    try {
        const session = getCurrentSession();

        const response = await fetch(`${API_BASE_URL}/api/audit/forms/${formId}/require-final-review`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'user-role': session.role,
                'user-id': session.username
            },
            body: JSON.stringify({
                requiresFinalReview: requires
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Error actualizando requisito de revisión');
        }

        return result.data;
    } catch (error) {
        console.error('Error en setRequiresFinalReview:', error);
        throw error;
    }
}

/**
 * Obtiene estadísticas de revisiones finales del socio
 */
async function getFinalReviewStats() {
    try {
        const session = getCurrentSession();

        const response = await fetch(`${API_BASE_URL}/api/audit/final-reviews/stats/${session.username}`, {
            headers: {
                'Content-Type': 'application/json',
                'user-role': session.role,
                'user-id': session.username
            }
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo estadísticas');
        }

        return result.data;
    } catch (error) {
        console.error('Error en getFinalReviewStats:', error);
        throw error;
    }
}

// ============================================
// FUNCIONES DE UI - COMPONENTES
// ============================================

/**
 * Renderiza un badge de estado de revisión final
 */
function renderFinalReviewBadge(status) {
    const color = STATUS_COLORS[status] || STATUS_COLORS[FINAL_REVIEW_STATUSES.NO_REQUERIDO];
    const label = STATUS_LABELS[status] || status;

    return `
        <span class="badge badge-final-review" style="background-color: ${color};">
            ${label}
        </span>
    `;
}

/**
 * Renderiza el panel de revisión final para socios
 */
function renderFinalReviewPanel(formId, commitmentId, currentStatus = 'pendiente', existingData = {}) {
    const { comments = '', observations = {} } = existingData;

    return `
        <div class="final-review-panel" id="final-review-panel">
            <div class="panel-header">
                <h3>🎯 Revisión Final de Socio</h3>
                <span class="panel-badge ${currentStatus}">${STATUS_LABELS[currentStatus]}</span>
            </div>

            <div class="panel-body">
                <!-- Estado de revisión -->
                <div class="form-group">
                    <label for="final-review-status">Estado de Revisión *</label>
                    <select id="final-review-status" class="form-control" required>
                        <option value="en_revision" ${currentStatus === 'en_revision' ? 'selected' : ''}>
                            En Revisión
                        </option>
                        <option value="aprobado" ${currentStatus === 'aprobado' ? 'selected' : ''}>
                            Aprobar ✓
                        </option>
                        <option value="rechazado" ${currentStatus === 'rechazado' ? 'selected' : ''}>
                            Rechazar ✗
                        </option>
                        <option value="con_observaciones" ${currentStatus === 'con_observaciones' ? 'selected' : ''}>
                            Aprobar con Observaciones
                        </option>
                    </select>
                </div>

                <!-- Comentarios generales -->
                <div class="form-group">
                    <label for="final-review-comments">Comentarios Generales</label>
                    <textarea 
                        id="final-review-comments" 
                        class="form-control" 
                        rows="4"
                        placeholder="Ingrese sus comentarios generales sobre el formulario..."
                    >${comments}</textarea>
                </div>

                <!-- Observaciones detalladas -->
                <div class="form-group">
                    <label>Observaciones Detalladas (Opcional)</label>
                    <div id="observations-container" class="observations-container">
                        <!-- Las observaciones se agregan dinámicamente -->
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="addObservation()">
                        + Agregar Observación
                    </button>
                </div>

                <!-- Botones de acción -->
                <div class="panel-actions">
                    <button 
                        type="button" 
                        class="btn btn-primary" 
                        onclick="submitFinalReview('${formId}', ${commitmentId})"
                    >
                        💾 Guardar Revisión Final
                    </button>
                    <button 
                        type="button" 
                        class="btn btn-secondary" 
                        onclick="cancelFinalReview()"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza la lista de formularios pendientes
 */
function renderPendingForms(forms) {
    if (!forms || forms.length === 0) {
        return '<div class="empty-state">No hay formularios pendientes de revisión final</div>';
    }

    return `
        <div class="pending-forms-list">
            ${forms.map(form => `
                <div class="form-card" data-form-id="${form.id}">
                    <div class="form-card-header">
                        <h4>${form.form_type.toUpperCase()}</h4>
                        ${renderFinalReviewBadge(form.final_review_status)}
                    </div>
                    <div class="form-card-body">
                        <p><strong>Compromiso:</strong> ${form.commitments?.name || 'N/A'}</p>
                        <p><strong>Usuario:</strong> ${form.user_id}</p>
                        <p><strong>Fecha:</strong> ${new Date(form.created_at).toLocaleDateString()}</p>
                    </div>
                    <div class="form-card-actions">
                        <button 
                            class="btn btn-primary btn-sm" 
                            onclick="openFormForReview('${form.id}', ${form.commitment_id})"
                        >
                            📋 Revisar
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Renderiza el dashboard de estadísticas para socios
 */
async function renderSocioStatsDashboard() {
    try {
        const stats = await getFinalReviewStats();

        return `
            <div class="stats-dashboard">
                <h3>📊 Mis Estadísticas de Revisión</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.pendientes || 0}</div>
                        <div class="stat-label">Pendientes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.en_revision || 0}</div>
                        <div class="stat-label">En Revisión</div>
                    </div>
                    <div class="stat-card stat-success">
                        <div class="stat-value">${stats.aprobado || 0}</div>
                        <div class="stat-label">Aprobados</div>
                    </div>
                    <div class="stat-card stat-danger">
                        <div class="stat-value">${stats.rechazado || 0}</div>
                        <div class="stat-label">Rechazados</div>
                    </div>
                    <div class="stat-card stat-warning">
                        <div class="stat-value">${stats.con_observaciones || 0}</div>
                        <div class="stat-label">Con Observaciones</div>
                    </div>
                    <div class="stat-card stat-info">
                        <div class="stat-value">${stats.total || 0}</div>
                        <div class="stat-label">Total Revisados</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        return `<div class="error-state">Error cargando estadísticas: ${error.message}</div>`;
    }
}

// ============================================
// FUNCIONES DE INTERACCIÓN
// ============================================

/**
 * Agrega un campo de observación
 */
function addObservation() {
    const container = document.getElementById('observations-container');
    const observationId = `obs_${Date.now()}`;

    const observationHtml = `
        <div class="observation-item" data-obs-id="${observationId}">
            <input 
                type="text" 
                class="form-control observation-key" 
                placeholder="Nombre de la sección (ej: seccion1, objetivos, etc.)"
            />
            <textarea 
                class="form-control observation-value" 
                rows="2"
                placeholder="Observación para esta sección..."
            ></textarea>
            <button 
                type="button" 
                class="btn btn-danger btn-sm" 
                onclick="removeObservation('${observationId}')"
            >
                ✗
            </button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', observationHtml);
}

/**
 * Elimina un campo de observación
 */
function removeObservation(observationId) {
    const element = document.querySelector(`[data-obs-id="${observationId}"]`);
    if (element) {
        element.remove();
    }
}

/**
 * Recopila las observaciones del formulario
 */
function collectObservations() {
    const observations = {};
    const observationItems = document.querySelectorAll('.observation-item');

    observationItems.forEach(item => {
        const key = item.querySelector('.observation-key').value.trim();
        const value = item.querySelector('.observation-value').value.trim();

        if (key && value) {
            observations[key] = value;
        }
    });

    return observations;
}

/**
 * Envía la revisión final
 */
async function submitFinalReview(formId, commitmentId) {
    try {
        // Mostrar loading
        showLoading('Guardando revisión final...');

        // Obtener valores del formulario
        const status = document.getElementById('final-review-status').value;
        const comments = document.getElementById('final-review-comments').value.trim();
        const observations = collectObservations();

        // Validar
        if (!status) {
            throw new Error('Debe seleccionar un estado de revisión');
        }

        // Guardar
        await saveFinalReview(formId, commitmentId, status, comments, observations);

        // Éxito
        hideLoading();
        showSuccessMessage('Revisión final guardada exitosamente');

        // Recargar o redirigir
        setTimeout(() => {
            location.reload();
        }, 1500);

    } catch (error) {
        hideLoading();
        showErrorMessage(error.message);
    }
}

/**
 * Cancela la revisión final
 */
function cancelFinalReview() {
    if (confirm('¿Está seguro de que desea cancelar? Los cambios no guardados se perderán.')) {
        window.history.back();
    }
}

/**
 * Abre un formulario para revisión
 */
function openFormForReview(formId, commitmentId) {
    // Redirigir a la página de revisión de formulario
    window.location.href = `audit-form-review.html?formId=${formId}&commitmentId=${commitmentId}`;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function showLoading(message = 'Cargando...') {
    // Implementar según tu sistema de loading
    console.log('Loading:', message);
}

function hideLoading() {
    // Implementar según tu sistema de loading
    console.log('Loading hidden');
}

function showSuccessMessage(message) {
    alert(`✓ ${message}`);
}

function showErrorMessage(message) {
    alert(`✗ Error: ${message}`);
}

// ============================================
// INICIALIZACIÓN
// ============================================

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    toggleSocioUI();

    // Si es socio, cargar dashboard
    if (isSocio()) {
        console.log('Usuario admin habilitado para secciones de socio');
        // Cargar datos específicos si aplica
    }
});

// Exportar funciones para uso global
window.SocioUtils = {
    isSocio,
    isSocioOrAdmin,
    toggleSocioUI,
    getPendingFinalReviews,
    getFinalReviewsByFormId,
    saveFinalReview,
    setRequiresFinalReview,
    getFinalReviewStats,
    renderFinalReviewBadge,
    renderFinalReviewPanel,
    renderPendingForms,
    renderSocioStatsDashboard,
    addObservation,
    removeObservation,
    submitFinalReview,
    cancelFinalReview,
    openFormForReview,
    FINAL_REVIEW_STATUSES,
    STATUS_COLORS,
    STATUS_LABELS
};
