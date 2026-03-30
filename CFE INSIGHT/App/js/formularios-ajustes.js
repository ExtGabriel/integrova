(() => {
    const STORAGE_KEY = 'ajustes_formularios_v1';
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

    let ajustes = [];
    let detalleItems = [];
    let selectorState = null;
    let openModalCounter = 0;

    document.addEventListener('DOMContentLoaded', () => {
        const modalBackdrop = document.getElementById('ajusteModal');
        const openButton = document.getElementById('btnNuevoAjuste');
        const closeButton = document.getElementById('closeAjusteModal');
        const cancelButton = document.getElementById('cancelAjusteModal');
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

        ajustes = loadAdjustmentsFromStorage();
        renderAdjustments();

        openButton.addEventListener('click', () => openAjusteModal());
        closeButton?.addEventListener('click', () => closeAjusteModal());
        cancelButton?.addEventListener('click', () => closeAjusteModal());

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
                detail.amount = Number.isFinite(value) && value >= 0 ? value : 0;
            }
        });

        detailsList?.addEventListener('change', (event) => {
            const target = event.target;
            if (target.matches('[data-detail-field="nature"]')) {
                const row = target.closest('.ajuste-detail-row');
                if (!row) return;
                const detailId = row.dataset.detailId;
                const detail = getDetailById(detailId);
                if (!detail) return;
                detail.nature = target.value === 'haber' ? 'haber' : 'debe';
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
            updateNumeroField();
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

        function handleFormSubmit(event) {
            event.preventDefault();

            if (!detalleItems.length) {
                notify('Agrega al menos una línea en Detalles antes de guardar.', 'warning');
                return;
            }

            const hasEmptyAmount = detalleItems.some((item) => !Number.isFinite(item.amount) || item.amount <= 0);
            if (hasEmptyAmount) {
                notify('Completa el monto de cada línea antes de guardar.', 'warning');
                return;
            }

            const numero = parseInt(numeroField.value, 10) || computeNextNumber();
            const tipoValue = tipoSelect.value;
            const tipoLabel = (tipoSelect.options[tipoSelect.selectedIndex]?.text || tipoValue || '').trim();
            const periodoValue = periodoSelect.value;
            const periodoLabel = (periodoSelect.options[periodoSelect.selectedIndex]?.text || periodoValue || '').trim();
            const periodoYear = resolvePeriodYear(periodoValue);
            const entidadValue = entidadSelect.value;
            const entidadLabel = (entidadSelect.options[entidadSelect.selectedIndex]?.text || entidadValue || '').trim();
            const descripcionValue = descripcionTextarea.value.trim();

            // Verificar si es modo edición
            const editingId = modalBackdrop.dataset.editingId;
            
            if (editingId) {
                // Modo edición: actualizar ajuste existente
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
                    closeAjusteModal();
                    notify('Ajuste actualizado correctamente', 'success');
                } else {
                    notify('No se encontró el ajuste para editar', 'error');
                }
                delete modalBackdrop.dataset.editingId;
            } else {
                // Modo creación: crear nuevo ajuste
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
                
                ajustes.push(newAjuste);
                saveAjustes();
                renderAjustes();
                closeAjusteModal();
                notify('Ajuste creado correctamente', 'success');
            }
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

        function renderDetailItems() {
            if (!detailsList || !detailsEmptyState) return;

            if (!detalleItems.length) {
                detailsList.innerHTML = '';
                detailsEmptyState.style.display = 'block';
                return;
            }

            detailsEmptyState.style.display = 'none';

            const rowsHtml = detalleItems.map((detail) => {
                const amountValue = Number.isFinite(detail.amount) ? detail.amount.toFixed(2) : '0.00';
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
                                <span class="ajuste-detail-row__code">${detail.code || ''}</span>
                                <span class="ajuste-detail-row__name">${detail.label}</span>
                            </div>
                            <div class="ajuste-detail-row__amounts">
                                <div class="ajuste-detail-row__amount">
                                    <label for="detail-amount-${detail.id}">Cantidad</label>
                                    <input type="number" id="detail-amount-${detail.id}" data-detail-field="amount" min="0" step="0.01" value="${amountValue}" placeholder="0.00">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            detailsList.innerHTML = rowsHtml;
        }

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
                    <input type="number" class="ajuste-card__number-input" value="${ajuste.numero}" data-ajuste-id="${ajuste.id}" min="1">
                    <span class="ajuste-card__title-text">- ${ajuste.periodoYear}</span>
                </div>
                <div class="ajuste-card__meta">${ajuste.tipoLabel} - ${ajuste.periodoLabel}</div>
            `;

            const entity = document.createElement('div');
            entity.className = 'ajuste-card__entity';
            entity.textContent = ajuste.entidadLabel;

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

            // Agregar event listener para el input del número
            const numberInput = title.querySelector('.ajuste-card__number-input');
            
            // Hacer el input editable
            numberInput.addEventListener('click', (e) => {
                e.target.select();
            });
            
            numberInput.addEventListener('focus', (e) => {
                e.target.select();
            });
            
            numberInput.addEventListener('change', (e) => {
                const newNumber = parseInt(e.target.value, 10);
                if (Number.isFinite(newNumber) && newNumber > 0) {
                    // Actualizar el número del ajuste
                    ajuste.numero = newNumber;
                    saveAjustes();
                    notify('Número de ajuste actualizado', 'success');
                } else {
                    // Restaurar valor original si es inválido
                    e.target.value = ajuste.numero;
                    notify('Número inválido. Debe ser mayor a 0.', 'error');
                }
            });

            // Prevenir que el Enter en el input recargue la página
            numberInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
            
            // Prevenir propagación del clic para evitar conflictos con otros eventos
            numberInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Agregar event listener de prueba al wrapper principal
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
                detalleItems = (ajuste.detalles || []).map(detail => ({
                    ...detail,
                    id: uniqueId('detail')
                }));
                
                renderDetailItems();
                updateNumeroField();
                
                // Marcar como modo edición
                modalBackdrop.dataset.editingId = ajuste.id;
                
                console.log('Editando ajuste:', ajuste);
                console.log('Detalles cargados:', detalleItems);
            }, 100);
        }

        function openNotesModal(ajuste) {
            console.log('openNotesModal llamado con:', ajuste);
            
            // Crear modal para notas con estilo similar a la imagen
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;
            
            const dialog = document.createElement('div');
            dialog.className = 'notes-modal';
            dialog.style.cssText = `
                background: #fff;
                border-radius: 12px;
                width: 400px;
                max-width: 90%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                overflow: hidden;
            `;
            
            dialog.innerHTML = `
                <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #374151;">Notas del Ajuste ${ajuste.numero}</h3>
                    <button type="button" class="notes-modal__close" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280; padding: 0;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <textarea 
                        id="notes-textarea" 
                        placeholder="Agregar notas u observaciones..." 
                        style="width: 100%; min-height: 120px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.5;"
                    >${ajuste.notas || ''}</textarea>
                    <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end;">
                        <button type="button" class="notes-modal__cancel" style="padding: 8px 16px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; cursor: pointer; font-size: 14px; color: #374151;">Cancelar</button>
                        <button type="button" class="notes-modal__save" style="padding: 8px 16px; border: none; background: #3b82f6; color: #fff; border-radius: 6px; cursor: pointer; font-size: 14px;">Guardar</button>
                    </div>
                </div>
            `;
            
            modal.appendChild(dialog);
            document.body.appendChild(modal);
            console.log('Modal agregado al DOM');
            
            // Event listeners
            const close = () => {
                console.log('Cerrando modal');
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            };
            
            dialog.querySelector('.notes-modal__close').addEventListener('click', close);
            dialog.querySelector('.notes-modal__cancel').addEventListener('click', close);
            dialog.querySelector('.notes-modal__save').addEventListener('click', () => {
                const notes = dialog.querySelector('#notes-textarea').value;
                ajuste.notas = notes;
                saveAjustes();
                notify('Notas guardadas correctamente', 'success');
                close();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) close();
            });
            
            // Enfocar el textarea al abrir
            setTimeout(() => {
                const textarea = dialog.querySelector('#notes-textarea');
                if (textarea) {
                    textarea.focus();
                    console.log('Textarea enfocado');
                }
            }, 100);
        }

        function computeNextNumber() {
            if (!Array.isArray(ajustes) || !ajustes.length) {
                return 1;
            }
            const max = ajustes.reduce((acc, item) => Math.max(acc, Number(item.numero) || 0), 0);
            return max + 1;
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

        function loadAdjustmentsFromStorage() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return [];
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                console.warn('No se pudieron cargar los ajustes almacenados:', error);
                return [];
            }
        }

        function saveAjustes() {
            saveAdjustmentsToStorage(ajustes);
        }

        function saveAdjustmentsToStorage(data) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (error) {
                console.warn('No se pudieron guardar los ajustes:', error);
            }
        }

        function collectAssignedAccounts() {
            const elements = document.querySelectorAll('.financial-groups-list .assigned-account');
            const seen = new Set();
            const accounts = [];

            elements.forEach((element) => {
                const code = element.dataset.accountCode || '';
                const name = element.dataset.accountName || element.textContent.trim() || '';
                const value = parseNumber(element.dataset.accountValue || element.querySelector('.account-value')?.textContent || '0');

                if (code && name && !seen.has(code)) {
                    seen.add(code);
                    accounts.push({
                        code,
                        name,
                        value,
                        type: 'account'
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

                        if (code && name && !seen.has(code) && code !== 'No hay cuentas disponibles') {
                            seen.add(code);
                            accounts.push({
                                code,
                                name,
                                value: preliminaryValue,
                                type: 'account'
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
    });
})();
