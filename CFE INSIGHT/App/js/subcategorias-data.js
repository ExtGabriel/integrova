(() => {
    // Sistema de gestión de datos para subcategorías
    const API_BASE = (window.API_BASE_URL || '').replace(/\/$/, '');

    function buildApiUrl(path) {
        return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    }

    async function parseJsonSafe(response) {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (err) {
            throw new Error(`Respuesta no JSON (status ${response.status}): ${text.slice(0, 200)}`);
        }
    }

    class SubcategoriasDataManager {
        constructor() {
            this.cache = new Map();
            this.userId = null;
            this.init();
        }

        async init() {
            // Obtener ID del usuario actual
            this.userId = await this.getCurrentUserId();
        }

        async getCurrentUserId() {
            try {
                console.log('🔍 Buscando ID de usuario en múltiples fuentes...');
                
                // 1. Intentar obtener desde window.currentUser (auth-guard)
                if (window.currentUser && window.currentUser.id) {
                    console.log('✅ ID de usuario encontrado en window.currentUser:', window.currentUser.id);
                    return window.currentUser.id;
                }
                
                // 2. Intentar obtener desde localStorage
                const userData = localStorage.getItem('currentUser') || localStorage.getItem('auth_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    const userId = user.id || user.user_id;
                    if (userId) {
                        console.log('✅ ID de usuario encontrado en localStorage:', userId);
                        return userId;
                    }
                }
                
                // 3. Intentar obtener desde sessionStorage
                const sessionData = sessionStorage.getItem('userUI');
                if (sessionData) {
                    const user = JSON.parse(sessionData);
                    const userId = user.id || user.user_id;
                    if (userId) {
                        console.log('✅ ID de usuario encontrado en sessionStorage:', userId);
                        return userId;
                    }
                }
                
                // 4. Intentar obtener desde la sesión de Supabase directamente
                if (window.getSupabaseSession) {
                    try {
                        const { data } = await window.getSupabaseSession();
                        if (data.session && data.session.user) {
                            const userId = data.session.user.id;
                            console.log('✅ ID de usuario encontrado en sesión Supabase:', userId);
                            return userId;
                        }
                    } catch (sessionErr) {
                        console.warn('⚠️ Error obteniendo sesión de Supabase:', sessionErr.message);
                    }
                }
                
                console.warn('❌ No se encontró ID de usuario en ninguna fuente');
                return null;
            } catch (error) {
                console.warn('❌ Error obteniendo ID de usuario:', error);
                return null;
            }
        }

        // Guardar subcarpeta
        async saveSubfolder(categoria, subcategoria, nombre, descripcion = '', parentFolderId = null) {
            try {
                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                const response = await fetch(buildApiUrl('/api/subfolders/save'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': this.userId
                    },
                    body: JSON.stringify({
                        categoria,
                        subcategoria,
                        nombre,
                        descripcion,
                        parent_folder_id: parentFolderId
                    })
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al guardar subcarpeta');
                }

                // Limpiar cache para forzar recarga
                this.cache.delete(`${categoria}/${subcategoria}/subfolders`);
                
                // Disparar evento para notificar cambios
                window.dispatchEvent(new CustomEvent('subfolderCreated', {
                    detail: {
                        categoria,
                        subcategoria,
                        subfolder: result.subfolder
                    }
                }));

                console.log('✅ Subcarpeta guardada:', result.subfolder);
                return result.subfolder;
                
            } catch (error) {
                console.error('❌ Error guardando subcarpeta:', error);
                throw error;
            }
        }

        // Guardar subdocumento
        async saveSubdocument(categoria, subcategoria, tipo, titulo, contenido = '', metadata = {}, parentFolderId = null) {
            try {
                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                const response = await fetch(buildApiUrl('/api/subdocuments/save'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': this.userId
                    },
                    body: JSON.stringify({
                        categoria,
                        subcategoria,
                        tipo,
                        titulo,
                        contenido,
                        metadata,
                        parent_folder_id: parentFolderId
                    })
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al guardar subdocumento');
                }

                // Limpiar cache para forzar recarga
                this.cache.delete(`${categoria}/${subcategoria}/documents`);
                
                // Actualizar UI inmediatamente
                console.log('🔄 Actualizando UI después de guardar documento...');
                this.updateUI(categoria, subcategoria);
                
                // Disparar evento para notificar cambios
                window.dispatchEvent(new CustomEvent('subdocumentCreated', {
                    detail: {
                        categoria,
                        subcategoria,
                        document: result.document
                    }
                }));

                console.log('✅ Subdocumento guardado:', result.document);
                return result.document;
                
            } catch (error) {
                console.error('❌ Error guardando subdocumento:', error);
                throw error;
            }
        }

        // Obtener subcarpetas
        async getSubfolders(categoria, subcategoria, useCache = true) {
            try {
                const cacheKey = `${categoria}/${subcategoria}/subfolders`;
                
                if (useCache && this.cache.has(cacheKey)) {
                    return this.cache.get(cacheKey);
                }

                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                const response = await fetch(buildApiUrl(`/api/subfolders/${categoria}/${subcategoria}`), {
                    headers: {
                        'user-id': this.userId
                    }
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al obtener subcarpetas');
                }

                const subfolders = result.subfolders || [];
                
                // Guardar en cache
                this.cache.set(cacheKey, subfolders);
                
                return subfolders;
                
            } catch (error) {
                console.error('❌ Error obteniendo subcarpetas:', error);
                return [];
            }
        }

        // Obtener subdocumentos
        async getSubdocuments(categoria, subcategoria, useCache = true) {
            try {
                const cacheKey = `${categoria}/${subcategoria}/documents`;
                
                if (useCache && this.cache.has(cacheKey)) {
                    return this.cache.get(cacheKey);
                }

                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                const response = await fetch(buildApiUrl(`/api/subdocuments/${categoria}/${subcategoria}`), {
                    headers: {
                        'user-id': this.userId
                    }
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al obtener subdocumentos');
                }

                const documents = result.documents || [];
                
                // Guardar en cache
                this.cache.set(cacheKey, documents);
                
                return documents;
                
            } catch (error) {
                console.error('❌ Error obteniendo subdocumentos:', error);
                return [];
            }
        }

        // Limpiar cache
        clearCache(categoria = null, subcategoria = null) {
            if (categoria && subcategoria) {
                this.cache.delete(`${categoria}/${subcategoria}/subfolders`);
                this.cache.delete(`${categoria}/${subcategoria}/documents`);
            } else {
                this.cache.clear();
            }
        }

        // Actualizar datos en la UI
        async updateUI(categoria, subcategoria) {
            try {
                console.log(`🔄 Actualizando UI para ${categoria}/${subcategoria}`);
                console.log('🔍 Parámetros recibidos:', { categoria, subcategoria });
                
                // Guardar referencia a la categoría y subcategoría actual
                this.currentCategory = categoria;
                this.currentSubcategory = subcategoria;
                console.log('✅ Estado actualizado:', { currentCategory: this.currentCategory, currentSubcategory: this.currentSubcategory });
                
                // Asegurarse de que tenemos userId
                if (!this.userId) {
                    console.log('🔍 userId no disponible, obteniendo...');
                    this.userId = await this.getCurrentUserId();
                }
                
                if (!this.userId) {
                    console.error('❌ No se pudo obtener ID de usuario para updateUI');
                    return;
                }
                
                console.log(`✅ userId disponible: ${this.userId}`);
                
                // Obtener el contenedor de la subcategoría
                const containerId = `${subcategoria}-content`;
                console.log('🔍 Buscando contenedor:', containerId);
                const subcategoriaContent = document.getElementById(containerId);
                if (!subcategoriaContent) {
                    console.warn(`⚠️ Contenedor no encontrado: ${containerId}`);
                    console.log('📋 Contenedores disponibles:', Array.from(document.querySelectorAll('[id$="-content"]')).map(el => el.id));
                    return;
                }
                console.log('✅ Contenedor encontrado:', containerId);

                // Guardar el contenido estático existente si es la primera carga
                const hasStaticContent = subcategoriaContent.querySelector('.form-item-lista');
                const staticContent = hasStaticContent ? subcategoriaContent.innerHTML : null;

                console.log(`🔍 Cargando datos para ${categoria}/${subcategoria} con userId: ${this.userId}`);

                // Cargar datos y actualizar UI
                console.log('🔍 Iniciando carga de datos...');
                const [subfolders, documents] = await Promise.all([
                    this.getSubfolders(categoria, subcategoria, false),
                    this.getSubdocuments(categoria, subcategoria, false)
                ]);
                
                console.log(`📊 Datos cargados: ${subfolders.length} carpetas, ${documents.length} documentos`);
                console.log('📄 Detalle de documentos:', documents.map(d => ({ id: d.id, titulo: d.titulo, tipo: d.tipo })));
                
                // Si hay contenido estático, restaurarlo primero
                if (staticContent) {
                    console.log('🔄 Restaurando contenido estático...');
                    subcategoriaContent.innerHTML = staticContent;
                }
                
                // Agregar contenido dinámico
                console.log('🎨 Renderizando contenido dinámico...');
                this.renderSubcategoriaContent(subcategoriaContent, subfolders, documents);
                console.log('✅ UI actualizada completamente');
                
            } catch (error) {
                console.error('❌ Error en updateUI:', error);
                const subcategoriaContent = document.getElementById(`${subcategoria}-content`);
                if (subcategoriaContent) {
                    const hasStaticContent = subcategoriaContent.querySelector('.form-item-lista');
                    const staticContent = hasStaticContent ? subcategoriaContent.innerHTML : null;
                    
                    if (staticContent) {
                        subcategoriaContent.innerHTML = staticContent;
                    } else {
                        subcategoriaContent.innerHTML = '<div class="error-message">Error al cargar los datos</div>';
                    }
                }
            }
        }

        // Renderizar contenido de subcategoría
        renderSubcategoriaContent(container, subfolders, documents) {
            console.log('🔍 renderSubcategoriaContent llamado con:', {
                subfolders: subfolders.length,
                documents: documents.length,
                containerId: container.id
            });
            
            console.log('📋 Subcarpetas:', subfolders);
            console.log('📄 Documentos:', documents);
            
            const rootKey = 'root';
            const foldersByParent = {};
            const docsByParent = {};

            subfolders.forEach(folder => {
                const key = folder.parent_folder_id || rootKey;
                if (!foldersByParent[key]) foldersByParent[key] = [];
                foldersByParent[key].push(folder);
            });

            documents.forEach(doc => {
                const key = doc.parent_folder_id || rootKey;
                if (!docsByParent[key]) docsByParent[key] = [];
                docsByParent[key].push(doc);
            });
            
            console.log('🗂️ Carpetas agrupadas por padre:', foldersByParent);
            console.log('📄 Documentos agrupados por padre:', docsByParent);

            const renderDocuments = (parentId) => {
                const list = docsByParent[parentId || rootKey] || [];
                if (!list.length) return '';
                let html = '<div class="documents-list">';
                list.forEach(doc => {
                    const icon = this.getDocumentIcon(doc.tipo);
                    html += `
                        <div class="document-row" data-id="${doc.id}">
                            <div class="document-row-main" onclick="viewSubdocument(${doc.id})" style="cursor: pointer;">
                                <i class="bi ${icon}"></i>
                                <span class="document-title">${doc.titulo}</span>
                                <span class="document-type">${doc.tipo}</span>
                            </div>
                            <div class="document-row-actions">
                                <button class="btn-edit" onclick="editSubdocument(${doc.id})" title="Editar"><i class="bi bi-pencil"></i></button>
                                <button class="btn-delete" onclick="deleteSubdocument(${doc.id})" title="Eliminar"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>`;
                });
                html += '</div>';
                return html;
            };

            const renderFolders = (parentId) => {
                const list = foldersByParent[parentId || rootKey] || [];
                if (!list.length) return '';
                let html = '<div class="folder-list">';
                list.forEach(folder => {
                    const menuId = `folder-menu-${folder.id}`;
                    html += `
                        <div class="folder-block" data-id="${folder.id}">
                            <div class="folder-block-header">
                                <div class="folder-heading">
                                    <i class="bi bi-folder-fill"></i>
                                    <div class="folder-title">${folder.nombre}</div>
                                </div>
                                <div class="folder-block-actions">
                                    <i class="bi bi-plus-circle" onclick="togglePlusMenu(event, '${menuId}')"></i>
                                    <i class="bi bi-trash" onclick="deleteSubfolder(${folder.id}, '${folder.nombre}')" title="Eliminar carpeta" style="color: #dc2626; cursor: pointer;"></i>
                                    <div class="plus-dropdown-content" id="${menuId}">
                                        <a href="#" onclick="openSubFolderModal(event, '${folder.subcategoria}', ${folder.id})"><i class="bi bi-folder"></i> Subcarpeta</a>
                                        <a href="#" onclick="openSubDocumentModal(event, 'hoja-trabajo', '${folder.subcategoria}', ${folder.id})"><i class="bi bi-grid-3x3"></i> Hoja de trabajo</a>
                                        <a href="#" onclick="openSubDocumentModal(event, 'word', '${folder.subcategoria}', ${folder.id})"><i class="bi bi-file-word"></i> Word</a>
                                        <a href="#" onclick="openSubDocumentModal(event, 'excel', '${folder.subcategoria}', ${folder.id})"><i class="bi bi-file-excel"></i> Excel</a>
                                        <a href="#" onclick="openSubDocumentModal(event, 'carta', '${folder.subcategoria}', ${folder.id})"><i class="bi bi-envelope"></i> Carta</a>
                                        <a href="#" onclick="openSubDocumentModal(event, 'memorandum', '${folder.subcategoria}', ${folder.id})"><i class="bi bi-file-text"></i> Memorándum</a>
                                        <a href="#" onclick="openSubDocumentModal(event, 'lista-verificacion', '${folder.subcategoria}', ${folder.id})"><i class="bi bi-check-square"></i> Lista de verificación</a>
                                        <a href="#" onclick="openSubDocumentModal(event, 'enlace', '${folder.subcategoria}', ${folder.id})"><i class="bi bi-link"></i> Enlace</a>
                                    </div>
                                </div>
                            </div>
                            ${folder.descripcion ? `<div class="folder-description">${folder.descripcion}</div>` : ''}
                            <div class="folder-children">
                                ${renderDocuments(folder.id)}
                                ${renderFolders(folder.id)}
                            </div>
                        </div>`;
                });
                html += '</div>';
                return html;
            };

            const rootHtml = `${renderFolders(null)}${renderDocuments(null)}`.trim();

            // Buscar o crear contenedor dinámico dedicado
            let dynamicContainer = container.querySelector('.dynamic-subcategory-content');
            if (!dynamicContainer) {
                dynamicContainer = document.createElement('div');
                dynamicContainer.className = 'dynamic-subcategory-content';
                container.appendChild(dynamicContainer);
            }

            if (rootHtml) {
                dynamicContainer.innerHTML = rootHtml;
            } else {
                dynamicContainer.innerHTML = '';
            }
        }

        // Obtener ícono según tipo de documento
        getDocumentIcon(tipo) {
            const iconMap = {
                'carta': 'bi-envelope',
                'memorandum': 'bi-file-text',
                'hoja-trabajo': 'bi-file-earmark-spreadsheet',
                'analisis': 'bi-graph-up',
                'lista-verificacion': 'bi-check-square',
                'estados-financieros': 'bi-currency-dollar',
                'word': 'bi-file-word',
                'excel': 'bi-file-excel',
                'enlace': 'bi-link'
            };
            
            return iconMap[tipo] || 'bi-file-earmark';
        }

        // Eliminar subcarpeta
        async deleteSubfolder(folderId, folderName) {
            try {
                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                // Confirmación
                if (!confirm(`¿Estás seguro de que quieres eliminar la carpeta "${folderName}" y todo su contenido? Esta acción no se puede deshacer.`)) {
                    return;
                }

                const response = await fetch(buildApiUrl('/api/subfolders/delete'), {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': this.userId
                    },
                    body: JSON.stringify({ folderId })
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al eliminar subcarpeta');
                }

                // Limpiar cache
                this.cache.delete(`${this.currentCategory}/${this.currentSubcategory}/subfolders`);
                
                console.log('✅ Subcarpeta eliminada:', folderName);
                
                // Disparar evento para notificar cambios
                window.dispatchEvent(new CustomEvent('subfolderDeleted', {
                    detail: { folderId, folderName }
                }));

                // Actualizar UI
                const folderElement = document.querySelector(`[data-id="${folderId}"]`);
                if (folderElement) {
                    folderElement.remove();
                    console.log('🗑️ Elemento de carpeta eliminado del DOM');
                }
                
                if (this.currentCategory && this.currentSubcategory) {
                    setTimeout(() => {
                        this.updateUI(this.currentCategory, this.currentSubcategory);
                    }, 100);
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ Error eliminando subcarpeta:', error);
                throw error;
            }
        }

        // Eliminar subdocumento
        async deleteSubdocument(documentId, documentTitle) {
            try {
                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                if (!confirm(`¿Estás seguro de que quieres eliminar el documento "${documentTitle}"? Esta acción no se puede deshacer.`)) {
                    return;
                }

                const response = await fetch(buildApiUrl('/api/subdocuments/delete'), {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': this.userId
                    },
                    body: JSON.stringify({ documentId })
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al eliminar subdocumento');
                }

                this.cache.delete(`${this.currentCategory}/${this.currentSubcategory}/documents`);
                
                console.log('✅ Subdocumento eliminado:', documentTitle);
                
                window.dispatchEvent(new CustomEvent('subdocumentDeleted', {
                    detail: { documentId, documentTitle }
                }));

                const documentElement = document.querySelector(`.document-row[data-id="${documentId}"]`);
                if (documentElement) {
                    documentElement.remove();
                    console.log('🗑️ Elemento de documento eliminado del DOM');
                }
                
                if (this.currentCategory && this.currentSubcategory) {
                    setTimeout(() => {
                        this.updateUI(this.currentCategory, this.currentSubcategory);
                    }, 100);
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ Error eliminando subdocumento:', error);
                throw error;
            }
        }

        // Obtener un subdocumento por ID
        async getSubdocument(documentId) {
            try {
                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                const response = await fetch(buildApiUrl('/api/subdocuments/get'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': this.userId
                    },
                    body: JSON.stringify({ documentId })
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al obtener subdocumento');
                }
                
                return result.document;
                
            } catch (error) {
                console.error('❌ Error obteniendo subdocumento:', error);
                throw error;
            }
        }

        // Actualizar subdocumento
        async updateSubdocument(documentId, titulo, contenido, metadata, category = null, subcategory = null) {
            try {
                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                const response = await fetch(buildApiUrl('/api/subdocuments/update'), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': this.userId
                    },
                    body: JSON.stringify({
                        documentId,
                        titulo,
                        contenido,
                        metadata
                    })
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al actualizar subdocumento');
                }

                // Usar la categoría y subcategoría proporcionadas o las actuales
                const targetCategory = category || this.currentCategory || 'planificacion';
                const targetSubcategory = subcategory || this.currentSubcategory || 'configuracion';
                
                console.log('📍 Usando categoría/subcategoría:', { targetCategory, targetSubcategory });
                
                // Limpiar cache
                this.cache.delete(`${targetCategory}/${targetSubcategory}/documents`);
                
                console.log('✅ Subdocumento actualizado:', titulo);
                
                // Disparar evento para notificar cambios
                window.dispatchEvent(new CustomEvent('subdocumentUpdated', {
                    detail: { documentId, titulo, document: result.document, category: targetCategory, subcategory: targetSubcategory }
                }));

                // Actualizar UI inmediatamente
                console.log('� Actualizando UI después de editar documento...');
                console.log('📝 Actualizando con:', { targetCategory, targetSubcategory });
                
                // Forzar actualización de la UI
                this.updateUI(targetCategory, targetSubcategory);
                
                // Disparar evento adicional para asegurar actualización
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('forceUIUpdate', {
                        detail: { category: this.currentCategory, subcategory: this.currentSubcategory }
                    }));
                }, 100);
                
                return result.document;
                
            } catch (error) {
                console.error('❌ Error actualizando subdocumento:', error);
                throw error;
            }
        }
    }

    window.subcategoriasManager = new SubcategoriasDataManager();

    window.deleteSubfolder = async (folderId, folderName) => {
        try {
            await window.subcategoriasManager.deleteSubfolder(folderId, folderName);
        } catch (error) {
            console.error('Error al eliminar carpeta:', error);
            alert('Error al eliminar la carpeta: ' + error.message);
        }
    };

    window.deleteSubdocument = async (documentId, documentTitle) => {
        try {
            await window.subcategoriasManager.deleteSubdocument(documentId, documentTitle);
        } catch (error) {
            console.error('Error al eliminar documento:', error);
            alert('Error al eliminar el documento: ' + error.message);
        }
    };

    window.viewSubdocument = async (docId) => {
        try {
            console.log('👁️ Iniciando vista de documento:', docId);
            
            // Obtener datos del documento
            const docData = await window.subcategoriasManager.getSubdocument(docId);
            console.log('📄 Datos del documento obtenidos:', docData);
            
            // Si es una hoja de trabajo, redirigir a la página especializada
            if (docData.tipo === 'hoja-trabajo') {
                console.log('🔄 Redirigiendo a página de hojas de trabajo...');
                window.location.href = 'hojas-trabajo.html';
                return;
            }
            
            // Para otros tipos de documentos, aquí podrías implementar la lógica de visualización
            console.log('📄 Visualizando documento de tipo:', docData.tipo);
            // TODO: Implementar visualización para otros tipos de documentos
            
        } catch (error) {
            console.error('❌ Error al ver documento:', error);
            console.error('📍 Stack trace:', error.stack);
            alert('Error al ver el documento: ' + error.message);
        }
    };

    window.editSubdocument = async (docId) => {
        try {
            console.log('🔧 Iniciando edición de documento:', docId);
            
            // Obtener datos del documento
            const docData = await window.subcategoriasManager.getSubdocument(docId);
            console.log('📄 Datos del documento obtenidos:', docData);
            
            // Si es una hoja de trabajo, redirigir a la página especializada
            if (docData.tipo === 'hoja-trabajo') {
                console.log('🔄 Redirigiendo a página de hojas de trabajo para editar...');
                window.location.href = 'hojas-trabajo.html';
                return;
            }
            
            // Abrir modal con los datos del documento
            openEditDocumentModal(docData);
            
        } catch (error) {
            console.error('❌ Error al editar documento:', error);
            console.error('📍 Stack trace:', error.stack);
            alert('Error al editar el documento: ' + error.message);
        }
    };

    // Hacer togglePlusMenu disponible globalmente (con posicionamiento corregido)
    window.togglePlusMenu = function(event, menuId) {
        event.stopPropagation();
        
        // Cerrar todos los menús dropdown
        const allMenus = document.querySelectorAll('.plus-dropdown-content');
        if (allMenus && allMenus.forEach) {
            allMenus.forEach(menu => {
                menu.classList.remove('show');
            });
        }
        
        // Toggle del menú actual
        const menu = document.getElementById(menuId);
        if (!menu) {
            console.warn('⚠️ Menú no encontrado:', menuId);
            return;
        }
        
        const isVisible = menu.classList.contains('show');
        if (isVisible) {
            menu.classList.remove('show');
            return;
        }

        menu.classList.add('show');

        let button = event.target.closest('.subcategoria-plus-icon, .categoria-plus-icon');

        // Manejar el caso en que el botón está dentro del dropdown (carpetas recién creadas)
        if (!button && event.currentTarget && event.currentTarget.classList) {
            button = event.currentTarget.closest('.subcategoria-plus-icon, .categoria-plus-icon');
        }
        if (!button) {
            button = event.target.closest('.folder-block-actions i');
        }
        if (!button) {
            return;
        }

        const rect = button.getBoundingClientRect();
        const menuWidth = menu.offsetWidth || 220;
        const menuHeight = menu.offsetHeight || 260;

        let left = rect.left;
        let top = rect.bottom + 5;

        // Asegurar que el menú no se salga horizontalmente de la ventana
        if (left + menuWidth > window.innerWidth - 12) {
            left = Math.max(12, rect.right - menuWidth);
        }
        if (left < 12) {
            left = 12;
        }

        // Asegurar que el menú no se salga verticalmente de la ventana
        if (top + menuHeight > window.innerHeight - 12) {
            top = Math.max(12, rect.top - menuHeight - 5);
        }
        if (top < 12) {
            top = 12;
        }

        menu.style.position = 'fixed';
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.zIndex = '1000';
    };
    console.log('✅ togglePlusMenu definido globalmente con posicionamiento corregido');

    // Funciones de depuración para consola
    window.debugSubcategories = {
        // Verificar estado del manager
        checkManager: () => {
            console.log('🔍 Estado del SubcategoriasDataManager:');
            console.log('- Manager disponible:', !!window.subcategoriasManager);
            console.log('- User ID:', window.subcategoriasManager?.userId);
            console.log('- Cache size:', window.subcategoriasManager?.cache?.size);
            return window.subcategoriasManager;
        },

        // Forzar carga de una subcategoría específica
        loadSubcategory: async (categoria = 'planificacion', subcategoria = 'configuracion') => {
            console.log(`🔄 Forzando carga de ${categoria}/${subcategoria}`);
            try {
                const subfolders = await window.subcategoriasManager.getSubfolders(categoria, subcategoria, false);
                const documents = await window.subcategoriasManager.getSubdocuments(categoria, subcategoria, false);
                console.log('✅ Subcarpetas encontradas:', subfolders);
                console.log('✅ Documentos encontrados:', documents);
                
                // Forzar actualización UI
                window.subcategoriasManager.updateUI(categoria, subcategoria);
                return { subfolders, documents };
            } catch (error) {
                console.error('❌ Error cargando subcategoría:', error);
                return null;
            }
        },

        // Verificar contenedores DOM
        checkContainers: () => {
            const containers = ['configuracion-content', 'aceptacion-content', 'estrategia-content'];
            containers.forEach(id => {
                const container = document.getElementById(id);
                console.log(`📂 Contenedor ${id}:`, {
                    existe: !!container,
                    hijos: container?.children?.length || 0,
                    contenido: container?.innerHTML?.substring(0, 100) + '...'
                });
            });
        },

        // Verificar API directamente
        testAPI: async (categoria = 'planificacion', subcategoria = 'configuracion') => {
            console.log(`🌐 Probando API para ${categoria}/${subcategoria}`);
            try {
                const response = await fetch(`${(window.API_BASE_URL || '').replace(/\/$/, '')}/api/subfolders/${categoria}/${subcategoria}`, {
                    headers: { 'user-id': window.subcategoriasManager.userId }
                });
                const result = await response.json();
                console.log('📊 Respuesta API:', result);
                return result;
            } catch (error) {
                console.error('❌ Error API:', error);
                return null;
            }
        },

        // Limpiar y recargar todo
        fullReset: async () => {
            console.log('🔄 Reset completo del sistema');
            window.subcategoriasManager.clearCache();
            await window.subcategoriasManager.init();
            await window.loadExistingSubcategories?.();
        }
    };

    // Escuchar eventos de creación para actualizar UI automáticamente
    window.addEventListener('subfolderCreated', (event) => {
        const { categoria, subcategoria } = event.detail;
        // Solo refrescar subcategorías; si subcategoria==categoria es una carpeta de nivel categoría y no debemos sustituir la UI estática
        if (subcategoria && categoria && subcategoria !== categoria) {
            window.subcategoriasManager.updateUI(categoria, subcategoria);
        }
    });

    window.addEventListener('subdocumentCreated', (event) => {
        const { categoria, subcategoria } = event.detail;
        window.subcategoriasManager.updateUI(categoria, subcategoria);
    });

})();
