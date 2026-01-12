/**
 * DASHBOARD INITIALIZATION - SEGURA Y DEFENSIVA
 * 
 * Este archivo contiene la inicialización del dashboard con el flujo correcto:
 * 1. Verificar si window.API existe
 * 2. Obtener sesión desde Supabase
 * 3. Si no hay sesión → redirigir a login
 * 4. Obtener perfil del usuario desde public.users
 * 5. Si no hay perfil → mostrar error
 * 6. Renderizar dashboard
 */

(function () {
    'use strict';

    /**
     * Flujo principal de inicialización del dashboard
     */
    async function initDashboard() {
        try {
            // Paso 1: Verificar que window.API existe
            if (!window.API) {
                console.error('❌ window.API no está disponible. Asegurate que api-client.js se cargó correctamente.');
                showFatalError('Error de configuración: API no disponible');
                return;
            }

            console.log('✅ window.API disponible');

            // Mostrar indicador de carga
            window.API.showLoading(true);

            // Paso 2: Obtener sesión
            console.log('🔄 Obteniendo sesión...');
            const session = await window.API.getSession();

            if (!session) {
                console.warn('⚠️ No hay sesión activa');
                redirectToLogin();
                return;
            }

            console.log('✅ Sesión obtenida:', session.user.id);

            // Paso 3: Obtener perfil del usuario
            console.log('🔄 Obteniendo perfil...');
            const profile = await window.API.getMyProfile();

            if (!profile) {
                console.error('❌ No se pudo obtener el perfil del usuario');
                window.API.showLoading(false);
                showFatalError('No se encontró tu perfil de usuario. Contacta a un administrador.');
                return;
            }

            console.log('✅ Perfil obtenido:', profile.id);

            // Paso 4: Guardar datos en sesión
            window.currentUserProfile = profile;
            window.currentSession = session;

            // Paso 5: Renderizar dashboard
            console.log('🔄 Renderizando dashboard...');
            renderDashboard(profile);

            // Paso 6: Cargar datos del dashboard
            console.log('🔄 Cargando datos...');
            await loadDashboardData();

            // Paso 7: Configurar event listeners
            setupEventListeners();

            console.log('✅ Dashboard inicializado correctamente');
            window.API.showLoading(false);

        } catch (error) {
            console.error('❌ Error iniciando dashboard:', error);
            window.API.showLoading(false);
            showFatalError('Error al cargar el dashboard. Por favor, recarga la página.');
        }
    }

    /**
     * Renderizar dashboard con datos del perfil
     */
    function renderDashboard(profile) {
        // Mostrar nombre del usuario
        const welcomeText = document.getElementById('welcomeText');
        if (welcomeText) {
            const name = profile.full_name || profile.name || profile.email || 'Usuario';
            welcomeText.textContent = `Bienvenido, ${name}`;
        }

        // Aplicar restricciones por rol
        if (profile.role) {
            applyRoleRestrictions(profile.role);
        }

        // Actualizar mes actual
        updateCurrentMonth();
    }

    /**
     * Actualizar mes actual mostrado en el dashboard
     */
    function updateCurrentMonth() {
        const currentMonthEl = document.getElementById('currentMonth');
        if (currentMonthEl) {
            const now = new Date();
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            currentMonthEl.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
        }
    }

    /**
     * Cargar datos del dashboard desde la API
     */
    async function loadDashboardData() {
        try {
            // Los datos se cargarán desde dashboard.js
            // Este archivo solo maneja la inicialización
            if (typeof loadDashboardDataFromAPI === 'function') {
                await loadDashboardDataFromAPI();
            }
        } catch (error) {
            console.error('❌ Error cargando datos del dashboard:', error);
        }
    }

    /**
     * Configurar event listeners
     */
    function setupEventListeners() {
        // Botón de logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Otros listeners pueden agregarse aquí
    }

    /**
     * Aplicar restricciones por rol
     */
    function applyRoleRestrictions(role) {
        const navItems = document.querySelectorAll('[data-role-restrict]');

        navItems.forEach(item => {
            const requiredRoles = item.getAttribute('data-role-restrict');
            if (requiredRoles && !requiredRoles.includes(role)) {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Manejar logout
     */
    async function handleLogout() {
        try {
            await window.API.signOut();
            redirectToLogin();
        } catch (error) {
            console.error('❌ Error cerrando sesión:', error);
            redirectToLogin();
        }
    }

    /**
     * Redirigir a login
     */
    function redirectToLogin() {
        const isInPages = window.location.pathname.includes('/pages/');
        const loginUrl = isInPages ? 'login.html' : '/pages/login.html';
        window.location.href = loginUrl;
    }

    /**
     * Mostrar error fatal
     */
    function showFatalError(message) {
        const container = document.body;
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; padding: 20px;">
                <div style="background: white; border-radius: 8px; padding: 40px; max-width: 500px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; color: #d32f2f; margin-bottom: 20px;">⚠️</div>
                        <h1 style="color: #d32f2f; margin-bottom: 20px; font-size: 24px;">Error</h1>
                        <p style="color: #666; margin-bottom: 30px; font-size: 16px; line-height: 1.5;">${message}</p>
                        <button onclick="window.location.href='login.html'" style="background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px;">
                            Ir a Login
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Exponer initDashboard globalmente
     */
    window.initDashboard = initDashboard;

    console.log('✅ dashboard-init.js cargado (window.initDashboard disponible)');

})();
