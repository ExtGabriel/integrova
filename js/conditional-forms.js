/**
 * Sistema de Formularios Condicionales
 * Maneja la visualización dinámica de formularios relacionados según las respuestas
 */

// Configuración de relaciones entre preguntas y formularios
const FORM_RELATIONSHIPS = {
    // A100 - Pregunta 1: ¿Qué nivel de colaboración en línea es aplicable para este cliente?
    'q1_colaboracion': {
        'alto': ['A200Q', 'A205', 'A205L', 'A345Q', 'A350', 'A350L', 'B200Q', 'B300Q', 'D500Q', 'D540Q', 'D545L', 'D630Q'],
        'limitado': ['A345Q', 'A350', 'A350L', 'C105Q', 'D630Q'],
        'ninguno': [] // Sin formularios relacionados
    },

    // A100 - Pregunta 2: ¿Usar solo el sistema de consultas?
    'q2_consultas': {
        'si': [], // OCULTAR: A200, A300, A400, A500, B100, B200, B300, B400, B450, C100, D100, D200, D500, D600
        'no': ['C145']
    },

    // A100 - Pregunta 3: ¿Usar analítica integrada?
    'q3_analitica': {
        'si': ['B020', 'B030', 'B031', 'C145'],
        'no': ['C145']
    },

    // A100 - Pregunta 4: ¿Es este un compromiso de primer año o un compromiso de continuación?
    'q4_tipo': {
        'primer_año': ['C145'],
        'continuacion': ['C145']
    },

    // A200 - Pregunta sobre factores de riesgo
    'q7_factores_riesgo': {
        'si': ['A330'],
        'no': [],
        'na': []
    },

    // A200 - Pregunta sobre auditoría de grupo
    'q8_auditoria_grupo': {
        'si': ['A600'],
        'no': [],
        'na': []
    },

    // A200 - Pregunta sobre auditores de componente
    'q9_auditores_componente': {
        'si': ['A400'],
        'no': [],
        'na': []
    },

    // A300 - Pregunta sobre factores de auditoría
    'factores_auditoria': {
        'sin_excepciones': [],
        'con_excepciones': ['A360'],
        'na': []
    },

    // B400 - Pregunta sobre nivel de riesgo evaluado
    'riesgo_nivel_estados': {
        'bajo': ['B600'],
        'moderado': ['B600', 'C100'],
        'alto': ['B600', 'C100', 'C160', 'C165']
    },

    // C100 - Pregunta sobre nivel de riesgo evaluado
    'nivel_riesgo': {
        'bajo': ['C175'],
        'moderado': ['C160', 'C175', 'C180'],
        'alto': ['C160', 'C165', 'C175', 'C180', 'C190']
    },

    // D100 - Pregunta sobre actualización de materialidad
    'actualizar_materialidad': {
        'sin_excepciones': ['D500'],
        'con_excepciones': ['D500', 'D600'],
        'na': []
    },

    // A360 - Pregunta sobre competencia y capacidad del auditor
    'competencia_capacidad': {
        'sin_excepciones': ['B110', 'B120'],
        'con_excepciones': ['A400', 'B110', 'B120', 'B130'],
        'na': []
    },

    // B600 - Pregunta sobre consideraciones de hechos o condiciones
    'consideraciones_hechos': {
        'sin_dudas': ['C175'],
        'con_dudas': ['C160', 'C165', 'C175', 'C180'],
        'na': []
    },

    // B600 - Pregunta sobre conclusión de negocio en marcha
    'conclusion_negocio': {
        'sin_eventos': ['C190'],
        'con_eventos': ['C160', 'C165', 'C190', 'C195']
    },

    // B300 - Pregunta sobre documentación de sistemas de información
    'doc_pref_sistemas_info': {
        'si': ['B335', 'B400', 'B600'],
        'no': []
    },

    // C160 - Pregunta sobre revisión analítica
    'revision_analitica': {
        'sin_excepciones': [],
        'con_excepciones': ['C165', 'C180'],
        'na': []
    },

    // C160 - Pregunta sobre ajustes
    'ajustes': {
        'sin_excepciones': ['D500'],
        'con_excepciones': ['D100', 'D500', 'D600'],
        'na': []
    }
};

