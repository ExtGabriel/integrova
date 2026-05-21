// Funciones para guardar formularios usando el sistema de API existente
// Integración con sistema actual de CFE INSIGHT

// Función auxiliar para parsear JSON seguro (copiada de subcategorias-data.js)
async function parseJsonSafe(response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (err) {
        throw new Error(`Respuesta no JSON (status ${response.status}): ${text.slice(0, 200)}`);
    }
}

// Función para construir URL de API (copiada de subcategorias-data.js)
function buildApiUrl(path) {
    const API_BASE = (window.API_BASE_URL || '').replace(/\/$/, '');
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

// Función principal para guardar formulario en la BD usando API existente
async function guardarFormularioEnBD(formId, formTitle, formData, subdocumentId = null) {
    try {
        console.log('💾 Guardando formulario en BD via API:', { formId, formTitle, formData });
        
        // Obtener ID del usuario actual (usar el mismo método que subcategorias-data.js)
        let userId = null;
        
        // Intentar obtener desde window.currentUser
        if (window.currentUser && window.currentUser.id) {
            userId = window.currentUser.id;
        }
        
        // Intentar desde localStorage
        if (!userId) {
            const userData = localStorage.getItem('currentUser') || localStorage.getItem('auth_user');
            if (userData) {
                const user = JSON.parse(userData);
                userId = user.id || user.user_id;
            }
        }
        
        if (!userId) {
            throw new Error('No se encontró ID de usuario');
        }
        
        // Enviar datos a la API
        const response = await fetch(buildApiUrl('/api/formularios/save'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            },
            body: JSON.stringify({
                form_id: formId,
                form_title: formTitle,
                form_data: formData,
                subdocument_id: subdocumentId,
                metadata: {
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    userId: userId
                }
            })
        });

        const result = await parseJsonSafe(response);
        
        if (!result.success) {
            throw new Error(result.error || 'Error al guardar formulario');
        }

        console.log('✅ Formulario guardado en BD:', result.formulario);
        showNotification(`Formulario ${formId} guardado correctamente en la base de datos`, 'success');
        
        return result.formulario;
        
    } catch (error) {
        console.error('❌ Error guardando formulario en BD:', error);
        showNotification(`Error al guardar formulario ${formId}: ${error.message}`, 'error');
        throw error;
    }
}

// Función para obtener formulario guardado previamente
async function getFormularioGuardado(formId, subdocumentId = null) {
    try {
        let userId = null;
        
        if (window.currentUser && window.currentUser.id) {
            userId = window.currentUser.id;
        } else {
            const userData = localStorage.getItem('currentUser') || localStorage.getItem('auth_user');
            if (userData) {
                const user = JSON.parse(userData);
                userId = user.id || user.user_id;
            }
        }
        
        if (!userId) {
            throw new Error('No se encontró ID de usuario');
        }
        
        const response = await fetch(buildApiUrl('/api/formularios/get'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            },
            body: JSON.stringify({
                form_id: formId,
                subdocument_id: subdocumentId
            })
        });

        const result = await parseJsonSafe(response);
        
        if (!result.success) {
            throw new Error(result.error || 'Error obteniendo formulario');
        }
        
        return result.formulario;
        
    } catch (error) {
        console.error('❌ Error obteniendo formulario guardado:', error);
        return null;
    }
}

// Función para listar todos los formularios del usuario
async function listarFormulariosUsuario() {
    try {
        let userId = null;
        
        if (window.currentUser && window.currentUser.id) {
            userId = window.currentUser.id;
        } else {
            const userData = localStorage.getItem('currentUser') || localStorage.getItem('auth_user');
            if (userData) {
                const user = JSON.parse(userData);
                userId = user.id || user.user_id;
            }
        }
        
        if (!userId) {
            throw new Error('No se encontró ID de usuario');
        }
        
        const response = await fetch(buildApiUrl('/api/formularios/list'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'user-id': userId
            }
        });

        const result = await parseJsonSafe(response);
        
        if (!result.success) {
            throw new Error(result.error || 'Error listando formularios');
        }
        
        return result.formularios || [];
        
    } catch (error) {
        console.error('❌ Error listando formularios del usuario:', error);
        return [];
    }
}

// Exportar funciones para uso global
window.guardarFormularioEnBD = guardarFormularioEnBD;
window.getFormularioGuardado = getFormularioGuardado;
window.listarFormulariosUsuario = listarFormulariosUsuario;

console.log('✅ Funciones de formularios API cargadas');
