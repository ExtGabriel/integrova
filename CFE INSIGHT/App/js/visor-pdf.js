/**
 * Visor de PDF con anotaciones - INTEGROVA
 * Permite ver PDFs y dibujar anotaciones (pluma, resaltador, círculos, flechas, texto)
 * Las anotaciones se guardan en Supabase y se pueden exportar al PDF
 */

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Estado del visor
const viewerState = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    documentId: null,
    documentPath: null,
    documentName: '',
    
    // Herramienta actual
    currentTool: 'pen',
    currentColor: '#ff0000',
    strokeWidth: 4,
    
    // Estado de dibujo
    isDrawing: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    
    // Anotaciones por página
    annotations: {}, // { pageNum: [annotation, ...] }
    currentPath: [],
    
    // Historial para undo/redo
    history: [],
    historyIndex: -1,
    
    // Auto-guardado
    saveTimeout: null,
    hasUnsavedChanges: false
};

// Referencias a elementos DOM
let pdfCanvas, annotationCanvas, pdfCtx, annotCtx;
let pageWrapper, canvasContainer;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Inicializando visor de PDF...');
    
    // Usar protectPage para asegurar autenticación y cargar usuario
    if (typeof window.protectPage === 'function') {
        window.protectPage(initViewer);
    } else {
        // Fallback si auth-guard no está disponible
        console.warn('⚠️ protectPage no disponible, intentando inicializar directamente...');
        setTimeout(initViewer, 500);
    }
});

async function initViewer() {
    console.log('🔍 Usuario autenticado, cargando visor...');
    
    // Obtener referencias DOM
    pdfCanvas = document.getElementById('pdfCanvas');
    annotationCanvas = document.getElementById('annotationCanvas');
    pdfCtx = pdfCanvas.getContext('2d');
    annotCtx = annotationCanvas.getContext('2d');
    pageWrapper = document.getElementById('pageWrapper');
    canvasContainer = document.getElementById('canvasContainer');
    
    // Configurar eventos del canvas de anotaciones
    setupAnnotationEvents();
    
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    viewerState.documentId = urlParams.get('id');
    viewerState.documentPath = urlParams.get('path');
    viewerState.documentName = urlParams.get('name') || 'Documento';
    
    document.getElementById('documentTitle').textContent = viewerState.documentName;
    
    if (!viewerState.documentId && !viewerState.documentPath) {
        showNotification('No se especificó ningún documento', 'error');
        hideLoading();
        return;
    }
    
    try {
        // Cargar el PDF
        await loadPDF();
        
        // Cargar anotaciones existentes
        await loadAnnotations();
        
        hideLoading();
    } catch (error) {
        console.error('Error inicializando visor:', error);
        showNotification('Error al cargar el documento: ' + error.message, 'error');
        hideLoading();
    }
}

// Cargar PDF
async function loadPDF() {
    showLoading('Cargando documento...');
    
    const authHeaders = {
        'user-id': window.currentUser?.id || 'anonymous'
    };
    
    let pdfData;
    
    if (viewerState.documentId) {
        // Descargar el archivo con autenticación y pasarlo a PDF.js como bytes
        const response = await window.authenticatedFetch(
            `${getApiBaseUrl()}/api/subdocuments/download/${viewerState.documentId}`,
            { headers: authHeaders }
        );
        
        if (!response.ok) {
            let errorMsg = 'No se pudo obtener el archivo';
            try {
                const result = await response.json();
                errorMsg = result.error || errorMsg;
            } catch (e) { /* respuesta no es JSON */ }
            throw new Error(errorMsg);
        }
        
        pdfData = await response.arrayBuffer();
    } else {
        // Obtener URL firmada del archivo en Storage
        const response = await window.authenticatedFetch(
            `${getApiBaseUrl()}/api/formularios/attachment?path=${encodeURIComponent(viewerState.documentPath)}`,
            { headers: authHeaders }
        );
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'No se pudo obtener el archivo');
        }
        
        const pdfResponse = await fetch(result.url);
        pdfData = await pdfResponse.arrayBuffer();
    }
    
    console.log('📄 PDF cargado:', pdfData.byteLength, 'bytes');
    
    // Cargar con PDF.js desde los bytes descargados
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    viewerState.pdfDoc = await loadingTask.promise;
    viewerState.totalPages = viewerState.pdfDoc.numPages;
    
    document.getElementById('totalPages').textContent = viewerState.totalPages;
    document.getElementById('pageInput').max = viewerState.totalPages;
    
    // Renderizar primera página
    await renderPage(1);
    
    // Ajustar al ancho inicial
    fitToWidth();
}

