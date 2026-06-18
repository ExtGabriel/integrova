(() => {
    const STORAGE_KEY = 'ajustes_formularios_v1';

    // Función para obtener el año del Excel cargado
    function getExcelYear() {
        // Intentar obtener el año de los datos cargados en la aplicación
        try {
            // Buscar en localStorage datos del Excel
            const excelData = localStorage.getItem('excel_data_current');
            if (excelData) {
                const parsed = JSON.parse(excelData);
                // Extraer año de los datos si existe
                if (parsed.year || parsed.año) {
                    return parseInt(parsed.year || parsed.año);
                }
                // Intentar obtener de alguna columna de datos
                if (parsed.data && parsed.data.length > 0) {
                    const firstRow = parsed.data[0];
                    // Buscar columnas que puedan contener años
                    const yearColumns = ['Año', 'anio', 'year', 'periodo', 'period'];
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
            
            // Intentar obtener de la URL o parámetros
            const urlParams = new URLSearchParams(window.location.search);
            const yearParam = urlParams.get('year') || urlParams.get('año');
            if (yearParam) {
                return parseInt(yearParam);
            }
            
            return null;
        } catch (error) {
            console.warn('No se pudo obtener el año del Excel:', error);
            return null;
        }
    }

    const YEAR_RESOLVERS = {
        'anio-corriente': () => {
            // Intentar obtener el año del Excel cargado, si no hay, usar año actual
            const excelYear = getExcelYear();
            return excelYear || new Date().getFullYear();
        },
        'anio-anterior': () => {
            // Intentar obtener el año del Excel cargado, si no hay, usar año anterior
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

    document.addEventListener('DOMContentLoaded', async () => {
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
        const adjustmentsList = document.getElementById('adjustmentsList');
        const adjustmentsEmpty = document.getElementById('adjustmentsEmpty');

        const selectorModal = document.getElementById('selectorModal');
        const selectorModalList = document.getElementById('selectorModalList');
        const selectorModalTitle = document.getElementById('selectorModalTitle');
        const selectorModalClose = document.getElementById('selectorModalClose');
        const selectorSearchInput = document.getElementById('selectorSearch');

        if (!modalBackdrop || !openButton || !form) {
            return;
        }

        try {
            await loadCurrentUserProfile();
        } catch (error) {
            console.warn('No se pudo precargar el usuario actual para notas de ajustes:', error);
        }

        ajustes = loadAdjustmentsFromStorage();
        renderAdjustments();
        
        // Inicializar el badge de notificaciones
        updateNotesNotificationBadge();

        openButton.addEventListener('click', () => openAjusteModal());
        closeButton?.addEventListener('click', () => closeAjusteModal());
        cancelButton?.addEventListener('click', () => closeAjusteModal());
        deleteButton?.addEventListener('click', () => handleDeleteAjuste());

        modalBackdrop.addEventListener('click', (event) => {
            if (event.target === modalBackdrop) {
                closeAjusteModal();
            }
        });

        form.addEventListener('submit', handleFormSubmit);

        addCuentaButton?.addEventListener('click', () => {
            openSelectorModal('account', {
                onSelect(item) {
                    detalleItems.push(createDetailFromItem('account', item));
                    renderDetailItems();
                    focusLastDetailAmount();
                }
            });
        });

        addGrupoButton?.addEventListener('click', () => {
            openSelectorModal('group', {
                onSelect(item) {
                    detalleItems.push(createDetailFromItem('group', item));
                    renderDetailItems();
                    focusLastDetailAmount();
                }
            });
        });

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

        // Event listener para cambios en montos (la naturaleza se calcula automáticamente)
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
                
                // Actualizar visualización de la naturaleza basada en el nuevo signo
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

        function openAjusteModal() {
            form.reset();
            detalleItems = [];
            renderDetailItems();
            
            // Solo actualizar el número si no está en modo edición
            if (!modalBackdrop.dataset.editingId) {
                updateNumeroField();
            }
            
            // Ocultar el botón de eliminar para nuevos ajustes
            if (deleteButton) {
                deleteButton.style.display = 'none';
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

        function closeAjusteModal() {
            if (modalBackdrop.hasAttribute('hidden')) return;
            modalBackdrop.setAttribute('hidden', '');
            enableBodyScroll();
            openButton?.focus();
        }

        function handleDeleteAjuste() {
            const editingId = modalBackdrop.dataset.editingId;
            
            if (!editingId) {
                notify('No se puede eliminar: no hay un ajuste seleccionado para editar', 'error');
                return;
            }

            // Confirmar eliminación
            if (confirm('¿Estás seguro de que deseas eliminar este ajuste? Esta acción no se puede deshacer.')) {
                // Eliminar el ajuste del array
                const ajusteIndex = ajustes.findIndex(a => a.id === editingId);
                if (ajusteIndex !== -1) {
                    const ajusteEliminado = ajustes[ajusteIndex];
                    ajustes.splice(ajusteIndex, 1);
                    
                    // Guardar cambios y actualizar la lista
                    saveAjustes();
                    renderAjustes();
                    broadcastAdjustmentsUpdate(); // Actualizar tablas financieras
                    closeAjusteModal();
                    
                    notify(`Ajuste #${ajusteEliminado.numero} eliminado correctamente`, 'success');
                    console.log('Ajuste eliminado:', ajusteEliminado);
                } else {
                    notify('No se encontró el ajuste para eliminar', 'error');
                }
                
                // Limpiar el modo edición
                delete modalBackdrop.dataset.editingId;
            }
        }

        function handleFormSubmit(event) {
            event.preventDefault();
            
            console.log('=== INICIANDO GUARDADO DE AJUSTE ===');
            console.log('detalleItems:', detalleItems);
            
            // Verificar que los elementos del formulario existan
            console.log('Elementos del formulario:');
            console.log('- numeroField:', numeroField);
            console.log('- tipoSelect:', tipoSelect);
            console.log('- periodoSelect:', periodoSelect);
            console.log('- entidadSelect:', entidadSelect);
            console.log('- descripcionTextarea:', descripcionTextarea);
            
            if (!detalleItems.length) {
                console.log('ERROR: No hay detalles en el ajuste');
                notify('Agrega al menos una línea en Detalles antes de guardar.', 'warning');
                return;
            }

            const hasEmptyAmount = detalleItems.some((item) => !Number.isFinite(item.amount));
            if (hasEmptyAmount) {
                console.log('ERROR: Hay montos vacíos o inválidos');
                notify('Completa el monto de cada línea con valores válidos antes de guardar.', 'warning');
                return;
            }

            // Validación de doble partida
            const balance = calculateAdjustmentBalance();
            if (!balance.isBalanced) {
                console.log('ERROR: Ajuste desbalanceado - Débitos != Créditos');
                const excessType = balance.difference > 0 ? 'débitos' : 'créditos';
                const excessAmount = formatCurrency(Math.abs(balance.difference));
                notify(`Ajuste desbalanceado. Exceso de ${excessType}: ${excessAmount}. Los débitos deben ser iguales a los créditos.`, 'error');
                return;
            }

            // Validación de partida doble (al menos un débito y un crédito)
            if (!balance.hasDebit || !balance.hasCredit) {
                console.log('ERROR: Partida doble requiere al menos un débito y un crédito');
                notify('Una partida contable requiere al menos una línea en Débito y otra en Crédito.', 'warning');
                return;
            }

            const hasZeroAmount = detalleItems.some((item) => !Number.isFinite(item.amount) || item.amount === 0);
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

            console.log('Valores del formulario:');
            console.log('- numero:', numero);
            console.log('- tipoValue:', tipoValue);
            console.log('- periodoValue:', periodoValue);
            console.log('- entidadValue:', entidadValue);
            console.log('- descripcion:', descripcionValue);

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
                descripcion: descripcionValue, detalles: detalleItems
            });

            // Verificar si es modo edición
            const editingId = modalBackdrop.dataset.editingId;
            
            if (editingId) {
                // Modo edición: actualizar ajuste existente
                console.log('MODO EDICIÓN - Actualizando ajuste:', editingId);
                const ajusteIndex = ajustes.findIndex(a => a.id === editingId);
                if (ajusteIndex !== -1) {
                    ajustes[ajusteIndex] = {
                        ...ajustes[ajusteIndex],
                        numero,
                        tipo: tipoValue,
                        tipoLabel,
                        periodo: periodoValue,
                        periodoLabel,
                        periodoYear,
                        entidad: entidadValue,
                        entidadLabel,
                        descripcion: descripcionValue,
                        descripcionHtml: null,
                        detalles: [...detalleItems],
                        updatedAt: new Date().toISOString()
                    };
                    
                    saveAjustes();
                    renderAjustes();
                    broadcastAdjustmentsUpdate(); // Actualizar tablas financieras
                    closeAjusteModal();
                    notify('Ajuste actualizado correctamente', 'success');
                } else {
                    console.log('ERROR: No se encontró el ajuste para editar');
                    notify('No se encontró el ajuste para editar', 'error');
                }
                delete modalBackdrop.dataset.editingId;
            } else {
                // Modo creación: crear nuevo ajuste
                console.log('MODO CREACIÓN - Creando nuevo ajuste');
                const newAjuste = {
                    id: uniqueId('ajuste'),
                    numero,
                    tipo: tipoValue,
                    tipoLabel,
                    periodo: periodoValue,
                    periodoLabel,
                    periodoYear,
                    entidad: entidadValue,
                    entidadLabel,
                    descripcion: descripcionValue,
                    descripcionHtml: null,
                    detalles: [...detalleItems],
                    createdAt: new Date().toISOString()
                };
                
                console.log('Nuevo ajuste a crear:', newAjuste);
                
                ajustes.push(newAjuste);
                saveAjustes();
                renderAjustes();
                broadcastAdjustmentsUpdate(); // Actualizar tablas financieras
                closeAjusteModal();
                notify('Ajuste creado correctamente', 'success');
            }
            
            console.log('=== AJUSTE GUARDADO EXITOSAMENTE ===');
        }

        function renderAdjustments() {
            if (!adjustmentsList) return;

            adjustmentsList.innerHTML = '';
            if (!Array.isArray(ajustes) || !ajustes.length) {
                if (adjustmentsEmpty) {
                    adjustmentsEmpty.style.display = 'grid';
                }
                return;
            }

            if (adjustmentsEmpty) {
                adjustmentsEmpty.style.display = 'none';
            }

            ajustes.forEach((ajuste) => {
                adjustmentsList.appendChild(createAdjustmentCard(ajuste));
            });
        }

        function renderAjustes() {
            renderAdjustments();
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
                                <span class="account-origin">Origen: ${originSide}</span>
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
                                    <small class="amount-hint">Origen ${originSide}: ${originSide === 'DEBE' ? '+' : '-'} = SUMA, ${originSide === 'DEBE' ? '-' : '+'} = RESTA</small>
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
            return new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
            }).format(amount);
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
            if (!selectorModal || !selectorModalList || !selectorModalTitle) return;

            const items = type === 'group' ? collectAssignedGroups() : collectAssignedAccounts();
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
            selectorModal.removeAttribute('hidden');
            disableBodyScroll();
            setTimeout(() => selectorSearchInput?.focus(), 80);
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
            
            const card = document.createElement('article');
            card.className = 'ajuste-card';

            const title = document.createElement('div');
            title.className = 'ajuste-card__header';
            title.innerHTML = `
                <div class="ajuste-card__title">
                    <span class="ajuste-card__title-text">Ajuste</span>
                    <span class="ajuste-card__number">${ajuste.numero}</span>
                    <span class="ajuste-card__title-text">- ${ajuste.periodoYear}</span>
                </div>
            `;

            const entity = document.createElement('div');
            entity.className = 'ajuste-card__entity';
            entity.textContent = ajuste.entidadLabel;

            const typePeriod = document.createElement('div');
            typePeriod.className = 'ajuste-card__type-period';
            typePeriod.textContent = `${ajuste.tipoLabel} - ${ajuste.periodoLabel}`;

            const description = document.createElement('div');
            description.className = 'ajuste-card__description';
            if (ajuste.descripcionHtml) {
                description.innerHTML = ajuste.descripcionHtml;
            } else if (ajuste.descripcion) {
                description.textContent = ajuste.descripcion;
            } else {
                description.innerHTML = '<span class="ajuste-detail-placeholder">Sin descripción</span>';
            }

            const detailsWrapper = document.createElement('div');
            detailsWrapper.className = 'ajuste-card__details';

            (ajuste.detalles || []).forEach((detail) => {
                const row = document.createElement('div');
                row.className = 'ajuste-card__detail';

                const signedAmount = detail.nature === 'haber' ? -Math.abs(detail.amount) : Math.abs(detail.amount);
                const formattedAmount = formatCurrencyFriendly(Math.abs(signedAmount));
                const amountElement = document.createElement('span');
                amountElement.className = signedAmount < 0 ? 'ajuste-card__amount ajuste-card__amount--negative' : 'ajuste-card__amount ajuste-card__amount--positive';
                amountElement.textContent = signedAmount < 0 ? `(${formattedAmount})` : formattedAmount;

                const label = document.createElement('span');
                label.innerHTML = `<strong>${detail.label}</strong><br><small>${detail.meta || (detail.type === 'group' ? 'Agrupamiento' : 'Cuenta')}</small>`;

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
                <button type="button" class="ajuste-card__action-btn" data-action="duplicate" title="Duplicar ajuste">
                    <i class="bi bi-files"></i>
                </button>
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
                    case 'duplicate':
                        console.log('Ejecutando duplicateAdjustment');
                        duplicateAdjustment(ajuste);
                        break;
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

        function duplicateAdjustment(ajuste) {
            // Crear una copia del ajuste con nuevo número
            const duplicatedAjuste = {
                ...ajuste,
                id: uniqueId('ajuste'),
                numero: computeNextNumber(),
                createdAt: new Date().toISOString()
            };
            
            // Agregar a la lista de ajustes
            ajustes.push(duplicatedAjuste);
            saveAjustes();
            renderAjustes();
            
            notify('Ajuste duplicado correctamente', 'success');
        }

        function editAdjustment(ajuste) {
            // Abrir modal con los datos del ajuste a editar
            openAjusteModal();
            
            // Esperar un momento a que el modal se abra completamente
            setTimeout(() => {
                // Cargar datos del ajuste en el formulario
                if (numeroField) numeroField.value = ajuste.numero;
                if (tipoSelect) tipoSelect.value = ajuste.tipo;
                if (periodoSelect) periodoSelect.value = ajuste.periodo;
                if (entidadSelect) entidadSelect.value = ajuste.entidad;
                if (descripcionTextarea) descripcionTextarea.value = ajuste.descripcion || '';
                
                // Cargar detalles
                detalleItems = (ajuste.detalles || []).map(detail => {
                    // Mantener la naturaleza original si está definida, si no, detectar automáticamente
                    const nature = detail.nature || getAccountNature(detail.name || detail.label || '', detail.code || '');
                    
                    return {
                        ...detail,
                        amount: Number.isFinite(detail.amount) ? detail.amount : 0,
                        nature: nature === 'haber' ? 'haber' : 'debe',
                        id: uniqueId('detail')
                    };
                });
                
                renderDetailItems();
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
                
                if (!window.getFinancialAdjustments || !currentDatasetId) {
                    console.warn('⚠️ No se puede cargar: getFinancialAdjustments o currentDatasetId no disponibles');
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
                
                // Convertir ajustes de la base de datos al formato local
                const convertedAdjustments = dbAdjustments.map(adj => ({
                    id: adj.id,
                    tipo: adj.adjustment_type,
                    moneda: adj.moneda,
                    monto: adj.monto,
                    descripcion: adj.descripcion,
                    htmlContenido: adj.html_contenido,
                    adjuntos: adj.adjuntos,
                    creado: adj.created_at,
                    modificado: adj.updated_at,
                    detalles: adj.meta?.detalles || [],
                    // Mantener compatibilidad con formato existente
                    notasArray: adj.meta?.notasArray || []
                }));

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
                document.dispatchEvent(new CustomEvent('databaseAdjustmentsUpdated', {
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
            document.dispatchEvent(new CustomEvent('localAdjustmentsUpdated', {
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
            const elements = document.querySelectorAll('.financial-groups-list .assigned-account');
            const seen = new Set();
            const accounts = [];

            elements.forEach((element) => {
                const code = element.dataset.accountCode || '';
                const name = element.dataset.accountName || element.textContent.trim() || '';
                const value = parseNumber(element.dataset.accountValue || element.querySelector('.account-value')?.textContent || '0');
                const datasetId = element.dataset.accountDatasetId || window.currentDatasetId || '';
                const uniqueKey = `${code}-${datasetId}`;

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
                const cuentasTableRows = document.querySelectorAll('#cuentasTableBody tr');
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
            if (typeof window.formatCurrency === 'function') {
                return window.formatCurrency(numericValue);
            }
            return `Q${numericValue.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    });
})();
