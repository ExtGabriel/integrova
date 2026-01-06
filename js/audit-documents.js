/**
 * AUDIT DOCUMENTS MANAGER
 * Maneja la subida, listado y eliminación de documentos de auditoría
 */

const AUDIT_API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.NEXT_PUBLIC_API_BASE_URL)) ||
    (typeof process !== 'undefined' && (process.env?.VITE_API_BASE_URL || process.env?.NEXT_PUBLIC_API_BASE_URL)) ||
    (typeof window !== 'undefined' ? window.location.origin : '');

class AuditDocumentsManager {
    constructor(commitmentId, formId = null) {
        this.commitmentId = commitmentId;
        this.formId = formId;
        this.currentUser = getCurrentSession();
        this.documents = [];
        this.sections = [];
        this.currentSection = null;
    }

    /**
     * Inicializar el componente de documentos
     */
    async initialize(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        // Crear HTML del componente
        container.innerHTML = this.getComponentHTML();

        // Configurar event listeners
        this.setupEventListeners();

        // Cargar secciones
        this.loadSections();

        // Cargar documentos existentes
        await this.loadDocuments();
    }

    /**
     * Generar HTML del componente
     */
    getComponentHTML() {
        return `
            <div class="audit-documents-section">
                <div class="section-header-container">
                    <h4 class="section-title">
                        <i class="bi bi-file-earmark-text"></i>
                        Planes y Procedimientos de Auditoría
                    </h4>
                    <button type="button" class="btn btn-success btn-sm" onclick="auditDocs.showAddSectionModal()">
                        <i class="bi bi-plus-square"></i> Agregar Sección
                    </button>
                </div>

                <!-- Selector de sección -->
                <div class="section-selector mt-3" id="sectionSelector" style="display: none;">
                    <label class="form-label fw-bold">
                        <i class="bi bi-folder-check"></i> Subir archivos a la sección:
                    </label>
                    <select class="form-select form-select-lg" id="sectionSelect">
                        <option value="">📄 Sin sección específica</option>
                    </select>
                    <small class="text-muted d-block mt-1">
                        Los archivos se organizarán en la sección que selecciones
                    </small>
                </div>
                
                <!-- Área de subida de archivos -->
                <div class="upload-area" id="uploadArea">
                    <div class="upload-content">
                        <i class="bi bi-cloud-upload upload-icon"></i>
                        <p class="upload-text">Arrastra archivos aquí o haz clic para seleccionar</p>
                        <p class="upload-hint">PDF, Word, Excel, imágenes (máx. 50MB)</p>
                        <input type="file" id="fileInput" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt" style="display: none;">
                        <button type="button" class="btn btn-primary btn-sm mt-2" onclick="document.getElementById('fileInput').click()">
                            <i class="bi bi-plus-circle"></i> Seleccionar Archivos
                        </button>
                    </div>
                </div>

                <!-- Barra de progreso -->
                <div id="uploadProgress" class="upload-progress" style="display: none;">
                    <div class="progress">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
                    </div>
                    <small class="progress-text">Subiendo archivo...</small>
                </div>

                <!-- Lista de documentos -->
                <div class="documents-list mt-3">
                    <h5 class="documents-title">Documentos (<span id="documentCount">0</span>)</h5>
                    <div id="documentsList" class="list-group">
                        <p class="text-muted text-center py-3">No hay documentos subidos</p>
                    </div>
                </div>

                <!-- Modal para agregar sección -->
                <div id="addSectionModal" class="audit-modal-overlay" style="display: none;">
                    <div class="modal-dialog-custom">
                        <div class="modal-header-custom">
                            <h5><i class="bi bi-folder-plus"></i> Nueva Sección</h5>
                            <button class="btn-close-custom" onclick="auditDocs.closeAddSectionModal()">&times;</button>
                        </div>
                        <div class="modal-body-custom">
                            <label class="form-label">Título de la Sección</label>
                            <input type="text" class="form-control" id="sectionTitleInput" placeholder="Ej: Procedimientos de Control Interno">
                        </div>
                        <div class="modal-footer-custom">
                            <button class="btn btn-secondary" onclick="auditDocs.closeAddSectionModal()">Cancelar</button>
                            <button class="btn btn-primary" onclick="auditDocs.createSection()">Crear Sección</button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .audit-documents-section {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                }

                .section-title {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-size: 1.2rem;
                    font-weight: 600;
                }

                .upload-area {
                    border: 2px dashed #cbd5e0;
                    border-radius: 8px;
                    padding: 30px;
                    text-align: center;
                    background: white;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .upload-area:hover {
                    border-color: #4a90e2;
                    background: #f0f7ff;
                }

                .upload-area.drag-over {
                    border-color: #4a90e2;
                    background: #e3f2fd;
                    border-style: solid;
                }

                .upload-icon {
                    font-size: 3rem;
                    color: #4a90e2;
                    margin-bottom: 10px;
                }

                .upload-text {
                    font-size: 1.1rem;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }

                .upload-hint {
                    font-size: 0.9rem;
                    color: #718096;
                }

                .upload-progress {
                    margin-top: 15px;
                }

                .progress {
                    height: 25px;
                    border-radius: 5px;
                }

                .progress-text {
                    display: block;
                    text-align: center;
                    margin-top: 5px;
                    color: #4a90e2;
                }

                .documents-title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 10px;
                }

                .document-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 15px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    transition: all 0.2s ease;
                }

                .document-item:hover {
                    background: #f7fafc;
                    border-color: #cbd5e0;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .document-info {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .document-icon {
                    font-size: 1.8rem;
                    color: #4a90e2;
                }

                .document-details {
                    flex: 1;
                }

                .document-name {
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 2px;
                }

                .document-meta {
                    font-size: 0.85rem;
                    color: #718096;
                }

                .document-actions {
                    display: flex;
                    gap: 8px;
                }

                .btn-icon {
                    padding: 6px 12px;
                    border-radius: 5px;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-download {
                    background: #4a90e2;
                    color: white;
                }

                .btn-download:hover {
                    background: #357abd;
                }

                .btn-delete {
                    background: #e53e3e;
                    color: white;
                }

                .btn-delete:hover {
                    background: #c53030;
                }

                .section-header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .section-header-container .btn {
                    padding: 8px 16px;
                    font-size: 0.9rem;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .section-header-container .btn-success {
                    background: #28a745;
                    color: white;
                }

                .section-header-container .btn-success:hover {
                    background: #218838;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 5px rgba(40, 167, 69, 0.3);
                }

                .section-selector {
                    background: #e8f4fd;
                    border: 2px solid #4a90e2;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                }

                .form-select {
                    padding: 10px 15px;
                    border: 2px solid #cbd5e0;
                    border-radius: 6px;
                    font-size: 1rem;
                    width: 100%;
                    max-width: 100%;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .form-select:focus {
                    border-color: #4a90e2;
                    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
                    outline: none;
                }

                .form-select-lg {
                    font-size: 1.05rem;
                    padding: 12px 16px;
                }

                .form-label {
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 10px;
                    display: block;
                    font-size: 1rem;
                }

                .audit-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }

                .modal-dialog-custom {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }

                .modal-header-custom {
                    padding: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header-custom h5 {
                    margin: 0;
                    color: #2c3e50;
                    font-weight: 600;
                }

                .btn-close-custom {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #718096;
                }

                .btn-close-custom:hover {
                    color: #2c3e50;
                }

                .modal-body-custom {
                    padding: 20px;
                }

                .modal-footer-custom {
                    padding: 15px 20px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                .section-container {
                    margin-bottom: 25px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 15px;
                    background: white;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #4a90e2;
                }

                .section-title-text {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #2c3e50;
                }

                .section-count {
                    font-size: 0.85rem;
                    color: #718096;
                    margin-left: 10px;
                }

                .btn-delete-section {
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    transition: all 0.2s ease;
                }

                .btn-delete-section:hover {
                    background: #c82333;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 5px rgba(220, 53, 69, 0.3);
                }

                .modal-footer-custom .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                }

                .modal-footer-custom .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .modal-footer-custom .btn-secondary:hover {
                    background: #5a6268;
                }

                .modal-footer-custom .btn-primary {
                    background: #007bff;
                    color: white;
                }

                .modal-footer-custom .btn-primary:hover {
                    background: #0056b3;
                }
            </style>
        `;
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            await this.uploadFiles(files);
        });

        // Click to select files
        uploadArea.addEventListener('click', (e) => {
            if (e.target.id !== 'fileInput' && !e.target.closest('button')) {
                fileInput.click();
            }
        });

        // File input change
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            await this.uploadFiles(files);
            fileInput.value = ''; // Reset input
        });
    }

    /**
     * Subir archivos
     */
    async uploadFiles(files) {
        if (!files || files.length === 0) return;

        const progressBar = document.querySelector('#uploadProgress .progress-bar');
        const progressText = document.querySelector('#uploadProgress .progress-text');
        const progressContainer = document.getElementById('uploadProgress');

        progressContainer.style.display = 'block';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = Math.round(((i + 1) / files.length) * 100);

            progressBar.style.width = `${progress}%`;
            progressText.textContent = `Subiendo ${file.name}... (${i + 1}/${files.length})`;

            try {
                await this.uploadFile(file);
            } catch (error) {
                console.error(`Error al subir ${file.name}:`, error);
                // Mostrar mensaje de error más amigable
                const errorMsg = error.message || 'Error desconocido';
                alert(`❌ Error al subir "${file.name}":\n\n${errorMsg}\n\nPor favor, verifica que:\n• El servidor esté en ejecución (puerto 3001)\n• El archivo no supere el tamaño máximo (50MB)\n• Tengas los permisos necesarios`);
                // No detener el proceso, continuar con el siguiente archivo
            }
        }

        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';

        // Recargar lista de documentos
        await this.loadDocuments();
    }

    /**
     * Subir un archivo individual
     */
    async uploadFile(file) {
        try {
            // Validar que el usuario existe
            if (!this.currentUser || !this.currentUser.id) {
                throw new Error('No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente.');
            }

            // Validar que el commitmentId existe
            if (!this.commitmentId) {
                throw new Error('No se pudo obtener el ID del compromiso.');
            }

            const formData = new FormData();
            formData.append('document', file);
            formData.append('commitment_id', this.commitmentId);
            formData.append('user_id', this.currentUser.id);
            formData.append('category', 'planes_procedimientos');

            // Agregar sección seleccionada si existe
            const sectionSelect = document.getElementById('sectionSelect');
            if (sectionSelect) {
                const selectedValue = sectionSelect.value;
                console.log('🔍 Sección seleccionada:', selectedValue || 'Sin sección específica');

                if (selectedValue) {
                    formData.append('description', selectedValue);
                    console.log('✅ Agregando documento a la sección:', selectedValue);
                } else {
                    console.log('⚠️ No se seleccionó ninguna sección, el documento irá a "Sin Sección"');
                }
            }

            if (this.formId) {
                formData.append('form_id', this.formId);
            }

            const response = await fetch(`${AUDIT_API_BASE_URL}/api/audit/documents/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let errorMessage = 'Error al subir archivo';
                try {
                    const error = await response.json();
                    errorMessage = error.error || error.message || errorMessage;
                } catch (e) {
                    // Si no se puede parsear el JSON, usar mensaje por defecto
                    errorMessage = `Error del servidor (${response.status}): ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('✅ Archivo subido exitosamente. Datos guardados:', {
                nombre: result.data?.document_name,
                description: result.data?.description,
                id: result.data?.id
            });
            return result;
        } catch (error) {
            // Si es un error de red
            if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
                throw new Error('No se pudo conectar al servidor. Verifica que el servidor esté en ejecución.');
            }
            // Re-lanzar el error para que sea manejado por uploadFiles
            throw error;
        }
    }

    /**
     * Cargar documentos existentes
     */
    async loadDocuments() {
        try {
            const url = this.formId
                ? `${AUDIT_API_BASE_URL}/api/audit/documents/form/${this.formId}`
                : `${AUDIT_API_BASE_URL}/api/audit/documents/commitment/${this.commitmentId}?category=planes_procedimientos`;

            const response = await fetch(url);

            if (!response.ok) {
                console.error(`Error al cargar documentos: ${response.status} ${response.statusText}`);
                // Si es error 500, mostrar mensaje pero no detener la UI
                if (response.status === 500) {
                    console.warn('Error del servidor al cargar documentos. Mostrando lista vacía.');
                    this.documents = [];
                    this.renderDocuments();
                    return;
                }
            }

            const result = await response.json();

            if (result.success) {
                this.documents = result.data || [];
                console.log('📥 Documentos cargados desde servidor:', this.documents.map(d => ({
                    nombre: d.document_name,
                    description: d.description,
                    id: d.id
                })));
                // Derivar secciones dinámicamente desde documentos existentes
                this.deriveSectionsFromDocuments();
                this.renderDocuments();
            } else {
                console.error('Error en respuesta:', result.error);
                this.documents = [];
                this.renderDocuments();
            }
        } catch (error) {
            console.error('Error al cargar documentos:', error);
            // Mostrar lista vacía en caso de error
            this.documents = [];
            this.renderDocuments();
        }
    }

    /**
     * Derivar secciones desde documentos (usa 'description' como ID)
     */
    deriveSectionsFromDocuments() {
        const uniqueIds = new Set();
        const sections = [];
        this.documents.forEach(doc => {
            const id = doc.description;
            if (id && !uniqueIds.has(id)) {
                uniqueIds.add(id);
                const short = String(id).slice(0, 8);
                sections.push({ id, title: `Sección ${short}` });
            }
        });
        this.sections = sections;
        this.updateSectionSelector();
    }

    /**
     * Renderizar lista de documentos
     */
    renderDocuments() {
        const documentsList = document.getElementById('documentsList');
        const documentCount = document.getElementById('documentCount');

        documentCount.textContent = this.documents.length;

        if (this.documents.length === 0) {
            documentsList.innerHTML = '<p class="text-muted text-center py-3">No hay documentos subidos</p>';
            return;
        }

        // Agrupar documentos por sección
        const documentsBySec = {};
        const docsWithoutSection = [];

        console.log('📊 Renderizando documentos:', {
            totalDocumentos: this.documents.length,
            totalSecciones: this.sections.length,
            secciones: this.sections.map(s => ({ id: s.id, title: s.title }))
        });

        this.documents.forEach(doc => {
            const sectionId = doc.description;
            console.log('📄 Procesando documento:', {
                nombre: doc.document_name,
                sectionId: sectionId,
                existeSeccion: sectionId ? this.sections.some(s => s.id === sectionId) : false
            });

            if (sectionId && this.sections.some(s => s.id === sectionId)) {
                if (!documentsBySec[sectionId]) {
                    documentsBySec[sectionId] = [];
                }
                documentsBySec[sectionId].push(doc);
            } else {
                docsWithoutSection.push(doc);
            }
        });

        let html = '';

        // Renderizar documentos por sección
        this.sections.forEach(section => {
            const docs = documentsBySec[section.id] || [];
            html += `
                <div class="section-container">
                    <div class="section-header">
                        <div>
                            <span class="section-title-text">
                                <i class="bi bi-folder"></i> ${section.title}
                            </span>
                            <span class="section-count">(${docs.length})</span>
                        </div>
                        <button class="btn-delete-section" onclick="auditDocs.deleteSection('${section.id}')" title="Eliminar sección">
                            <i class="bi bi-trash"></i> Eliminar Sección
                        </button>
                    </div>
                    ${docs.length > 0 ? docs.map(doc => this.renderDocumentItem(doc)).join('') : '<p class="text-muted text-center py-2">No hay documentos en esta sección</p>'}
                </div>
            `;
        });

        // Renderizar documentos sin sección
        if (docsWithoutSection.length > 0) {
            html += `
                <div class="section-container">
                    <div class="section-header">
                        <div>
                            <span class="section-title-text">
                                <i class="bi bi-file-earmark"></i> Sin Sección
                            </span>
                            <span class="section-count">(${docsWithoutSection.length})</span>
                        </div>
                    </div>
                    ${docsWithoutSection.map(doc => this.renderDocumentItem(doc)).join('')}
                </div>
            `;
        }

        documentsList.innerHTML = html;
    }

    /**
     * Renderizar un item de documento
     */
    renderDocumentItem(doc) {
        return `
            <div class="document-item">
                <div class="document-info">
                    <i class="bi ${this.getFileIcon(doc.document_type)} document-icon"></i>
                    <div class="document-details">
                        <div class="document-name">${doc.document_name}</div>
                        <div class="document-meta">
                            ${this.formatFileSize(doc.file_size)} • 
                            ${new Date(doc.created_at).toLocaleDateString('es-ES')}
                        </div>
                    </div>
                </div>
                <div class="document-actions">
                    <button class="btn-icon btn-download" onclick="auditDocs.downloadDocument('${doc.id}')" title="Descargar">
                        <i class="bi bi-download"></i>
                    </button>
                    ${doc.uploaded_by === this.currentUser.id ? `
                        <button class="btn-icon btn-delete" onclick="auditDocs.deleteDocument('${doc.id}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Obtener ícono según tipo de archivo
     */
    getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) return 'bi-file-pdf-fill';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'bi-file-word-fill';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bi-file-excel-fill';
        if (mimeType.includes('image')) return 'bi-file-image-fill';
        if (mimeType.includes('text')) return 'bi-file-text-fill';
        return 'bi-file-earmark-fill';
    }

    /**
     * Formatear tamaño de archivo
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Descargar documento
     */
    async downloadDocument(documentId) {
        try {
            window.open(`${AUDIT_API_BASE_URL}/api/audit/documents/download/${documentId}`, '_blank');
        } catch (error) {
            console.error('Error al descargar documento:', error);
            alert('Error al descargar el documento');
        }
    }

    /**
     * Eliminar documento
     */
    async deleteDocument(documentId) {
        // Validar que documentId existe y no está vacío
        if (!documentId || documentId === 'undefined' || documentId === 'null') {
            console.error('ID de documento inválido:', documentId);
            return;
        }

        if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) {
            return;
        }

        try {
            const response = await fetch(
                `${AUDIT_API_BASE_URL}/api/audit/documents/${documentId}?user_id=${this.currentUser.id}`,
                { method: 'DELETE' }
            );

            const result = await response.json();

            if (result.success) {
                alert('Documento eliminado exitosamente');
                await this.loadDocuments();
            } else {
                alert('Error al eliminar documento: ' + result.error);
            }
        } catch (error) {
            console.error('Error al eliminar documento:', error);
            alert('Error al eliminar el documento');
        }
    }

    /**
     * Mostrar modal para agregar sección
     */
    showAddSectionModal() {
        const modal = document.getElementById('addSectionModal');
        modal.style.display = 'flex';
        document.getElementById('sectionTitleInput').value = '';
        document.getElementById('sectionTitleInput').focus();
    }

    /**
     * Cerrar modal de agregar sección
     */
    closeAddSectionModal() {
        const modal = document.getElementById('addSectionModal');
        modal.style.display = 'none';
    }

    /**
     * Crear nueva sección
     */
    createSection() {
        const titleInput = document.getElementById('sectionTitleInput');
        const title = titleInput.value.trim();

        if (!title) {
            alert('Por favor ingresa un título para la sección');
            return;
        }

        // Verificar si ya existe una sección con ese nombre
        if (this.sections.some(s => s.title.toLowerCase() === title.toLowerCase())) {
            alert('Ya existe una sección con ese nombre');
            return;
        }

        // Crear nueva sección
        const section = {
            id: Date.now().toString(),
            title: title,
            created_at: new Date().toISOString()
        };

        this.sections.push(section);
        this.saveSections();
        this.updateSectionSelector();

        // Seleccionar automáticamente la nueva sección
        const select = document.getElementById('sectionSelect');
        if (select) {
            select.value = section.id;
            console.log('✅ Nueva sección creada y seleccionada:', title);
        }

        this.closeAddSectionModal();
        this.renderDocuments();

        alert(`Sección "${title}" creada exitosamente. Ahora puedes subir archivos a esta sección.`);
    }

    /**
     * Guardar secciones (persistencia deshabilitada)
     * Nota: Evitamos localStorage para mantener consistencia entre equipos.
     * Las secciones creadas se mantienen sólo en memoria durante la sesión.
     */
    saveSections() {
        // No-op: persistencia local deshabilitada
        return;
    }

    /**
     * Cargar secciones (persistencia deshabilitada)
     * Mantener lista vacía hasta que el usuario cree nuevas secciones en sesión.
     */
    loadSections() {
        this.sections = [];
        this.updateSectionSelector();
    }

    /**
     * Actualizar selector de secciones
     */
    updateSectionSelector() {
        const selectorContainer = document.getElementById('sectionSelector');
        const select = document.getElementById('sectionSelect');

        if (this.sections.length > 0) {
            selectorContainer.style.display = 'block';
            select.innerHTML = '<option value="">📄 Sin sección específica</option>';
            this.sections.forEach(section => {
                const option = document.createElement('option');
                option.value = section.id;
                option.textContent = `📁 ${section.title}`;
                select.appendChild(option);
            });

            // Si solo hay una sección, seleccionarla automáticamente
            if (this.sections.length === 1) {
                select.value = this.sections[0].id;
                console.log('✅ Solo hay una sección, seleccionada automáticamente:', this.sections[0].title);
            }
        } else {
            selectorContainer.style.display = 'none';
        }
    }

    /**
     * Eliminar sección
     */
    deleteSection(sectionId) {
        const section = this.sections.find(s => s.id === sectionId);
        if (!section) return;

        // Verificar si hay documentos en esta sección
        const docsInSection = this.documents.filter(d => d.description === sectionId);
        if (docsInSection.length > 0) {
            if (!confirm(`La sección "${section.title}" tiene ${docsInSection.length} documento(s). ¿Deseas eliminarla de todos modos? Los documentos quedarán sin sección.`)) {
                return;
            }
        } else {
            if (!confirm(`¿Estás seguro de que deseas eliminar la sección "${section.title}"?`)) {
                return;
            }
        }

        this.sections = this.sections.filter(s => s.id !== sectionId);
        this.saveSections();
        this.updateSectionSelector();
        this.renderDocuments();
    }
}

// Variable global para instancia
let auditDocs = null;

/**
 * Inicializar componente de documentos
 * @param {string} containerId - ID del contenedor donde se renderizará el componente
 * @param {number} commitmentId - ID del compromiso
 * @param {string|null} formId - ID del formulario (opcional)
 */
async function initAuditDocuments(containerId, commitmentId, formId = null) {
    auditDocs = new AuditDocumentsManager(commitmentId, formId);
    await auditDocs.initialize(containerId);
}