// Renderizar página
async function renderPage(pageNum) {
    if (!viewerState.pdfDoc) return;
    
    viewerState.currentPage = pageNum;
    document.getElementById('pageInput').value = pageNum;
    
    // Actualizar botones de navegación
    document.getElementById('prevPage').disabled = pageNum <= 1;
    document.getElementById('nextPage').disabled = pageNum >= viewerState.totalPages;
    
    const page = await viewerState.pdfDoc.getPage(pageNum);
    
    // Guardar dimensiones originales de la página (a escala 1.0)
    const originalViewport = page.getViewport({ scale: 1.0 });
    viewerState.pageWidth = originalViewport.width;
    viewerState.pageHeight = originalViewport.height;
    
    const viewport = page.getViewport({ scale: viewerState.scale });
    
    // Configurar canvas del PDF
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    
    // Configurar canvas de anotaciones
    annotationCanvas.width = viewport.width;
    annotationCanvas.height = viewport.height;
    
    // Ajustar wrapper
    pageWrapper.style.width = viewport.width + 'px';
    pageWrapper.style.height = viewport.height + 'px';
    
    // Renderizar PDF
    const renderContext = {
        canvasContext: pdfCtx,
        viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Redibujar anotaciones de esta página
    redrawAnnotations();
}

// Configurar eventos del canvas de anotaciones
function setupAnnotationEvents() {
    annotationCanvas.addEventListener('mousedown', handleMouseDown);
    annotationCanvas.addEventListener('mousemove', handleMouseMove);
    annotationCanvas.addEventListener('mouseup', handleMouseUp);
    annotationCanvas.addEventListener('mouseleave', handleMouseUp);
    
    // Touch events para tablets
    annotationCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    annotationCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    annotationCanvas.addEventListener('touchend', handleTouchEnd);
}

// Obtener coordenadas del canvas (en píxeles del canvas actual)
function getCanvasCoordinates(e) {
    const rect = annotationCanvas.getBoundingClientRect();
    const scaleX = annotationCanvas.width / rect.width;
    const scaleY = annotationCanvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Convertir coordenadas de canvas a normalizadas (0-1)
function canvasToNormalized(x, y) {
    return {
        x: x / (viewerState.pageWidth * viewerState.scale),
        y: y / (viewerState.pageHeight * viewerState.scale)
    };
}

// Convertir coordenadas normalizadas a canvas
function normalizedToCanvas(x, y) {
    return {
        x: x * viewerState.pageWidth * viewerState.scale,
        y: y * viewerState.pageHeight * viewerState.scale
    };
}

// Convertir path completo a normalizado
function pathToNormalized(path) {
    return path.map(p => canvasToNormalized(p.x, p.y));
}

// Convertir path normalizado a canvas
function pathToCanvas(path) {
    return path.map(p => normalizedToCanvas(p.x, p.y));
}

function handleMouseDown(e) {
    if (viewerState.currentTool === 'select') return;
    
    const coords = getCanvasCoordinates(e);
    viewerState.isDrawing = true;
    viewerState.startX = coords.x;
    viewerState.startY = coords.y;
    viewerState.lastX = coords.x;
    viewerState.lastY = coords.y;
    viewerState.currentPath = [{ x: coords.x, y: coords.y }];
    
    if (viewerState.currentTool === 'text') {
        showTextInput(coords.x, coords.y);
        viewerState.isDrawing = false;
    }
}

function handleMouseMove(e) {
    if (!viewerState.isDrawing) return;
    
    const coords = getCanvasCoordinates(e);
    
    switch (viewerState.currentTool) {
        case 'pen':
        case 'highlighter':
            drawFreehand(coords.x, coords.y);
            break;
        case 'underline':
            drawUnderlinePreview(coords.x, coords.y);
            break;
        case 'circle':
        case 'rectangle':
        case 'arrow':
            drawShapePreview(coords.x, coords.y);
            break;
        case 'eraser':
            eraseAt(coords.x, coords.y);
            break;
    }
    
    viewerState.lastX = coords.x;
    viewerState.lastY = coords.y;
}

function handleMouseUp(e) {
    if (!viewerState.isDrawing) return;
    
    viewerState.isDrawing = false;
    
    if (viewerState.currentTool === 'eraser') return;
    
    const coords = e.type === 'mouseleave' ? 
        { x: viewerState.lastX, y: viewerState.lastY } : 
        getCanvasCoordinates(e);
    
    // Guardar anotación
    saveCurrentAnnotation(coords);
}

// Touch handlers
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleMouseDown(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleMouseMove(mouseEvent);
}

function handleTouchEnd(e) {
    const mouseEvent = new MouseEvent('mouseup', {});
    handleMouseUp(mouseEvent);
}

// Dibujo de trazo libre (pluma/resaltador)
function drawFreehand(x, y) {
    viewerState.currentPath.push({ x, y });
    
    annotCtx.beginPath();
    annotCtx.moveTo(viewerState.lastX, viewerState.lastY);
    annotCtx.lineTo(x, y);
    annotCtx.strokeStyle = viewerState.currentColor;
    annotCtx.lineWidth = viewerState.strokeWidth;
    annotCtx.lineCap = 'round';
    annotCtx.lineJoin = 'round';
    
    if (viewerState.currentTool === 'highlighter') {
        annotCtx.globalAlpha = 0.3;
        annotCtx.lineWidth = viewerState.strokeWidth * 4;
    } else {
        annotCtx.globalAlpha = 1;
    }
    
    annotCtx.stroke();
    annotCtx.globalAlpha = 1;
}

// Preview de subrayado
function drawUnderlinePreview(x, y) {
    redrawAnnotations();
    
    annotCtx.beginPath();
    annotCtx.moveTo(viewerState.startX, viewerState.startY);
    annotCtx.lineTo(x, viewerState.startY);
    annotCtx.strokeStyle = viewerState.currentColor;
    annotCtx.lineWidth = viewerState.strokeWidth;
    annotCtx.stroke();
}

// Preview de formas
function drawShapePreview(x, y) {
    redrawAnnotations();
    
    annotCtx.strokeStyle = viewerState.currentColor;
    annotCtx.lineWidth = viewerState.strokeWidth;
    annotCtx.lineCap = 'round';
    
    const width = x - viewerState.startX;
    const height = y - viewerState.startY;
    
    switch (viewerState.currentTool) {
        case 'circle':
            const radiusX = Math.abs(width) / 2;
            const radiusY = Math.abs(height) / 2;
            const centerX = viewerState.startX + width / 2;
            const centerY = viewerState.startY + height / 2;
            
            annotCtx.beginPath();
            annotCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            annotCtx.stroke();
            break;
            
        case 'rectangle':
            annotCtx.beginPath();
            annotCtx.rect(viewerState.startX, viewerState.startY, width, height);
            annotCtx.stroke();
            break;
            
        case 'arrow':
            drawArrow(viewerState.startX, viewerState.startY, x, y);
            break;
    }
}

// Dibujar flecha
function drawArrow(fromX, fromY, toX, toY) {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    annotCtx.beginPath();
    annotCtx.moveTo(fromX, fromY);
    annotCtx.lineTo(toX, toY);
    annotCtx.stroke();
    
    // Punta de flecha
    annotCtx.beginPath();
    annotCtx.moveTo(toX, toY);
    annotCtx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    annotCtx.moveTo(toX, toY);
    annotCtx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    annotCtx.stroke();
}

// Borrador (trabaja con coordenadas normalizadas)
function eraseAt(x, y) {
    // Convertir posición del borrador a normalizada
    const normPos = canvasToNormalized(x, y);
    const eraserSize = 0.03; // 3% del tamaño de la página
    
    const pageAnnotations = viewerState.annotations[viewerState.currentPage] || [];
    
    viewerState.annotations[viewerState.currentPage] = pageAnnotations.filter(ann => {
        if (ann.type === 'freehand' || ann.type === 'highlighter') {
            // Verificar si algún punto del trazo está cerca del borrador
            return !ann.path.some(point => 
                Math.abs(point.x - normPos.x) < eraserSize && Math.abs(point.y - normPos.y) < eraserSize
            );
        } else if (ann.type === 'text') {
            return !(Math.abs(ann.x - normPos.x) < eraserSize && Math.abs(ann.y - normPos.y) < eraserSize);
        } else {
            // Para formas, verificar si el punto está dentro del bounding box
            const bounds = getAnnotationBounds(ann);
            return !(normPos.x >= bounds.x - eraserSize && normPos.x <= bounds.x + bounds.width + eraserSize &&
                     normPos.y >= bounds.y - eraserSize && normPos.y <= bounds.y + bounds.height + eraserSize);
        }
    });
    
    redrawAnnotations();
    markUnsaved();
}

function getAnnotationBounds(ann) {
    // Bounds en coordenadas normalizadas
    switch (ann.type) {
        case 'circle':
        case 'rectangle':
            return {
                x: Math.min(ann.startX, ann.endX),
                y: Math.min(ann.startY, ann.endY),
                width: Math.abs(ann.endX - ann.startX),
                height: Math.abs(ann.endY - ann.startY)
            };
        case 'arrow':
        case 'underline':
            return {
                x: Math.min(ann.startX, ann.endX),
                y: Math.min(ann.startY, ann.endY),
                width: Math.abs(ann.endX - ann.startX),
                height: Math.abs(ann.endY - ann.startY) || 0.02
            };
        default:
            return { x: 0, y: 0, width: 0, height: 0 };
    }
}

// Guardar anotación actual (con coordenadas normalizadas)
function saveCurrentAnnotation(endCoords) {
    const pageNum = viewerState.currentPage;
    
    if (!viewerState.annotations[pageNum]) {
        viewerState.annotations[pageNum] = [];
    }
    
    let annotation = {
        type: viewerState.currentTool,
        color: viewerState.currentColor,
        strokeWidth: viewerState.strokeWidth,
        timestamp: Date.now()
    };
    
    // Convertir coordenadas a normalizadas para que sean independientes del zoom
    const startNorm = canvasToNormalized(viewerState.startX, viewerState.startY);
    const endNorm = canvasToNormalized(endCoords.x, endCoords.y);
    
    switch (viewerState.currentTool) {
        case 'pen':
        case 'highlighter':
            if (viewerState.currentPath.length < 2) return;
            annotation.type = viewerState.currentTool === 'highlighter' ? 'highlighter' : 'freehand';
            annotation.path = pathToNormalized(viewerState.currentPath);
            break;
            
        case 'underline':
            annotation.startX = startNorm.x;
            annotation.startY = startNorm.y;
            annotation.endX = endNorm.x;
            annotation.endY = startNorm.y; // Mantener Y igual para subrayado horizontal
            break;
            
        case 'circle':
        case 'rectangle':
        case 'arrow':
            annotation.startX = startNorm.x;
            annotation.startY = startNorm.y;
            annotation.endX = endNorm.x;
            annotation.endY = endNorm.y;
            break;
    }
    
    viewerState.annotations[pageNum].push(annotation);
    
    // Agregar al historial
    addToHistory({
        action: 'add',
        pageNum: pageNum,
        annotation: annotation
    });
    
    markUnsaved();
}

// Input de texto
function showTextInput(x, y) {
    const overlay = document.getElementById('textInputOverlay');
    const input = document.getElementById('textInput');
    
    const rect = annotationCanvas.getBoundingClientRect();
    const scaleX = rect.width / annotationCanvas.width;
    const scaleY = rect.height / annotationCanvas.height;
    
    overlay.style.left = (x * scaleX) + 'px';
    overlay.style.top = (y * scaleY) + 'px';
    overlay.classList.add('active');
    
    input.value = '';
    input.focus();
    
    input.dataset.x = x;
    input.dataset.y = y;
}

function handleTextInput(e) {
    if (e.key === 'Enter') {
        const input = document.getElementById('textInput');
        const text = input.value.trim();
        
        if (text) {
            const canvasX = parseFloat(input.dataset.x);
            const canvasY = parseFloat(input.dataset.y);
            
            // Convertir a coordenadas normalizadas
            const normPos = canvasToNormalized(canvasX, canvasY);
            
            const annotation = {
                type: 'text',
                text: text,
                x: normPos.x,
                y: normPos.y,
                color: viewerState.currentColor,
                fontSize: viewerState.strokeWidth * 4,
                timestamp: Date.now()
            };
            
            const pageNum = viewerState.currentPage;
            if (!viewerState.annotations[pageNum]) {
                viewerState.annotations[pageNum] = [];
            }
            viewerState.annotations[pageNum].push(annotation);
            
            addToHistory({
                action: 'add',
                pageNum: pageNum,
                annotation: annotation
            });
            
            redrawAnnotations();
            markUnsaved();
        }
        
        document.getElementById('textInputOverlay').classList.remove('active');
    } else if (e.key === 'Escape') {
        document.getElementById('textInputOverlay').classList.remove('active');
    }
}

// Redibujar todas las anotaciones de la página actual
// Las anotaciones están en coordenadas normalizadas (0-1), se convierten a canvas
function redrawAnnotations() {
    annotCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
    
    const pageAnnotations = viewerState.annotations[viewerState.currentPage] || [];
    
    pageAnnotations.forEach(ann => {
        annotCtx.strokeStyle = ann.color;
        annotCtx.fillStyle = ann.color;
        annotCtx.lineWidth = ann.strokeWidth || viewerState.strokeWidth;
        annotCtx.lineCap = 'round';
        annotCtx.lineJoin = 'round';
        
        // Convertir coordenadas normalizadas a canvas
        let start, end;
        if (ann.startX !== undefined) {
            start = normalizedToCanvas(ann.startX, ann.startY);
            end = normalizedToCanvas(ann.endX, ann.endY);
        }
        
        switch (ann.type) {
            case 'freehand':
                annotCtx.globalAlpha = 1;
                drawPathNormalized(ann.path);
                break;
                
            case 'highlighter':
                annotCtx.globalAlpha = 0.3;
                annotCtx.lineWidth = (ann.strokeWidth || viewerState.strokeWidth) * 4;
                drawPathNormalized(ann.path);
                annotCtx.globalAlpha = 1;
                break;
                
            case 'underline':
                annotCtx.beginPath();
                annotCtx.moveTo(start.x, start.y);
                annotCtx.lineTo(end.x, end.y);
                annotCtx.stroke();
                break;
                
            case 'circle':
                const width = end.x - start.x;
                const height = end.y - start.y;
                const radiusX = Math.abs(width) / 2;
                const radiusY = Math.abs(height) / 2;
                const centerX = start.x + width / 2;
                const centerY = start.y + height / 2;
                
                annotCtx.beginPath();
                annotCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                annotCtx.stroke();
                break;
                
            case 'rectangle':
                annotCtx.beginPath();
                annotCtx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
                annotCtx.stroke();
                break;
                
            case 'arrow':
                drawArrow(start.x, start.y, end.x, end.y);
                break;
                
            case 'text':
                const textPos = normalizedToCanvas(ann.x, ann.y);
                annotCtx.font = `${ann.fontSize || 16}px Arial`;
                annotCtx.fillText(ann.text, textPos.x, textPos.y);
                break;
        }
    });
}

// Dibujar path desde coordenadas normalizadas
function drawPathNormalized(path) {
    if (!path || path.length < 2) return;
    
    const canvasPath = pathToCanvas(path);
    
    annotCtx.beginPath();
    annotCtx.moveTo(canvasPath[0].x, canvasPath[0].y);
    
    for (let i = 1; i < canvasPath.length; i++) {
        annotCtx.lineTo(canvasPath[i].x, canvasPath[i].y);
    }
    
    annotCtx.stroke();
}

// Historial (undo/redo)
function addToHistory(action) {
    // Eliminar acciones futuras si estamos en medio del historial
    viewerState.history = viewerState.history.slice(0, viewerState.historyIndex + 1);
    viewerState.history.push(action);
    viewerState.historyIndex = viewerState.history.length - 1;
    
    // Limitar tamaño del historial
    if (viewerState.history.length > 50) {
        viewerState.history.shift();
        viewerState.historyIndex--;
    }
}

function undoAnnotation() {
    if (viewerState.historyIndex < 0) return;
    
    const action = viewerState.history[viewerState.historyIndex];
    
    if (action.action === 'add') {
        // Remover la anotación
        const pageAnnotations = viewerState.annotations[action.pageNum] || [];
        const index = pageAnnotations.findIndex(a => a.timestamp === action.annotation.timestamp);
        if (index !== -1) {
            pageAnnotations.splice(index, 1);
        }
    }
    
    viewerState.historyIndex--;
    redrawAnnotations();
    markUnsaved();
}

function redoAnnotation() {
    if (viewerState.historyIndex >= viewerState.history.length - 1) return;
    
    viewerState.historyIndex++;
    const action = viewerState.history[viewerState.historyIndex];
    
    if (action.action === 'add') {
        if (!viewerState.annotations[action.pageNum]) {
            viewerState.annotations[action.pageNum] = [];
        }
        viewerState.annotations[action.pageNum].push(action.annotation);
    }
    
    redrawAnnotations();
    markUnsaved();
}

function clearAllAnnotations() {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las anotaciones de esta página?')) {
        return;
    }
    
    viewerState.annotations[viewerState.currentPage] = [];
    redrawAnnotations();
    markUnsaved();
    showNotification('Anotaciones eliminadas', 'info');
}

// Herramientas
function setTool(tool) {
    viewerState.currentTool = tool;
    
    // Actualizar UI
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tool' + tool.charAt(0).toUpperCase() + tool.slice(1))?.classList.add('active');
    
    // Cambiar cursor
    annotationCanvas.className = '';
    if (tool === 'pen') annotationCanvas.classList.add('cursor-pen');
    else if (tool === 'highlighter') annotationCanvas.classList.add('cursor-highlighter');
    else if (tool === 'eraser') annotationCanvas.classList.add('cursor-eraser');
}

function setColor(color) {
    viewerState.currentColor = color;
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
}

function setStrokeWidth(width) {
    viewerState.strokeWidth = width;
    
    document.querySelectorAll('.stroke-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.width) === width);
    });
}

