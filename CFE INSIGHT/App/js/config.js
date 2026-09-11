/**
 * CONFIGURACIÓN GLOBAL DE LA APLICACIÓN - VANILLA JS (SIN BUNDLERS)
 * 
 * Este archivo NO usa import.meta ni módulos ES6.
 * Expone toda la configuración en window.APP_CONFIG
 */

// Configuración global de la aplicación
window.APP_CONFIG = {
    ENV: 'production',
    DEBUG: true,
    API_BASE_URL: window.location.origin,
    EMAILJS: {
        /**
         * 🔐 Configuración de EmailJS
         * IDs proporcionados por el usuario desde https://dashboard.emailjs.com/
         */
        serviceId: 'service_bpky4pq',
        templateId: 'template_t7jze9v', // Plantilla de restablecimiento de contraseña
        welcomeTemplateId: 'template_munblu4', // Plantilla de bienvenida
        publicKey: 'F9y4MfQXgCZr5Wi87',
        loginUrl: 'https://integrovagt.com/login', // URL de login para nuevos usuarios
    }
};

// Configuración dinámica de la URL base de la API para distintos entornos
// - En Vercel (dominios *.vercel.app) y en integrovagt.com, apuntamos siempre al backend en Railway
// - En otros entornos (desarrollo local, Railway sirviendo frontend), usamos el origin actual
(function configureApiBaseUrl() {
    try {
        const host = window.location.hostname || '';
        let apiBase = window.location.origin;

        if (
            host.endsWith('vercel.app') ||
            host === 'www.integrovagt.com' ||
            host === 'integrovagt.com'
        ) {
            apiBase = 'https://integrova-production-5b1b.up.railway.app';
        }

        window.APP_CONFIG.API_BASE_URL = apiBase;
        window.API_BASE_URL = apiBase;
    } catch (e) {
        // Si algo falla, mantener el valor por defecto basado en window.location.origin
        window.API_BASE_URL = window.APP_CONFIG.API_BASE_URL || window.location.origin;
    }
})();

/**
 * Configuración de APIs de IA - CLIENTE SIDE
 * NOTA DE SEGURIDAD: Las API keys han sido movidas al servidor backend.
 * Ahora todas las llamadas a IA pasan por el proxy seguro en /api/ai/*
 */
window.AI_CONFIG = {
    // Configuración del proxy backend
    proxy: {
        baseUrl: (window.APP_CONFIG?.API_BASE_URL || window.location.origin) + '/api/ai',
        timeout: 30000, // Timeout en ms
        enabled: true
    },

    // Configuración general (cliente-side safe)
    defaultProvider: 'openai',
    maxTokens: 1000,
    temperature: 0.7,

    // Contextos específicos para CFE INSIGHT (mantenidos para referencia)
    contexts: {
        soporte: 'soporte',
        auditoria: 'auditoria',
        reporte: 'reporte',
        chat: 'chat'
    }
};

/**
 * Función para validar configuración del proxy
 */
function validateAIConfig() {
    if (!window.AI_CONFIG.proxy.enabled) {
        console.warn('⚠️ Proxy de IA no habilitado. Las funcionalidades de IA estarán limitadas.');
        return false;
    }
    return true;
}

console.log('✅ config.js cargado (window.APP_CONFIG disponible)');

