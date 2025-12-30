






// Utility functions for input validation and sanitization

// Validate email using regex
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number (basic: digits, spaces, dashes, parentheses, +)
function validatePhone(phone) {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/[^\d]/g, '').length >= 7;
}

// Validate required field (not empty after trim)
function validateRequired(value) {
    return value.trim() !== '';
}

// Sanitize string to prevent XSS (escape HTML entities)
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[&<>"']/g, function (match) {
        const entityMap = {
            '&': '&amp;',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#39;'
        };
        return entityMap[match];
    });
}

// Check if session is expired - ACTUALIZADO: usa sessionStorage
function isSessionExpired() {
    const sessionStr = sessionStorage.getItem('userSession');
    return !sessionStr;
}

// Get current session data if valid - ACTUALIZADO: usa sessionStorage
function getCurrentSession() {
    const sessionStr = sessionStorage.getItem('userSession');
    if (!sessionStr) return null;
    try {
        return JSON.parse(sessionStr);
    } catch (e) {
        console.error('Error parsing session:', e);
        return null;
    }
}

// Set session - ACTUALIZADO: usa sessionStorage
function setSessionWithExpiry(userData) {
    sessionStorage.setItem('userSession', JSON.stringify(userData));
    window.appSession = userData; // También en memoria para compatibilidad
}

// Validate strong password (min 8 chars, uppercase, lowercase, number, special char)
function validateStrongPassword(password) {
    if (!password || password.length < 8) {
        return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'La contraseña debe contener al menos una letra mayúscula.' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'La contraseña debe contener al menos una letra minúscula.' };
    }
    if (!/\d/.test(password)) {
        return { valid: false, message: 'La contraseña debe contener al menos un número.' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, message: 'La contraseña debe contener al menos un símbolo especial.' };
    }
    return { valid: true, message: '' };
}

// Check if account is blocked
function isAccountBlocked(username) {
    const blockKey = `loginBlock_${username}`;
    const blockData = localStorage.getItem(blockKey);
    if (!blockData) return false;
    try {
        const { blockedUntil } = JSON.parse(blockData);
        return new Date().getTime() < blockedUntil;
    } catch (e) {
        return false;
    }
}

// Block account for 5 minutes after 5 failed attempts
function blockAccount(username) {
    const blockKey = `loginBlock_${username}`;
    const blockedUntil = new Date().getTime() + (5 * 60 * 1000); // 5 minutes
    localStorage.setItem(blockKey, JSON.stringify({ blockedUntil, attempts: 5 }));
}

// Unblock account (reset attempts and remove block)
function unblockAccount(username) {
    const attemptsKey = `loginAttempts_${username}`;
    const blockKey = `loginBlock_${username}`;
    localStorage.removeItem(attemptsKey);
    localStorage.removeItem(blockKey);
}

// Increment failed attempts for username
function incrementFailedAttempts(username) {
    const attemptsKey = `loginAttempts_${username}`;
    let attempts = parseInt(localStorage.getItem(attemptsKey) || '0');
    attempts++;
    localStorage.setItem(attemptsKey, attempts.toString());
    if (attempts >= 5) {
        blockAccount(username);
    }
    return attempts;
}

// Reset failed attempts on successful login
function resetFailedAttempts(username) {
    const attemptsKey = `loginAttempts_${username}`;
    localStorage.removeItem(attemptsKey);
}

// Encryption functions - ELIMINADOS: ya no se usan
// Ya no guardamos datos sensibles en localStorage
const ENCRYPTION_KEY = 'CFE_INSIGHT_SECRET_KEY_2025'; // Mantenido solo para compatibilidad

// Encrypt data - DEPRECATED
function encryptData(data) {
    console.warn('encryptData is deprecated. Do not store sensitive data in localStorage.');
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

// Decrypt data - DEPRECATED
function decryptData(encryptedData) {
    console.warn('decryptData is deprecated. Do not store sensitive data in localStorage.');
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        console.error('Error decrypting data:', e);
        return null;
    }
}

// Secure localStorage functions - ELIMINADOS: no más localStorage para datos
function setSecureItem(key, data) {
    console.error('setSecureItem is deprecated. Use database instead of localStorage.');
}

