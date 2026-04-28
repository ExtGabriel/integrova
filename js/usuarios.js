/**
 * CFE INSIGHT - MÓDULO DE USUARIOS (VANILLA JS)
 * 
 * Funcionalidad completa y DEFENSIVA:
 * ✅ Listar usuarios con filtros
 * ✅ Cambiar rol de usuario (si tiene permiso)
 * ✅ Activar/desactivar usuario (si tiene permiso)
 * ✅ Manejo robusto de errores 401/403
 * ✅ Bloqueo de UI si no tiene permisos
 * ✅ Mensajes claros en la UI, no solo console.log
 * ✅ Integración con permissions-helpers.js
 * 
 * REQUISITOS:
 * - api-client.js debe estar cargado (window.API)
 * - permissions-helpers.js debe estar cargado (window.PermissionsHelper)
 * - auth-guard.js debe estar cargado (window.protectPage, window.getUserUI)
 */

(function () {
    'use strict';

    console.log('📋 usuarios.js: Inicializando módulo de usuarios...');

    // ==========================================
    // ESTADO GLOBAL
    // ==========================================

    let allUsers = [];
    let visibleUsers = new Set();
    let currentUserProfile = null;
    let currentUserRole = null;
    let canChangeRoles = false;
    let canChangeStatus = false;
    let hasAccessToUsers = false;
    const ALLOWED_GLOBAL_ROLES = ['admin', 'user'];

    // ==========================================
    // UTILIDADES DEFENSIVAS
    // ==========================================

    /**
     * Normalizar valor a array de forma segura
     */
    function normalizeToArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'object') return [value];
        return [];
    }

    /**
     * Agregar contenido a una celda TD de forma segura
     */
    function appendCellContent(td, content) {
        if (!content && content !== 0) {
            td.textContent = '';
            return;
        }
        if (content instanceof Node) {
            td.appendChild(content);
        } else {
            td.innerHTML = String(content);
        }
    }

    /**
     * Mostrar mensaje de error en la UI
     */
    function showErrorMsg(message, duration = 5000) {
        console.error('❌', message);
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) {
            alert(message);
            return;
        }
        alertContainer.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle"></i> <strong>Error:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        setTimeout(() => { alertContainer.innerHTML = ''; }, duration);
    }

    /**
     * Mostrar mensaje de éxito en la UI
     */
    function showSuccessMsg(message, duration = 3000) {
        console.log('✅', message);
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) {
            alert(message);
            return;
        }
        alertContainer.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        setTimeout(() => { alertContainer.innerHTML = ''; }, duration);
    }

    /**
     * Mostrar indicador de carga
     */
    function showLoading(visible) {
        const loadingContainer = document.getElementById('loadingContainer');
        if (!loadingContainer) return;

        if (visible) {
            loadingContainer.innerHTML = `
                <div class="text-center my-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-2">Cargando usuarios...</p>
                </div>
            `;
            loadingContainer.style.display = 'block';
        } else {
            loadingContainer.innerHTML = '';
            loadingContainer.style.display = 'none';
        }
    }

    /**
     * Bloquear elemento de UI con mensaje
     */
    function disableWithTooltip(element, tooltip) {
        if (!element) return;
        element.disabled = true;
        element.title = tooltip;
        element.style.opacity = '0.5';
        element.style.cursor = 'not-allowed';
    }

    /**
     * Interpretar error de API y mostrar mensaje amigable
     */
    function interpretApiError(error) {
        // Error explícito del servidor
        if (typeof error === 'string') {
            return error;
        }

        // Validar input
        if (!error) {
            return 'Error desconocido. Por favor, intenta de nuevo.';
        }

        // Error con código HTTP explícito
        if (error.code === 'PGRST301' || error.code === 403) {
            return '🚫 Acceso denegado (403): No tienes permiso para hacer esta operación';
        }
        if (error.code === '401' || error.code === 401 || error.message?.includes('401')) {
            return '⚠️ Tu sesión expiró. Por favor, recarga la página e intenta de nuevo.';
        }

        // Error de tabla no existe
        if (error.code === 'PGRST205' || error.message?.includes('relation')) {
            return '⚠️ La tabla de datos no existe aún. Intenta más tarde.';
        }

        // Error de red
        if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
            return '🔌 Error de conexión. Verifica tu conexión a internet.';
        }

        // Error genérico con mensaje
        if (error.message) {
            return error.message;
        }

        return 'Error desconocido. Por favor, intenta de nuevo.';
    }

    // ==========================================
    // VALIDACIONES Y PERMISOS
    // ==========================================

    /**
     * Validar acceso al módulo de usuarios
     */
    async function validateAccess() {
        try {
            console.log('🔐 usuarios.js: Validando acceso...');

            // 🎯 ESPERAR A QUE EL USUARIO ESTÉ COMPLETAMENTE CARGADO
            console.log('⏳ usuarios.js: Esperando window.currentUserReady...');
            await window.currentUserReady;
            console.log('✅ usuarios.js: window.currentUserReady resuelto');

            // Verificar que currentUser esté disponible
            if (!window.currentUser) {
                console.error('❌ window.currentUser no disponible después de esperar');
                showErrorMsg('❌ Error cargando datos de usuario. Por favor, recarga la página.');
                disableUI();
                return false;
            }

            console.log(`✅ Usuario: ${window.currentUser.name} (${window.currentUser.role})`);

            // 🔒 VALIDAR SOLO ROLE = 'admin'
            const userRole = window.currentUser.role;

            if (userRole !== 'admin') {
                console.warn(`⚠️ Acceso denegado - Role: ${userRole}`);
                showErrorMsg('❌ Acceso denegado. Solo administradores pueden gestionar usuarios.');
                disableUI();
                return false;
            }

            console.log(`✅ Acceso permitido - Admin: ${window.currentUser.name}`);

            // Setear variables de módulo
            currentUserProfile = window.currentUser;
            currentUserRole = window.currentUser.role;
            hasAccessToUsers = true;

            // Cargar permisos específicos
            canChangeRoles = await API.Users.canChangeRoles();
            canChangeStatus = await API.Users.canChangeStatus();

            console.log('✅ Permisos cargados:', { canChangeRoles, canChangeStatus });

            return true;
        } catch (err) {
            console.error('❌ Error validando acceso:', err);
            showErrorMsg('Error al validar permisos de acceso.');
            return false;
        }
    }

    /**
     * Deshabilitar UI completamente
     */
    function disableUI() {
        const addUserBtn = document.getElementById('addUserBtn');
        const searchInput = document.getElementById('searchInput');
        const roleFilter = document.getElementById('roleFilter');

        if (addUserBtn) disableWithTooltip(addUserBtn, 'No tienes permiso para crear usuarios');
        if (searchInput) searchInput.disabled = true;
        if (roleFilter) roleFilter.disabled = true;

        document.getElementById('usersTableBody').innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div style="padding: 40px;">
                        <i class="bi bi-shield-exclamation" style="font-size: 2.5em; color: #dc3545;"></i>
                        <p style="margin-top: 15px; color: #dc3545;">
                            <strong>Acceso Denegado</strong><br>
                            No tienes permiso para acceder a la gestión de usuarios.
                        </p>
                    </div>
                </td>
            </tr>
        `;
    }

    // ==========================================
    // CARGAR USUARIOS
    // ==========================================

    /**
     * Cargar lista de usuarios desde API
     */
    async function loadUsers() {
        try {
            showLoading(true);
            console.log('📥 Cargando usuarios...');

            // Obtener usuarios según permisos
            const result = await API.Users.getAccessibleUsers();

            if (!result.success) {
                console.warn('⚠️ API retornó error:', result);
                allUsers = [];
                renderUsers();
                showLoading(false);
                return;
            }

            if (!result.data) {
                console.warn('⚠️ Sin datos de usuarios');
                allUsers = [];
                renderUsers();
                showLoading(false);
                return;
            }

            // Normalizar datos
            allUsers = (result.data || []).map(u => ({
                id: u.id,
                username: u.username || (u.email ? u.email.split('@')[0] : 'N/A'),
                name: u.full_name || u.name || 'Sin nombre',
                full_name: u.full_name || u.name || 'Sin nombre',
                email: u.email || 'No disponible',
                phone: u.phone || 'No disponible',
                role: u.role || 'Sin rol',
                team: Array.isArray(u.groups) && u.groups.length ? u.groups[0] : (u.group || 'Sin grupo'),
                active: u.active !== false,
                password: '••••••••',
                created_at: u.created_at || null
            }));

            console.log(`✅ ${allUsers.length} usuarios cargados`);
            renderUsers();

            if (allUsers.length === 0) {
                console.info('ℹ️ No hay usuarios disponibles (tabla vacía o sin permisos suficientes)');
            }

            showLoading(false);
        } catch (err) {
            console.error('❌ Error al cargar usuarios:', err);
            showErrorMsg(`Error al cargar usuarios: ${interpretApiError(err)}`);
            allUsers = [];
            renderUsers();
            showLoading(false);
        }
    }

    // ==========================================
    // RENDERIZAR TABLA
    // ==========================================

    /**
     * Renderizar tabla de usuarios
     */
    function renderUsers(filteredUsers = allUsers) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            console.warn('❌ No se encontró tbody con id "usersTableBody"');
            return;
        }

        tbody.innerHTML = '';
        const safeUsers = normalizeToArray(filteredUsers);

        if (safeUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">
                        <i class="bi bi-inbox"></i> No hay usuarios que mostrar
                    </td>
                </tr>
            `;
            return;
        }

        safeUsers.forEach(user => {
            const row = document.createElement('tr');

            // Username
            const tdUsername = document.createElement('td');
            tdUsername.textContent = user.username || '';
            row.appendChild(tdUsername);

            // Nombre
            const tdName = document.createElement('td');
            tdName.textContent = user.name || '';
            row.appendChild(tdName);

            // Email
            const tdEmail = document.createElement('td');
            tdEmail.textContent = user.email;
            row.appendChild(tdEmail);

            // Teléfono
            const tdPhone = document.createElement('td');
            tdPhone.textContent = user.phone;
            row.appendChild(tdPhone);

            // Rol (con selector si puede cambiar)
            const tdRole = document.createElement('td');
            if (canChangeRoles) {
                const select = document.createElement('select');
                select.className = 'form-select form-select-sm';
                select.value = (user.role || '').toLowerCase();

                ALLOWED_GLOBAL_ROLES.forEach(r => {
                    const option = document.createElement('option');
                    option.value = r;
                    option.textContent = r === 'admin' ? 'Administrador' : 'Usuario';
                    select.appendChild(option);
                });

                select.addEventListener('change', () => updateUserRole(user.id, select.value));
                tdRole.appendChild(select);
            } else {
                tdRole.textContent = user.role || 'Sin rol';
                tdRole.style.fontStyle = 'italic';
            }
            row.appendChild(tdRole);

            // Equipo/Grupo
            const tdEquipo = document.createElement('td');
            tdEquipo.textContent = user.team || '';
            row.appendChild(tdEquipo);

            // Estado (con botón si puede cambiar)
            const tdEstado = document.createElement('td');
            if (canChangeStatus) {
                const btn = document.createElement('button');
                btn.className = `btn btn-sm ${user.active ? 'btn-success' : 'btn-danger'}`;
                btn.innerHTML = user.active
                    ? '<i class="bi bi-check-circle"></i> Activo'
                    : '<i class="bi bi-x-circle"></i> Inactivo';
                btn.title = `Clic para ${user.active ? 'desactivar' : 'activar'} usuario`;
                btn.addEventListener('click', () => toggleUserActive(user.id, !user.active));
                tdEstado.appendChild(btn);
            } else {
                const badge = document.createElement('span');
                badge.className = user.active ? 'badge bg-success' : 'badge bg-danger';
                badge.textContent = user.active ? 'Activo' : 'Inactivo';
                tdEstado.appendChild(badge);
            }
            row.appendChild(tdEstado);

            // Contraseña
            const tdPassword = document.createElement('td');
            tdPassword.textContent = user.password;
            tdPassword.style.fontFamily = 'monospace';
            row.appendChild(tdPassword);

            // Acciones
            const tdActions = document.createElement('td');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'user-actions';

            // Botón Edit (deshabilitado)
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn btn-sm btn-warning';
            btnEdit.innerHTML = '<i class="bi bi-pencil-fill"></i>';
            disableWithTooltip(btnEdit, 'Edición no disponible');
            actionsDiv.appendChild(btnEdit);

            // Botón Delete (deshabilitado)
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn btn-sm btn-danger';
            btnDelete.innerHTML = '<i class="bi bi-trash-fill"></i>';
            disableWithTooltip(btnDelete, 'Eliminación no disponible');
            actionsDiv.appendChild(btnDelete);

            // Botón View (mostrar/ocultar datos sensibles)
            const btnToggle = document.createElement('button');
            btnToggle.className = 'btn btn-sm btn-info';
            btnToggle.innerHTML = visibleUsers.has(user.id)
                ? '<i class="bi bi-eye-slash-fill"></i>'
                : '<i class="bi bi-eye-fill"></i>';
            btnToggle.title = 'Ver/Ocultar datos sensibles';
            btnToggle.addEventListener('click', () => toggleUserVisibility(user.id));
            actionsDiv.appendChild(btnToggle);

            tdActions.appendChild(actionsDiv);
            row.appendChild(tdActions);

            tbody.appendChild(row);
        });
    }

    // ==========================================
    // ACCIONES DE USUARIO
    // ==========================================

    /**
     * Cambiar rol de un usuario
     */
    async function updateUserRole(userId, newRole) {
        try {
            if (!userId || !newRole) {
                showErrorMsg('Datos inválidos para cambiar rol.');
                return;
            }

            // Validar que sea administrador
            if (!PermissionsHelper.isAdmin()) {
                showErrorMsg('No tienes permiso para cambiar roles. Solo administradores pueden hacerlo.');
                return;
            }

            const normalizedRole = newRole.toLowerCase();
            if (!ALLOWED_GLOBAL_ROLES.includes(normalizedRole)) {
                showErrorMsg('Rol inválido. Solo se permiten roles globales: admin o user');
                loadUsers();
                return;
            }

            showLoading(true);
            console.log(`🔄 Cambiando rol de usuario ${userId} a ${normalizedRole}...`);

            const result = await API.Users.updateRole(userId, normalizedRole);
            showLoading(false);

            if (!result.success) {
                const errorMsg = interpretApiError(result.error);
                console.error('❌ Error al cambiar rol:', result.error);
                showErrorMsg(errorMsg);
                loadUsers(); // Recargar para mostrar valor anterior
                return;
            }

            showSuccessMsg(`✅ Rol actualizado correctamente a: ${normalizedRole}`);
            loadUsers();
        } catch (err) {
            showLoading(false);
            console.error('❌ Error en updateUserRole:', err);
            const errorMsg = interpretApiError(err);
            showErrorMsg(errorMsg);
            loadUsers();
        }
    }

    /**
     * Activar/desactivar usuario
     */
    async function toggleUserActive(userId, isActive) {
        try {
            if (!userId || typeof isActive !== 'boolean') {
                showErrorMsg('Datos inválidos para cambiar estado.');
                return;
            }

            // Validar que sea administrador
            if (!PermissionsHelper.isAdmin()) {
                showErrorMsg('No tienes permiso para cambiar estado. Solo administradores pueden hacerlo.');
                return;
            }

            const status = isActive ? 'activar' : 'desactivar';
            showLoading(true);
            console.log(`🔄 ${status} usuario ${userId}...`);

            const result = await API.Users.toggleActive(userId, isActive);
            showLoading(false);

            if (!result.success) {
                const errorMsg = interpretApiError(result.error);
                console.error(`❌ Error al ${status}:`, result.error);
                showErrorMsg(errorMsg);
                loadUsers();
                return;
            }

            const finalStatus = isActive ? 'activado' : 'desactivado';
            showSuccessMsg(`✅ Usuario ${finalStatus} correctamente`);
            loadUsers();
        } catch (err) {
            showLoading(false);
            console.error('❌ Error en toggleUserActive:', err);
            const errorMsg = interpretApiError(err);
            showErrorMsg(errorMsg);
            loadUsers();
        }
    }

    /**
     * Mostrar/ocultar usuario en la lista
     */
    function toggleUserVisibility(userId) {
        if (visibleUsers.has(userId)) {
            visibleUsers.delete(userId);
        } else {
            visibleUsers.add(userId);
        }
        renderUsers();
    }

    /**
     * Abrir modal de agregar usuario
     */
    function openAddModal() {
        // Verificar permisos
        if (!canChangeRoles) {
            showErrorMsg('No tienes permisos para crear usuarios');
            return;
        }

        // Limpiar formulario
        const form = document.getElementById('createUserForm');
        if (form) {
            form.reset();
        }

        // Ocultar mensaje de error
        const errorSection = document.getElementById('createUserError');
        if (errorSection) {
            errorSection.style.display = 'none';
        }

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
        modal.show();
    }

    /**
     * Confirmar y crear usuario
     */
    async function confirmCreateUser() {
        const form = document.getElementById('createUserForm');
        const errorSection = document.getElementById('createUserError');
        const errorMessage = document.getElementById('createUserErrorMessage');

        // Validar formulario
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const userData = {
            name: document.getElementById('createUserName').value.trim(),
            email: document.getElementById('createUserEmail').value.trim(),
            password: document.getElementById('createUserPassword').value,
            role: document.getElementById('createUserRole').value,
            phone: document.getElementById('createUserPhone').value.trim() || null,
            team: document.getElementById('createUserTeam').value.trim() || null
        };

        // Validación adicional
        if (!userData.name || !userData.email || !userData.password || !userData.role) {
            errorSection.style.display = 'block';
            errorMessage.textContent = 'Todos los campos marcados con * son requeridos';
            return;
        }

        if (userData.password.length < 6) {
            errorSection.style.display = 'block';
            errorMessage.textContent = 'La contraseña debe tener al menos 6 caracteres';
            return;
        }

        const normalizedRole = userData.role.toLowerCase();
        if (!ALLOWED_GLOBAL_ROLES.includes(normalizedRole)) {
            errorSection.style.display = 'block';
            errorMessage.textContent = 'Rol inválido. Solo se permiten roles globales: admin o user';
            return;
        }
        userData.role = normalizedRole;

        try {
            window.showLoading(true);
            errorSection.style.display = 'none';

            // Verificar que la API esté disponible
            if (!window.API || !window.API.Users) {
                throw new Error('API.Users no está disponible');
            }

            const response = await API.Users.create(userData);
            console.log('✅ Respuesta de creación:', response);

            if (!response.success) {
                // Mostrar error
                errorSection.style.display = 'block';
                errorMessage.textContent = response.error || 'Error desconocido al crear usuario';
                return;
            }

            // Éxito: cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
            if (modal) modal.hide();

            // Recargar lista de usuarios
            await loadUsers();

            // Mostrar mensaje de éxito
            showSuccessMsg(`Usuario ${userData.name} creado exitosamente`);

        } catch (error) {
            console.error('❌ Error creando usuario:', error);
            errorSection.style.display = 'block';
            errorMessage.textContent = error.message || 'Error desconocido al crear usuario';
        } finally {
            window.showLoading(false);
        }
    }

    // Exponer función confirmCreateUser globalmente
    window.confirmCreateUser = confirmCreateUser;

    // ==========================================
    // FILTRADO Y BÚSQUEDA
    // ==========================================

    /**
     * Filtrar usuarios por búsqueda y rol
     */
    function filterUsers(query) {
        const q = (query || '').toLowerCase();
        const roleFilter = document.getElementById('roleFilter');
        const role = roleFilter ? (roleFilter.value || '') : '';

        const filtered = allUsers.filter(u => {
            const matchesQuery = !q ||
                (u.username || '').toLowerCase().includes(q) ||
                (u.name || u.full_name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.phone || '').toLowerCase().includes(q);

            const matchesRole = !role || (u.role || '').toLowerCase() === role.toLowerCase();

            return matchesQuery && matchesRole;
        });

        renderUsers(filtered);
    }

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    /**
     * Inicializar página de usuarios
     */
    async function initializePage() {
        try {
            console.log('🎬 Inicializando página de usuarios...');

            // Validar acceso
            const hasAccess = await validateAccess();
            if (!hasAccess) {
                console.error('❌ Acceso denegado al módulo de usuarios');
                return;
            }

            // Cargar usuarios
            await loadUsers();

            // Configurar eventos
            const searchInput = document.getElementById('searchInput');
            const roleFilter = document.getElementById('roleFilter');
            const addUserBtn = document.getElementById('addUserBtn');

            if (searchInput) {
                searchInput.addEventListener('input', (e) => filterUsers(e.target.value));
            }

            if (roleFilter) {
                roleFilter.addEventListener('change', () => {
                    const searchQuery = searchInput ? searchInput.value : '';
                    filterUsers(searchQuery);
                });
            }

            if (addUserBtn) {
                if (!hasAccessToUsers) {
                    disableWithTooltip(addUserBtn, 'No tienes permiso para crear usuarios');
                } else {
                    addUserBtn.addEventListener('click', openAddModal);
                }
            }

            console.log('✅ Página de usuarios inicializada correctamente');
        } catch (err) {
            console.error('❌ Error en inicialización:', err);
            showErrorMsg(`Error en inicialización: ${interpretApiError(err)}`);
        }
    }

    // ==========================================
    // PROTEGER PÁGINA Y EJECUTAR
    // ==========================================

    // Proteger página y ejecutar inicialización
    window.protectPage(initializePage);

    // Exponer funciones globales para debugging
    window.__usuariosDebug = {
        allUsers: () => allUsers,
        currentUserProfile: () => currentUserProfile,
        currentUserRole: () => currentUserRole,
        permisos: () => ({
            canChangeRoles,
            canChangeStatus,
            hasAccessToUsers
        }),
        reloadUsers: () => loadUsers(),
        filterUsers: (query) => filterUsers(query)
    };

    // Exponer funciones globalmente para el HTML
    window.openAddModal = openAddModal;
    window.confirmCreateUser = confirmCreateUser;

    console.log('✅ usuarios.js: Módulo inicializado. Debug disponible en window.__usuariosDebug');

})();