document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM cargado');

    // Check if edit mode is requested
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('edit') === 'true';

    if (isEditMode) {
        console.log('Modo edición detectado, activando...');
        // Activate editing mode after a short delay
        setTimeout(() => {
            enableEditMode();
        }, 500);
    }

    // Verificar todos los tabs
    const allTabs = document.querySelectorAll('.tab-pane');
    console.log('Tabs encontrados:', allTabs.length);
    allTabs.forEach((tab, index) => {
        console.log(`Tab ${index}:`, tab.id, tab.classList.contains('active'));
    });

    initializeTabs();
    initializeSidebar();
    initializeChart();
    initializeButtons();
    initializeFormValidation();
    initializeEnlaceSearch();
    initializeStyleSelector();
});

// Tab functionality
function initializeTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Asegurar que el primer tab-pane esté activo
    const firstTabPane = document.getElementById('tab-descripcion');
    if (firstTabPane) {
        firstTabPane.classList.add('active');
    }

    tabLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all tabs and panes
            tabLinks.forEach(l => l.parentElement.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab and corresponding pane
            this.parentElement.classList.add('active');
            const targetPane = document.getElementById(`tab-${targetTab}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
}

// Sidebar navigation
function initializeSidebar() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active class from all nav items
            navLinks.forEach(l => l.parentElement.classList.remove('active'));

            // Add active class to clicked nav item
            this.parentElement.classList.add('active');

            // Handle tab switching
            const targetId = this.getAttribute('href');

            // Special handling for sections within descripcion tab
            const sectionsInDescripcion = ['#informacion-estimacion', '#historial-estimaciones', '#resumen-detallado'];
            if (sectionsInDescripcion.includes(targetId)) {
                // First, activate descripcion tab
                const tabLinks = document.querySelectorAll('.tab-link');
                const tabPanes = document.querySelectorAll('.tab-pane');

                tabLinks.forEach(l => l.parentElement.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                const descripcionTabLink = document.querySelector(`[data-tab="descripcion"]`);
                const descripcionPane = document.getElementById('tab-descripcion');

                if (descripcionTabLink) {
                    descripcionTabLink.parentElement.classList.add('active');
                }
                if (descripcionPane) {
                    descripcionPane.classList.add('active');
                }

                // Then scroll to the target section
                setTimeout(() => {
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 200);

                return;
            }

            if (targetId && targetId.startsWith('#tab-')) {
                // Switch to the corresponding tab
                const tabLinks = document.querySelectorAll('.tab-link');
                const tabPanes = document.querySelectorAll('.tab-pane');

                // Remove active class from all tabs and panes
                tabLinks.forEach(l => l.parentElement.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                // Find and activate the corresponding tab
                const tabName = targetId.replace('#tab-', '');
                const targetTabLink = document.querySelector(`[data-tab="${tabName}"]`);
                const targetPane = document.getElementById(`tab-${tabName}`);

                if (targetTabLink) {
                    targetTabLink.parentElement.classList.add('active');
                }
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            } else if (targetId && targetId !== '#') {
                // Smooth scroll to section if it exists
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

// Initialize Chart
function initializeChart() {
    const ctx = document.getElementById('historialChart');
    if (!ctx) return;

    const chartData = {
        labels: ['2020', '2021', '2022'],
        datasets: [
            {
                label: 'Original estimate',
                data: [100000, 120000, 115000],
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Actual',
                data: [95000, 118000, 117000],
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            },
            {
                label: 'Variance',
                data: [-5000, -2000, 2000],
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }
        ]
    };

    const config = {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We're using custom legend
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('es-MX', {
                                    style: 'currency',
                                    currency: 'MXN'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        callback: function (value) {
                            return new Intl.NumberFormat('es-MX', {
                                style: 'currency',
                                currency: 'MXN',
                                minimumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    };

    new Chart(ctx, config);
}

// Button functionality
function initializeButtons() {
    // EDIT main button
    const btnEditMain = document.getElementById('btn-edit-main');
    if (btnEditMain) {
        btnEditMain.addEventListener('click', function () {
            // Open the first tab (Descripción general) for editing
            openTabForEditing('descripcion');
        });
    }

    // Estimación previa button
    const btnPrevia = document.getElementById('btn-estimacion-previa');
    if (btnPrevia) {
        btnPrevia.addEventListener('click', function () {
            setEstimacionTipoSeleccionado('previa');
        });
    }

    // Nueva estimación button
    const btnNueva = document.getElementById('btn-nueva-estimacion');
    if (btnNueva) {
        btnNueva.addEventListener('click', function () {
            setEstimacionTipoSeleccionado('nueva');
        });
    }

    // Save button
    const btnSave = document.querySelector('.btn-save');
    if (btnSave) {
        btnSave.addEventListener('click', function () {
            saveEstimacion();
        });
    }
}

function setEstimacionTipoSeleccionado(tipo) {
    const btnPrevia = document.getElementById('btn-estimacion-previa');
    const btnNueva = document.getElementById('btn-nueva-estimacion');

    if (!btnPrevia || !btnNueva) return;

    btnPrevia.classList.remove('active-option');
    btnNueva.classList.remove('active-option');

    if (tipo === 'previa') {
        btnPrevia.classList.add('active-option');
    } else if (tipo === 'nueva') {
        btnNueva.classList.add('active-option');
    }
}

// Form validation
function initializeFormValidation() {
    const nombreInput = document.getElementById('nombre-estimacion');
    if (nombreInput) {
        nombreInput.addEventListener('input', function () {
            validateForm();
        });

        nombreInput.addEventListener('blur', function () {
            validateNombreEstimacion();
        });
    }
}

// Function to open a specific tab for editing
function openTabForEditing(tabName) {
    console.log('Opening tab for editing:', tabName);

    // Remove active class from all tabs and panes
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabLinks.forEach(link => {
        link.classList.remove('active');
    });

    tabPanes.forEach(pane => {
        pane.classList.remove('active');
    });

    // Find and activate the target tab
    const targetTabLink = document.querySelector(`[data-tab="${tabName}"]`);
    const targetTabPane = document.getElementById(`tab-${tabName}`);

    console.log('Target tab link:', targetTabLink);
    console.log('Target tab pane:', targetTabPane);

    if (targetTabLink && targetTabPane) {
        // Add active class
        targetTabLink.classList.add('active');
        targetTabPane.classList.add('active');

        console.log('Tab activated successfully');

        // Show notification
        showNotification(`Abriendo área de trabajo para ${targetTabPane.querySelector('h2')?.textContent || 'Estimación contable'}`, 'info');

        // Scroll to the top of the main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }

        // Focus on the first input field if available
        setTimeout(() => {
            const firstInput = targetTabPane.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
                console.log('Focused on first input:', firstInput);
            }
        }, 200);
    } else {
        console.error('Tab elements not found');
        showNotification('No se pudo abrir la sección solicitada', 'error');
    }
}

// Function to enable edit mode for form
function enableEditMode() {
    console.log('Activando modo de edición...');

    // First, ensure the tab is visible and active
    const targetTab = document.getElementById('tab-descripcion');
    const targetTabLink = document.querySelector('[data-tab="descripcion"]');

    // Remove active class from all tabs and panes
    const allTabLinks = document.querySelectorAll('.tab-link');
    const allTabPanes = document.querySelectorAll('.tab-pane');

    allTabLinks.forEach(link => {
        link.classList.remove('active');
    });

    allTabPanes.forEach(pane => {
        pane.classList.remove('active');
    });

    // Activate the description tab
    if (targetTabLink && targetTab) {
        targetTabLink.classList.add('active');
        targetTab.classList.add('active');
    }

    // Enable all input fields in the form
    const inputs = document.querySelectorAll('#tab-descripcion input, #tab-descripcion textarea, #tab-descripcion select');
    inputs.forEach(input => {
        input.disabled = false;
        input.style.backgroundColor = 'white';
        input.style.borderColor = '#28a745';
        input.style.cursor = 'text';
        input.style.boxShadow = '0 0 5px rgba(40, 167, 69, 0.3)';
    });

    // Focus on the first input field
    const firstInput = document.querySelector('#nombre-estimacion');
    if (firstInput) {
        firstInput.focus();
        firstInput.select();
    }

    // Scroll to the top of the content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.scrollTop = 0;
    }
}

// Validation functions
function validateForm() {
    const nombreInput = document.getElementById('nombre-estimacion');
    const btnSave = document.querySelector('.btn-save');

    const isValid = nombreInput.value.trim().length > 0;

    if (btnSave) {
        btnSave.disabled = !isValid;
        btnSave.style.opacity = isValid ? '1' : '0.6';
        btnSave.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
}

function validateNombreEstimacion() {
    const nombreInput = document.getElementById('nombre-estimacion');
    const value = nombreInput.value.trim();

    if (value.length === 0) {
        showError(nombreInput, 'El nombre de la estimación es requerido');
        return false;
    } else if (value.length < 3) {
        showError(nombreInput, 'El nombre debe tener al menos 3 caracteres');
        return false;
    } else {
        clearError(nombreInput);
        return true;
    }
}

// Error handling
function showError(input, message) {
    clearError(input);

    input.style.borderColor = '#dc3545';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;

    input.parentNode.appendChild(errorDiv);
}

function clearError(input) {
    input.style.borderColor = '#ced4da';

    const errorMessage = input.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// Modal functions
function showEstimacionPreviaModal() {
    // Create modal for previous estimation
    const modalHtml = `
        <div class="modal fade" id="estimacionPreviaModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Estimación Contable Previa</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Seleccionar estimación previa</label>
                            <select class="form-select">
                                <option value="">Elija una estimación...</option>
                                <option value="est1">Estimación 2023 - Activos fijos</option>
                                <option value="est2">Estimación 2023 - Inventarios</option>
                                <option value="est3">Estimación 2022 - Cuentas por cobrar</option>
                            </select>
                        </div>
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i>
                            Al seleccionar una estimación previa, los datos se cargarán automáticamente para su revisión y actualización.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="cargarEstimacionPrevia()">Cargar estimación</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('estimacionPreviaModal'));
    modal.show();

    // Remove modal from DOM when hidden
    document.getElementById('estimacionPreviaModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

function showNuevaEstimacionModal() {
    // Create modal for new estimation
    const modalHtml = `
        <div class="modal fade" id="nuevaEstimacionModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Nueva Estimación Contable</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Tipo de estimación</label>
                            <select class="form-select">
                                <option value="">Seleccione un tipo...</option>
                                <option value="deterioro">Deterioro de valor de activos</option>
                                <option value="provisiones">Provisiones y contingencias</option>
                                <option value="instrumentos">Instrumentos financieros</option>
                                <option value="impuestos">Impuestos diferidos</option>
                                <option value="otros">Otros</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Período de estimación</label>
                            <input type="month" class="form-control" value="${new Date().toISOString().slice(0, 7)}">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Descripción</label>
                            <textarea class="form-control" rows="3" placeholder="Describa los detalles de la estimación..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="crearNuevaEstimacion()">Crear estimación</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('nuevaEstimacionModal'));
    modal.show();

    // Remove modal from DOM when hidden
    document.getElementById('nuevaEstimacionModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

// Action functions
function cargarEstimacionPrevia() {
    const select = document.querySelector('#estimacionPreviaModal select');
    const selectedValue = select.value;

    if (!selectedValue) {
        alert('Por favor seleccione una estimación previa');
        return;
    }

    // Simulate loading previous estimation data
    const nombreInput = document.getElementById('nombre-estimacion');
    nombreInput.value = select.options[select.selectedIndex].text;

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('estimacionPreviaModal')).hide();

    // Show success message
    showNotification('Estimación previa cargada correctamente', 'success');
}

function crearNuevaEstimacion() {
    const tipoSelect = document.querySelector('#nuevaEstimacionModal select');
    const periodoInput = document.querySelector('#nuevaEstimacionModal input[type="month"]');
    const descripcionTextarea = document.querySelector('#nuevaEstimacionModal textarea');

    if (!tipoSelect.value || !periodoInput.value) {
        alert('Por favor complete todos los campos requeridos');
        return;
    }

    // Create estimation name
    const nombreInput = document.getElementById('nombre-estimacion');
    const tipoText = tipoSelect.options[tipoSelect.selectedIndex].text;
    nombreInput.value = `${tipoText} - ${periodoInput.value}`;

    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('nuevaEstimacionModal')).hide();

    // Show success message
    showNotification('Nueva estimación creada correctamente', 'success');

    // Redirect to estimacion_contable.html after creating new estimation
    setTimeout(() => {
        window.open('estimacion_contable.html', '_blank');
    }, 500);
}

function saveEstimacion() {
    if (!validateNombreEstimacion()) {
        showNotification('Por favor corrija los errores antes de guardar', 'error');
        return;
    }

    // Simulate saving
    const btnSave = document.querySelector('.btn-save');
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<i class="bi bi-spinner spin"></i> Guardando...';
    btnSave.disabled = true;

    setTimeout(() => {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
        showNotification('Estimación guardada correctamente', 'success');
    }, 1500);
}

// Notification system
function showNotification(message, type = 'info') {
    const notificationHtml = `
        <div class="notification notification-${type}" style="
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        ">
            <div class="d-flex align-items-center gap-2">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'error' ? 'bi-exclamation-circle' : 'bi-info-circle'}"></i>
                <span>${message}</span>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', notificationHtml);

    // Auto remove after 3 seconds
    setTimeout(() => {
        const notification = document.querySelector('.notification');
        if (notification) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

// ============================================
// MODAL DE COMENTARIOS
// ============================================

let currentYear = null;

// Abrir modal de comentarios
function abrirModalComentarios(year) {
    currentYear = year;
    const modal = new bootstrap.Modal(document.getElementById('modalComentarios'));

    // Verificar si ya existe información guardada para este año
    let infoContainer;
    let savedData = null;

    if (year === 'resumen-preparado' || year === 'resumen-revisado') {
        // Para casos especiales de resumen, buscar el badge que contiene los datos
        const badge = document.querySelector(`div[onclick*="${year}"]`);
        if (badge && badge.dataset.objetivo) {
            // Extraer datos de los atributos data
            savedData = {
                objetivo: badge.dataset.objetivo,
                enlace: badge.dataset.enlace || '',
                nota: badge.dataset.nota || ''
            };
        }
    } else {
        // Para años normales, usar el contenedor original
        infoContainer = document.getElementById(`modal-info-${year}`);
        
        if (infoContainer && infoContainer.dataset.objetivo) {
            savedData = {
                objetivo: infoContainer.dataset.objetivo,
                enlace: infoContainer.dataset.enlace,
                nota: infoContainer.dataset.nota
            };
        }
    }

    if (savedData) {
        // Cargar la información guardada en el modal
        const { objetivo, enlace, nota } = savedData;

        // Establecer los valores en el formulario
        document.getElementById('objetivo').value = objetivo;
        document.getElementById('enlace').value = enlace;
        document.getElementById('nota').innerHTML = nota || '';

        // Si hay enlace, mostrarlo en el campo de búsqueda
        if (enlace) {
            document.getElementById('enlaceBusqueda').value = enlace;
            document.getElementById('enlaceBusqueda').classList.add('has-value');
            
            // Mostrar botón de limpiar
            const clearBtn = document.querySelector('.btn-clear-enlace');
            if (clearBtn) {
                clearBtn.style.display = 'flex';
            }
        }

        // Restaurar la selección del formulario si hay enlace
        if (enlace) {
            document.querySelectorAll('.formulario-item').forEach(item => {
                item.classList.remove('selected');
                if (item.onclick && item.onclick.toString().includes(enlace)) {
                    item.classList.add('selected');
                }
            });
        }
    } else {
        // Limpiar formulario si no hay información guardada
        document.getElementById('objetivo').value = '';
        document.getElementById('enlace').value = '';
        document.getElementById('enlaceBusqueda').value = '';
        document.getElementById('nota').innerHTML = '';

        // Ocultar botón de limpiar enlace
        const clearBtn = document.querySelector('.btn-clear-enlace');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }

        // Remover clase has-value del input
        document.getElementById('enlaceBusqueda').classList.remove('has-value');

        // Remover selecciones
        document.querySelectorAll('.formulario-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    modal.show();
}

// Formatear texto en el editor
function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('nota').focus();
}

// Aplicar estilos de texto (Título 1, 2, 3, Normal)
function applyStyle(style) {
    const editor = document.getElementById('nota');
    editor.focus();
    
    switch(style) {
        case 'Título 1':
            document.execCommand('formatBlock', false, 'h1');
            break;
        case 'Título 2':
            document.execCommand('formatBlock', false, 'h2');
            break;
        case 'Título 3':
            document.execCommand('formatBlock', false, 'h3');
            break;
        case 'Normal':
            document.execCommand('formatBlock', false, 'p');
            break;
    }
    
    // Actualizar el select para mostrar el estilo actual
    const styleSelect = document.querySelector('.editor-toolbar .form-select');
    if (styleSelect) {
        styleSelect.value = style;
    }
}

// Inicializar el selector de estilos
function initializeStyleSelector() {
    const styleSelect = document.querySelector('.editor-toolbar .form-select');
    if (styleSelect) {
        styleSelect.addEventListener('change', function() {
            applyStyle(this.value);
        });
    }
}

// Guardar comentario
function guardarComentario() {
    const objetivo = document.getElementById('objetivo').value;
    const enlace = document.getElementById('enlace').value;
    const nota = document.getElementById('nota').innerHTML;

    if (!objetivo) {
        showNotification('Por favor selecciona un objetivo', 'error');
        return;
    }

    // Verificar si es un caso especial de resumen
    if (currentYear === 'resumen-preparado' || currentYear === 'resumen-revisado') {
        // Crear el elemento para mostrar la información
        let infoHTML = '';
        let iconClass = '';
        let shortText = '';
        
        // Determinar el icono y texto según el objetivo
        switch(objetivo) {
            case 'viene-de':
                iconClass = 'bi-arrow-left';
                shortText = enlace ? enlace.substring(0, 15) + '...' : 'Viene de';
                break;
            case 'va-a':
                iconClass = 'bi-arrow-right';
                shortText = enlace ? enlace.substring(0, 15) + '...' : 'Va a';
                break;
            case 'calculo-verificado':
                iconClass = 'bi-check-circle';
                shortText = enlace ? enlace.substring(0, 15) + '...' : 'Verificado';
                break;
            case 'adicion-marcada':
                iconClass = 'bi-plus-square';
                shortText = enlace ? enlace.substring(0, 15) + '...' : 'Adición';
                break;
            case 'enlace':
                iconClass = 'bi-link';
                shortText = enlace ? enlace.substring(0, 15) + '...' : 'Enlace';
                break;
            case 'nota':
            default:
                iconClass = 'bi-sticky-note';
                // Extraer texto plano del contenido HTML
                const textoNota = nota.replace(/<[^>]*>/g, '').substring(0, 20);
                shortText = textoNota + (nota.length > 20 ? '...' : '');
                break;
        }

        infoHTML = `
            <div class="modal-info-item" onclick="abrirModalComentarios('${currentYear}')" 
                 data-objetivo="${objetivo}" 
                 data-enlace="${enlace}" 
                 data-nota="${nota.replace(/"/g, '&quot;')}"
                 title="Objetivo: ${objetivo}${enlace ? ' - ' + enlace : ''}">
                <i class="bi ${iconClass}"></i>
                <span class="modal-info-text">${shortText}</span>
            </div>
        `;

        // Encontrar el botón correspondiente y reemplazarlo
        const targetButton = document.querySelector(`button[onclick*="${currentYear}"]`);
        if (targetButton) {
            targetButton.outerHTML = infoHTML;
        }

        showNotification('Información guardada exitosamente', 'success');
    } else {
        // Lógica original para los años de la tabla de historial
        const infoContainer = document.getElementById(`modal-info-${currentYear}`);
        if (infoContainer) {
            // Crear el elemento para mostrar la información
            let infoHTML = '';
            let iconClass = '';
            let shortText = '';
            
            // Determinar el icono y texto según el objetivo
            switch(objetivo) {
                case 'viene-de':
                    iconClass = 'bi-arrow-left';
                    shortText = enlace ? enlace.substring(0, 15) + '...' : 'Viene de';
                    break;
                case 'va-a':
                    iconClass = 'bi-arrow-right';
                    shortText = enlace ? enlace.substring(0, 15) + '...' : 'Va a';
                    break;
                case 'calculo-verificado':
                    iconClass = 'bi-check-circle';
                    shortText = enlace ? enlace.substring(0, 15) + '...' : 'Verificado';
                    break;
                case 'adicion-marcada':
                    iconClass = 'bi-plus-square';
                    shortText = enlace ? enlace.substring(0, 15) + '...' : 'Adición';
                    break;
                case 'enlace':
                    iconClass = 'bi-link';
                    shortText = enlace ? enlace.substring(0, 15) + '...' : 'Enlace';
                    break;
                case 'nota':
                default:
                    iconClass = 'bi-sticky-note';
                    // Extraer texto plano del contenido HTML
                    const textoNota = nota.replace(/<[^>]*>/g, '').substring(0, 20);
                    shortText = textoNota + (nota.length > 20 ? '...' : '');
                    break;
            }

            infoHTML = `
                <div class="modal-info-item" onclick="abrirModalComentarios(${currentYear})" title="Objetivo: ${objetivo}${enlace ? ' - ' + enlace : ''}">
                    <i class="bi ${iconClass}"></i>
                    <span class="modal-info-text">${shortText}</span>
                </div>
            `;

            infoContainer.innerHTML = infoHTML;

            // Guardar datos completos en atributos data para referencia futura
            infoContainer.dataset.objetivo = objetivo;
            infoContainer.dataset.enlace = enlace;
            infoContainer.dataset.nota = nota;

            showNotification('Información guardada exitosamente', 'success');
        }
    }

    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalComentarios'));
    modal.hide();
}

// Eliminar comentario
function eliminarComentario() {
    // Confirmar eliminación
    if (!confirm('¿Estás seguro de que deseas eliminar esta información? Esta acción no se puede deshacer.')) {
        return;
    }

    if (currentYear === 'resumen-preparado' || currentYear === 'resumen-revisado') {
        // Para casos especiales de resumen, reemplazar el badge con el botón +
        const badge = document.querySelector(`div[onclick*="${currentYear}"]`);
        if (badge) {
            let buttonText = '<button type="button" class="resumen-add-btn" title="Agregar comentario" onclick="abrirModalComentarios(\'' + currentYear + '\')"><i class="bi bi-plus"></i></button>';
            badge.outerHTML = buttonText;
        }
    } else {
        // Para años normales, restaurar el contenedor original con el botón +
        const infoContainer = document.getElementById(`modal-info-${currentYear}`);
        if (infoContainer) {
            infoContainer.innerHTML = '<button type="button" class="btn btn-primary btn-sm" onclick="abrirModalComentarios(' + currentYear + ')"><i class="bi bi-plus-circle"></i></button>';
            
            // Limpiar datos guardados
            delete infoContainer.dataset.objetivo;
            delete infoContainer.dataset.enlace;
            delete infoContainer.dataset.nota;
        }
    }

    // Limpiar formulario
    document.getElementById('objetivo').value = '';
    document.getElementById('enlace').value = '';
    document.getElementById('enlaceBusqueda').value = '';
    document.getElementById('nota').innerHTML = '';

    // Ocultar botón de limpiar enlace
    const clearBtn = document.querySelector('.btn-clear-enlace');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }

    // Limpiar selección de formularios
    document.querySelectorAll('.formulario-item').forEach(item => {
        item.classList.remove('selected');
    });

    showNotification('Información eliminada exitosamente', 'success');

    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalComentarios'));
    modal.hide();
}

// ============================================
// SELECTOR DE FORMULARIOS EN ENLACE
// ============================================

// Toggle mostrar/ocultar lista de formularios
function toggleFormulariosList() {
    const container = document.getElementById('formulariosListContainer');
    const toggleText = document.getElementById('toggleText');
    const toggleIcon = document.getElementById('toggleIcon');

    if (container.style.display === 'none') {
        container.style.display = 'block';
        toggleText.textContent = 'Mostrar oculto';
        toggleIcon.classList.remove('bi-chevron-down');
        toggleIcon.classList.add('bi-chevron-up');
    } else {
        container.style.display = 'none';
        toggleText.textContent = 'Mostrar oculto';
        toggleIcon.classList.remove('bi-chevron-up');
        toggleIcon.classList.add('bi-chevron-down');
    }
}

// Toggle categoría expandida/colapsada
function toggleCategory(categoryId) {
    const items = document.getElementById('category-' + categoryId);
    const icon = document.getElementById('icon-' + categoryId);

    if (items.classList.contains('collapsed')) {
        items.classList.remove('collapsed');
        icon.classList.remove('bi-plus-lg');
        icon.classList.add('bi-dash-lg');
    } else {
        items.classList.add('collapsed');
        icon.classList.remove('bi-dash-lg');
        icon.classList.add('bi-plus-lg');
    }
}

// Seleccionar formulario
function selectFormulario(codigo, nombre) {
    const enlaceInput = document.getElementById('enlace');
    const busquedaInput = document.getElementById('enlaceBusqueda');
    const clearBtn = document.querySelector('.btn-clear-enlace');

    // Guardar el valor completo en el input oculto
    enlaceInput.value = `${codigo} - ${nombre}`;

    // Mostrar en el input de búsqueda
    busquedaInput.value = `${codigo} - ${nombre}`;
    busquedaInput.classList.add('has-value');

    // Mostrar botón de limpiar
    if (clearBtn) {
        clearBtn.style.display = 'flex';
    }

    // Remover selección previa
    document.querySelectorAll('.formulario-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Marcar como seleccionado
    event.target.closest('.formulario-item').classList.add('selected');

    // Ocultar la lista
    document.getElementById('formulariosListContainer').style.display = 'none';
    document.getElementById('toggleText').textContent = 'Mostrar oculto';
    document.getElementById('toggleIcon').classList.remove('bi-chevron-up');
    document.getElementById('toggleIcon').classList.add('bi-chevron-down');
}

// Limpiar selección de enlace
function clearEnlaceSelection() {
    const enlaceInput = document.getElementById('enlace');
    const busquedaInput = document.getElementById('enlaceBusqueda');
    const clearBtn = document.querySelector('.btn-clear-enlace');

    // Limpiar valores
    enlaceInput.value = '';
    busquedaInput.value = '';
    busquedaInput.classList.remove('has-value');

    // Ocultar botón de limpiar
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }

    // Remover todas las selecciones
    document.querySelectorAll('.formulario-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Enfocar el input de búsqueda
    busquedaInput.focus();
}

// Búsqueda en formularios
function initializeEnlaceSearch() {
    const busquedaInput = document.getElementById('enlaceBusqueda');

    if (busquedaInput) {
        busquedaInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            const items = document.querySelectorAll('.formulario-item');

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = 'flex';
                    // Mostrar la categoría padre
                    item.closest('.category-items').style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });

            // Ocultar categorías vacías
            document.querySelectorAll('.category-items').forEach(category => {
                const visibleItems = category.querySelectorAll('.formulario-item[style="display: flex;"]');
                if (visibleItems.length === 0) {
                    category.previousElementSibling.style.display = 'none';
                } else {
                    category.previousElementSibling.style.display = 'flex';
                }
            });
        });
    }
}
