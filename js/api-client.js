// ⚠️ MODO TRANSICIÓN: backend deshabilitado
window.SUPABASE_ONLY_MODE = true;

/**
 * CFE INSIGHT - API Client
 * Cliente para consumir la API REST del backend con Supabase
 * Versión: 1.0.0
 */

// Determinar la URL base de la API desde entorno o contexto
// IMPORTANTE: NO usar import.meta directamente (causa syntax error en scripts normales)
let API_BASE_URL = '';

try {
    // Intentar leer desde window.API_BASE_URL primero (más seguro)
    API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) || '';

    // Si no existe, usar window.location.origin como fallback
    if (!API_BASE_URL && typeof window !== 'undefined') {
        API_BASE_URL = window.location.origin;
    }
} catch (e) {
    // Fallback silencioso si falla
    API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
}

// Exponer para otros módulos que cargan en el navegador
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
}

// Configuración de la API
const API_CONFIG = {
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
};

// Cliente HTTP genérico
class HTTPClient {
    constructor(config) {
        this.baseURL = config.baseURL;
        this.timeout = config.timeout;
        this.headers = config.headers;
    }

    async request(method, endpoint, data = null, customHeaders = {}) {

    // 🚫 Backend deshabilitado (modo Supabase)
    if (window.SUPABASE_ONLY_MODE && endpoint.startsWith('/api/')) {
        console.warn(`⛔ API deshabilitada: ${endpoint}`);
        return {
            success: true,
            data: [],
            status: 200
        };
    }

    const url = `${this.baseURL}${endpoint}`;

    const options = {
        method,
        headers: {
            ...this.headers,
            ...customHeaders
        }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP ${response.status}`);
        }

        return { success: true, data: responseData, status: response.status };

    } catch (error) {
        console.warn(`⚠️ API ignorada (${endpoint}):`, error.message);
        return {
            success: true,
            data: [],
            status: 200
        };
    }
}


        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            options.signal = controller.signal;

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Si responseData ya tiene la estructura {success, data}, devolverla directamente
            // Si no, envolverla
            if (responseData.hasOwnProperty('success') && responseData.hasOwnProperty('data')) {
                return responseData;
            }

            return { success: true, data: responseData, status: response.status };
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            return {
                success: false,
                error: error.message || 'Error de conexión con el servidor',
                status: 0
            };
        }
    }

    get(endpoint, customHeaders = {}) {
        return this.request('GET', endpoint, null, customHeaders);
    }

    post(endpoint, data, customHeaders = {}) {
        return this.request('POST', endpoint, data, customHeaders);
    }

    put(endpoint, data, customHeaders = {}) {
        return this.request('PUT', endpoint, data, customHeaders);
    }

    delete(endpoint, customHeaders = {}) {
        return this.request('DELETE', endpoint, null, customHeaders);
    }
}

// Instancia del cliente HTTP
const httpClient = new HTTPClient(API_CONFIG);

// ============================================
// API DE AUTENTICACIÓN
// ============================================

const AuthAPI = {
    /**
     * Iniciar sesión usando Supabase Auth (email/password)
     * @param {string} email
     * @param {string} password
     */
    async login(usernameOrEmail, password) {
        if (!window.supabaseClient) {
            return { success: false, error: 'Supabase no está configurado en el frontend' };
        }

        const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        let resolvedEmail = usernameOrEmail;

        // Si el usuario ingresó un username, resolver su correo antes de autenticar
        if (!isEmail(usernameOrEmail)) {
            try {
                const userResponse = await UsersAPI.getByUsername(usernameOrEmail);

                if (!userResponse?.success) {
                    return { success: false, error: 'Usuario no encontrado' };
                }

                const userData = userResponse.data?.user || userResponse.data || userResponse;
                resolvedEmail = userData?.email || userData?.correo || userData?.mail || null;

                if (!resolvedEmail) {
                    return { success: false, error: 'El usuario no tiene un correo asociado' };
                }
            } catch (lookupError) {
                console.error('Error buscando usuario por username:', lookupError);
                return { success: false, error: 'No se pudo validar el usuario' };
            }
        }

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: resolvedEmail,
            password
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // Supabase gestiona la sesión internamente; devolvemos user y session directo
        return {
            success: true,
            user: data.user,
            session: data.session,
            username: data.user?.user_metadata?.username || usernameOrEmail,
            email: resolvedEmail
        };
    },

    /**
     * Cerrar sesión en Supabase
     */
    async logout() {
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
        sessionStorage.removeItem('userUI');
        window.appSession = null;
        return { success: true };
    },

    /**
     * Recuperar sesión actual desde Supabase y sincronizar sessionStorage
     */
    async getSession() {
        if (!window.supabaseClient) return null;
        const { data, error } = await window.supabaseClient.auth.getSession();
        if (error || !data.session) return null;
        return data.session;
    },

    /**
     * Suscribirse a cambios de sesión
     */
    onAuthStateChange(callback) {
        if (!window.supabaseClient) return { unsubscribe: () => { } };
        const { data: listener } = window.supabaseClient.auth.onAuthStateChange((event, session) => {
            callback(session?.user || null, event, session || null);
        });
        return listener;
    }
};

// ============================================
// API DE USUARIOS (NUEVA ESTRUCTURA)
// ============================================

const UsuariosAPI = {
    /**
     * Obtener todos los usuarios
     * @returns {Promise<Object>} Respuesta con lista de usuarios
     */
    async getAll() {
        return await httpClient.get('/api/users');
    },

    /**
     * Obtener usuario por ID
     * @param {number} id - ID del usuario
     * @returns {Promise<Object>} Usuario encontrado
     */
    async getById(id) {
        return await httpClient.get(`/api/users/${id}`);
    },

    /**
     * Crear nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async create(userData) {
        return await httpClient.post('/api/users', userData);
    },

    /**
     * Actualizar usuario
     * @param {number} id - ID del usuario
     * @param {Object} userData - Datos a actualizar
     * @returns {Promise<Object>} Usuario actualizado
     */
    async update(id, userData) {
        return await httpClient.put(`/api/users/${id}`, userData);
    },

    /**
     * Eliminar usuario
     * @param {number} id - ID del usuario
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async delete(id) {
        return await httpClient.delete(`/api/users/${id}`);
    }
};

// ============================================
// API DE USUARIOS (ESTRUCTURA ANTIGUA - PARA COMPATIBILIDAD)
// ============================================

const UsersAPI = {
    /**
     * Obtener todos los usuarios
     * @returns {Promise<Object>} Respuesta con lista de usuarios
     */
    async getAll() {
        return await httpClient.get('/api/users');
    },

    /**
     * Obtener usuario por username
     * @param {string} username - Username del usuario
     * @returns {Promise<Object>} Usuario encontrado
     */
    async getByUsername(username) {
        return await httpClient.get(`/api/users/${username}`);
    },

    /**
     * Crear nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async create(userData) {
        return await httpClient.post('/api/users', userData);
    },

    /**
     * Actualizar usuario
     * @param {string} username - Username del usuario
     * @param {Object} userData - Datos a actualizar
     * @returns {Promise<Object>} Usuario actualizado
     */
    async update(username, userData) {
        return await httpClient.put(`/api/users/${username}`, userData);
    },

    /**
     * Eliminar usuario
     * @param {string} username - Username del usuario
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async delete(username) {
        return await httpClient.delete(`/api/users/${username}`);
    }
};

// ============================================
// API DE ENTIDADES
// ============================================

const EntitiesAPI = {
    /**
     * Obtener todas las entidades
     * @returns {Promise<Object>} Respuesta con lista de entidades
     */
    async getAll() {
        return await httpClient.get('/api/entities');
    },

    /**
     * Obtener entidad por ID
     * @param {number} id - ID de la entidad
     * @returns {Promise<Object>} Entidad encontrada
     */
    async getById(id) {
        return await httpClient.get(`/api/entities/${id}`);
    },

    /**
     * Crear nueva entidad
     * @param {Object} entityData - Datos de la entidad
     * @returns {Promise<Object>} Entidad creada
     */
    async create(entityData) {
        return await httpClient.post('/api/entities', entityData);
    },

    /**
     * Actualizar entidad
     * @param {number} id - ID de la entidad
     * @param {Object} entityData - Datos a actualizar
     * @returns {Promise<Object>} Entidad actualizada
     */
    async update(id, entityData) {
        return await httpClient.put(`/api/entities/${id}`, entityData);
    },

    /**
     * Eliminar entidad
     * @param {number} id - ID de la entidad
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async delete(id) {
        return await httpClient.delete(`/api/entities/${id}`);
    }
};

// ============================================
// API DE CLIENTES (NUEVA ESTRUCTURA)
// ============================================

const ClientesAPI = {
    /**
     * Obtener todos los clientes
     * @returns {Promise<Object>} Respuesta con lista de clientes
     */
    async getAll() {
        return await httpClient.get('/api/clientes');
    },

    /**
     * Obtener cliente por ID
     * @param {number} id - ID del cliente
     * @returns {Promise<Object>} Cliente encontrado
     */
    async getById(id) {
        return await httpClient.get(`/api/clientes/${id}`);
    },

    /**
     * Crear nuevo cliente
     * @param {Object} clienteData - Datos del cliente
     * @returns {Promise<Object>} Cliente creado
     */
    async create(clienteData) {
        return await httpClient.post('/api/clientes', clienteData);
    },

    /**
     * Actualizar cliente
     * @param {number} id - ID del cliente
     * @param {Object} clienteData - Datos a actualizar
     * @returns {Promise<Object>} Cliente actualizado
     */
    async update(id, clienteData) {
        return await httpClient.put(`/api/clientes/${id}`, clienteData);
    },

    /**
     * Eliminar cliente
     * @param {number} id - ID del cliente
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async delete(id) {
        return await httpClient.delete(`/api/clientes/${id}`);
    }
};

// ============================================
// API DE AUDITORIAS (NUEVA ESTRUCTURA)
// ============================================

const AuditoriasAPI = {
    /**
     * Obtener todas las auditorías
     * @returns {Promise<Object>} Respuesta con lista de auditorías
     */
    async getAll() {
        return await httpClient.get('/api/auditorias');
    },

    /**
     * Obtener auditoría por ID
     * @param {number} id - ID de la auditoría
     * @returns {Promise<Object>} Auditoría encontrada
     */
    async getById(id) {
        return await httpClient.get(`/api/auditorias/${id}`);
    },

    /**
     * Obtener auditorías por cliente
     * @param {number} clienteId - ID del cliente
     * @returns {Promise<Object>} Respuesta con lista de auditorías del cliente
     */
    async getByCliente(clienteId) {
        return await httpClient.get(`/api/auditorias/cliente/${clienteId}`);
    },

    /**
     * Crear nueva auditoría
     * @param {Object} auditoriaData - Datos de la auditoría
     * @returns {Promise<Object>} Auditoría creada
     */
    async create(auditoriaData) {
        return await httpClient.post('/api/auditorias', auditoriaData);
    },

    /**
     * Actualizar auditoría
     * @param {number} id - ID de la auditoría
     * @param {Object} auditoriaData - Datos a actualizar
     * @returns {Promise<Object>} Auditoría actualizada
     */
    async update(id, auditoriaData) {
        return await httpClient.put(`/api/auditorias/${id}`, auditoriaData);
    },

    /**
     * Eliminar auditoría
     * @param {number} id - ID de la auditoría
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async delete(id) {
        return await httpClient.delete(`/api/auditorias/${id}`);
    }
};

// ============================================
// API DE COMPROMISOS
// ============================================

const CommitmentsAPI = {
    /**
     * Obtener todos los compromisos
     * @returns {Promise<Object>} Respuesta con lista de compromisos
     */
    async getAll() {
        return await httpClient.get('/api/commitments');
    },

    /**
     * Obtener compromiso por ID
     * @param {number} id - ID del compromiso
     * @returns {Promise<Object>} Compromiso encontrado con relaciones
     */
    async getById(id) {
        return await httpClient.get(`/api/commitments/${id}`);
    },

    /**
     * Obtener compromisos por entidad
     * @param {number} entityId - ID de la entidad
     * @returns {Promise<Object>} Respuesta con lista de compromisos de la entidad
     */
    async getByEntity(entityId) {
        return await httpClient.get(`/api/commitments/entity/${entityId}`);
    },

    /**
     * Crear nuevo compromiso
     * @param {Object} commitmentData - Datos del compromiso
     * @returns {Promise<Object>} Compromiso creado
     */
    async create(commitmentData) {
        return await httpClient.post('/api/commitments', commitmentData);
    },

    /**
     * Actualizar compromiso
     * @param {number} id - ID del compromiso
     * @param {Object} commitmentData - Datos a actualizar
     * @returns {Promise<Object>} Compromiso actualizado
     */
    async update(id, commitmentData) {
        return await httpClient.put(`/api/commitments/${id}`, commitmentData);
    },

    /**
     * Eliminar compromiso
     * @param {number} id - ID del compromiso
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async delete(id) {
        return await httpClient.delete(`/api/commitments/${id}`);
    }
};

// ============================================
// API DE EQUIPOS DE TRABAJO
// ============================================

const WorkGroupsAPI = {
    /**
     * Obtener todos los equipos de trabajo
     * @returns {Promise<Object>} Respuesta con lista de grupos
     */
    async getAll() {
        return await httpClient.get('/api/work-groups');
    },

    /**
     * Obtener grupo por ID
     * @param {number} id - ID del grupo
     * @returns {Promise<Object>} Grupo encontrado
     */
    async getById(id) {
        return await httpClient.get(`/api/work-groups/${id}`);
    },

    /**
     * Crear nuevo grupo
     * @param {Object} groupData - Datos del grupo
     * @returns {Promise<Object>} Grupo creado
     */
    async create(groupData) {
        return await httpClient.post('/api/work-groups', groupData);
    },

    /**
     * Actualizar grupo
     * @param {number} id - ID del grupo
     * @param {Object} groupData - Datos a actualizar
     * @returns {Promise<Object>} Grupo actualizado
     */
    async update(id, groupData) {
        return await httpClient.put(`/api/work-groups/${id}`, groupData);
    },

    /**
     * Eliminar grupo
     * @param {number} id - ID del grupo
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async delete(id) {
        return await httpClient.delete(`/api/work-groups/${id}`);
    }
};

// ============================================
// API DE REGISTROS (LOGS)
// ============================================

const RecordsAPI = {
    /**
     * Obtener registros con paginación
     * @param {Object} options - Opciones de consulta
     * @returns {Promise<Object>} Registros con metadata de paginación
     */
    async getAll(options = {}) {
        const { limit = 100, offset = 0, username = null, action = null } = options;

        let endpoint = `/api/records?limit=${limit}&offset=${offset}`;
        if (username) endpoint += `&username=${username}`;
        if (action) endpoint += `&action=${action}`;

        return await httpClient.get(endpoint);
    },

    /**
     * Obtener registro por ID
     * @param {number} id - ID del registro
     * @returns {Promise<Object>} Registro encontrado
     */
    async getById(id) {
        return await httpClient.get(`/api/records/${id}`);
    },

    /**
     * Obtener registros por rango de fechas
     * @param {string} startDate - Fecha inicial (YYYY-MM-DD)
     * @param {string} endDate - Fecha final (YYYY-MM-DD)
     * @returns {Promise<Object>} Respuesta con lista de registros en el rango
     */
    async getByDateRange(startDate, endDate) {
        return await httpClient.get(`/api/records/range/${startDate}/${endDate}`);
    },

    /**
     * Crear nuevo registro
     * @param {Object} recordData - Datos del registro
     * @returns {Promise<Object>} Registro creado
     */
    async create(recordData) {
        return await httpClient.post('/api/records', recordData);
    },

    /**
     * Eliminar registro
     * @param {number} id - ID del registro
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async delete(id) {
        return await httpClient.delete(`/api/records/${id}`);
    }
};

// ============================================
// API DE FORMULARIOS DE AUDITORÍA
// ============================================

const AuditFormsAPI = {
    /**
     * Obtener formulario por tipo para el usuario actual
     * @param {string} formType - Tipo de formulario (a100, a101, etc.)
     * @returns {Promise<Object>} Formulario encontrado
     */
    async getByType(formType) {
        return await httpClient.get(`/api/audit/forms/${formType}`);
    },

    /**
     * Crear/actualizar formulario
     * @param {string} formType - Tipo de formulario
     * @param {Object} data - Datos del formulario
     * @returns {Promise<Object>} Formulario creado/actualizado
     */
    async save(formType, data) {
        return await httpClient.post('/api/audit/forms', { formType, data });
    }
};

// ============================================
// API DE REVISIONES DE AUDITORÍA
// ============================================

const AuditReviewsAPI = {
    /**
     * Obtener revisiones de un formulario
     * @param {string} formId - ID del formulario
     * @returns {Promise<Object>} Respuesta con lista de revisiones
     */
    async getByFormId(formId) {
        return await httpClient.get(`/api/audit/reviews/${formId}`);
    },

    /**
     * Marcar pregunta como revisada (solo admins)
     * @param {string} formId - ID del formulario
     * @param {string} questionId - ID de la pregunta
     * @param {boolean} reviewed - Estado de revisión
     * @returns {Promise<Object>} Revisión creada/actualizada
     */
    async update(formId, questionId, reviewed) {
        const session = getCurrentSession();
        if (!session) {
            return { success: false, error: 'Sesión no válida' };
        }

        return await httpClient.post('/api/audit/reviews', {
            formId,
            questionId,
            reviewed,
            reviewedBy: session.id
        });
    }
};

// ============================================
// API DE INTELIGENCIA ARTIFICIAL
// ============================================

const AIAPI = {
    /**
     * Llamada general a IA
     * @param {string} prompt - Pregunta o solicitud
     * @param {string} context - Contexto (soporte, auditoria, reporte, chat)
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} Respuesta de la IA
     */
    async call(prompt, context = 'soporte', options = {}) {
        return await httpClient.post('/api/ai/call', { prompt, context, options });
    },

    /**
     * Analizar logs con IA
     * @param {Array} logs - Array de logs a analizar
     * @param {string} analysisType - Tipo de análisis (general, anomalies, patterns, recommendations)
     * @returns {Promise<Object>} Análisis de la IA
     */
    async analyzeLogs(logs, analysisType = 'general') {
        return await httpClient.post('/api/ai/analyze-logs', { logs, analysisType });
    },

    /**
     * Generar reporte con IA
     * @param {Object} data - Datos para el reporte
     * @param {string} reportType - Tipo de reporte (general, auditoria, compromisos, usuarios)
     * @returns {Promise<Object>} Reporte generado
     */
    async generateReport(data, reportType = 'general') {
        return await httpClient.post('/api/ai/generate-report', { data, reportType });
    }
};

// ============================================
// UTILIDADES
// ============================================

/**
 * Verificar estado del servidor
 * @returns {Promise<boolean>} True si el servidor está disponible
 */
async function checkServerHealth() {
    try {
        const response = await httpClient.get('/api/health');
        return response.success && response.data.status === 'OK';
    } catch (error) {
        return false;
    }
}

/**
 * Registrar acción en el sistema
 * @param {string} action - Acción realizada
 * @param {string} entity - Entidad afectada (opcional)
 * @param {string} commitment - Compromiso afectado (opcional)
 * @param {Object} details - Detalles adicionales (opcional)
 */
async function logAction() {
    // deshabilitado temporalmente
}

/**
 * Mostrar notificación de error
 * @param {string} message - Mensaje de error
 * @param {string} containerId - ID del contenedor donde mostrar el error
 */
function showError(message, containerId = 'alertContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Error container not found:', containerId);
        alert(message);
        return;
    }

    container.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="bi bi-exclamation-triangle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

/**
 * Mostrar notificación de éxito
 * @param {string} message - Mensaje de éxito
 * @param {string} containerId - ID del contenedor donde mostrar el mensaje
 */
function showSuccess(message, containerId = 'alertContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Success container not found:', containerId);
        alert(message);
        return;
    }

    container.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="bi bi-check-circle"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}

/**
 * Mostrar indicador de carga
 * @param {boolean} show - Mostrar u ocultar
 * @param {string} containerId - ID del contenedor
 */
function showLoading(show, containerId = 'loadingContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (show) {
        container.innerHTML = `
            <div class="text-center my-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Cargando datos...</p>
            </div>
        `;
        container.style.display = 'block';
    } else {
        container.innerHTML = '';
        container.style.display = 'none';
    }
}

// ============================================
// EXPORTAR API
// ============================================

// Hacer disponible globalmente
window.API = {
    Auth: AuthAPI,
    Usuarios: UsuariosAPI,
    Users: UsersAPI,
    Entities: EntitiesAPI,
    Clientes: ClientesAPI,
    Auditorias: AuditoriasAPI,
    Commitments: CommitmentsAPI,
    WorkGroups: WorkGroupsAPI,
    Records: RecordsAPI,
    AuditForms: AuditFormsAPI,
    AuditReviews: AuditReviewsAPI,
    AI: AIAPI,
    checkServerHealth,
    logAction,
    showError,
    showSuccess,
    showLoading
};

// Exportar httpClient globalmente para uso en formularios
window.apiClient = httpClient;

// Log de inicialización
console.log('✅ API Client inicializado correctamente');
console.log('📡 Base URL:', API_CONFIG.baseURL);
