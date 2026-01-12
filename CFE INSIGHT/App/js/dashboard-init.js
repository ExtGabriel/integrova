/**
 * DASHBOARD INITIALIZATION - FLUJO DE SESIÓN CON onAuthStateChange
 * 
 * Este archivo contiene la inicialización del dashboard con el flujo correcto:
 * 1. Verificar si window.API existe
 * 2. Usar supabase.auth.onAuthStateChange para monitorear estado de sesión
 * 3. SOLO redireccionar a login si event === 'SIGNED_OUT'
 * 4. Esperar sesión válida antes de inicializar
 * 5. Obtener perfil del usuario desde public.users
 * 6. Renderizar dashboard
 * 7. Dashboard se inicializa UNA SOLA VEZ después de confirmar sesión activa
 */

(function () {
    'use strict';

    let dashboardInitialized = false;

    /**
     * Configurar listener de cambios de autenticación
     * Se ejecuta cuando:
     * - event === 'INITIAL_SESSION': Al cargar la página (sesión actual)
     * - event === 'USER_UPDATED': Cuando se actualiza el usuario
     * - event === 'SIGNED_IN': Cuando inicia sesión
     * - event === 'SIGNED_OUT': Cuando cierra sesión (redirigir a login)
     * - event === 'TOKEN_REFRESHED': Cuando se refresca el token
     */
    async function setupAuthStateListener() {
        try {
            // Paso 1: Verificar que window.API existe
            if (!window.API) {
                console.error('❌ window.API no está disponible. Asegurate que api-client.js se cargó correctamente.');
                showFatalError('Error de configuración: API no disponible');
                return;
            }

            console.log('✅ window.API disponible');

            // Paso 2: Obtener cliente de Supabase
            if (!window.API.supabase) {
                console.error('❌ Supabase client no disponible');
                showFatalError('Error de configuración: Supabase no disponible');
                return;
            }

            // Paso 3: Configurar listener de estado de autenticación
            const { data: { subscription } } = window.API.supabase.auth.onAuthStateChange(
                async (event, session) => {
                    console.log(`🔐 Auth event: ${event}`, session ? '✅ Sesión activa' : '❌ Sin sesión');

                    // SOLO redirigir a login si SIGNED_OUT
                    if (event === 'SIGNED_OUT') {
                        console.warn('⚠️ Sesión cerrada por usuario o por inactividad');
                        redirectToLogin();
                        return;
                    }

                    // Si hay sesión válida (INITIAL_SESSION, USER_UPDATED, SIGNED_IN, TOKEN_REFRESHED)
                    if (session && session.user) {
                        console.log('✅ Sesión válida detectada:', session.user.id);

                        // Inicializar dashboard SOLO UNA VEZ
                        if (!dashboardInitialized) {
                            dashboardInitialized = true;
                            console.log('🔄 Inicializando dashboard (primera vez)...');
                            await initDashboard(session);
                        } else {
                            // En otros eventos (TOKEN_REFRESHED, USER_UPDATED), solo actualizar datos
                            console.log('🔄 Actualizando datos tras cambio de sesión...');
                            await updateDashboardData(session);
                        }
                    } else {
                        // Sin sesión pero no es SIGNED_OUT (ej: timeout esperando sesión inicial)
                        if (event !== 'INITIAL_SESSION') {
                            console.warn('⚠️ Sesión inválida sin evento SIGNED_OUT');
                            redirectToLogin();
                        }
                    }
                }
            );

            // Guardar subscription para limpiar si es necesario
            window.authSubscription = subscription;

        } catch (error) {
            console.error('❌ Error configurando listener de autenticación:', error);
            showFatalError('Error al configurar autenticación. Por favor, recarga la página.');
        }
    }

    /**
     * Flujo principal de inicialización del dashboard (ejecuta UNA sola vez)
     */
    async function initDashboard(session) {
        try {
            // Mostrar indicador de carga
            window.API.showLoading(true);

            // Guardar sesión
            window.currentSession = session;

            // Obtener perfil del usuario
            console.log('🔄 Obteniendo perfil...');
            const profile = await window.API.getMyProfile();

            if (!profile) {
                console.error('❌ No se pudo obtener el perfil del usuario');
                window.API.showLoading(false);
                showFatalError('No se encontró tu perfil de usuario. Contacta a un administrador.');
                return;
            }

            console.log('✅ Perfil obtenido:', profile.id);

            // Guardar perfil
            window.currentUserProfile = profile;

            // Renderizar dashboard
            console.log('🔄 Renderizando dashboard...');
            renderDashboard(profile);

            // Cargar datos del dashboard
            console.log('🔄 Cargando datos...');
            await loadDashboardData();

            // Configurar event listeners
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
     * Actualizar datos del dashboard sin reinicializar (para cambios de sesión)
     */
    async function updateDashboardData(session) {
        try {
            console.log('🔄 Actualizando datos del dashboard...');

            // Actualizar perfil
            const profile = await window.API.getMyProfile();
            if (profile) {
                window.currentUserProfile = profile;
                window.currentSession = session;
                console.log('✅ Datos actualizados');
            }

        } catch (error) {
            console.error('⚠️ Error actualizando datos:', error);
            // No redirigimos aquí, dejamos que onAuthStateChange maneje el caso
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
     * PUNTO DE ENTRADA: Inicializar listener de autenticación
     * Se llama cuando dashboard-init.js carga (después de que api-client.js esté listo)
     */
    console.log('⏳ dashboard-init.js cargado. Esperando window.API...');

    // Esperar a que window.API esté disponible (cargado por api-client.js)
    const maxAttempts = 50; // 5 segundos máximo
    let attempts = 0;

    const checkAPIAndInit = setInterval(() => {
        attempts++;
        if (window.API) {
            clearInterval(checkAPIAndInit);
            console.log('✅ window.API disponible. Configurando listener de autenticación...');
            setupAuthStateListener();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkAPIAndInit);
            console.error('❌ window.API no se cargó en tiempo');
            showFatalError('Error de configuración: API no disponible. Por favor, recarga la página.');
        }
    }, 100);

})();
