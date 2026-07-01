console.log('🚀 formularios-ajustes.js: EMPEZANDO A EJECUTAR SCRIPT');

(() => {
    console.log('formularios-ajustes.js: Iniciando script');
    
    try {
        const STORAGE_KEY = 'ajustes_formularios_v1';

    // Funcion para obtener el ano del Excel cargado
    function getExcelYear() {
        // Intentar obtener el ano de los datos cargados en la aplicacion
        try {
            // Buscar en localStorage datos del Excel
            const excelData = localStorage.getItem('excel_data_current');
            if (excelData) {
                const parsed = JSON.parse(excelData);
                // Extraer ano de los datos si existe
                if (parsed.year || parsed.ano) {
                    return parseInt(parsed.year || parsed.ano);
                }
                // Intentar obtener de alguna columna de datos
                if (parsed.data && parsed.data.length > 0) {
                    const firstRow = parsed.data[0];
                    // Buscar columnas que puedan contener anos
                    const yearColumns = ['Ano', 'anio', 'year', 'periodo', 'period'];
                    for (const col of yearColumns) {
                        if (firstRow[col]) {
                            const year = parseInt(firstRow[col]);
                            if (year && year > 2000 && year < 2100) {
                                return year;
                            }
                        }
                    }
                }
            }
            
            // Intentar obtener de la URL o parametros
            const urlParams = new URLSearchParams(window.location.search);
            const yearParam = urlParams.get('year') || urlParams.get('ano');
            if (yearParam) {
                return parseInt(yearParam);
            }
            
            return null;
        } catch (error) {
            console.warn('No se pudo obtener el ano del Excel:', error);
            return null;
        }
    }

    const YEAR_RESOLVERS = {
        'anio-corriente': () => {
            // Intentar obtener el ano del Excel cargado, si no hay, usar ano actual
            const excelYear = getExcelYear();
            return excelYear || new Date().getFullYear();
        },
        'anio-anterior': () => {
            // Intentar obtener el ano del Excel cargado, si no hay, usar ano anterior
            const excelYear = getExcelYear();
            return excelYear ? excelYear - 1 : new Date().getFullYear() - 1;
        }
    };

    const parseNumber = (value) => {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }
        if (typeof value === 'string') {
            const normalized = value.replace(/[^0-9.-]+/g, '');
            const num = parseFloat(normalized);
            return Number.isFinite(num) ? num : 0;
        }
        return 0;
    };

    const USER_SESSION_STORAGE_KEY = 'userUI';
    const LOCAL_USER_STORAGE_KEYS = ['currentUser', 'auth_user'];

    let ajustes = [];
    let detalleItems = [];
    let selectorState = null;
    let openModalCounter = 0;
    let currentUserProfile = null;

    console.log('formularios-ajustes.js: Script cargado');

    // Declarar funciones en el ámbito global para que estén disponibles inmediatamente
    let handleFormSubmit, openAjusteModal, closeAjusteModal;

    // Función para crear el modal dinámicamente
    function createAjusteModal() {
        console.log('🔧 Creando modal de ajustes dinámicamente...');
        
        // Eliminar modal existente si hay alguno
        const existingModal = document.getElementById('ajusteModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Asegurar que el selector modal tenga z-index más alto
        ensureSelectorModalZIndex();
        
        const modalHTML = `
            <div class="ajuste-modal-backdrop" id="ajusteModal" hidden>
                <div class="ajuste-modal" role="dialog" aria-modal="true" aria-labelledby="ajusteModalTitle">
                    <header class="ajuste-modal__header">
                        <div>
                            <h2 id="ajusteModalTitle">Ajuste</h2>
                            <p class="ajuste-modal__subtitle">Define los datos clave del ajuste y agrega las líneas afectadas.</p>
                        </div>
                        <button class="ajuste-modal__close" id="closeAjusteModal" aria-label="Cerrar">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </header>

                    <form id="ajusteForm" class="ajuste-form">
                        <section class="ajuste-form__grid">
                            <div class="form-field">
                                <label for="ajusteNumero">Número <span>*</span></label>
                                <input type="number" id="ajusteNumero" name="numero" min="1" required readonly>
                            </div>
                            <div class="form-field">
                                <label for="ajusteTipo">Tipo</label>
                                <select id="ajusteTipo" name="tipo" required>
                                    <option value="normal">Normal</option>
                                    <option value="reclasificacion">Reclasificación</option>
                                    <option value="no-registrado-hecho">No registrado - Hecho</option>
                                    <option value="no-registrado-proyectado">No registrado - Proyectado</option>
                                    <option value="no-registrado-critico">No registrado - Crítico</option>
                                </select>
                            </div>
                            <div class="form-field">
                                <label for="ajustePeriodo">Período</label>
                                <select id="ajustePeriodo" name="periodo" required>
                                    <option value="anio-corriente">Año corriente</option>
                                    <option value="anio-anterior">Año anterior</option>
                                </select>
                            </div>
                            <div class="form-field">
                                <label for="ajusteEntidad">Entidad</label>
                                <select id="ajusteEntidad" name="entidad" required>
                                    <option value="prueba">PRUEBA</option>
                                </select>
                            </div>
                        </section>

                        <section class="form-field">
                            <label for="ajusteDescripcion">Descripción</label>
                            <textarea id="ajusteDescripcion" name="descripcion"></textarea>
                        </section>

                        <section class="ajuste-details">
                            <div class="ajuste-details__header">
                                <h3>Detalles</h3>
                                <div class="ajuste-details__actions">
                                    <button type="button" class="link-button" id="addCuentaLine">
                                        <i class="bi bi-plus-circle"></i>
                                        Línea de cuenta
                                    </button>
                                    <button type="button" class="link-button" id="addGrupoLine">
                                        <i class="bi bi-plus-circle"></i>
                                        Línea de grupo
                                    </button>
                                </div>
                            </div>
                            <div class="ajuste-details__empty" id="ajusteDetailsEmpty">
                                <p>Aún no se han agregado líneas al ajuste.</p>
                            </div>
                            <div class="ajuste-details__list" id="ajusteDetailsList"></div>
                        </section>

                        <footer class="ajuste-modal__footer">
                            <button type="button" class="btn-outline" id="cancelAjusteModal">Cancelar</button>
                            <button type="button" class="btn-danger" id="deleteAjusteModal" style="display: none;">Eliminar Ajuste</button>
                            <button type="submit" class="btn-primary">Guardar</button>
                        </footer>
                    </form>
                </div>
            </div>
        `;
        
        // Agregar el modal al body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        console.log('✅ Modal de ajustes creado dinámicamente');
    }

    // Definir funciones inmediatamente en el ámbito global
    // Funciones placeholder que se reemplazarán cuando se inicialice el sistema
    handleFormSubmit = function(event) {
        console.warn('handleFormSubmit llamado antes de inicialización completa');
        event.preventDefault();
    };
    handleFormSubmit.isPlaceholder = true;
    
    openAjusteModal = function() {
        console.warn('openAjusteModal llamado antes de inicialización completa');
        // Asegurarse de que el modal exista
        if (!document.getElementById('ajusteModal')) {
            createAjusteModal();
        }
    };
    openAjusteModal.isPlaceholder = true;
    
    closeAjusteModal = function() {
        console.warn('closeAjusteModal llamado antes de inicialización completa');
        const modal = document.getElementById('ajusteModal');
        if (modal) {
            modal.setAttribute('hidden', '');
        }
    };
    closeAjusteModal.isPlaceholder = true;
    
    // Función para asegurar que el selector modal tenga z-index más alto
    function ensureSelectorModalZIndex() {
        const selectorModal = document.getElementById('selectorModal');
        if (selectorModal) {
            // Asegurar que el selector modal esté por encima del modal de ajustes
            selectorModal.style.zIndex = '999999';
            console.log('✅ z-index del selector modal ajustado a 999999');
        }
    }

    // Exponer inmediatamente en window
    if (typeof window !== 'undefined') {
        window.handleFormSubmit = handleFormSubmit;
        window.openAjusteModal = openAjusteModal;
        window.closeAjusteModal = closeAjusteModal;
        console.log('🔍 Funciones expuestas inmediatamente (placeholder)');
    }

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('formularios-ajustes.js: DOMContentLoaded disparado');
        
        // Esperar a que la sección de ajustes sea visible antes de inicializar
        const initializeWhenVisible = () => {
            const adjustmentsSection = document.getElementById('adjustments-content');
            if (adjustmentsSection && adjustmentsSection.style.display !== 'none') {
                console.log('formularios-ajustes.js: Sección de ajustes visible, inicializando...');
                initializeAjustesSystem();
            } else {
                console.log('formularios-ajustes.js: Sección de ajustes no visible, reintentando en 100ms...');
                setTimeout(initializeWhenVisible, 100);
            }
        };
        
        // Prevenir bucles infinitos - solo intentar por un tiempo limitado
        let attempts = 0;
        const maxAttempts = 100; // 10 segundos máximo
        const initializeWhenVisibleSafe = () => {
            attempts++;
            if (attempts > maxAttempts) {
                console.warn('formularios-ajustes.js: Máximo de intentos alcanzado, deteniendo inicialización');
                return;
            }
            
            const adjustmentsSection = document.getElementById('adjustments-content');
            if (adjustmentsSection && adjustmentsSection.style.display !== 'none') {
                console.log('formularios-ajustes.js: Sección de ajustes visible, inicializando...');
                initializeAjustesSystem();
            } else {
                console.log(`formularios-ajustes.js: Sección de ajustes no visible, intento ${attempts}/${maxAttempts}, reintentando en 100ms...`);
                setTimeout(initializeWhenVisibleSafe, 100);
            }
        };
        
        // Inicializar inmediatamente si ya es visible, o esperar
        initializeWhenVisibleSafe();
        
        // Además, forzar inicialización inmediata para asegurar que las funciones estén disponibles
        setTimeout(() => {
            console.log('🔄 Forzando inicialización de ajustes para asegurar disponibilidad de funciones...');
            initializeAjustesSystem().catch(error => {
                console.warn('⚠️ Error en inicialización forzada:', error);
            });
        }, 1000);
    });
    
    async function initializeAjustesSystem() {
        console.log('🚀 formularios-ajustes.js: INICIALIZANDO SISTEMA DE AJUSTES');
        
        // Crear el modal dinámicamente si no existe
        if (!document.getElementById('ajusteModal')) {
            createAjusteModal();
        }
        
        const modalBackdrop = document.getElementById('ajusteModal');
        const openButton = document.getElementById('btnNuevoAjuste');
        const closeButton = document.getElementById('closeAjusteModal');
        const cancelButton = document.getElementById('cancelAjusteModal');
        const deleteButton = document.getElementById('deleteAjusteModal');
        const form = document.getElementById('ajusteForm');
        const numeroField = document.getElementById('ajusteNumero');
        const tipoSelect = document.getElementById('ajusteTipo');
        const periodoSelect = document.getElementById('ajustePeriodo');
        const entidadSelect = document.getElementById('ajusteEntidad');
        const descripcionTextarea = document.getElementById('ajusteDescripcion');
        const detailsList = document.getElementById('ajusteDetailsList');
        const detailsEmptyState = document.getElementById('ajusteDetailsEmpty');
        const addCuentaButton = document.getElementById('addCuentaLine');
        const addGrupoButton = document.getElementById('addGrupoLine');
        // adjustmentsList eliminado - solo se usa ajuste-card-wrapper system
        const adjustmentsEmpty = document.getElementById('adjustmentsEmpty');

        const selectorModal = document.getElementById('selectorModal');
        const selectorModalList = document.getElementById('selectorModalList');
        const selectorModalTitle = document.getElementById('selectorModalTitle');
        const selectorModalClose = document.getElementById('selectorModalClose');
        const selectorSearchInput = document.getElementById('selectorSearch');

        // Validacion con debugging
        console.log('Elementos encontrados:', {
            modalBackdrop: !!modalBackdrop,
            openButton: !!openButton,
            form: !!form,
            addCuentaButton: !!addCuentaButton,
            addGrupoButton: !!addGrupoButton,
            selectorModal: !!selectorModal,
            selectorModalList: !!selectorModalList
        });
        
        if (!modalBackdrop || !openButton || !form) {
            console.error('No se encontraron elementos necesarios para el sistema de ajustes:', {
                modalBackdrop: !!modalBackdrop,
                openButton: !!openButton,
                form: !!form
            });
            return;
        }

        try {
            await loadCurrentUserProfile();
        } catch (error) {
            console.warn('No se pudo precargar el usuario actual para notas de ajustes:', error);
        }

        // Asegurar que ajustes se inicialice como array
        console.log('🔄 Inicializando ajustes...');
        console.log('🔍 currentDatasetId antes de cargar:', currentDatasetId);
        console.log('🔍 window.currentDatasetId antes de cargar:', window.currentDatasetId);
        
        // Si no hay currentDatasetId, intentar obtenerlo del localStorage
        if (!currentDatasetId && window.currentDatasetId) {
            currentDatasetId = window.currentDatasetId;
            console.log('✅ currentDatasetId sincronizado desde window.currentDatasetId:', currentDatasetId);
        }
        
        if (!currentDatasetId) {
            // Intentar obtener del localStorage como último recurso
            try {
                const lastDataset = localStorage.getItem('assigned_accounts_last_dataset_v1');
                if (lastDataset) {
                    currentDatasetId = lastDataset;
                    window.currentDatasetId = lastDataset;
                    console.log('✅ currentDatasetId recuperado desde localStorage:', currentDatasetId);
                }
            } catch (error) {
                console.warn('⚠️ Error obteniendo currentDatasetId desde localStorage:', error);
            }
        }
        
        console.log('🔍 currentDatasetId final antes de cargar ajustes:', currentDatasetId);
        
        ajustes = await loadAdjustmentsFromStorage();
        if (typeof window !== 'undefined') {
            window.ajustes = ajustes;
        }
        if (!Array.isArray(ajustes)) {
            console.warn('formularios-ajustes.js: loadAdjustmentsFromStorage no devolvió un array, usando array vacío');
            ajustes = [];
        }
        
        console.log('formularios-ajustes.js: ajustes inicializado:', typeof ajustes, ajustes.length, 'elementos');
        renderAjustes(); // Usar renderAjustes en lugar de renderAdjustments
        
        // Inicializar el badge de notificaciones
        updateNotesNotificationBadge();

        // Bandera para evitar múltiples recargas simultáneas
        let isReloadingAdjustments = false;
        
        // Escuchar actualizaciones de la base de datos para recargar ajustes
        window.addEventListener('databaseAdjustmentsUpdated', async function(event) {
            if (isReloadingAdjustments) {
                console.log('🔄 Ya se está recargando ajustes, ignorando evento duplicado...');
                return;
            }
            
            isReloadingAdjustments = true;
            console.log('🔄 Actualización de base de datos detectada, recargando ajustes...');
            const { datasetId, count } = event.detail || {};
            console.log(`🔍 Dataset: ${datasetId}, Ajustes actualizados: ${count}`);
            
            // Recargar ajustes desde la base de datos
            try {
                ajustes = await loadAdjustmentsFromStorage();
                if (!Array.isArray(ajustes)) {
                    console.warn('loadAdjustmentsFromStorage no devolvió un array, usando array vacío');
                    ajustes = [];
                }
                
                console.log('✅ Ajustes recargados desde BD:', ajustes.length, 'elementos');
                renderAjustes(); // Usar renderAjustes en lugar de renderAdjustments
                updateNotesNotificationBadge();
                
                // También actualizar las tablas financieras
                broadcastAdjustmentsUpdate();
            } catch (error) {
                console.error('❌ Error recargando ajustes desde BD:', error);
            } finally {
                // Resetear la bandera después de un tiempo para permitir futuras recargas
                setTimeout(() => {
                    isReloadingAdjustments = false;
                }, 500);
            }
        });

        console.log('🔍 Verificando botones para conectar event listeners:');
        console.log('- openButton (btnNuevoAjuste):', openButton);
        console.log('- closeButton (closeAjusteModal):', closeButton);
        console.log('- cancelButton (cancelAjusteModal):', cancelButton);
        console.log('- deleteButton (deleteAjusteModal):', deleteButton);

        if (openButton) {
            console.log('✅ Conectando openButton a openAjusteModal');
            openButton.addEventListener('click', () => openAjusteModal());
        } else {
            console.error('❌ openButton (btnNuevoAjuste) NO encontrado');
        }
        closeButton?.addEventListener('click', () => closeAjusteModal());
        cancelButton?.addEventListener('click', () => closeAjusteModal());
        if (deleteButton) {
            console.log('✅ Conectando deleteButton a handleDeleteAjuste');
            deleteButton.addEventListener('click', () => {
                console.log('🔘 Botón de eliminar presionado');
                handleDeleteAjuste();
            });
        } else {
            console.error('❌ deleteButton (deleteAjusteModal) NO encontrado');
        }

        modalBackdrop.addEventListener('click', (event) => {
            if (event.target === modalBackdrop) {
                closeAjusteModal();
            }
        });

        if (addCuentaButton) {
            console.log('✅ Boton "Linea de cuenta" encontrado, registrando event listener');
            addCuentaButton.addEventListener('click', () => {
                console.log('🔘 Boton "Linea de cuenta" presionado');
                console.log('🔍 detalleItems antes de seleccionar:', detalleItems.length, detalleItems);

                const availableAccounts = collectAssignedAccounts();
                if (!availableAccounts.length) {
                    notify('No hay cuentas disponibles para seleccionar. Revisa la sección Cuentas / Asignar cuentas.', 'warning');
                    console.warn('❌ No hay cuentas disponibles para selector de ajustes');
                    return;
                }

                openSelectorModal('account', {
                    onSelect(item) {
                        console.log('✅ Cuenta seleccionada:', item);
                        const newDetail = createDetailFromItem('account', item);
                        console.log('🔍 Nuevo detalle creado:', newDetail);
                        detalleItems.push(newDetail);
                        console.log('🔍 detalleItems después de agregar:', detalleItems.length, detalleItems);
                        renderDetailItems();
                        focusLastDetailAmount();
                    }
                });
            });
        } else {
            console.error('❌ Boton "Linea de cuenta" NO encontrado');
        }

        if (addGrupoButton) {
            console.log('✅ Boton "Linea de grupo" encontrado, registrando event listener');
            addGrupoButton.addEventListener('click', () => {
                console.log('🔘 Boton "Linea de grupo" presionado');

                const availableGroups = collectAssignedGroups();
                if (!availableGroups.length) {
                    notify('No hay agrupamientos con cuentas asignadas disponibles.', 'warning');
                    console.warn('❌ No hay grupos disponibles para selector de ajustes');
                    return;
                }

                openSelectorModal('group', {
                    onSelect(item) {
                        console.log('✅ Grupo seleccionado:', item);
                        detalleItems.push(createDetailFromItem('group', item));
                        renderDetailItems();
                        focusLastDetailAmount();
                    }
                });
            });
        } else {
            console.error('❌ Boton "Linea de grupo" NO encontrado');
        }

        selectorModalClose?.addEventListener('click', closeSelectorModal);
        selectorModal?.addEventListener('click', (event) => {
            if (event.target === selectorModal) {
                closeSelectorModal();
            }
        });

        selectorModalList?.addEventListener('click', (event) => {
            const itemButton = event.target.closest('.selector-item');
            if (!itemButton || !selectorState) return;
            const itemId = itemButton.dataset.itemId;
            if (!itemId) return;
            const selectedItem = selectorState.itemMap[itemId];
            if (!selectedItem) return;
            if (typeof selectorState.onSelect === 'function') {
                selectorState.onSelect(selectedItem);
            }
            closeSelectorModal();
        });

        selectorSearchInput?.addEventListener('input', (event) => {
            if (!selectorState) return;
            const term = event.target.value.trim().toLowerCase();
            const filtered = selectorState.items.filter((item) => {
                const haystack = [item.label, item.code, item.name, item.meta, item.parentLabel]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(term);
            });
            renderSelectorList(filtered);
        });

        detailsList?.addEventListener('input', (event) => {
            const target = event.target;
            if (target.matches('[data-detail-field="amount"]')) {
                const row = target.closest('.ajuste-detail-row');
                if (!row) return;
                const detailId = row.dataset.detailId;
                const detail = getDetailById(detailId);
                if (!detail) return;
                const value = parseFloat(target.value);
                detail.amount = Number.isFinite(value) ? value : 0;
                
                // Actualizar indicador de balance
                const balance = calculateAdjustmentBalance();
                updateBalanceIndicator(balance);
            }
        });

        // Event listener para cambios en montos (la naturaleza se calcula automaticamente)
        detailsList?.addEventListener('input', (event) => {
            const target = event.target;
            if (target.matches('[data-detail-field="amount"]')) {
                const row = target.closest('.ajuste-detail-row');
                if (!row) return;
                const detailId = row.dataset.detailId;
                const detail = getDetailById(detailId);
                if (!detail) return;
                const value = parseFloat(target.value);
                detail.amount = Number.isFinite(value) ? value : 0;
                
                // Actualizar indicador de balance
                const balance = calculateAdjustmentBalance();
                updateBalanceIndicator(balance);
                
                // Actualizar visualizacion de la naturaleza basada en el nuevo signo
                updateNatureDisplay(row, detail.amount);
            }
        });

        detailsList?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            if (!actionButton) return;
            const row = actionButton.closest('.ajuste-detail-row');
            if (!row) return;
            const detailId = row.dataset.detailId;
            const detail = getDetailById(detailId);
            if (!detail) return;

            const action = actionButton.dataset.action;
            if (action === 'remove') {
                detalleItems = detalleItems.filter((item) => item.id !== detailId);
                renderDetailItems();
            } else if (action === 'change') {
                openSelectorModal(detail.type, {
                    detailId,
                    onSelect(item) {
                        updateDetailWithItem(detail, item);
                        renderDetailItems();
                    }
                });
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (selectorModal && selectorState && !selectorModal.hasAttribute('hidden')) {
                closeSelectorModal();
                return;
            }
            if (modalBackdrop && !modalBackdrop.hasAttribute('hidden')) {
                closeAjusteModal();
            }
        });

        openAjusteModal = function() {
            // No limpiar el formulario si ya se está en modo edición
            const isEditing = modalBackdrop.dataset.editingId;
            console.log('🔧 openAjusteModal: isEditing =', isEditing);
            
            if (!isEditing) {
                console.log('🔧 openAjusteModal: Limpiando formulario (modo nuevo)');
                form.reset();
                detalleItems = [];
                renderDetailItems();
                updateNumeroField();
                // Ocultar el botón de eliminar solo para nuevos ajustes
                if (deleteButton) {
                    deleteButton.style.display = 'none';
                }
            } else {
                console.log('🔧 openAjusteModal: Manteniendo formulario (modo edición)');
                // Mostrar el botón de eliminar para ajustes existentes
                if (deleteButton) {
                    deleteButton.style.display = 'inline-block';
                }
            }
            
            selectorSearchInput && (selectorSearchInput.value = '');
            resetDescripcionEditor();
            modalBackdrop.removeAttribute('hidden');
            disableBodyScroll();
            setTimeout(() => {
                if (modalBackdrop.querySelector('.ajuste-modal')) {
                    modalBackdrop.querySelector('.ajuste-modal').focus?.();
                }
            }, 50);
        }
        openAjusteModal.isPlaceholder = false;

        closeAjusteModal = function() {
            if (modalBackdrop.hasAttribute('hidden')) return;
            modalBackdrop.setAttribute('hidden', '');
            enableBodyScroll();
            openButton?.focus();
            
            // Limpiar modo edición al cerrar
            delete modalBackdrop.dataset.editingId;
        }
        closeAjusteModal.isPlaceholder = false;
        
        // Exponer funciones inmediatamente
        if (typeof window !== 'undefined') {
            window.openAjusteModal = openAjusteModal;
            window.closeAjusteModal = closeAjusteModal;
            console.log('🔍 Funciones openAjusteModal y closeAjusteModal expuestas (implementaciones reales)');
        }

        function handleDeleteAjuste() {
            const editingId = modalBackdrop.dataset.editingId;
            
            console.log('🔧 handleDeleteAjuste iniciado');
            console.log('🔍 editingId:', editingId);
            console.log('🔍 modalBackdrop.dataset:', modalBackdrop.dataset);
            console.log('🔍 currentDatasetId:', currentDatasetId);
            console.log('🔍 window.deleteFinancialAdjustment disponible:', typeof window.deleteFinancialAdjustment);
            
            if (!editingId) {
                notify('No se puede eliminar: no hay un ajuste seleccionado para editar', 'error');
                return;
            }

            // Confirmar eliminación
            console.log('🔍 Mostrando diálogo de confirmación...');
            if (confirm('¿Estás seguro de que deseas eliminar este ajuste? Esta acción no se puede deshacer.')) {
                console.log('✅ Usuario confirmó eliminación');
                
                // Eliminar directamente de la base de datos
                console.log('🔧 Eliminando ajuste directamente de BD:', editingId);
                
                if (typeof window.deleteFinancialAdjustment === 'function' && currentDatasetId) {
                    console.log('🔧 Llamando a deleteFinancialAdjustment...');
                    window.deleteFinancialAdjustment(editingId, currentDatasetId)
                        .then(() => {
                            console.log('✅ Ajuste eliminado de la base de datos');
                            
                            // Recargar ajustes desde BD y actualizar UI
                            loadAdjustmentsFromStorage().then(ajustesRecargados => {
                                ajustes = ajustesRecargados;
                                renderAjustes();
                                broadcastAdjustmentsUpdate(); // Actualizar tablas financieras
                                
                                // Disparar evento para actualizar grupos financieros
                                window.dispatchEvent(new CustomEvent('databaseAdjustmentsUpdated', {
                                    detail: { datasetId: currentDatasetId, count: -1 }
                                }));
                                
                                closeAjusteModal();
                                
                                notify('Ajuste eliminado correctamente', 'success');
                            }).catch(error => {
                                console.error('❌ Error recargando ajustes:', error);
                                // Si falla la recarga, renderizar igual para quitar la tarjeta
                                renderAjustes();
                                closeAjusteModal();
                                notify('Ajuste eliminado (recarga pendiente)', 'success');
                            });
                        })
                        .catch(error => {
                            console.error('❌ Error eliminando ajuste de la base de datos:', error);
                            notify('Error al eliminar el ajuste de la base de datos', 'error');
                        });
                } else {
                    console.error('❌ No se puede eliminar: función o datasetId no disponible');
                    notify('Error: No hay conexión con la base de datos', 'error');
                }
                
                // Limpiar el modo edición
                delete modalBackdrop.dataset.editingId;
            }
        }

        // Función para recolectar detalles del formulario
        function collectDetailsFromForm() {
            const detailsList = document.getElementById('ajusteDetailsList');
            if (!detailsList) {
                console.warn('❌ No se encontró ajusteDetailsList');
                return [];
            }
            
            const detailRows = detailsList.querySelectorAll('.ajuste-detail-row');
            const detalles = [];
            
            detailRows.forEach((row) => {
                const code = row.querySelector('.ajuste-detail-row__code')?.textContent || row.dataset.accountCode || '';
                const name = row.querySelector('.ajuste-detail-row__name')?.textContent || row.dataset.accountName || '';
                const amountInput = row.querySelector('[data-detail-field="amount"]');
                const amount = parseFloat(amountInput?.value) || 0;
                
                if (code && name && amount !== 0) {
                    detalles.push({
                        id: row.dataset.detailId || `detail-${Date.now()}-${Math.random()}`,
                        code: code.trim(),
                        name: name.trim(),
                        amount: amount,
                        type: 'account', // necesario para partida doble y mapeo de ajustes
                        movementSide: amount > 0 ? 'debit' : 'credit'
                    });
                }
            });
            
            console.log('✅ Detalles recolectados del formulario:', detalles.length, detalles);
            return detalles;
        }

        // Función para guardar ajuste directamente en la base de datos
        async function saveFinancialAdjustmentToDatabase(ajusteData, onSuccess) {
            try {
                console.log('💾 Guardando ajuste directamente en base de datos...', ajusteData);
                
                if (!window.saveFinancialAdjustment || !currentDatasetId) {
                    console.warn('⚠️ No se puede guardar: saveFinancialAdjustment o currentDatasetId no disponibles');
                    notify('Error: No hay conexión con la base de datos', 'error');
                    return;
                }

                const payload = {
                    datasetId: currentDatasetId,
                    adjustmentType: ajusteData.tipo || 'manual',
                    moneda: ajusteData.moneda || 'GTQ',
                    monto: ajusteData.monto,
                    descripcion: ajusteData.descripcion || '',
                    htmlContenido: ajusteData.htmlContenido || '',
                    adjuntos: ajusteData.adjuntos || null,
                    meta: ajusteData.meta || {}
                };
                
                // Solo incluir el ID si es un UUID válido (para actualizaciones)
                // No incluir IDs temporales que empiezan con "ajuste-" (esos son para nuevos ajustes)
                if (ajusteData.id && !ajusteData.id.startsWith('ajuste-')) {
                    payload.id = ajusteData.id;
                }
                
                const result = await window.saveFinancialAdjustment(payload);

                console.log('✅ Ajuste guardado en BD:', result);
                
                // Disparar evento para que la UI se recargue desde BD
                window.dispatchEvent(new CustomEvent('databaseAdjustmentsUpdated', {
                    detail: { datasetId: currentDatasetId, count: 1 }
                }));

                // Ejecutar callback de éxito
                if (onSuccess && typeof onSuccess === 'function') {
                    onSuccess();
                }

                return result;
            } catch (error) {
                console.error('❌ Error guardando ajuste en base de datos:', error);
                notify('Error al guardar el ajuste en la base de datos', 'error');
                throw error;
            }
        }

        handleFormSubmit = function(event) {
            event.preventDefault();
            
            console.log('=== INICIANDO GUARDADO DE AJUSTE EN BD ===');
            
            // Recolectar detalles directamente del DOM
            const detallesRecolectados = collectDetailsFromForm();
            console.log('Detalles recolectados del DOM:', detallesRecolectados);
            
            // Obtener valores de los campos con validación - buscar elementos directamente
            const numeroField = document.getElementById('ajusteNumero');
            const tipoSelect = document.getElementById('ajusteTipo');
            const periodoSelect = document.getElementById('ajustePeriodo');
            const entidadSelect = document.getElementById('ajusteEntidad');
            const descripcionTextarea = document.getElementById('ajusteDescripcion');
            
            console.log('Elementos del formulario:');
            console.log('- numeroField:', !!numeroField, numeroField?.id);
            console.log('- tipoSelect:', !!tipoSelect, tipoSelect?.id);
            console.log('- periodoSelect:', !!periodoSelect, periodoSelect?.id);
            console.log('- entidadSelect:', !!entidadSelect, entidadSelect?.id);
            console.log('- descripcionTextarea:', !!descripcionTextarea, descripcionTextarea?.id);
            
            if (!detallesRecolectados.length) {
                console.log('ERROR: No hay detalles en el ajuste');
                notify('Agrega al menos una línea en Detalles antes de guardar.', 'warning');
                return;
            }

            const hasEmptyAmount = detallesRecolectados.some((item) => !Number.isFinite(item.amount));
            if (hasEmptyAmount) {
                console.log('ERROR: Hay montos vacíos o inválidos');
                notify('Completa el monto de cada línea con valores válidos antes de guardar.', 'warning');
                return;
            }

            // Validación de doble partida
            let totalDebit = 0;
            let totalCredit = 0;
            detallesRecolectados.forEach(detail => {
                const amount = Number.isFinite(detail.amount) ? detail.amount : 0;
                if (amount > 0) {
                    totalDebit += amount;
                } else if (amount < 0) {
                    totalCredit += Math.abs(amount);
                }
            });
            
            const difference = totalDebit - totalCredit;
            const isBalanced = Math.abs(difference) < 0.01;
            const hasDebit = totalDebit > 0;
            const hasCredit = totalCredit > 0;
            
            if (!isBalanced) {
                console.log('ERROR: Ajuste desbalanceado - Débitos != Créditos');
                const excessType = difference > 0 ? 'débitos' : 'créditos';
                const excessAmount = formatCurrency(Math.abs(difference));
                notify(`Ajuste desbalanceado. Exceso de ${excessType}: ${excessAmount}. Los débitos deben ser iguales a los créditos.`, 'error');
                return;
            }

            // Validación de partida doble (al menos un débito y un crédito)
            if (!hasDebit || !hasCredit) {
                console.log('ERROR: Partida doble requiere al menos un débito y un crédito');
                notify('Una partida contable requiere al menos una línea en Débito y otra en Crédito.', 'warning');
                return;
            }

            const hasZeroAmount = detallesRecolectados.some((item) => !Number.isFinite(item.amount) || item.amount === 0);
            if (hasZeroAmount) {
                console.log('ADVERTENCIA: Hay montos en 0');
                notify('Algunas líneas tienen monto en 0. El ajuste se guardará pero puedes querer revisar los montos.', 'info');
            }

            // Obtener valores de los campos con validación
            const numero = parseInt(numeroField?.value, 10) || computeNextNumber();
            const tipoValue = tipoSelect?.value || '';
            const tipoLabel = tipoSelect?.options[tipoSelect?.selectedIndex]?.text || tipoValue || '';
            const periodoValue = periodoSelect?.value || '';
            const periodoLabel = periodoSelect?.options[periodoSelect?.selectedIndex]?.text || periodoValue || '';
            const periodoYear = resolvePeriodYear(periodoValue);
            const entidadValue = entidadSelect?.value || '';
            const entidadLabel = entidadSelect?.options[entidadSelect?.selectedIndex]?.text || entidadValue || '';
            const descripcionValue = descripcionTextarea?.value?.trim() || '';
            
            console.log('Valores recolectados:', {
                numero, tipoValue, tipoLabel, periodoValue, periodoLabel,
                periodoYear, entidadValue, entidadLabel, descripcionValue
            });

            console.log('Valores del formulario:');
            console.log('- numero:', numero);
            console.log('- tipoValue:', tipoValue);
            console.log('- periodoValue:', periodoValue);
            console.log('- entidadValue:', entidadValue);
            console.log('- descripcion:', descripcionValue);

            // Validación de partida doble: al menos 2 cuentas y Debe = Haber
            const accountDetails = (detallesRecolectados || []).filter(d => d.type === 'account' && (d.code || '').trim());
            if (accountDetails.length < 2) {
                console.warn('ERROR: La partida necesita al menos dos cuentas (doble entrada)');
                notify('La partida necesita al menos dos cuentas (doble partida). Agrega cuenta contrapartida.', 'warning');
                return;
            }

            const totals = accountDetails.reduce((acc, detail) => {
                const code = (detail.code || '').trim();
                const amount = Number.isFinite(detail.amount) ? detail.amount : 0;
                const originSide = getAccountOriginSide(code);

                if (originSide === 'DEBE') {
                    if (amount >= 0) {
                        acc.debe += amount; // mismo lado DEBE
                    } else {
                        acc.haber += Math.abs(amount); // lado contrario
                    }
                } else {
                    if (amount <= 0) {
                        acc.haber += Math.abs(amount); // mismo lado HABER
                    } else {
                        acc.debe += amount; // lado contrario
                    }
                }

                return acc;
            }, { debe: 0, haber: 0 });

            const diff = Math.abs(totals.debe - totals.haber);
            const format = (n) => Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            console.log('🔍 Validación partida doble:', { debe: totals.debe, haber: totals.haber, diff });

            if (diff > 0.01) {
                console.warn(`ERROR: La partida no cuadra. Debe: ${totals.debe}, Haber: ${totals.haber}`);
                notify(`La partida no cuadra: Debe Q${format(totals.debe)} vs Haber Q${format(totals.haber)}. Ajusta los montos.`, 'error');
                return;
            }

            // Validar campos requeridos
            if (!tipoValue) {
                console.log('ERROR: No se ha seleccionado tipo de ajuste');
                notify('Por favor selecciona un tipo de ajuste', 'warning');
                tipoSelect?.focus();
                return;
            }

            if (!periodoValue) {
                console.log('ERROR: No se ha seleccionado período');
                notify('Por favor selecciona un período', 'warning');
                periodoSelect?.focus();
                return;
            }

            if (!entidadValue) {
                console.log('ERROR: No se ha seleccionado entidad');
                notify('Por favor selecciona una entidad', 'warning');
                entidadSelect?.focus();
                return;
            }

            console.log('Datos completos del ajuste:', {
                numero, tipoValue, periodoValue, entidadValue, 
                descripcion: descripcionValue, detalles: detallesRecolectados
            });

            // Verificar si es modo edición
            const editingId = modalBackdrop.dataset.editingId;
            
            if (editingId) {
                // Modo edición: actualizar ajuste existente
                console.log('MODO EDICIÓN - Actualizando ajuste:', editingId);
                
                // Crear objeto para actualizar en BD
                const ajusteActualizado = {
                    id: editingId,
                    numero,
                    tipo: tipoValue,
                    tipoLabel,
                    periodo: periodoValue,
                    periodoLabel,
                    periodoYear,
                    entidad: entidadValue,
                    entidadLabel,
                    moneda: 'GTQ',
                    monto: detallesRecolectados.reduce((sum, d) => sum + Math.abs(d.amount), 0),
                    descripcion: descripcionValue,
                    htmlContenido: '',
                    adjuntos: null,
                    meta: {
                        detalles: detallesRecolectados,
                        numero,
                        tipo: tipoValue,
                        tipoLabel,
                        periodo: periodoValue,
                        periodoLabel,
                        periodoYear,
                        entidad: entidadValue,
                        entidadLabel,
                        creado: new Date().toISOString(),
                        modificado: new Date().toISOString(),
                        totalMonto: detallesRecolectados.reduce((sum, d) => sum + Math.abs(d.amount), 0)
                    }
                };
                
                // Guardar directamente en BD
                saveFinancialAdjustmentToDatabase(ajusteActualizado, () => {
                    // Sincronizar en memoria para mostrar inmediatamente
                    const idx = ajustes.findIndex(a => a.id === editingId);
                    if (idx !== -1) {
                        ajustes[idx] = {
                            ...ajustes[idx],
                            ...ajusteActualizado,
                            detalles: detallesRecolectados,
                            updatedAt: new Date().toISOString()
                        };
                    }
                    renderAjustes();
                    broadcastAdjustmentsUpdate();
                    closeAjusteModal();
                    notify('Ajuste actualizado correctamente', 'success');
                });
                
                delete modalBackdrop.dataset.editingId;
            } else {
                // Modo creación: crear nuevo ajuste
                console.log('MODO CREACIÓN - Creando nuevo ajuste');
                
                // Crear objeto para guardar en BD
                const newAjuste = {
                    id: `ajuste-${Date.now()}-${Math.random()}`,
                    numero,
                    tipo: tipoValue,
                    tipoLabel,
                    periodo: periodoValue,
                    periodoLabel,
                    periodoYear,
                    entidad: entidadValue,
                    entidadLabel,
                    moneda: 'GTQ',
                    monto: detallesRecolectados.reduce((sum, d) => sum + Math.abs(d.amount), 0),
                    descripcion: descripcionValue,
                    htmlContenido: '',
                    adjuntos: null,
                    detalles: detallesRecolectados,
                    createdAt: new Date().toISOString(),
                    meta: {
                        detalles: detallesRecolectados,
                        numero,
                        tipo: tipoValue,
                        tipoLabel,
                        periodo: periodoValue,
                        periodoLabel,
                        periodoYear,
                        entidad: entidadValue,
                        entidadLabel,
                        creado: new Date().toISOString(),
                        modificado: new Date().toISOString(),
                        totalMonto: detallesRecolectados.reduce((sum, d) => sum + Math.abs(d.amount), 0)
                    }
                };
                
                console.log('Nuevo ajuste a guardar en BD:', newAjuste);
                
                // Guardar directamente en BD
                saveFinancialAdjustmentToDatabase(newAjuste, () => {
                    // Asegurar que el ajuste tenga la estructura correcta para renderizado
                    const ajusteParaUI = {
                        ...newAjuste,
                        // Propiedades directas para compatibilidad con renderizado
                        numero: newAjuste.numero,
                        tipo: newAjuste.tipo,
                        tipoLabel: newAjuste.tipoLabel,
                        periodo: newAjuste.periodo,
                        periodoLabel: newAjuste.periodoLabel,
                        periodoYear: newAjuste.periodoYear,
                        entidad: newAjuste.entidad,
                        entidadLabel: newAjuste.entidadLabel,
                        descripcion: newAjuste.descripcion,
                        detalles: newAjuste.detalles,
                        createdAt: newAjuste.createdAt
                    };
                    
                    ajustes.push(ajusteParaUI);
                    console.log('Ajuste agregado al array local:', ajusteParaUI);
                    renderAjustes();
                    broadcastAdjustmentsUpdate();
                    closeAjusteModal();
                    notify('Ajuste creado correctamente', 'success');
                });
            }
            
            console.log('=== AJUSTE GUARDADO EN BD EXITOSAMENTE ===');
        }
        handleFormSubmit.isPlaceholder = false;
        
        // Exponer handleFormSubmit inmediatamente
        if (typeof window !== 'undefined') {
            window.handleFormSubmit = handleFormSubmit;
            window.renderAjusteCards = renderAjusteCards;
            console.log('🔍 Funciones expuestas: handleFormSubmit, renderAjusteCards');
        }

        // Registrar el submit del formulario con la implementación real
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }

        // Función para renderizar cards usando ajuste-card-wrapper
        function renderAjusteCards(ajustesArray) {
            const container = document.getElementById('ajusteCardsContainer');
            const emptyState = document.getElementById('adjustmentsEmpty');
            
            if (!container) return;
            
            container.innerHTML = '';
            
            if (!Array.isArray(ajustesArray) || !ajustesArray.length) {
                if (emptyState) {
                    emptyState.style.display = 'grid';
                }
                return;
            }
            
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            
            console.log('📋 Renderizando ajustes con ajuste-card-wrapper:', ajustesArray.length);
            
            // Verificar que createAdjustmentCard esté disponible
            if (typeof window.createAdjustmentCard !== 'function') {
                console.error('❌ window.createAdjustmentCard no está disponible. Usando función local.');
                // Usar la función local directamente
                ajustesArray.forEach(ajuste => {
                    const wrapper = createAdjustmentCard(ajuste);
                    if (wrapper) {
                        container.appendChild(wrapper);
                    }
                });
            } else {
                // Usar la función global
                ajustesArray.forEach(ajuste => {
                    const wrapper = window.createAdjustmentCard(ajuste);
                    if (wrapper) {
                        container.appendChild(wrapper);
                    }
                });
            }
            
            console.log('✅ Ajustes renderizados con ajuste-card-wrapper');
        }

        function renderAjustes() {
            if (typeof window !== 'undefined') {
                window.ajustes = ajustes;
            }
            // Usar el nuevo sistema de renderizado con ajuste-card-wrapper
            renderAjusteCards(ajustes);
            // Actualizar el badge de notificaciones después de renderizar
            updateNotesNotificationBadge();
        }

        function calculateAdjustmentBalance() {
            let totalDebit = 0;
            let totalCredit = 0;

            detalleItems.forEach(detail => {
                const amount = Number.isFinite(detail.amount) ? detail.amount : 0;
                
                // Lógica contable simple: el signo indica naturaleza, no se necesita campo "nature"
                if (amount > 0) {
                    // Positivo = Débito
                    totalDebit += amount;
                } else if (amount < 0) {
                    // Negativo = Crédito (usar valor absoluto para el total)
                    totalCredit += Math.abs(amount);
                }
                // Cero no afecta los totales
            });

            const difference = totalDebit - totalCredit;
            const isBalanced = Math.abs(difference) < 0.01; // Tolerancia de centavos

            return {
                totalDebit,
                totalCredit,
                difference,
                isBalanced,
                hasDebit: totalDebit > 0,
                hasCredit: totalCredit > 0,
                balanceStatus: isBalanced ? 'balanced' : (difference > 0 ? 'debit-excess' : 'credit-excess')
            };
        }

        function renderDetailItems() {
            if (!detailsList || !detailsEmptyState) return;

            if (!detalleItems.length) {
                detailsList.innerHTML = '';
                detailsEmptyState.style.display = 'block';
                updateBalanceIndicator({ totalDebit: 0, totalCredit: 0, difference: 0, isBalanced: true });
                return;
            }

            detailsEmptyState.style.display = 'none';

            const rowsHtml = detalleItems.map((detail) => {
                const amount = Number.isFinite(detail.amount) ? detail.amount : 0;
                const amountValue = amount.toFixed(2);
                const code = (detail.code || '').trim();
                
                // Determinar lado de origen y efecto
                const originSide = getAccountOriginSide(code);
                const isSameSide = (originSide === 'DEBE' && amount > 0) || (originSide === 'HABER' && amount < 0);
                const effect = isSameSide ? 'SUMA' : 'RESTA';
                const effectClass = isSameSide ? 'effect-increase' : 'effect-decrease';
                
                // Determinar naturaleza para balance
                const isDebit = amount > 0;
                const isCredit = amount < 0;
                const natureLabel = isDebit ? 'Débito' : (isCredit ? 'Crédito' : 'Sin efecto');
                const natureClass = isDebit ? 'nature-debit' : (isCredit ? 'nature-credit' : 'nature-neutral');
                
                return `
                    <div class="ajuste-detail-row" data-detail-id="${detail.id}">
                        <div class="ajuste-detail-row__content">
                            <div class="ajuste-detail-row__header">
                                <div class="ajuste-detail-row__type">${detail.type === 'group' ? 'Línea de grupo' : 'Línea de cuenta'}</div>
                                <div class="ajuste-detail-row__actions">
                                    <button type="button" class="link-button" data-action="change">Cambiar</button>
                                    <button type="button" class="ajuste-detail-row__remove" data-action="remove" aria-label="Eliminar">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="ajuste-detail-row__info">
                                <span class="ajuste-detail-row__code">${code}</span>
                                <span class="ajuste-detail-row__name">${detail.label}</span>
                                                            </div>
                            <div class="ajuste-detail-row__amounts">
                                <div class="ajuste-detail-row__nature-display">
                                    <label>Naturaleza contable</label>
                                    <span class="nature-badge ${natureClass}">${natureLabel}</span>
                                </div>
                                <div class="ajuste-detail-row__effect-display">
                                    <label>Efecto en saldo</label>
                                    <span class="effect-badge ${effectClass}">${effect}</span>
                                </div>
                                <div class="ajuste-detail-row__amount">
                                    <label for="detail-amount-${detail.id}">Cantidad</label>
                                    <input type="number" id="detail-amount-${detail.id}" data-detail-field="amount" step="0.01" min="-999999999.99" max="999999999.99" value="${amountValue}" placeholder="0.00">
                                                                    </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            detailsList.innerHTML = rowsHtml;
            
            // Actualizar indicador de balance
            const balance = calculateAdjustmentBalance();
            updateBalanceIndicator(balance);
        }

        function updateNatureDisplay(row, amount) {
            const natureBadge = row.querySelector('.nature-badge');
            if (!natureBadge) return;
            
            // Determinar naturaleza basada en el signo
            const isDebit = amount > 0;
            const isCredit = amount < 0;
            const natureLabel = isDebit ? 'Débito' : (isCredit ? 'Crédito' : 'Sin efecto');
            
            // Actualizar clases y texto
            natureBadge.classList.remove('nature-debit', 'nature-credit', 'nature-neutral');
            const natureClass = isDebit ? 'nature-debit' : (isCredit ? 'nature-credit' : 'nature-neutral');
            natureBadge.classList.add(natureClass);
            natureBadge.textContent = natureLabel;
        }

        function updateBalanceIndicator(balance) {
            // Buscar o crear el contenedor del indicador de balance
            let balanceIndicator = document.getElementById('ajusteBalanceIndicator');
            
            if (!balanceIndicator) {
                balanceIndicator = document.createElement('div');
                balanceIndicator.id = 'ajusteBalanceIndicator';
                balanceIndicator.style.cssText = `
                    padding: 12px 16px;
                    margin: 12px 0;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid;
                    transition: all 0.3s ease;
                `;
                
                // Insertar después del header de detalles
                const detailsHeader = document.querySelector('.ajuste-details__header');
                if (detailsHeader) {
                    detailsHeader.parentNode.insertBefore(balanceIndicator, detailsHeader.nextSibling);
                }
            }

            // Actualizar contenido y estilos según el balance
            if (balance.isBalanced) {
                balanceIndicator.style.backgroundColor = '#d4edda';
                balanceIndicator.style.borderColor = '#28a745';
                balanceIndicator.style.color = '#155724';
                balanceIndicator.innerHTML = `
                    <span>✅ Ajuste balanceado</span>
                    <span>Débitos: ${formatCurrency(balance.totalDebit)} = Créditos: ${formatCurrency(balance.totalCredit)}</span>
                `;
            } else {
                balanceIndicator.style.backgroundColor = '#f8d7da';
                balanceIndicator.style.borderColor = '#dc3545';
                balanceIndicator.style.color = '#721c24';
                
                const excessType = balance.difference > 0 ? 'Débitos' : 'Créditos';
                const excessAmount = formatCurrency(Math.abs(balance.difference));
                
                balanceIndicator.innerHTML = `
                    <span>⚠️ Ajuste desbalanceado - Exceso de ${excessType}: ${excessAmount}</span>
                    <span>Débitos: ${formatCurrency(balance.totalDebit)} | Créditos: ${formatCurrency(balance.totalCredit)}</span>
                `;
            }
        }

        function formatCurrency(amount) {
            // Formato sin símbolo de moneda, solo número con separadores
            return Number.isFinite(amount) 
                ? amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '0.00';
        }

        // Agregar estilos para los badges de naturaleza y efectos
        const style = document.createElement('style');
        style.textContent = `
            .ajuste-detail-row__nature-display,
            .ajuste-detail-row__effect-display {
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 80px;
            }
            
            .ajuste-detail-row__nature-display label,
            .ajuste-detail-row__effect-display label {
                font-size: 12px;
                color: #666;
                font-weight: 500;
            }
            
            .nature-badge,
            .effect-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .nature-debit {
                background-color: #e3f2fd;
                color: #1976d2;
                border: 1px solid #bbdefb;
            }
            
            .nature-credit {
                background-color: #f3e5f5;
                color: #7b1fa2;
                border: 1px solid #e1bee7;
            }
            
            .nature-neutral {
                background-color: #f5f5f5;
                color: #666;
                border: 1px solid #ddd;
            }
            
            .effect-increase {
                background-color: #e8f5e8;
                color: #2e7d32;
                border: 1px solid #c8e6c9;
            }
            
            .effect-decrease {
                background-color: #ffebee;
                color: #c62828;
                border: 1px solid #ffcdd2;
            }
            
            .account-origin {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: 600;
                background-color: #f3e5f5;
                color: #7b1fa2;
                margin-left: 8px;
            }
            
            .amount-hint {
                display: block;
                font-size: 11px;
                color: #888;
                margin-top: 2px;
                font-style: italic;
            }
            
            .ajuste-detail-row__info {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
        `;
        document.head.appendChild(style);

function updateNumeroField() {
            numeroField.value = computeNextNumber();
        }

        function openSelectorModal(type, { onSelect, detailId } = {}) {
            console.log('🔍 Abriendo selector modal...', { type, selectorModal: !!selectorModal, selectorModalList: !!selectorModalList, selectorModalTitle: !!selectorModalTitle });
            
            if (!selectorModal || !selectorModalList || !selectorModalTitle) {
                console.error('❌ Elementos del selector modal no encontrados:', {
                    selectorModal: !!selectorModal,
                    selectorModalList: !!selectorModalList,
                    selectorModalTitle: !!selectorModalTitle
                });
                return;
            }

            const items = type === 'group' ? collectAssignedGroups() : collectAssignedAccounts();
            console.log(`🔍 Items para selector modal (${type}):`, items.length);
            
            selectorState = {
                type,
                onSelect,
                detailId,
                items,
                emptyMessage: type === 'group'
                    ? 'No hay agrupamientos con cuentas asignadas disponibles.'
                    : 'No hay cuentas asignadas disponibles en este momento.',
                itemMap: items.reduce((map, item) => {
                    map[item.id] = item;
                    return map;
                }, {})
            };

            const title = type === 'group' ? 'Seleccionar agrupamiento' : 'Seleccionar cuenta';
            selectorModalTitle.textContent = title;
            if (selectorSearchInput) {
                selectorSearchInput.value = '';
            }

            renderSelectorList(items);
            
            // Verificar estado actual del modal
            console.log('🔍 Estado del selector modal antes de abrir:', {
                hidden: selectorModal.hasAttribute('hidden'),
                style: selectorModal.style.cssText,
                zIndex: selectorModal.style.zIndex,
                computedZIndex: getComputedStyle(selectorModal).zIndex
            });
            
            // Mover el selector al body para romper cualquier stacking context
            try {
                if (selectorModal.parentElement !== document.body) {
                    document.body.appendChild(selectorModal);
                    console.log('🔍 selectorModal movido a body para evitar stacking context');
                }
            } catch (err) {
                console.warn('⚠️ No se pudo mover selectorModal a body:', err);
            }

            selectorModal.removeAttribute('hidden');
            
            // Forzar visibilidad con estilos inline
            selectorModal.style.display = 'flex';
            selectorModal.style.visibility = 'visible';
            selectorModal.style.opacity = '1';
            selectorModal.style.pointerEvents = 'auto';
            selectorModal.style.position = 'fixed';
            selectorModal.style.top = '0';
            selectorModal.style.left = '0';
            selectorModal.style.width = '100vw';
            selectorModal.style.height = '100vh';
            selectorModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            selectorModal.style.zIndex = '999999';
            
            disableBodyScroll();
            
            console.log('🔍 Estado del selector modal después de abrir:', {
                hidden: selectorModal.hasAttribute('hidden'),
                display: selectorModal.style.display,
                visibility: selectorModal.style.visibility,
                opacity: selectorModal.style.opacity,
                pointerEvents: selectorModal.style.pointerEvents,
                position: selectorModal.style.position,
                zIndex: selectorModal.style.zIndex,
                computedZIndex: getComputedStyle(selectorModal).zIndex,
                computedDisplay: getComputedStyle(selectorModal).display,
                computedVisibility: getComputedStyle(selectorModal).visibility,
                computedOpacity: getComputedStyle(selectorModal).opacity
            });
            
            setTimeout(() => {
                selectorSearchInput?.focus();
                console.log('🔍 Selector modal forzado a estar visible');
            }, 80);
        }

        function closeSelectorModal() {
            if (!selectorModal || selectorModal.hasAttribute('hidden')) return;
            selectorModal.setAttribute('hidden', '');
            selectorState = null;
            enableBodyScroll();
        }

        function renderSelectorList(items) {
            if (!selectorModalList) return;

            if (!items.length) {
                const emptyMessage = selectorState?.emptyMessage || 'No se encontraron resultados.';
                selectorModalList.innerHTML = `<div class="selector-item__empty">${emptyMessage}</div>`;
                return;
            }

            selectorModalList.innerHTML = items.map((item) => {
                const metaText = item.meta || item.groupLabel || item.parentLabel || '';
                const codeBadge = item.code ? `<strong>${item.code}</strong>` : '';
                const title = [codeBadge, item.name].filter(Boolean).join(codeBadge ? ' · ' : '');
                const amountHtml = Number.isFinite(item.value)
                    ? `<span class="selector-item__amount">${formatCurrencyFriendly(item.value)}</span>`
                    : '';
                return `
                    <button type="button" class="selector-item" data-item-id="${item.id}">
                        <span class="selector-item__line">
                            <span class="selector-item__title">${title}</span>
                            ${amountHtml}
                        </span>
                        ${metaText ? `<span class="selector-item__meta">${metaText}</span>` : ''}
                    </button>
                `;
            }).join('');
        }

        function focusLastDetailAmount() {
            if (!detailsList) return;
            const lastInput = detailsList.querySelector('.ajuste-detail-row:last-of-type input[data-detail-field="amount"]');
            if (lastInput) {
                setTimeout(() => lastInput.focus(), 120);
            }
        }

        function resetDescripcionEditor() {
            if (descripcionTextarea) {
                descripcionTextarea.value = '';
                descripcionTextarea.focus();
            }
        }

        function getDescripcionContent() {
            const value = (descripcionTextarea?.value || '').trim();
            return {
                html: value ? `<p>${escapeHtml(value)}</p>` : '',
                text: value
            };
        }

        function createAdjustmentCard(ajuste) {
            console.log('Creando tarjeta para ajuste:', ajuste);
            
            // Obtener valores desde meta o directamente del ajuste (compatibilidad)
            const numero = ajuste.numero || ajuste.meta?.numero || 'N/A';
            const tipoLabel = ajuste.tipoLabel || ajuste.meta?.tipoLabel || ajuste.tipo || 'N/A';
            const periodoLabel = ajuste.periodoLabel || ajuste.meta?.periodoLabel || ajuste.periodo || 'N/A';
            const periodoYear = ajuste.periodoYear || ajuste.meta?.periodoYear || 'N/A';
            const entidadLabel = ajuste.entidadLabel || ajuste.meta?.entidadLabel || ajuste.entidad || 'N/A';
            const descripcion = ajuste.descripcion || ajuste.meta?.descripcion || '';
            const detalles = ajuste.detalles || ajuste.meta?.detalles || [];
            
            console.log('Valores para renderizado:', {
                numero, tipoLabel, periodoLabel, periodoYear, entidadLabel, descripcion, detalles
            });
            
            const card = document.createElement('article');
            card.className = 'ajuste-card';

            const title = document.createElement('div');
            title.className = 'ajuste-card__header';
            title.innerHTML = `
                <div class="ajuste-card__title">
                    <span class="ajuste-card__title-text">Ajuste</span>
                    <span class="ajuste-card__number">${numero}</span>
                    <span class="ajuste-card__title-text">- ${periodoYear}</span>
                </div>
            `;

            const entity = document.createElement('div');
            entity.className = 'ajuste-card__entity';
            entity.textContent = entidadLabel;

            const typePeriod = document.createElement('div');
            typePeriod.className = 'ajuste-card__type-period';
            typePeriod.textContent = `${tipoLabel} - ${periodoLabel}`;

            const description = document.createElement('div');
            description.className = 'ajuste-card__description';
            if (ajuste.descripcionHtml) {
                description.innerHTML = ajuste.descripcionHtml;
            } else if (descripcion) {
                description.textContent = descripcion;
            } else {
                description.innerHTML = '<span class="ajuste-detail-placeholder">Sin descripción</span>';
            }

            const detailsWrapper = document.createElement('div');
            detailsWrapper.className = 'ajuste-card__details';

            detalles.forEach((detail) => {
                const row = document.createElement('div');
                row.className = 'ajuste-card__detail';

                // Usar el amount directamente (positivo para débito, negativo para crédito)
                const amount = Number.isFinite(detail.amount) ? detail.amount : 0;
                const formattedAmount = formatCurrencyFriendly(Math.abs(amount));
                const amountElement = document.createElement('span');
                amountElement.className = amount < 0 ? 'ajuste-card__amount ajuste-card__amount--negative' : 'ajuste-card__amount ajuste-card__amount--positive';
                amountElement.textContent = amount < 0 ? `(${formattedAmount})` : formattedAmount;

                const label = document.createElement('span');
                const displayName = detail.label || detail.name || detail.code || 'Sin nombre';
                const detailType = detail.type === 'group' ? 'Agrupamiento' : 'Cuenta';
                label.innerHTML = `<strong>${displayName}</strong><br><small>${detail.code || ''} - ${detailType}</small>`;

                row.appendChild(label);
                row.appendChild(amountElement);
                detailsWrapper.appendChild(row);
            });

            card.appendChild(title);
            card.appendChild(entity);
            card.appendChild(typePeriod);
            card.appendChild(description);
            card.appendChild(detailsWrapper);

            // Crear contenedor externo para los botones de acción
            const actionsWrapper = document.createElement('div');
            actionsWrapper.className = 'ajuste-card__external-actions';
            actionsWrapper.innerHTML = `
                <button type="button" class="ajuste-card__action-btn" data-action="edit" title="Editar ajuste">
                    <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="ajuste-card__action-btn" data-action="notes" title="Agregar notas">
                    <i class="bi bi-chat-left-text"></i>
                    ${ajuste.notasArray && ajuste.notasArray.length > 0 ? `<span class="ajuste-card__notes-count">${ajuste.notasArray.length}</span>` : ''}
                </button>
            `;
            
            console.log('Botones de acción creados:', actionsWrapper.innerHTML);

            // Crear wrapper principal que contiene la tarjeta y los botones
            const mainWrapper = document.createElement('div');
            mainWrapper.className = 'ajuste-card-wrapper';
            mainWrapper.appendChild(card);
            mainWrapper.appendChild(actionsWrapper);

            // Agregar event listeners para los botones de acción
            actionsWrapper.addEventListener('click', (e) => {
                console.log('Clic detectado en actionsWrapper');
                console.log('Target:', e.target);
                console.log('Target className:', e.target.className);
                console.log('Target closest:', e.target.closest('.ajuste-card__action-btn'));
                
                const button = e.target.closest('.ajuste-card__action-btn');
                if (!button) {
                    console.log('No se encontró botón con clase .ajuste-card__action-btn');
                    console.log('Buscando botones directamente...');
                    const allButtons = actionsWrapper.querySelectorAll('.ajuste-card__action-btn');
                    console.log('Botones encontrados:', allButtons.length, allButtons);
                    return;
                }
                
                const action = button.dataset.action;
                const ajusteId = ajuste.id;
                
                console.log('Botón presionado:', action, 'Ajuste:', ajuste);
                console.log('Dataset del botón:', button.dataset);
                
                switch (action) {
                    case 'edit':
                        console.log('Ejecutando editAdjustment');
                        editAdjustment(ajuste);
                        break;
                    case 'notes':
                        console.log('Ejecutando openNotesModal');
                        openNotesModal(ajuste);
                        break;
                    default:
                        console.log('Acción no reconocida:', action);
                }
            });

            // Prevenir propagación del clic para evitar conflictos con otros eventos
            mainWrapper.addEventListener('click', (e) => {
                console.log('Clic en wrapper principal:', e.target);
            });

            return mainWrapper;
        }

        // Exponer createAdjustmentCard globalmente inmediatamente después de definirla
        if (typeof window !== 'undefined') {
            window.createAdjustmentCard = createAdjustmentCard;
            console.log('✅ createAdjustmentCard expuesta globalmente');
        }

        function updateDetailWithItem(detail, item) {
            if (detail.type === 'group') {
                detail.name = item.name;
                detail.label = item.label || item.name;
                detail.meta = item.meta || (item.parentLabel ? `Agrupamiento · ${item.parentLabel}` : 'Agrupamiento');
                detail.parentLabel = item.parentLabel || '';
                detail.valueSource = item;
                detail.amount = Number.isFinite(item.value) ? item.value : detail.amount;
                return;
            }

            detail.code = item.code || '';
            detail.name = item.name;
            detail.label = item.label || item.name;
            detail.meta = item.meta || (item.groupLabel ? `Cuenta · ${item.groupLabel}` : 'Cuenta');
            detail.groupLabel = item.groupLabel || '';
            detail.valueSource = item;
            detail.amount = Number.isFinite(item.value) ? item.value : detail.amount;
        }

        function resolvePeriodYear(value) {
            const resolver = YEAR_RESOLVERS[value];
            if (typeof resolver === 'function') {
                return resolver();
            }
            return new Date().getFullYear();
        }

        function getDetailById(id) {
            return detalleItems.find((item) => item.id === id);
        }

        function editAdjustment(ajuste) {
            console.log('🔧 editAdjustment iniciado con:', ajuste);
            
            // Establecer modo edición ANTES de abrir el modal
            modalBackdrop.dataset.editingId = ajuste.id;
            console.log('✅ editingId establecido:', modalBackdrop.dataset.editingId);
            
            // Abrir modal con los datos del ajuste a editar
            openAjusteModal();
            
            // Esperar un momento a que el modal se abra completamente
            setTimeout(() => {
                console.log('🔧 editAdjustment: Cargando datos del ajuste', ajuste);
                
                // Re-obtener elementos del formulario por si acaso
                const modal = document.getElementById('ajusteModal');
                const currentNumeroField = modal?.querySelector('#ajusteNumero');
                const currentTipoSelect = modal?.querySelector('#ajusteTipo');
                const currentPeriodoSelect = modal?.querySelector('#ajustePeriodo');
                const currentEntidadSelect = modal?.querySelector('#ajusteEntidad');
                const currentDescripcionTextarea = modal?.querySelector('#ajusteDescripcion');
                
                console.log('🔧 Elementos del formulario disponibles:');
                console.log('- modal:', !!modal);
                console.log('- numeroField:', !!currentNumeroField, currentNumeroField?.id);
                console.log('- tipoSelect:', !!currentTipoSelect, currentTipoSelect?.id);
                console.log('- periodoSelect:', !!currentPeriodoSelect, currentPeriodoSelect?.id);
                console.log('- entidadSelect:', !!currentEntidadSelect, currentEntidadSelect?.id);
                console.log('- descripcionTextarea:', !!currentDescripcionTextarea, currentDescripcionTextarea?.id);
                console.log('- Datos del ajuste:', {
                    numero: ajuste.numero,
                    tipo: ajuste.tipo,
                    periodo: ajuste.periodo,
                    entidad: ajuste.entidad,
                    descripcion: ajuste.descripcion
                });
                
                // Obtener datos desde meta o directamente del ajuste (compatibilidad)
                const datos = {
                    numero: ajuste.numero || ajuste.meta?.numero || '',
                    tipo: ajuste.tipo || ajuste.meta?.tipo || '',
                    periodo: ajuste.periodo || ajuste.meta?.periodo || '',
                    entidad: ajuste.entidad || ajuste.meta?.entidad || '',
                    descripcion: ajuste.descripcion || ajuste.meta?.descripcion || ''
                };
                
                console.log('🔧 Datos obtenidos para cargar:', datos);
                
                // Cargar datos del ajuste en el formulario
                if (currentNumeroField) {
                    currentNumeroField.value = datos.numero || '';
                    console.log('✅ numeroField asignado:', currentNumeroField.value);
                } else {
                    console.warn('⚠️ numeroField no encontrado');
                }
                if (currentTipoSelect) {
                    currentTipoSelect.value = datos.tipo || '';
                    console.log('✅ tipoSelect asignado:', currentTipoSelect.value);
                } else {
                    console.warn('⚠️ tipoSelect no encontrado');
                }
                if (currentPeriodoSelect) {
                    currentPeriodoSelect.value = datos.periodo || '';
                    console.log('✅ periodoSelect asignado:', currentPeriodoSelect.value);
                } else {
                    console.warn('⚠️ periodoSelect no encontrado');
                }
                if (currentEntidadSelect) {
                    currentEntidadSelect.value = datos.entidad || '';
                    console.log('✅ entidadSelect asignado:', currentEntidadSelect.value);
                } else {
                    console.warn('⚠️ entidadSelect no encontrado');
                }
                if (currentDescripcionTextarea) {
                    currentDescripcionTextarea.value = datos.descripcion || '';
                    console.log('✅ descripcionTextarea asignado:', currentDescripcionTextarea.value);
                } else {
                    console.warn('⚠️ descripcionTextarea no encontrado');
                }
                
                // Cargar detalles - buscar en múltiples propiedades para compatibilidad
                const detallesOrigen = ajuste.detalles || ajuste.meta?.detalles || [];
                console.log('🔧 Cargando detalles desde:', detallesOrigen.length, 'elementos');
                console.log('🔧 Primer detalle original:', detallesOrigen[0]);
                
                detalleItems = detallesOrigen.map(detail => {
                    const amount = Number(detail.amount);
                    const isNumber = Number.isFinite(amount);
                    // Determinar naturaleza original o inferir
                    const nature = detail.nature || (detail.type === 'credit' ? 'haber' : detail.type === 'debit' ? 'debe' : getAccountNature(detail.name || detail.label || '', detail.code || ''));
                    const normalized = {
                        ...detail,
                        label: detail.label || detail.name || detail.code || 'Sin nombre',
                        type: detail.type || 'account',
                        amount: isNumber ? amount : 0,
                        nature: nature === 'haber' ? 'haber' : 'debe',
                        id: uniqueId('detail')
                    };
                    console.log('🔧 Detalle normalizado:', normalized);
                    return normalized;
                });
                
                console.log('🔧 detalleItems después de cargar:', detalleItems);
                renderDetailItems();
                console.log('🔧 renderDetailItems ejecutado');
                // NO llamar a updateNumeroField() en modo edición para mantener el número original
                
                // Marcar como modo edición
                modalBackdrop.dataset.editingId = ajuste.id;
                
                // Mostrar el botón de eliminar
                if (deleteButton) {
                    deleteButton.style.display = 'inline-block';
                }
                
                console.log('Editando ajuste:', ajuste);
                console.log('Número del ajuste original:', ajuste.numero);
                console.log('Detalles cargados:', detalleItems);
            }, 100);
        }

        function renderNotesList(notesArray) {
            if (!notesArray || notesArray.length === 0) {
                return `
                    <div class="ajuste-notes-modal__empty-notes">
                        <i class="bi bi-chat-left-text" style="font-size: 2rem; color: #cbd5e1;"></i>
                        <p style="color: #94a3b8; margin: 8px 0 0 0;">No hay notas aún</p>
                    </div>
                `;
            }

            return notesArray.map(note => {
                const authorName = getNoteAuthorName(note);
                return `
                <div class="ajuste-notes-modal__note-item" data-note-id="${note.id}">
                    <div class="ajuste-notes-modal__note-header">
                        <span class="ajuste-notes-modal__note-user">
                            <i class="bi bi-person-circle"></i> ${authorName}
                        </span>
                        <span class="ajuste-notes-modal__note-time">
                            <i class="bi bi-clock"></i> ${note.createdAt}
                        </span>
                        <button type="button" class="ajuste-notes-modal__delete-btn" data-note-id="${note.id}" title="Eliminar nota">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div class="ajuste-notes-modal__note-text">
                        ${note.html || note.text}
                    </div>
                </div>`;
            }).join('');
        }

        function updateNotesNotificationBadge() {
            // Asegurar que ajustes es un array
            if (!Array.isArray(ajustes)) {
                console.warn('formularios-ajustes.js: ajustes no es un array en updateNotesNotificationBadge:', typeof ajustes, ajustes);
                return;
            }
            
            // Contar solo ajustes que tienen notas (no solo ajustes creados)
            const adjustmentsWithNotes = ajustes.filter(ajuste => 
                ajuste.notasArray && ajuste.notasArray.length > 0
            );
            
            const totalNotes = adjustmentsWithNotes.reduce((total, ajuste) => {
                return total + ajuste.notasArray.length;
            }, 0);

            // Obtener el badge del play icon
            const playIcon = document.querySelector('.menu-logo .bi-play-circle');
            if (playIcon) {
                // Buscar o crear el badge
                let badge = playIcon.parentElement.querySelector('.notes-notification-badge');
                
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'notes-notification-badge';
                    playIcon.parentElement.style.position = 'relative';
                    playIcon.parentElement.appendChild(badge);
                }

                // Mostrar u ocultar el badge SOLO si hay notas reales
                if (totalNotes > 0) {
                    badge.textContent = totalNotes > 99 ? '99+' : totalNotes;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }

        function openNotesModal(ajuste) {
            const modal = document.createElement('div');
            modal.className = 'ajuste-notes-backdrop';

            const dialog = document.createElement('div');
            dialog.className = 'ajuste-notes-modal';
            // Inicializar array de notas si no existe
            if (!ajuste.notasArray) {
                ajuste.notasArray = [];
            }

            dialog.innerHTML = `
                <div class="ajuste-notes-modal__header">
                    <h3 class="ajuste-notes-modal__title">Notas del Ajuste #${ajuste.numero}</h3>
                    <button type="button" class="ajuste-notes-modal__close" aria-label="Cerrar notas">&times;</button>
                </div>
                <div class="ajuste-notes-modal__body">
                    <div class="ajuste-notes-modal__notes-list" id="notes-list">
                        ${renderNotesList(ajuste.notasArray)}
                    </div>
                    <div class="ajuste-notes-modal__new-note">
                        <label class="ajuste-notes-modal__label" for="notes-textarea">Nueva nota</label>
                        <div class="ajuste-notes-modal__toolbar">
                            <div class="ajuste-notes-modal__toolbar-group">
                                <button type="button" class="ajuste-notes-modal__toolbar-btn" data-command="bold" title="Negrita">
                                    <i class="bi bi-type-bold"></i>
                                </button>
                                <button type="button" class="ajuste-notes-modal__toolbar-btn" data-command="italic" title="Cursiva">
                                    <i class="bi bi-type-italic"></i>
                                </button>
                                <button type="button" class="ajuste-notes-modal__toolbar-btn" data-command="underline" title="Subrayado">
                                    <i class="bi bi-type-underline"></i>
                                </button>
                            </div>
                            <div class="ajuste-notes-modal__toolbar-group">
                                <button type="button" class="ajuste-notes-modal__toolbar-btn" data-command="insertUnorderedList" title="Lista con viñetas">
                                    <i class="bi bi-list-ul"></i>
                                </button>
                                <button type="button" class="ajuste-notes-modal__toolbar-btn" data-command="insertOrderedList" title="Lista numerada">
                                    <i class="bi bi-list-ol"></i>
                                </button>
                            </div>
                            <div class="ajuste-notes-modal__toolbar-group">
                                <button type="button" class="ajuste-notes-modal__toolbar-btn" data-command="justifyLeft" title="Alinear a la izquierda">
                                    <i class="bi bi-text-left"></i>
                                </button>
                                <button type="button" class="ajuste-notes-modal__toolbar-btn" data-command="justifyCenter" title="Centrar">
                                    <i class="bi bi-text-center"></i>
                                </button>
                                <button type="button" class="ajuste-notes-modal__toolbar-btn" data-command="justifyRight" title="Alinear a la derecha">
                                    <i class="bi bi-text-right"></i>
                                </button>
                            </div>
                        </div>
                        <div id="notes-textarea" class="ajuste-notes-modal__textarea" contenteditable="true" placeholder="Escribe aquí tu nota..."></div>
                    </div>
                </div>
                <div class="ajuste-notes-modal__actions">
                    <button type="button" class="ajuste-notes-modal__action ajuste-notes-modal__action--cancel">Cancelar</button>
                    <button type="button" class="ajuste-notes-modal__action ajuste-notes-modal__action--save">Agregar nota</button>
                </div>
            `;

            modal.appendChild(dialog);
            document.body.appendChild(modal);
            disableBodyScroll();

            const textarea = dialog.querySelector('#notes-textarea');
            const closeButton = dialog.querySelector('.ajuste-notes-modal__close');
            const cancelButton = dialog.querySelector('.ajuste-notes-modal__action--cancel');
            const saveButton = dialog.querySelector('.ajuste-notes-modal__action--save');
            const toolbarButtons = dialog.querySelectorAll('.ajuste-notes-modal__toolbar-btn');

            let savedRange = null;

            const saveSelection = () => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) {
                    return;
                }
                const range = selection.getRangeAt(0);
                if (!textarea.contains(range.commonAncestorContainer)) {
                    return;
                }
                savedRange = range.cloneRange();
            };

            const restoreSelection = () => {
                if (!savedRange) {
                    return;
                }
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(savedRange);
            };

            ['mouseup', 'keyup', 'mouseleave', 'input', 'focus'].forEach(evt => {
                textarea.addEventListener(evt, saveSelection);
            });

            // Estilos y funcionalidad para los botones de la toolbar
            toolbarButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const command = btn.dataset.command;
                    
                    // Aplicar comandos de formato real al contenteditable
                    textarea.focus();
                    restoreSelection();
                    
                    try {
                        // Comandos de formato estándar del navegador
                        if (['bold', 'italic', 'underline'].includes(command)) {
                            document.execCommand(command, false, null);
                        } else if (['insertUnorderedList', 'insertOrderedList'].includes(command)) {
                            document.execCommand(command, false, null);
                        } else if (['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) {
                            document.execCommand(command, false, null);
                        }
                    } catch (error) {
                        console.warn('Comando no soportado:', command, error);
                        
                        // Fallback para navegadores que no soportan execCommand
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            const selectedText = range.toString();
                            
                            if (selectedText) {
                                let formattedElement;
                                
                                switch(command) {
                                    case 'bold':
                                        formattedElement = document.createElement('strong');
                                        break;
                                    case 'italic':
                                        formattedElement = document.createElement('em');
                                        break;
                                    case 'underline':
                                        formattedElement = document.createElement('u');
                                        break;
                                    default:
                                        return;
                                }
                                
                                formattedElement.textContent = selectedText;
                                range.deleteContents();
                                range.insertNode(formattedElement);
                                range.selectNodeContents(formattedElement);
                                selection.removeAllRanges();
                                selection.addRange(range);
                            }
                        }
                    }
                    
                    // Mantener el foco en el editor
                    textarea.focus();
                    saveSelection();
                });
            });

            const closeModal = () => {
                modal.removeEventListener('click', onBackdropClick);
                document.removeEventListener('keydown', onKeyDown);
                enableBodyScroll();
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            };

            const onBackdropClick = (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            };

            const onKeyDown = (event) => {
                if (event.key === 'Escape') {
                    closeModal();
                }
            };

            closeButton.addEventListener('click', closeModal);
            cancelButton.addEventListener('click', closeModal);
            
            // Event listener para botones de eliminar nota
            dialog.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.ajuste-notes-modal__delete-btn');
                if (deleteBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const noteId = parseInt(deleteBtn.dataset.noteId);
                    if (noteId && confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
                        // Eliminar la nota del array
                        ajuste.notasArray = ajuste.notasArray.filter(note => note.id !== noteId);
                        
                        // Actualizar el campo notas para compatibilidad
                        ajuste.notas = ajuste.notasArray.map(n => 
                            `[${n.createdAt}] ${n.username}: ${n.text}`
                        ).join('\n\n');
                        
                        // Guardar y actualizar
                        saveAjustes();
                        renderAjustes();
                        
                        // Actualizar la lista de notas en el modal
                        const notesList = dialog.querySelector('#notes-list');
                        if (notesList) {
                            notesList.innerHTML = renderNotesList(ajuste.notasArray);
                        }
                        
                        // Mostrar notificación
                        notify('Nota eliminada correctamente', 'success');
                        
                        // Actualizar el badge de notificaciones
                        updateNotesNotificationBadge();
                    }
                }
            });
            
            saveButton.addEventListener('click', async () => {
                // Obtener el contenido del contenteditable div
                const noteHtml = textarea.innerHTML;
                const noteText = textarea.textContent || textarea.innerText;

                if (!noteText.trim()) {
                    notify('Por favor escribe una nota antes de guardar', 'warning');
                    return;
                }

                let authorProfile = null;
                let authorName = 'Usuario';

                try {
                    authorProfile = await loadCurrentUserProfile();
                    authorName = getUserDisplayName(authorProfile);
                } catch (error) {
                    console.warn('No se pudo obtener el usuario actual al guardar la nota:', error);
                }

                // Crear nueva nota con información del usuario y timestamp
                const newNote = {
                    id: Date.now(),
                    text: noteText.trim(),
                    html: noteHtml, // Guardar el HTML con formato
                    username: authorName,
                    authorName,
                    userId: authorProfile?.id || null,
                    userEmail: authorProfile?.email || null,
                    timestamp: new Date().toISOString(),
                    createdAt: new Date().toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                };

                // Agregar la nota al array
                ajuste.notasArray.push(newNote);

                // Actualizar el campo notas para compatibilidad (solo texto plano)
                ajuste.notas = ajuste.notasArray.map(n => 
                    `[${n.createdAt}] ${n.username}: ${n.text}`
                ).join('\n\n');

                // Guardar y actualizar
                saveAjustes();
                renderAjustes();
                
                // Actualizar la lista de notas en el modal
                const notesList = dialog.querySelector('#notes-list');
                if (notesList) {
                    notesList.innerHTML = renderNotesList(ajuste.notasArray);
                }
                
                // Limpiar el contenteditable div
                textarea.innerHTML = '';
                textarea.textContent = '';
                
                // Mostrar notificación
                notify('Nota agregada correctamente', 'success');
                
                // Actualizar el badge de notificaciones
                updateNotesNotificationBadge();
            });

            modal.addEventListener('click', onBackdropClick);
            document.addEventListener('keydown', onKeyDown);

            setTimeout(() => {
                textarea.focus();
                // Para contenteditable, no necesitamos seleccionar texto si está vacío
                if (!textarea.textContent.trim()) {
                    // Colocar cursor al inicio
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(textarea);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }, 50);
        }

        function computeNextNumber() {
            if (!Array.isArray(ajustes) || !ajustes.length) {
                return 1;
            }
            const max = ajustes.reduce((acc, item) => Math.max(acc, Number(item.numero) || 0), 0);
            return max + 1;
        }

        function getNoteAuthorName(note) {
            if (!note || typeof note !== 'object') {
                return 'Usuario';
            }

            const candidates = [
                note.username,
                note.authorName,
                note.userName,
                note.user,
                note.createdBy,
                note.name,
                note.userFullName,
                note.user_username
            ];

            for (const value of candidates) {
                if (typeof value === 'string' && value.trim()) {
                    return value.trim();
                }
            }

            if (typeof note.userEmail === 'string' && note.userEmail.includes('@')) {
                return note.userEmail.split('@')[0] || 'Usuario';
            }

            return 'Usuario';
        }

        function disableBodyScroll() {
            openModalCounter += 1;
            document.body.classList.add('modal-open');
        }

        function enableBodyScroll() {
            openModalCounter = Math.max(0, openModalCounter - 1);
            if (openModalCounter === 0) {
                document.body.classList.remove('modal-open');
            }
        }

        function notify(message, type = 'info') {
            if (typeof window.showNotification === 'function') {
                window.showNotification(message, type);
            } else {
                console[type === 'error' ? 'error' : 'log']('[Ajustes]', message);
            }
        }

        async function loadAdjustmentsFromStorage() {
            try {
                console.log('📥 Cargando ajustes desde base de datos...');
                console.log('🔍 currentDatasetId:', currentDatasetId);
                console.log('🔍 window.currentDatasetId:', window.currentDatasetId);
                console.log('🔍 window.getFinancialAdjustments disponible:', typeof window.getFinancialAdjustments);
                
                if (!window.getFinancialAdjustments || !currentDatasetId) {
                    console.warn('⚠️ No se puede cargar: getFinancialAdjustments o currentDatasetId no disponibles');
                    console.warn('  - getFinancialAdjustments:', !!window.getFinancialAdjustments);
                    console.warn('  - currentDatasetId:', currentDatasetId);
                    return [];
                }

                // Verificar conexión a la base de datos
                const isConnected = await window.checkDatabaseConnection();
                if (!isConnected) {
                    console.warn('⚠️ Sin conexión a la base de datos');
                    return [];
                }

                // Cargar ajustes desde la base de datos
                const dbAdjustments = await window.getFinancialAdjustments(currentDatasetId);
                console.log(`📥 Ajustes cargados desde BD: ${dbAdjustments.length}`);
                
                // Convertir ajustes de la base de datos al formato local (incluyendo metadatos de UI)
                const convertedAdjustments = dbAdjustments.map((adj) => {
                    const meta = adj.meta || {};
                    const numero = meta.numero ?? adj.numero ?? null;
                    const tipoValue = meta.tipo || adj.adjustment_type || '';
                    const tipoLabel = meta.tipoLabel || tipoValue || 'N/A';
                    const periodoValue = meta.periodo || adj.periodo || '';
                    const periodoLabel = meta.periodoLabel || periodoValue || 'N/A';
                    const periodoYear = meta.periodoYear || resolvePeriodYear(periodoValue);
                    const entidadValue = meta.entidad || adj.entidad || '';
                    const entidadLabel = meta.entidadLabel || entidadValue || 'N/A';
                    const descripcion = adj.descripcion || meta.descripcion || '';
                    const detalles = meta.detalles || adj.detalles || [];
                    const notasArray = meta.notasArray || [];

                    return {
                        id: adj.id,
                        numero,
                        tipo: tipoValue,
                        tipoLabel,
                        periodo: periodoValue,
                        periodoLabel,
                        periodoYear,
                        entidad: entidadValue,
                        entidadLabel,
                        moneda: adj.moneda,
                        monto: adj.monto,
                        descripcion,
                        htmlContenido: adj.html_contenido || meta.descripcionHtml || '',
                        adjuntos: adj.adjuntos,
                        creado: adj.created_at,
                        modificado: adj.updated_at,
                        detalles,
                        meta,
                        // Mantener compatibilidad con formato existente
                        notasArray
                    };
                });

                return convertedAdjustments;
            } catch (error) {
                console.error('❌ Error cargando ajustes desde base de datos:', error);
                return [];
            }
        }

        function parseJsonSafe(value) {
            try {
                return JSON.parse(value);
            } catch (error) {
                console.warn('No se pudo parsear JSON de usuario almacenado:', error);
                return null;
            }
        }

        function getUserFromSessionStorage() {
            try {
                const stored = sessionStorage.getItem(USER_SESSION_STORAGE_KEY);
                return stored ? parseJsonSafe(stored) : null;
            } catch (error) {
                console.warn('No se pudo obtener usuario desde sessionStorage:', error);
                return null;
            }
        }

        function getUserFromLocalStorage() {
            for (const key of LOCAL_USER_STORAGE_KEYS) {
                try {
                    const stored = localStorage.getItem(key);
                    if (!stored) continue;
                    const parsed = parseJsonSafe(stored);
                    if (parsed) {
                        return parsed;
                    }
                } catch (error) {
                    console.warn(`No se pudo obtener usuario desde localStorage (${key}):`, error);
                }
            }
            return null;
        }

        function getUserDisplayName(user) {
            if (!user || typeof user !== 'object') {
                return 'Usuario';
            }

            const candidates = [
                user.name,
                user.full_name,
                user.fullName,
                user.username,
                user.displayName
            ];

            for (const value of candidates) {
                if (typeof value === 'string' && value.trim()) {
                    return value.trim();
                }
            }

            if (typeof user.email === 'string' && user.email.includes('@')) {
                return user.email.split('@')[0] || user.email;
            }

            return 'Usuario';
        }

        async function loadCurrentUserProfile(forceReload = false) {
            if (!forceReload && currentUserProfile) {
                return currentUserProfile;
            }

            let user = null;

            if (typeof window.getUserUI === 'function') {
                try {
                    user = window.getUserUI();
                } catch (error) {
                    console.warn('No se pudo obtener usuario mediante getUserUI:', error);
                }
            }

            if (!user) {
                user = getUserFromSessionStorage();
            }

            if (!user && window.appSession) {
                user = window.appSession;
            }

            if (!user && window.currentUser) {
                user = window.currentUser;
            }

            if (!user) {
                user = getUserFromLocalStorage();
            }

            if (!user && window.currentUserReady && typeof window.currentUserReady.then === 'function') {
                try {
                    user = await window.currentUserReady;
                } catch (error) {
                    console.warn('No se pudo resolver window.currentUserReady:', error);
                }
            }

            if (!user && window.currentUser) {
                user = window.currentUser;
            }

            if (user && typeof user === 'object') {
                currentUserProfile = user;
                return currentUserProfile;
            }

            return null;
        }

        function saveAjustes() {
            saveAdjustmentsToStorage(ajustes);
            // Dispatch event immediately to update Cuentas table
            try {
                document.dispatchEvent(new CustomEvent('localAdjustmentsUpdated', {
                    detail: {
                        adjustments: Array.from(computeAdjustmentsMap().entries())
                    }
                }));
                console.log('✅ localAdjustmentsUpdated dispatched after saving adjustment');
            } catch (error) {
                console.warn('⚠️ Error dispatching localAdjustmentsUpdated:', error);
            }
        }

        function computeAdjustmentTotal(ajuste) {
            if (!ajuste || !Array.isArray(ajuste.detalles)) {
                return 0;
            }

            return ajuste.detalles.reduce((total, detail) => {
                const amount = Number(detail?.amount);
                if (!Number.isFinite(amount) || amount <= 0) {
                    return total;
                }
                return total + Math.abs(amount);
            }, 0);
        }

        async function saveAdjustmentsToStorage(data) {
            try {
                console.log('💾 Guardando ajustes directamente en base de datos...');
                
                if (!window.saveFinancialAdjustment || !currentDatasetId) {
                    console.warn('⚠️ No se puede guardar: saveFinancialAdjustment o currentDatasetId no disponibles');
                    return false;
                }

                // Guardar cada ajuste individualmente en la base de datos
                const results = await Promise.allSettled(
                    data.map(async (ajuste) => {
                        const totalMonto = computeAdjustmentTotal(ajuste);

                        if (totalMonto <= 0) {
                            console.warn('Ajuste omitido para guardado en BD: monto total inválido', ajuste);
                            return null;
                        }

                        return await saveFinancialAdjustment({
                            datasetId: currentDatasetId,
                            adjustmentType: ajuste.tipo || 'manual',
                            moneda: ajuste.moneda || 'GTQ',
                            monto: totalMonto,
                            descripcion: ajuste.descripcion || '',
                            htmlContenido: ajuste.htmlContenido || '',
                            adjuntos: ajuste.adjuntos || null,
                            meta: {
                                detalles: ajuste.detalles || [],
                                creado: ajuste.creado,
                                modificado: ajuste.modificado,
                                totalMonto
                            }
                        });
                    })
                );

                const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
                const failed = results.filter(r => r.status === 'rejected').length;

                console.log(`✅ Ajustes guardados en BD: ${successful} exitosos, ${failed} fallidos`);
                
                // Disparar evento para que la UI se recargue desde BD
                window.dispatchEvent(new CustomEvent('databaseAdjustmentsUpdated', {
                    detail: { datasetId: currentDatasetId, count: successful }
                }));

                return successful > 0;
            } catch (error) {
                console.error('❌ Error guardando ajustes en base de datos:', error);
                return false;
            }
        }

        function getAccountOriginSide(code) {
            // Determinar el lado de origen (DEBE o HABER) según el tipo de cuenta
            const codeNum = parseInt(code);
            
            // Cuentas de ACTIVO (origen DEBE)
            if (codeNum >= 100 && codeNum < 200) {
                return 'DEBE'; // Activos: 100-199
            }
            
            // Cuentas de PASIVO (origen HABER)
            if (codeNum >= 300 && codeNum < 400) {
                return 'HABER'; // Pasivos: 300-399
            }
            
            // Cuentas de PATRIMONIO (origen HABER)
            if (codeNum >= 200 && codeNum < 300) {
                return 'HABER'; // Patrimonio: 200-299
            }
            
            // Cuentas de INGRESOS (origen HABER)
            if (codeNum >= 4000 && codeNum < 5000) {
                return 'HABER'; // Ingresos: 4000-4999
            }
            
            // Cuentas de GASTOS (origen DEBE)
            if (codeNum >= 5000 && codeNum < 6000) {
                return 'DEBE'; // Gastos: 5000-5999
            }
            
            // Por defecto, asumir DEBE (activos/gastos)
            return 'DEBE';
        }

        function computeAdjustmentsMap() {
            const map = new Map();

            ajustes.forEach((ajuste) => {
                (ajuste.detalles || []).forEach((detail) => {
                    if (detail.type !== 'account') return;

                    const code = (detail.code || '').trim();
                    if (!code) return;

                    const amount = Number.isFinite(detail.amount) ? detail.amount : 0;
                    const originSide = getAccountOriginSide(code);
                    
                    let effectiveAmount = 0;
                    
                    if (originSide === 'DEBE') {
                        // Cuentas de Activo/Gastos (origen DEBE)
                        // Positivo = mismo lado = suma, Negativo = lado contrario = resta
                        effectiveAmount = amount;
                    } else {
                        // Cuentas de Pasivo/Patrimonio/Ingresos (origen HABER)
                        // Negativo = mismo lado = suma, Positivo = lado contrario = resta
                        effectiveAmount = -amount;
                    }
                    
                    map.set(code, (map.get(code) || 0) + effectiveAmount);
                });
            });

            return map;
        }

        function broadcastAdjustmentsUpdate() {
            const map = computeAdjustmentsMap();
            window.dispatchEvent(new CustomEvent('localAdjustmentsUpdated', {
                detail: {
                    adjustments: Array.from(map.entries())
                }
            }));
        }

        // Exponer mapa de ajustes locales para otras secciones (Datos/Cuentas)
        window.getLocalAdjustmentsMap = function () {
            return computeAdjustmentsMap();
        };

        function collectAssignedAccounts() {
            console.log('🔍 Recolectando cuentas asignadas...');
            
            const elements = document.querySelectorAll('.financial-groups-list .assigned-account');
            console.log(`🔍 Encontrados ${elements.length} elementos .assigned-account`);
            const seen = new Set();
            const accounts = [];

            elements.forEach((element) => {
                const code = element.dataset.accountCode || '';
                const name = element.dataset.accountName || element.textContent.trim() || '';
                const value = parseNumber(element.dataset.accountValue || element.querySelector('.account-value')?.textContent || '0');
                const datasetId = element.dataset.accountDatasetId || window.currentDatasetId || '';
                const uniqueKey = `${code}-${datasetId}`;

                console.log(`🔍 Cuenta encontrada: ${code} - ${name} (valor: ${value})`);
                
                if (code && name && !seen.has(uniqueKey)) {
                    seen.add(uniqueKey);
                    accounts.push({
                        id: `account-${uniqueKey}`,
                        code,
                        name,
                        value,
                        type: 'account',
                        datasetId
                    });
                }
            });

            // Si no hay cuentas asignadas, obtener de la sección Cuentas
            if (accounts.length === 0) {
                console.log('🔍 No hay cuentas asignadas, buscando en tabla #cuentasTableBody...');
                const cuentasTableRows = document.querySelectorAll('#cuentasTableBody tr');
                console.log(`🔍 Encontradas ${cuentasTableRows.length} filas en #cuentasTableBody`);
                cuentasTableRows.forEach((row) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const code = cells[0].textContent.trim();
                        const name = cells[1].textContent.trim();
                        const preliminaryValue = parseNumber(cells[2].textContent || '0');
                        const datasetId = window.currentDatasetId || '';
                        const uniqueKey = `${code}-${datasetId}`;

                        if (code && name && !seen.has(uniqueKey) && code !== 'No hay cuentas disponibles') {
                            seen.add(uniqueKey);
                            accounts.push({
                                id: `account-${uniqueKey}`,
                                code,
                                name,
                                value: preliminaryValue,
                                type: 'account',
                                datasetId
                            });
                        }
                    }
                });
            }

            console.log(`🔍 Total de cuentas recolectadas: ${accounts.length}`);
            accounts.forEach(account => {
                console.log(`🔍 - ${account.code}: ${account.name} (${account.value})`);
            });

            return accounts.sort((a, b) => a.code.localeCompare(b.code, 'es'));
        }

        function collectAssignedGroups() {
            const groups = [];
            const seen = new Set();

            document.querySelectorAll('.financial-groups-list .group-item').forEach((groupItem, groupIndex) => {
                const groupNameElement = groupItem.querySelector('.group-header .group-name');
                const groupName = groupNameElement ? groupNameElement.textContent.trim() : '';
                const groupId = groupNameElement?.dataset.groupId || slugify(`${groupIndex}-${groupName}`);

                const groupAssignedAccounts = Array.from(groupItem.querySelectorAll('.assigned-account'));
                if (groupAssignedAccounts.length && groupName && !seen.has(groupId)) {
                    const total = groupAssignedAccounts.reduce((sum, accountEl) => sum + parseNumber(accountEl.dataset.accountValue), 0);
                    groups.push({
                        id: `group-${groupId}`,
                        type: 'group',
                        name: groupName,
                        label: groupName,
                        parentLabel: '',
                        meta: `Grupo con ${groupAssignedAccounts.length} cuentas asignadas`,
                        value: total
                    });
                    seen.add(groupId);
                }

                groupItem.querySelectorAll('.sub-group-item').forEach((subItem, index) => {
                    const subNameElement = subItem.querySelector('.sub-group-header .sub-group-name');
                    if (!subNameElement) return;
                    const subName = subNameElement.textContent.trim();
                    const subgroupAssigned = Array.from(subItem.querySelectorAll('.assigned-account'));
                    if (!subgroupAssigned.length) return;

                    const subId = subNameElement.dataset.groupId || slugify(`${groupName}-${subName}-${index}`);
                    if (seen.has(subId)) return;

                    const total = subgroupAssigned.reduce((sum, accountEl) => sum + parseNumber(accountEl.dataset.accountValue), 0);
                    groups.push({
                        id: `subgroup-${subId}`,
                        type: 'group',
                        name: subName,
                        label: subName,
                        parentLabel: groupName,
                        meta: groupName ? `Agrupamiento en ${groupName}` : 'Agrupamiento',
                        value: total
                    });
                    seen.add(subId);
                });
            });

            return groups.sort((a, b) => a.label.localeCompare(b.label, 'es'));
        }

        function getAccountContext(element) {
            const context = { group: '', subGroup: '' };
            const subGroup = element.closest('.sub-group-item');
            if (subGroup) {
                const subName = subGroup.querySelector('.sub-group-name');
                if (subName) {
                    context.subGroup = subName.textContent.trim();
                }
            }

            const group = element.closest('.group-item');
            if (group) {
                const groupName = group.querySelector('.group-name');
                if (groupName) {
                    context.group = groupName.textContent.trim();
                }
            }

            return context;
        }

        function extractAccountCode(text) {
            if (!text) return '';
            const match = text.trim().match(/^([\d\.]+)/);
            return match ? match[1] : '';
        }

        function extractAccountName(text) {
            if (!text) return '';
            return text.replace(/^([\d\.]+)\s*/, '').trim();
        }

        function formatCurrencyFriendly(value) {
            const numericValue = Number.isFinite(value) ? value : 0;
            // Formato sin símbolo de moneda, solo número con separadores
            return numericValue.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function getAccountNature(accountName, accountCode = '') {
            const name = (accountName || '').toLowerCase();
            const code = (accountCode || '').toString();
            
            // Detectar por código de cuenta (más preciso)
            if (code.startsWith('1')) {
                return 'debe'; // Activos (1xx) van en débito
            }
            if (code.startsWith('2')) {
                return 'haber'; // Pasivos (2xx) van en crédito
            }
            if (code.startsWith('3')) {
                return 'haber'; // Patrimonio (3xx) van en crédito
            }
            if (code.startsWith('4')) {
                return 'haber'; // Ingresos (4xx) van en crédito
            }
            if (code.startsWith('5')) {
                return 'debe'; // Gastos (5xx) van en débito
            }
            
            // Detectar por nombre de cuenta
            const debitKeywords = [
                'activo', 'caja', 'banco', 'cliente', 'cuentas por cobrar', 'inventario',
                'propiedad', 'equipo', 'inversión', 'gasto', 'costo', 'pérdida'
            ];
            
            const creditKeywords = [
                'pasivo', 'proveedor', 'cuentas por pagar', 'préstamo', 'impuesto por pagar',
                'patrimonio', 'capital', 'reserva', 'ingreso', 'venta', 'ganancia'
            ];
            
            if (debitKeywords.some(keyword => name.includes(keyword))) {
                return 'debe';
            }
            
            if (creditKeywords.some(keyword => name.includes(keyword))) {
                return 'haber';
            }
            
            // Por defecto, si no se puede determinar, asumir débito
            return 'debe';
        }

        function createDetailFromItem(type, item) {
            console.log('🔧 createDetailFromItem llamado con:', { type, item });
            const nature = getAccountNature(item.name || item.label || '', item.code || '');
            
            const detail = {
                id: uniqueId('detail'),
                type: type,
                code: item.code || '',
                name: item.name || '',
                label: item.label || item.name || '',
                meta: item.meta || (type === 'group' ? 'Agrupamiento' : 'Cuenta'),
                groupLabel: item.groupLabel || '',
                parentLabel: item.parentLabel || '',
                amount: Number.isFinite(item.value) ? item.value : 0,
                nature: nature,
                valueSource: item
            };
            
            console.log('🔧 Detalle creado en createDetailFromItem:', detail);
            return detail;
            
            // Si el item tiene un id, guardarlo como referencia
            if (item.id) {
                detail.itemId = item.id;
            }
            
            return detail;
        }

        function uniqueId(prefix = 'id') {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return `${prefix}-${crypto.randomUUID()}`;
            }
            return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        }

        function slugify(str) {
            return (str || '')
                .toString()
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        function escapeHtml(str) {
            return str.replace(/[&<>"]+/g, (match) => {
                const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
                return map[match] || match;
            });
        }

        // Función para sincronizar ajustes con la base de datos (ahora solo recarga desde BD)
        async function syncAdjustmentsWithDatabase() {
            try {
                console.log('🔄 Sincronizando ajustes con la base de datos...');
                
                if (!currentDatasetId) {
                    console.log('⚠️ No hay datasetId, omitiendo sincronización de ajustes');
                    return;
                }
                
                // Verificar si hay conexión a la base de datos
                if (!window.getFinancialAdjustments) {
                    console.warn('⚠️ getFinancialAdjustments no disponible');
                    return;
                }

                const isConnected = await window.checkDatabaseConnection();
                if (!isConnected) {
                    console.warn('⚠️ Sin conexión a la base de datos');
                    return;
                }
                
                // Recargar los ajustes desde la base de datos
                if (typeof loadAjustes === 'function') {
                    await loadAjustes();
                    console.log('✅ Ajustes recargados desde base de datos');
                }
            } catch (error) {
                console.error('❌ Error sincronizando ajustes con base de datos:', error);
            }
        }

        // Iniciar sincronización de ajustes si estamos en el contexto correcto
        if (typeof currentDatasetId !== 'undefined' && currentDatasetId) {
            syncAdjustmentsWithDatabase();
        }
    }
    
    } catch (error) {
        console.error('❌ Error en formularios-ajustes.js:', error);
        console.error('Stack trace:', error.stack);
    }
    
    // Exponer funciones globalmente inmediatamente después de que se definan
    // Esto asegura que estén disponibles para formularios.html
    if (typeof window !== 'undefined') {
        window.handleFormSubmit = handleFormSubmit;
        window.openAjusteModal = openAjusteModal;
        window.closeAjusteModal = closeAjusteModal;
        window.initializeAjustesSystem = initializeAjustesSystem;
        window.createAdjustmentCard = createAdjustmentCard;
        window.editAdjustment = editAdjustment;
        window.openNotesModal = openNotesModal;
        window.ajustes = ajustes;
        console.log('✅ Funciones de formularios-ajustes.js expuestas globalmente');
        console.log('🔍 Verificación final - handleFormSubmit:', typeof window.handleFormSubmit);
        console.log('🔍 Verificación final - openAjusteModal:', typeof window.openAjusteModal);
        console.log('🔍 Verificación final - closeAjusteModal:', typeof window.closeAjusteModal);
        console.log('🔍 Verificación final - initializeAjustesSystem:', typeof window.initializeAjustesSystem);
        console.log('🔍 Verificación final - createAdjustmentCard:', typeof window.createAdjustmentCard);
        console.log('🔍 Verificación final - editAdjustment:', typeof window.editAdjustment);
        console.log('🔍 Verificación final - openNotesModal:', typeof window.openNotesModal);
    }
})();