// Navegación
function prevPage() {
    if (viewerState.currentPage > 1) {
        renderPage(viewerState.currentPage - 1);
    }
}

function nextPage() {
    if (viewerState.currentPage < viewerState.totalPages) {
        renderPage(viewerState.currentPage + 1);
    }
}

function goToPage(pageNum) {
    const page = parseInt(pageNum);
    if (page >= 1 && page <= viewerState.totalPages) {
        renderPage(page);
    }
}

// Zoom
function zoomIn() {
    viewerState.scale = Math.min(viewerState.scale + 0.25, 3);
    updateZoom();
}

function zoomOut() {
    viewerState.scale = Math.max(viewerState.scale - 0.25, 0.5);
    updateZoom();
}

function fitToWidth() {
    if (!viewerState.pdfDoc) return;
    
    viewerState.pdfDoc.getPage(viewerState.currentPage).then(page => {
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = canvasContainer.clientWidth - 40;
        viewerState.scale = containerWidth / viewport.width;
        updateZoom();
    });
}

function updateZoom() {
    document.getElementById('zoomLevel').textContent = Math.round(viewerState.scale * 100) + '%';
    renderPage(viewerState.currentPage);
}

// Guardar/Cargar anotaciones
async function saveAnnotations() {
    if (!viewerState.documentId && !viewerState.documentPath) return;
    
    updateSaveStatus('saving');
    
    try {
        const response = await window.authenticatedFetch(`${getApiBaseUrl()}/api/pdf-annotations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': window.currentUser?.id || 'anonymous'
            },
            body: JSON.stringify({
                documentId: viewerState.documentId,
                documentPath: viewerState.documentPath,
                annotations: viewerState.annotations
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            viewerState.hasUnsavedChanges = false;
            updateSaveStatus('saved');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error guardando anotaciones:', error);
        updateSaveStatus('error');
        showNotification('Error al guardar anotaciones', 'error');
    }
}

async function loadAnnotations() {
    if (!viewerState.documentId && !viewerState.documentPath) return;
    
    try {
        const params = new URLSearchParams();
        if (viewerState.documentId) params.set('documentId', viewerState.documentId);
        if (viewerState.documentPath) params.set('documentPath', viewerState.documentPath);
        
        const response = await window.authenticatedFetch(`${getApiBaseUrl()}/api/pdf-annotations?${params.toString()}`, {
            headers: {
                'user-id': window.currentUser?.id || 'anonymous'
            }
        });
        const result = await response.json();
        
        if (result.success && result.annotations) {
            viewerState.annotations = result.annotations;
            redrawAnnotations();
            console.log('✅ Anotaciones cargadas:', Object.keys(viewerState.annotations).length, 'páginas');
        }
    } catch (error) {
        console.error('Error cargando anotaciones:', error);
    }
}

function markUnsaved() {
    viewerState.hasUnsavedChanges = true;
    updateSaveStatus('unsaved');
    
    // Auto-guardar después de 2 segundos de inactividad
    clearTimeout(viewerState.saveTimeout);
    viewerState.saveTimeout = setTimeout(() => {
        saveAnnotations();
    }, 2000);
}

function updateSaveStatus(status) {
    const el = document.getElementById('saveStatus');
    el.className = 'save-status ' + status;
    
    switch (status) {
        case 'saved':
            el.innerHTML = '<i class="bi bi-cloud-check"></i> Guardado';
            break;
        case 'saving':
            el.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Guardando...';
            break;
        case 'unsaved':
            el.innerHTML = '<i class="bi bi-cloud"></i> Sin guardar';
            break;
        case 'error':
            el.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Error';
            break;
    }
}

// Exportar PDF con anotaciones
async function exportPDF() {
    showLoading('Exportando PDF con anotaciones...');
    
    try {
        const response = await window.authenticatedFetch(`${getApiBaseUrl()}/api/pdf-annotations/export`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': window.currentUser?.id || 'anonymous'
            },
            body: JSON.stringify({
                documentId: viewerState.documentId,
                documentPath: viewerState.documentPath,
                annotations: viewerState.annotations
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al exportar PDF');
        }
        
        // Descargar el PDF
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = viewerState.documentName.replace(/\.pdf$/i, '') + '_anotado.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        hideLoading();
        showNotification('PDF exportado correctamente', 'success');
    } catch (error) {
        console.error('Error exportando PDF:', error);
        hideLoading();
        showNotification('Error al exportar PDF: ' + error.message, 'error');
    }
}

// Utilidades
function showLoading(text = 'Cargando...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.querySelector('.loading-text').textContent = text;
    overlay.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification ' + type + ' show';
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function goBack() {
    if (viewerState.hasUnsavedChanges) {
        if (!confirm('Tienes cambios sin guardar. ¿Deseas salir de todos modos?')) {
            return;
        }
    }
    
    window.history.back();
}

// Obtener URL base de la API
function getApiBaseUrl() {
    if (typeof window.APP_CONFIG !== 'undefined' && window.APP_CONFIG.API_BASE_URL) {
        return window.APP_CONFIG.API_BASE_URL;
    }
    return window.location.origin;
}

// Atajos de teclado
document.addEventListener('keydown', function(e) {
    // Ctrl+Z = Deshacer
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoAnnotation();
    }
    // Ctrl+Y = Rehacer
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redoAnnotation();
    }
    // Ctrl+S = Guardar
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveAnnotations();
    }
    // Escape = Seleccionar
    if (e.key === 'Escape') {
        setTool('select');
    }
    // P = Pluma
    if (e.key === 'p' && !e.ctrlKey) {
        setTool('pen');
    }
    // H = Resaltador
    if (e.key === 'h' && !e.ctrlKey) {
        setTool('highlighter');
    }
    // E = Borrador
    if (e.key === 'e' && !e.ctrlKey) {
        setTool('eraser');
    }
});

// Guardar antes de cerrar
window.addEventListener('beforeunload', function(e) {
    if (viewerState.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});
