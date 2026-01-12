/**
 * CFE INSIGHT - API CLIENT (VANILLA JS)
 * 
 * Cliente centralizado DEFENSIVO para Supabase + APIs.
 * Expone window.API con métodos seguros.
 * 
 * REQUISITO: supabaseClient.js y config-supabase.js deben cargarse ANTES de este archivo.
 */

(function () {
    'use strict';

    /**
     * ==========================================
     * INICIALIZACIÓN
     * ==========================================
     */

    // Esperar a que Supabase esté inicializado
    let supabaseReady = window.supabaseReady || Promise.resolve();
    if (!supabaseReady || !supabaseReady.then) {
        supabaseReady = Promise.resolve();
    }

    // Estado global
    let currentSession = null;
    let currentProfile = null;

    /**
     * ==========================================
     * FUNCIONES CORE DE SESIÓN Y PERFIL
     * ==========================================
     */

    /**
     * Obtener sesión actual desde Supabase
     */
    async function getSession() {
        try {
            if (!window.getSupabaseSession) {
                console.warn('⚠️ getSupabaseSession no disponible');
                return null;
            }

            const { data, error } = await window.getSupabaseSession();
            if (error || !data.session) {
                return null;
            }

            currentSession = data.session;
            return currentSession;
        } catch (err) {
            console.error('❌ Error obteniendo sesión:', err);
            return null;
        }
    }

    /**
     * Obtener perfil del usuario actual desde public.users
     * Filtra por auth.uid()
     */
    async function getMyProfile() {
        try {
            // Primero, obtener la sesión
            const session = await getSession();
            if (!session || !session.user || !session.user.id) {
                console.error('❌ No hay sesión activa');
                return null;
            }

            const userId = session.user.id;

            // Obtener cliente Supabase
            const client = await window.getSupabaseClient();
            if (!client) {
                console.error('❌ Supabase no inicializado');
                return null;
            }

            // Consultar public.users filtrando por id = auth.uid()
            const { data, error } = await client
                .from('users')
                .select('*')
                .eq('auth_id', userId)
                .maybeSingle();

            if (error) {
                console.error('❌ Error obteniendo perfil:', error);
                return null;
            }

            if (!data) {
                console.warn('⚠️ Perfil no encontrado para auth_id:', userId);
                return null;
            }

            currentProfile = data;
            return currentProfile;
        } catch (err) {
            console.error('❌ Error inesperado en getMyProfile:', err);
            return null;
        }
    }

    /**
     * Cerrar sesión
     */
    async function signOut() {
        try {
            const client = await window.getSupabaseClient();
            if (client) {
                await client.auth.signOut();
            }
            currentSession = null;
            currentProfile = null;
            sessionStorage.removeItem('userUI');
            return { success: true };
        } catch (err) {
            console.error('❌ Error cerrando sesión:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * ==========================================
     * API GLOBAL CENTRALIZADA
     * ==========================================
     */

    window.API = {
        // === Sesión y Autenticación ===
        getSession,
        getMyProfile,
        signOut,

        // === Funciones auxiliares ===
        showError(message, containerId = 'alertContainer') {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Container not found:', containerId);
                alert(message);
                return;
            }
            container.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="bi bi-exclamation-triangle"></i> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            setTimeout(() => { container.innerHTML = ''; }, 5000);
        },

        showSuccess(message, containerId = 'alertContainer') {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Container not found:', containerId);
                alert(message);
                return;
            }
            container.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="bi bi-check-circle"></i> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            setTimeout(() => { container.innerHTML = ''; }, 3000);
        },

        showLoading(show, containerId = 'loadingContainer') {
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
    };

    // Log
    console.log('✅ API Client inicializado (window.API disponible)');

})();
