document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado');
    
    // Forzar visibilidad del tab activo
    const activeTab = document.getElementById('tab-descripcion');
    if (activeTab) {
        console.log('Tab-descripcion encontrado, forzando visibilidad');
        activeTab.classList.add('active');
        // Forzar estilos inline para asegurar visibilidad
        activeTab.style.display = 'block';
        activeTab.style.visibility = 'visible';
        activeTab.style.opacity = '1';
        activeTab.style.position = 'relative';
        activeTab.style.width = '100%';
        activeTab.style.height = 'auto';
    } else {
        console.log('Tab-descripcion NO encontrado');
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
        link.addEventListener('click', function(e) {
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
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.parentElement.classList.add('active');
            
            // Handle tab switching
            const targetId = this.getAttribute('href');
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
                    // Force visibility
                    targetPane.style.display = 'block';
                    targetPane.style.visibility = 'visible';
                    targetPane.style.opacity = '1';
                    targetPane.style.position = 'relative';
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
                        label: function(context) {
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
                        callback: function(value) {
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
    // Estimación previa button
    const btnPrevia = document.getElementById('btn-estimacion-previa');
    if (btnPrevia) {
        btnPrevia.addEventListener('click', function() {
            showEstimacionPreviaModal();
        });
    }

    // Nueva estimación button
    const btnNueva = document.getElementById('btn-nueva-estimacion');
    if (btnNueva) {
        btnNueva.addEventListener('click', function() {
            showNuevaEstimacionModal();
        });
    }

    // Save button
    const btnSave = document.querySelector('.btn-save');
    if (btnSave) {
        btnSave.addEventListener('click', function() {
            saveEstimacion();
        });
    }
}

// Form validation
function initializeFormValidation() {
    const nombreInput = document.getElementById('nombre-estimacion');
    if (nombreInput) {
        nombreInput.addEventListener('input', function() {
            validateForm();
        });

        nombreInput.addEventListener('blur', function() {
            validateNombreEstimacion();
        });
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
    document.getElementById('estimacionPreviaModal').addEventListener('hidden.bs.modal', function() {
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
    document.getElementById('nuevaEstimacionModal').addEventListener('hidden.bs.modal', function() {
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