function getSecureItem(key) {
    console.error('getSecureItem is deprecated. Use database instead of localStorage.');
    return null;
}

// Advanced input sanitization to prevent XSS
function sanitizeInputAdvanced(input) {
    if (typeof input !== 'string') return input;
    // Escape HTML entities
    let sanitized = input.replace(/[&<>"'/]/g, function (match) {
        const entityMap = {
            '&': '&amp;',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return entityMap[match];
    });
    // Remove script tags and event handlers
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
    sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
    return sanitized;
}

// Validate password strength with real-time feedback
function validatePasswordStrength(password) {
    const result = validateStrongPassword(password);
    if (result.valid) {
        return { valid: true, message: 'Contraseña segura', color: 'green' };
    } else {
        return { valid: false, message: result.message, color: 'red' };
    }
}

// Real-time form validation
function setupFormValidation(formId, validationRules) {
    const form = document.getElementById(formId);
    if (!form) return;

    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', function () {
            validateField(this, validationRules);
        });
        input.addEventListener('input', function () {
            clearFieldError(this);
        });
    });
}

// Validate individual field
function validateField(field, rules) {
    const fieldName = field.name || field.id;
    const rule = rules[fieldName];
    if (!rule) return true;

    let isValid = true;
    let message = '';

    // Required validation
    if (rule.required && !validateRequired(field.value)) {
        isValid = false;
        message = rule.requiredMessage || 'Este campo es obligatorio.';
    }
    // Email validation
    else if (rule.email && !validateEmail(field.value)) {
        isValid = false;
        message = rule.emailMessage || 'Correo electrónico no válido.';
    }
    // Phone validation
    else if (rule.phone && !validatePhone(field.value)) {
        isValid = false;
        message = rule.phoneMessage || 'Teléfono no válido.';
    }
    // Password strength
    else if (rule.password && !validateStrongPassword(field.value).valid) {
        isValid = false;
        message = validateStrongPassword(field.value).message;
    }
    // Custom regex
    else if (rule.pattern && !rule.pattern.test(field.value)) {
        isValid = false;
        message = rule.patternMessage || 'Formato no válido.';
    }

    if (!isValid) {
        showFieldError(field, message);
    } else {
        clearFieldError(field);
    }

    return isValid;
}

// Show field error
function showFieldError(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');

    let errorElement = field.parentNode.querySelector('.invalid-feedback');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'invalid-feedback';
        field.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
}

// Clear field error
function clearFieldError(field) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');

    const errorElement = field.parentNode.querySelector('.invalid-feedback');
    if (errorElement) {
        errorElement.remove();
    }
}

// Function to log actions securely
function logAction(username, action, entity, commitment, timestamp) {
    const records = getSecureItem('appRecords') || [];
    records.push({ id: Date.now(), username, action, entity, commitment, timestamp });
    setSecureItem('appRecords', records);
}

// ===== FUNCIONES DE IA PARA CFE INSIGHT =====

