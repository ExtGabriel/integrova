/**
 * CFE INSIGHT - Auth Guard Module
 * Verifica autenticación con Supabase y protege rutas
 */

import { supabaseClient } from './supabase-client.js';

const USER_UI_KEY = 'userUI';

/**
 * Verifica si el usuario tiene sesión activa en Supabase
 * Redirige a login si no está autenticado
 * @param {boolean} redirect - Si debe redirigir automáticamente (default: true)
 * @returns {Promise<object|null>} Sesión de Supabase o null
 */
export async function requireAuth(redirect = true) {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('❌ Error al verificar sesión:', error);
            if (redirect) {
                window.location.href = 'login.html';
            }
            return null;
        }

        if (!session) {
            console.warn('⚠️ No hay sesión activa');
            if (redirect) {
                window.location.href = 'login.html';
            }
            return null;
        }

        return session;
    } catch (error) {
        console.error('❌ Error crítico en auth guard:', error);
        if (redirect) {
            window.location.href = 'login.html';
        }
        return null;
    }
}

/**
 * Obtiene los datos de UI del usuario desde sessionStorage
 * @returns {object|null} Datos de UI o null
 */
export function getUserUI() {
    try {
        const userUIStr = sessionStorage.getItem(USER_UI_KEY);
        return userUIStr ? JSON.parse(userUIStr) : null;
    } catch (error) {
        console.error('Error al obtener userUI:', error);
        return null;
    }
}

/**
 * Cierra la sesión de Supabase y limpia sessionStorage
 */
export async function logout() {
    try {
        // Limpiar sessionStorage
        sessionStorage.removeItem(USER_UI_KEY);

        // Cerrar sesión en Supabase
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión en Supabase:', error);
        }

        // Redirigir a login
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error crítico en logout:', error);
        // Forzar redirección incluso si hay error
        window.location.href = 'login.html';
    }
}

/**
 * Inicializa el guard de autenticación en la página
 * Verifica sesión y configura el botón de logout
 * @param {string} logoutBtnId - ID del botón de logout (default: 'logoutBtn')
 * @returns {Promise<object|null>} Sesión de Supabase
 */
export async function initAuthGuard(logoutBtnId = 'logoutBtn') {
    // Verificar autenticación
    const session = await requireAuth();

    if (!session) {
        return null;
    }

    // Configurar botón de logout si existe
    const logoutBtn = document.getElementById(logoutBtnId);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    return session;
}

// Constante exportada para consistencia
export const USER_KEY = USER_UI_KEY;
