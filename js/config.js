// Configuración de APIs de IA - CLIENTE SIDE
// NOTA DE SEGURIDAD: Las API keys han sido movidas al servidor backend.
// Ahora todas las llamadas a IA pasan por el proxy seguro en /api/ai/*

const AI_CONFIG = {
    // Configuración del proxy backend
    proxy: {
        baseUrl: `${(typeof window !== 'undefined' && window.API_BASE_URL) ||
            (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.NEXT_PUBLIC_API_BASE_URL)) ||
            (typeof process !== 'undefined' && (process.env?.VITE_API_BASE_URL || process.env?.NEXT_PUBLIC_API_BASE_URL)) ||
            (typeof window !== 'undefined' ? window.location.origin : '')}/api/ai`,
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

// Función para validar configuración del proxy
function validateAIConfig() {
    if (!AI_CONFIG.proxy.enabled) {
        console.warn('Proxy de IA no habilitado. Las funcionalidades de IA estarán limitadas.');
        return false;
    }
    return true;
}