// Función para llamar a APIs de IA de manera unificada a través del proxy seguro
async function callAI(prompt, context = 'soporte', provider = 'openai', options = {}) {
    try {
        // Validar configuración del proxy
        if (!validateAIConfig()) {
            throw new Error('Configuración de IA no válida - proxy no disponible');
        }

        const maxTokens = options.maxTokens || AI_CONFIG.maxTokens;
        const temperature = options.temperature || AI_CONFIG.temperature;

        // Llamar al proxy backend
        const response = await fetch(`${AI_CONFIG.proxy.baseUrl}/call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                context,
                provider,
                options: { maxTokens, temperature }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(`Error del proxy: ${response.status} - ${errorData.error || response.statusText}`);
        }

        const data = await response.json();

        // Log de la interacción con IA (cliente-side)
        console.log(`IA call completada - Context: ${context}, Prompt length: ${prompt.length}`);

        return data.response;
    } catch (error) {
        console.error('Error al llamar a IA:', error);

        // Mejor manejo de errores con más detalle
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return 'Error de conexión: No se pudo conectar al servidor de IA. Verifica tu conexión a internet.';
        } else if (error.message.includes('proxy')) {
            return 'Error del servidor: El servicio de IA no está disponible temporalmente. Intenta de nuevo más tarde.';
        } else {
            return 'Lo siento, hubo un error al procesar tu consulta con la IA. Por favor, intenta de nuevo más tarde.';
        }
    }
}

// Función específica para OpenAI
async function callOpenAI(prompt, systemPrompt, config, maxTokens, temperature) {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: config.models.chat,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            max_tokens: maxTokens,
            temperature: temperature
        })
    });

    if (!response.ok) {
        throw new Error(`Error de OpenAI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Función específica para Gemini (placeholder - implementar cuando se tenga la API)
async function callGemini(prompt, systemPrompt, config, maxTokens, temperature) {
    // Implementación pendiente - requiere API key real
    throw new Error('Gemini no implementado aún');
}

// Función específica para Claude (placeholder - implementar cuando se tenga la API)
async function callClaude(prompt, systemPrompt, config, maxTokens, temperature) {
    // Implementación pendiente - requiere API key real
    throw new Error('Claude no implementado aún');
}

// Función para analizar logs con IA a través del proxy
async function analyzeLogsWithAI(logs, analysisType = 'general') {
    try {
        if (!validateAIConfig()) {
            return 'Servicio de IA no disponible.';
        }

        const response = await fetch(`${AI_CONFIG.proxy.baseUrl}/analyze-logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ logs, analysisType })
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error analizando logs:', error);
        return 'Error al analizar los logs. Intenta de nuevo más tarde.';
    }
}

// Función para generar reportes automáticos a través del proxy
async function generateReportWithAI(data, reportType = 'general') {
    try {
        if (!validateAIConfig()) {
            return 'Servicio de IA no disponible.';
        }

        const response = await fetch(`${AI_CONFIG.proxy.baseUrl}/generate-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data, reportType })
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const result = await response.json();
        return result.response;
    } catch (error) {
        console.error('Error generando reporte:', error);
        return 'Error al generar el reporte. Intenta de nuevo más tarde.';
    }
}

// Función para sugerencias inteligentes de auditoría
async function getAuditSuggestions(logs, currentContext = {}) {
    const contextText = Object.keys(currentContext).length > 0 ?
        `\nContexto actual: ${JSON.stringify(currentContext)}` : '';

    const prompt = `Como experto en auditoría para CFE INSIGHT, analiza estos logs y el contexto actual, y proporciona 3-5 sugerencias específicas de mejora:${contextText}\n\nLogs recientes:\n${logs.map(log =>
        `[${log.timestamp}] ${log.username}: ${log.action} en ${log.entity || 'N/A'}`
    ).join('\n')}\n\nSugerencias:`;

    return await callAI(prompt, 'auditoria');
}

// Función para logging de interacciones con IA
function logAIInteraction(provider, prompt, response, context) {
    const aiLogs = getSecureItem('aiInteractions') || [];
    aiLogs.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        provider: provider,
        context: context,
        promptLength: prompt.length,
        responseLength: response.length,
        user: getCurrentSession()?.name || 'unknown'
    });

    // Mantener solo los últimos 100 logs de IA
    if (aiLogs.length > 100) {
        aiLogs.splice(0, aiLogs.length - 100);
    }

    setSecureItem('aiInteractions', aiLogs);
}

// Función para obtener estadísticas de uso de IA
function getAIUsageStats() {
    const aiLogs = getSecureItem('aiInteractions') || [];
    const stats = {
        totalInteractions: aiLogs.length,
        byProvider: {},
        byContext: {},
        recentActivity: aiLogs.slice(-10) // Últimas 10 interacciones
    };

    aiLogs.forEach(log => {
        stats.byProvider[log.provider] = (stats.byProvider[log.provider] || 0) + 1;
        stats.byContext[log.context] = (stats.byContext[log.context] || 0) + 1;
    });

    return stats;
}

// Función para chat inteligente con contexto histórico
async function intelligentChatResponse(message, chatHistory = [], userRole = 'cliente') {
    const historyText = chatHistory.slice(-5).map(msg =>
        `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.message}`
    ).join('\n');

    const roleContext = {
        'cliente': 'El usuario es un cliente que necesita soporte técnico.',
        'auditor': 'El usuario es un auditor que necesita análisis detallados.',
        'auditor_senior': 'El usuario es un auditor senior con experiencia avanzada.',
        'administrador': 'El usuario es administrador del sistema.',
        'programador': 'El usuario es programador con conocimientos técnicos.'
    };

    const prompt = `Contexto: ${roleContext[userRole] || 'Usuario general'}\n\nHistorial de conversación:\n${historyText}\n\nMensaje actual: ${message}\n\nResponde de manera útil y profesional. Si la consulta es muy técnica o requiere acción humana, sugiere escalar a soporte humano.`;

    return await callAI(prompt, 'chat');
}

