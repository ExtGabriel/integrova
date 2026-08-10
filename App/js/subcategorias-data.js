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

                // Obtener contexto actual de entidad y compromiso
                const entityId = window.commitmentDropdownState?.currentEntityId || document.getElementById('entidad')?.value || '';
                const commitmentId = window.commitmentDropdownState?.selectedCommitmentId || '';

                const response = await fetch(buildApiUrl('/api/subdocuments/save'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': this.userId,
                        'entity-id': entityId,
                        'commitment-id': commitmentId
                    },
                    body: JSON.stringify({
                        categoria,
                        subcategoria,
                        tipo,
                        titulo,
                        contenido,
                        metadata: {
                            ...metadata,
                            entity_id: entityId,
                            commitment_id: commitmentId
                        },
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

                // Obtener contexto actual de entidad y compromiso
                const entityId = window.commitmentDropdownState?.currentEntityId || document.getElementById('entidad')?.value || '';
                const commitmentId = window.commitmentDropdownState?.selectedCommitmentId || '';

                // Construir URL con parámetros de contexto
                let apiUrl = buildApiUrl(`/api/subdocuments/${categoria}/${subcategoria}`);
                const params = new URLSearchParams();
                if (entityId) params.append('entity_id', entityId);
                if (commitmentId) params.append('commitment_id', commitmentId);
                if (params.toString()) apiUrl += `?${params.toString()}`;

                const response = await fetch(apiUrl, {
                    headers: {
                        'user-id': this.userId,
                        'entity-id': entityId,
                        'commitment-id': commitmentId
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

        // Limpiar cache cuando cambia el contexto de entidad/compromiso
        clearContextCache() {
            console.log('🗑️ Limpiando cache de subdocumentos por cambio de contexto');
            this.cache.clear();
            
            // Recargar documentos visibles con el nuevo contexto
            this.reloadVisibleDocuments();
        }

        // Recargar documentos visibles con el nuevo contexto
        reloadVisibleDocuments() {
            console.log('🔄 Recargando documentos visibles con nuevo contexto...');
            
            // Mapeo de subcategorías a categorías (basado en la lógica de loadExistingSubcategories)
            const subcategoryToCategory = {
                // Planificación
                'configuracion': 'planificacion',
                'aceptacion': 'planificacion',
                'estrategia': 'planificacion',
                'discusiones': 'planificacion',
                'materialidad': 'planificacion',
                'revision-analitica': 'planificacion',
                'comprension-entidad': 'planificacion',
                // Evaluación
                'diseno-control': 'evaluacion',
                'areas-riesgo': 'evaluacion',
                'resumen-evaluacion': 'evaluacion',
                'procedimientos-evaluacion': 'evaluacion',
                // Respuesta
                'procedimientos-auditoria': 'respuesta',
                // Planes
                'incorr-identificadas': 'planes',
                'eval-evidencia': 'planes',
                'informes-direccion': 'planes',
                // Cierre
                'cierre-compromiso': 'cierre'
            };
            
            // Buscar todas las subcategorías visibles
            const visibleContents = document.querySelectorAll('[id$="-content"]');
            console.log(`🔍 Encontrados ${visibleContents.length} contenedores con -content`);
            
            visibleContents.forEach(content => {
                const subcategoria = content.id.replace('-content', '');
                const categoria = subcategoryToCategory[subcategoria] || 'planificacion';
                
                console.log(`🔄 Recargando documentos para ${categoria}/${subcategoria}`);
                this.updateUI(categoria, subcategoria);
            });
        }

        // Actualizar datos en la UI
        async updateUI(categoria, subcategoria) {
            try {
                console.log(`🔄 Actualizando UI para ${categoria}/${subcategoria}`);
                console.log('🔍 Parámetros recibidos:', { categoria, subcategoria });
                
                // Recargar subdocumentos
                const documents = await this.getSubdocuments(categoria, subcategoria, false);
                console.log('📄 Documentos recargados:', documents.length);
                
                // Actualizar contenedor de documentos si existe
                const documentContainer = document.getElementById(`documentContainer-${categoria}-${subcategoria}`);
                if (documentContainer) {
                    this.renderDocuments(documents, documentContainer);
                }
                
            } catch (error) {
                console.error('❌ Error actualizando UI:', error);
            }
        }

        // Renderizar documentos en el contenedor
        renderDocuments(documents, container) {
            if (!container) return;
            
            if (!documents || documents.length === 0) {
                container.innerHTML = '<p class="text-muted text-center py-3">No hay documentos disponibles</p>';
                return;
            }
            
            container.innerHTML = documents.map(doc => `
                <div class="document-item">
                    <div class="document-info">
                        <strong>${doc.titulo || 'Sin título'}</strong>
                        <small class="text-muted">${doc.tipo || 'documento'}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.subcategoriasManager.deleteDocument('${doc.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `).join('');
        }

        // Eliminar documento
        async deleteDocument(documentId) {
            try {
                if (!this.userId) {
                    throw new Error('Usuario no autenticado');
                }

                const response = await fetch(buildApiUrl(`/api/subdocuments/delete/${documentId}`), {
                    method: 'DELETE',
                    headers: {
                        'user-id': this.userId
                    }
                });

                const result = await parseJsonSafe(response);
                
                if (!result.success) {
                    throw new Error(result.error || 'Error al eliminar documento');
                }

                console.log('✅ Documento eliminado:', documentId);
                
                // Limpiar cache y recargar
                this.cache.clear();
                
                // Disparar evento de actualización
                window.dispatchEvent(new CustomEvent('subdocumentDeleted', {
                    detail: { documentId }
                }));
                
                return true;
                
            } catch (error) {
                console.error('❌ Error eliminando documento:', error);
                throw error;
            }
        }
    }

    // Exponer instancia global
    window.subcategoriasManager = new SubcategoriasDataManager();
    
    // Exponer función para limpiar cache por contexto
    window.clearSubdocumentContextCache = () => {
        if (window.subcategoriasManager) {
            window.subcategoriasManager.clearContextCache();
        }
    };
    
    console.log('✅ SubcategoriasDataManager inicializado');
})();