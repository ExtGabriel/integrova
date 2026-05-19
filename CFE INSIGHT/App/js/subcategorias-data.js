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
                // Intentar obtener desde localStorage
                const userData = localStorage.getItem('currentUser') || localStorage.getItem('auth_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    return user.id || user.user_id;
                }
                
                // Intentar obtener desde sessionStorage
                const sessionData = sessionStorage.getItem('userUI');
                if (sessionData) {
                    const user = JSON.parse(sessionData);
                    return user.id || user.user_id;
                }
                
                return null;
            } catch (error) {
                console.warn('Error obteniendo ID de usuario:', error);
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
        updateUI(categoria, subcategoria) {
            // Obtener el contenedor de la subcategoría
            const subcategoriaContent = document.getElementById(`${subcategoria}-content`);
            if (!subcategoriaContent) return;

            // Mostrar indicador de carga
            subcategoriaContent.innerHTML = '<div class="loading-indicator">Cargando...</div>';

            // Cargar datos y actualizar UI
            Promise.all([
                this.getSubfolders(categoria, subcategoria, false),
                this.getSubdocuments(categoria, subcategoria, false)
            ]).then(([subfolders, documents]) => {
                this.renderSubcategoriaContent(subcategoriaContent, subfolders, documents);
            }).catch(error => {
                console.error('Error cargando datos de subcategoría:', error);
                subcategoriaContent.innerHTML = '<div class="error-message">Error al cargar los datos</div>';
            });
        }

        // Renderizar contenido de subcategoría
        renderSubcategoriaContent(container, subfolders, documents) {
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

            const renderDocuments = (parentId) => {
                const list = docsByParent[parentId || rootKey] || [];
                if (!list.length) return '';
                let html = '<div class="documents-list">';
                list.forEach(doc => {
                    const icon = this.getDocumentIcon(doc.tipo);
                    html += `
                        <div class="document-row" data-id="${doc.id}">
                            <div class="document-row-main">
                                <i class="bi ${icon}"></i>
                                <span class="document-title">${doc.titulo}</span>
                                <span class="document-type">${doc.tipo}</span>
                            </div>
                            <div class="document-row-actions">
                                <button class="btn-view" onclick="viewSubdocument(${doc.id})" title="Ver"><i class="bi bi-eye"></i></button>
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

            const rootContent = `${renderFolders(null)}${renderDocuments(null)}`;

            container.innerHTML = rootContent || '<div class="empty-state">No hay elementos en esta subcategoría. Usa el menú + para agregar.</div>';
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
    }

    // Crear instancia global
    window.subcategoriasManager = new SubcategoriasDataManager();

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