// Nombres descriptivos de los formularios (opcional, para mostrar títulos más amigables)
const FORM_NAMES = {
    'A145S': 'Formulario A145S',
    'A150': 'Formulario A150',
    'A155': 'Formulario A155',
    'A156': 'Formulario A156',
    'A200Q': 'Formulario A200Q',
    'A205': 'Formulario A205',
    'A205L': 'Formulario A205L',
    'A300S': 'Procedimientos',
    'A305': 'Formulario A305',
    'A315S': 'Formulario A315S',
    'A330': 'Evaluación de Riesgos',
    'A345Q': 'Formulario A345Q',
    'A350': 'Formulario A350',
    'A350L': 'Formulario A350L',
    'A360': 'Factores con Excepciones',
    'A380': 'Formulario A380',
    'A390': 'Formulario A390',
    'A400': 'Auditores de Componente',
    'A600': 'Auditoría de Grupo',
    'B020': 'Formulario B020',
    'B030': 'Formulario B030',
    'B031': 'Formulario B031',
    'B100': 'Formulario B100',
    'B110': 'Formulario B110',
    'B120': 'Formulario B120',
    'B130': 'Formulario B130',
    'B140': 'Formulario B140',
    'B200': 'Identificación de Riesgos',
    'B200Q': 'Formulario B200Q',
    'B300': 'Formulario B300',
    'B300Q': 'Formulario B300Q',
    'B310': 'Formulario B310',
    'B320': 'Formulario B320',
    'B330': 'Formulario B330',
    'B335': 'Formulario B335',
    'B340': 'Formulario B340',
    'B400': 'Evaluación de Controles',
    'B420': 'Formulario B420',
    'B430': 'Formulario B430',
    'B440': 'Formulario B440',
    'B450': 'Formulario B450',
    'B600': 'Controles y Procedimientos',
    'B800': 'Formulario B800',
    'B820': 'Formulario B820',
    'B830': 'Formulario B830',
    'B840': 'Formulario B840',
    'B860': 'Formulario B860',
    'B870': 'Formulario B870',
    'B880': 'Formulario B880',
    'C100': 'Conclusiones y Hallazgos',
    'C105Q': 'Formulario C105Q',
    'C145': 'Formulario C145',
    'C160': 'Documentación de Hallazgos',
    'C165': 'Hallazgos Adicionales',
    'C175': 'Formulario C175',
    'C180': 'Formulario C180',
    'C190': 'Formulario C190',
    'C195': 'Formulario C195',
    'D100': 'Documentación Base',
    'D120': 'Formulario D120',
    'D140': 'Formulario D140',
    'D160': 'Formulario D160',
    'D245L': 'Formulario D245L',
    'D450L': 'Formulario D450L',
    'D500': 'Documentación Complementaria',
    'D500Q': 'Formulario D500Q',
    'D540Q': 'Formulario D540Q',
    'D545L': 'Formulario D545L',
    'D600': 'Archivos de Respaldo',
    'D630Q': 'Formulario D630Q',
    'D800': 'Formulario D800'
};

/**
 * Inicializa el sistema de formularios condicionales para un campo específico
 * @param {string} fieldId - ID del campo que controla la visibilidad
 * @param {string} containerId - ID del contenedor donde se mostrarán los enlaces
 */
function initConditionalForms(fieldId, containerId) {
    const field = document.getElementById(fieldId);
    if (!field) {
        console.warn(`Campo ${fieldId} no encontrado`);
        return;
    }

    // Agregar listener según el tipo de campo
    if (field.tagName === 'SELECT') {
        field.addEventListener('change', () => updateRelatedForms(fieldId, containerId));
    } else if (field.type === 'radio') {
        // Para radio buttons, buscar todos los del mismo name
        const radioButtons = document.querySelectorAll(`input[name="${field.name}"]`);
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => updateRelatedForms(fieldId, containerId));
        });
    }

    // Actualizar al cargar
    updateRelatedForms(fieldId, containerId);
}

/**
 * Actualiza la visualización de formularios relacionados
 * @param {string} fieldId - ID del campo
 * @param {string} containerId - ID del contenedor
 */