// ============================================
// GLOBAL ERROR HANDLING & LOADING STATES
// ============================================

// Global loading overlay
let loadingOverlay = null;
let loadingCount = 0;

function createLoadingOverlay() {
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'globalLoadingOverlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(3px);
        `;

        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 60px;
            height: 60px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        loadingOverlay.appendChild(spinner);
        document.head.appendChild(style);
    }
    return loadingOverlay;
}

// Show global loading indicator
function showLoading(show = true) {
    if (show) {
        loadingCount++;
        const overlay = createLoadingOverlay();
        if (!overlay.parentElement) {
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    } else {
        loadingCount = Math.max(0, loadingCount - 1);
        if (loadingCount === 0 && loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Show error message to user
function showError(message, duration = 5000) {
    // Remove existing error if present
    const existingError = document.getElementById('globalErrorToast');
    if (existingError) {
        existingError.remove();
    }

    const errorToast = document.createElement('div');
    errorToast.id = 'globalErrorToast';
    errorToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideInRight 0.3s ease-out;
    `;

    errorToast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="bi bi-exclamation-circle" style="font-size: 24px;"></i>
            <div>
                <strong style="display: block; margin-bottom: 4px;">Error</strong>
                <span>${sanitizeInput(message)}</span>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-left: auto;
                padding: 0;
                width: 24px;
                height: 24px;
            ">×</button>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(errorToast);

    if (duration > 0) {
        setTimeout(() => {
            errorToast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => errorToast.remove(), 300);
        }, duration);
    }
}

// Show success message to user
function showSuccess(message, duration = 3000) {
    const successToast = document.createElement('div');
    successToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideInRight 0.3s ease-out;
    `;

    successToast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="bi bi-check-circle" style="font-size: 24px;"></i>
            <span>${sanitizeInput(message)}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-left: auto;
                padding: 0;
                width: 24px;
                height: 24px;
            ">×</button>
        </div>
    `;

    document.body.appendChild(successToast);

    if (duration > 0) {
        setTimeout(() => {
            successToast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => successToast.remove(), 300);
        }, duration);
    }
}

function showWarning(message, duration = 5000) {
    const warningToast = document.createElement('div');
    warningToast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff9800;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideInRight 0.3s ease-out;
    `;

    warningToast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="bi bi-exclamation-triangle" style="font-size: 24px;"></i>
            <span>${sanitizeInput(message)}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                margin-left: auto;
                padding: 0;
                width: 24px;
                height: 24px;
            ">×</button>
        </div>
    `;

    document.body.appendChild(warningToast);

    if (duration > 0) {
        setTimeout(() => {
            warningToast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => warningToast.remove(), 300);
        }, duration);
    }
}