function updateRelatedForms(fieldId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Contenedor ${containerId} no encontrado`);
        return;
    }

    const value = getFieldValue(fieldId);
    console.log(`[Conditional Forms] Campo: ${fieldId}, Valor seleccionado: "${value}"`);

    if (!value) {
        console.log(`[Conditional Forms] Sin valor, ocultando contenedor`);
        container.style.display = 'none';
        return;
    }

    const relationships = FORM_RELATIONSHIPS[fieldId];
    if (!relationships) {
        console.log(`[Conditional Forms] No hay relaciones configuradas para ${fieldId}`);
        container.style.display = 'none';
        return;
    }

    const relatedForms = relationships[value];
    console.log(`[Conditional Forms] Formularios relacionados para "${value}":`, relatedForms);

    if (!relatedForms || relatedForms.length === 0) {
        console.log(`[Conditional Forms] Ocultando contenedor (sin formularios)`);
        container.style.display = 'none';
        return;
    }

    // Mostrar los formularios relacionados
    console.log(`[Conditional Forms] Mostrando ${relatedForms.length} formularios en contenedor`, container.id);
    renderRelatedForms(container, relatedForms);
    container.style.display = 'block';
    console.log(`[Conditional Forms] Contenedor después de renderizar:`, {
        id: container.id,
        display: container.style.display,
        innerHTML: container.innerHTML.substring(0, 200),
        visible: container.offsetHeight > 0
    });
}

/**
 * Renderiza los botones de formularios relacionados
 * @param {HTMLElement} container - Contenedor donde se renderizarán los botones
 * @param {Array} forms - Array de códigos de formularios
 */
function renderRelatedForms(container, forms) {
    const commitmentId = new URLSearchParams(window.location.search).get('commitment_id')
        || sessionStorage.getItem('current_commitment_id');

    container.innerHTML = `
        <div class="alert alert-info mt-2 mb-0" style="background: #e7f3ff; border-left: 4px solid #0d6efd;">
            <div class="d-flex align-items-start">
                <i class="bi bi-link-45deg me-2" style="font-size: 1.2rem;"></i>
                <div>
                    <strong class="d-block mb-2">Formularios relacionados con esta respuesta:</strong>
                    <div class="d-flex flex-wrap gap-2">
                        ${forms.map(formCode => {
        const formName = FORM_NAMES[formCode] || formCode;
        const formFile = formCode.toLowerCase() + '.html';
        const formExists = checkFormExists(formCode);

        return `
                                <button 
                                    class="btn btn-sm ${formExists ? 'btn-outline-primary' : 'btn-outline-secondary'}" 
                                    onclick="openRelatedForm('${formFile}', '${commitmentId}')"
                                    ${!formExists ? 'disabled' : ''}
                                    title="${formExists ? 'Abrir ' + formName : 'Formulario en desarrollo'}">
                                    <i class="bi ${formExists ? 'bi-file-earmark-text' : 'bi-hourglass-split'}"></i>
                                    ${formCode}
                                </button>
                            `;
    }).join('')}
                    </div>
                    <small class="text-muted d-block mt-2">
                        <i class="bi bi-info-circle"></i> 
                        Los formularios marcados con <i class="bi bi-hourglass-split"></i> están en desarrollo
                    </small>
                </div>
            </div>
        </div>
    `;
}

/**
 * Obtiene el valor de un campo (select o radio)
 * @param {string} fieldId - ID del campo
 * @returns {string} Valor del campo
 */
function getFieldValue(fieldId) {
    // PRIMERO: Buscar radio button por nombre (para campos Sí/No)
    const radio = document.querySelector(`input[name="${fieldId}"]:checked`);
    if (radio) {
        return radio.value;
    }

    // SEGUNDO: Buscar elemento por ID
    const field = document.getElementById(fieldId);
    if (!field) return '';

    if (field.tagName === 'SELECT') {
        return field.value;
    } else if (field.type === 'radio') {
        const checked = document.querySelector(`input[name="${field.name}"]:checked`);
        return checked ? checked.value : '';
    }

    return field.value || '';
}

/**
 * Verifica si un formulario existe
 * @param {string} formCode - Código del formulario (ej: 'A300S')
 * @returns {boolean} True si el formulario existe
 */
function checkFormExists(formCode) {
    // Lista de formularios que actualmente existen
    const existingForms = [
        'A100', 'A200', 'A200Q', 'A205', 'A205L', 'A300', 'A300S', 'A305', 'A315S', 'A330', 'A345Q', 'A350', 'A350L', 'A145S', 'A150', 'A155', 'A156', 'A360', 'A380', 'A390', 'A400', 'A600',
        'B020', 'B030', 'B031', 'B100', 'B110', 'B120', 'B130', 'B140', 'B200', 'B200Q', 'B300', 'B300Q', 'B310', 'B320', 'B330', 'B340', 'B335', 'B400', 'B420', 'B430', 'B440', 'B450', 'B600', 'B800', 'B820', 'B830', 'B840', 'B860', 'B870', 'B880',
        'C100', 'C105Q', 'C145', 'C160', 'C165', 'C175', 'C180', 'C190', 'C195',
        'D100', 'D120', 'D140', 'D160', 'D245L', 'D450L', 'D500', 'D500Q', 'D540Q', 'D545L', 'D600', 'D630Q', 'D800'
    ];

    return existingForms.includes(formCode.toUpperCase());
}

/**
 * Abre un formulario relacionado en una nueva ventana
 * @param {string} formFile - Nombre del archivo del formulario
 * @param {string} commitmentId - ID del compromiso actual
 */
function openRelatedForm(formFile, commitmentId) {
    const url = `${formFile}?commitment_id=${commitmentId}`;
    window.open(url, '_blank', 'width=1200,height=800');
}

/**
 * Inicializa todos los campos condicionales en una página
 * Debe ser llamado después de cargar el DOM
 */
function initAllConditionalForms() {
    // A100 - Pregunta 1: Select de nivel de colaboración
    if (document.getElementById('q1_colaboracion')) {
        initConditionalForms('q1_colaboracion', 'related_forms_q1');
    }

    // A100 - Pregunta 2: Radio buttons de sistema de consultas
    if (document.querySelector('input[name="q2_consultas"]')) {
        initConditionalForms('q2_consultas', 'related_forms_q2');
    }

    // A100 - Pregunta 3: Radio buttons de analítica integrada
    if (document.querySelector('input[name="q3_analitica"]')) {
        initConditionalForms('q3_analitica', 'related_forms_q3');
    }

    // A100 - Pregunta 4: Radio buttons de tipo de compromiso
    if (document.querySelector('input[name="q4_tipo"]')) {
        initConditionalForms('q4_tipo', 'related_forms_q4');
    }

    // Agregar más inicializaciones según sea necesario
}

// Auto-inicializar si el DOM ya está cargado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllConditionalForms);
} else {
    // DOMContentLoaded ya se disparó
    setTimeout(initAllConditionalForms, 100);
}