// Retry logic for failed API calls
async function retryAPICall(apiFunction, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await apiFunction();
            if (result && result.success) {
                return result;
            }
            // If not successful but no error thrown, continue retrying
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        } catch (error) {
            if (i === retries - 1) {
                throw error; // Last attempt failed
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
    throw new Error('Máximo número de reintentos alcanzado');
}

// Wrap API calls with error handling
async function safeAPICall(apiFunction, options = {}) {
    const {
        showLoading: shouldShowLoading = true,
        showErrorToast = true,
        errorMessage = 'Error al procesar la solicitud',
        retries = 0
    } = options;

    try {
        if (shouldShowLoading) showLoading(true);

        let result;
        if (retries > 0) {
            result = await retryAPICall(apiFunction, retries);
        } else {
            result = await apiFunction();
        }

        if (!result || !result.success) {
            const error = result?.error || errorMessage;
            if (showErrorToast) showError(error);
            return { success: false, error };
        }

        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        if (showErrorToast) {
            showError(error.message || errorMessage);
        }
        return { success: false, error: error.message || errorMessage };
    } finally {
        if (shouldShowLoading) showLoading(false);
    }
}

// ============================================
// INTEGRACIÓN CON SISTEMA DE NOTIFICACIONES
// ============================================

/**
 * Enviar notificación de compromiso próximo a vencer
 * @param {Object} commitment - Objeto del compromiso
 */
function notifyCommitmentDueSoon(commitment) {
    if (window.NotificationSystem) {
        const daysLeft = Math.ceil((new Date(commitment.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        window.NotificationSystem.warning(
            'Compromiso próximo a vencer',
            `"${commitment.description}" vence en ${daysLeft} día(s)`,
            { commitmentId: commitment.id, type: 'commitment_due' }
        );
    }
}

/**
 * Enviar notificación de nueva auditoría asignada
 * @param {Object} audit - Objeto de la auditoría
 */
function notifyNewAudit(audit) {
    if (window.NotificationSystem) {
        window.NotificationSystem.info(
            'Nueva auditoría asignada',
            `Se te ha asignado la auditoría "${audit.title}"`,
            { auditId: audit.id, type: 'audit_assigned' }
        );
    }
}

/**
 * Enviar notificación de éxito en operación
 * @param {string} operation - Descripción de la operación
 */
function notifySuccess(operation) {
    if (window.NotificationSystem) {
        window.NotificationSystem.success('Operación exitosa', operation);
    }
}

/**
 * Enviar notificación de error en operación
 * @param {string} operation - Descripción de la operación
 * @param {string} errorDetail - Detalle del error
 */
function notifyError(operation, errorDetail = '') {
    if (window.NotificationSystem) {
        const message = errorDetail ? `${operation}: ${errorDetail}` : operation;
        window.NotificationSystem.error('Error', message);
    }
}

/**
 * Verificar compromisos próximos a vencer y enviar notificaciones
 * Debe llamarse al cargar el dashboard o periódicamente
 */
async function checkUpcomingCommitments() {
    try {
        // Verificar si API está disponible
        if (!window.API || !window.API.Commitments) {
            return;
        }

        const result = await API.Commitments.getAll();
        if (!result.success || !result.data) {
            return;
        }

        const commitments = result.data;
        const today = new Date();
        const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));

        commitments.forEach(commitment => {
            if (commitment.status !== 'cumplido') {
                const deadline = new Date(commitment.deadline);

                // Notificar si vence en los próximos 3 días
                if (deadline >= today && deadline <= threeDaysFromNow) {
                    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                    // Verificar si ya se notificó hoy
                    const notifKey = `notified_commitment_${commitment.id}_${today.toDateString()}`;
                    if (!sessionStorage.getItem(notifKey)) {
                        notifyCommitmentDueSoon(commitment);
                        sessionStorage.setItem(notifKey, 'true');
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error verificando compromisos:', error);
    }
}

/**
 * Inicializar verificación periódica de notificaciones
 * Llamar al cargar la aplicación
 */
function initNotificationChecks() {
    // Verificar inmediatamente
    checkUpcomingCommitments();

    // Verificar cada 30 minutos
    setInterval(checkUpcomingCommitments, 30 * 60 * 1000);
}

/**
 * Crear celda con texto censurado (para emails y teléfonos)
 * @param {string} text - Texto a censurar
 * @param {boolean} isVisible - Si debe mostrarse el texto completo
 * @returns {HTMLElement|string} - Elemento HTML o texto
 */
function createCensoredCell(text, isVisible) {
    if (!text) return '';

    if (isVisible) {
        return text;
    }

    // Censurar: mostrar primeros 3 caracteres y últimos 2, resto con asteriscos
    if (text.length <= 5) {
        return '*'.repeat(text.length);
    }

    const start = text.substring(0, 3);
    const end = text.substring(text.length - 2);
    const middle = '*'.repeat(Math.max(1, text.length - 5));

    return start + middle + end;
}

/**
 * Crear celda con contraseña censurada
 * @param {string} password - Contraseña a censurar
 * @param {boolean} isVisible - Si debe mostrarse la contraseña completa
 * @returns {HTMLElement|string} - Elemento HTML o texto
 */
function createPasswordCell(password, isVisible) {
    if (!password) return '';

    if (isVisible) {
        return password;
    }

    return '*'.repeat(8);
}
