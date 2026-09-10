(function () {
    'use strict';

    console.log('⚡ active-sessions.js: inicializando monitor de sesiones...');

    let sessionRowsCache = '';
    let isLoading = false;

    const POLL_INTERVAL_MS = 60_000;

    function formatDate(date) {
        try {
            const formatter = new Intl.DateTimeFormat('es-MX', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
            return formatter.format(date);
        } catch (error) {
            console.warn('⚠️ No se pudo formatear fecha:', error);
            return date.toLocaleString();
        }
    }

    function getRelativeTime(date) {
        const now = Date.now();
        const diffMs = now - date.getTime();
        const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

        if (diffMinutes < 1) return 'Hace unos segundos';
        if (diffMinutes === 1) return 'Hace un minuto';
        if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;

        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours === 1) return 'Hace 1 hora';
        return `Hace ${diffHours} horas`;
    }

    function updateMetrics(activeUsers, totalUsers, updatedAt = new Date()) {
        const activeElement = document.getElementById('activeSessionsCount');
        const totalElement = document.getElementById('totalUsersCount');
        const chipElement = document.getElementById('activeSessionsChip');
        const lastUpdatedText = document.getElementById('lastUpdatedText');

        if (activeElement) activeElement.textContent = activeUsers;
        if (totalElement) totalElement.textContent = totalUsers;
        if (lastUpdatedText) {
            const formattedRelative = getRelativeTime(updatedAt);
            const formattedExact = formatDate(updatedAt);
            lastUpdatedText.textContent = `Actualizado ${formattedRelative} (${formattedExact})`;
        }

        if (chipElement) {
            if (activeUsers > 0) {
                chipElement.style.display = 'inline-flex';
                chipElement.innerHTML = `<i class="bi bi-broadcast"></i> ${activeUsers === 1 ? '1 usuario conectado' : `${activeUsers} usuarios conectados`}`;
            } else {
                chipElement.style.display = 'none';
            }
        }
    }

    function showLoadingState(show) {
        const loadingNode = document.getElementById('sessionsTableState');
        const table = document.getElementById('sessionsTable');

        if (!loadingNode || !table) return;

        loadingNode.style.display = show ? 'flex' : 'none';
        table.style.display = show ? 'none' : 'table';
    }

    function renderEmptyState(message) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="bi bi-emoji-neutral" style="font-size: 1.5rem; display: block; margin-bottom: 8px;"></i>
                        ${message}
                    </div>
                </td>
            </tr>
        `;
        sessionRowsCache = '';
    }

    function renderSessions(sessions) {
        const tbody = document.getElementById('sessionsTableBody');
        if (!tbody) return;

        if (!Array.isArray(sessions) || sessions.length === 0) {
            renderEmptyState('No hay sesiones activas detectadas en las últimas horas.');
            return;
        }

        const rows = sessions.map(session => {
            const username = session.username || 'usuario_desconocido';
            const fullName = session.full_name || session.name || 'Nombre no disponible';
            const role = session.role || 'sin rol';
            const loginTime = session.last_login ? new Date(session.last_login) : null;
            const lastActivity = loginTime ? `${getRelativeTime(loginTime)} • ${formatDate(loginTime)}` : 'Sin registro';
            const sessionType = session.session_type || 'web';

            return `
                <tr>
                    <td>${username}</td>
                    <td>
                        <div class="session-meta">
                            <strong>${fullName}</strong>
                            <small>${session.email || 'Correo no disponible'}</small>
                        </div>
                    </td>
                    <td>${role}</td>
                    <td>${lastActivity}</td>
                    <td>${sessionType}</td>
                    <td>
                        <span class="badge-status">
                            <i class="bi bi-circle-fill"></i>
                            Activo
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        if (rows !== sessionRowsCache) {
            tbody.innerHTML = rows;
            sessionRowsCache = rows;
        }
    }

    function extractIdentifiers(record) {
        const usernameCandidates = [
            record.username,
            record.user_name,
            record.details?.username,
            record.details?.user?.username,
            record.details?.user_name,
            record.details?.user?.user_name
        ].filter(Boolean);

        const emailCandidates = [
            record.email,
            record.user_email,
            record.details?.email,
            record.details?.user?.email,
            record.details?.user_email,
            record.details?.user?.user_email
        ].filter(Boolean);

        const username = usernameCandidates.length > 0 ? usernameCandidates[0] : null;
        const email = emailCandidates.length > 0 ? emailCandidates[0] : null;
        const identifier = username || email || record.details?.user_id || record.details?.user?.id || null;

        return { identifier, username, email };
    }

    function isLoginEvent(record) {
        const fields = [
            record.action,
            record.activity_type,
            record.type,
            record.event,
            record.details?.action,
            record.details?.event_type,
            record.details?.activity_type
        ];
        return fields
            .filter(Boolean)
            .map(value => String(value).toLowerCase())
            .some(value => value.includes('login') || value === 'signin' || value === 'login_success');
    }

    function isLogoutEvent(record) {
        const fields = [
            record.action,
            record.activity_type,
            record.type,
            record.event,
            record.details?.action,
            record.details?.event_type,
            record.details?.activity_type
        ];
        return fields
            .filter(Boolean)
            .map(value => String(value).toLowerCase())
            .some(value => value.includes('logout') || value === 'signout');
    }

    function mapAuditLogsToActiveSessions(auditLogs) {
        if (!Array.isArray(auditLogs)) return [];

        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const sessionsMap = new Map();

        auditLogs.forEach(record => {
            const timestampField = record.timestamp || record.created_at;
            if (!timestampField) return;

            const recordDate = new Date(timestampField);
            if (Number.isNaN(recordDate.getTime()) || recordDate < twoHoursAgo) return;

            const { identifier, username, email } = extractIdentifiers(record);
            if (!identifier) {
                console.warn('⚠️ Registro de auditoría sin identificador utilizable:', record);
                return;
            }

            const loginEvent = isLoginEvent(record);
            const logoutEvent = isLogoutEvent(record);

            if (!loginEvent && !logoutEvent) return;

            const existing = sessionsMap.get(identifier) || {
                lastLogin: null,
                lastLogout: null,
                username: username || null,
                email: email || null
            };

            if (username && !existing.username) existing.username = username;
            if (email && !existing.email) existing.email = email;

            if (loginEvent) {
                if (!existing.lastLogin || recordDate > existing.lastLogin) {
                    sessionsMap.set(identifier, {
                        lastLogin: recordDate,
                        lastLogout: existing.lastLogout,
                        username: existing.username,
                        email: existing.email
                    });
                }
                return;
            }

            if (logoutEvent) {
                if (!existing.lastLogout || recordDate > existing.lastLogout) {
                    sessionsMap.set(identifier, {
                        lastLogin: existing.lastLogin || new Date(0),
                        lastLogout: recordDate,
                        username: existing.username,
                        email: existing.email
                    });
                }
            }
        });

        const activeSessions = [];
        sessionsMap.forEach((session, identifier) => {
            if (!session.lastLogin) return;
            const lastLogoutTime = session.lastLogout || new Date(0);
            if (session.lastLogin > lastLogoutTime) {
                activeSessions.push({
                    identifier,
                    username: session.username || null,
                    email: session.email || null,
                    lastLogin: session.lastLogin
                });
            }
        });

        console.log('🧮 Resultado mapAuditLogsToActiveSessions:', {
            sessionsMap: Array.from(sessionsMap.entries()).map(([key, data]) => ({
                identifier: key,
                lastLogin: data.lastLogin,
                lastLogout: data.lastLogout,
                username: data.username,
                email: data.email
            })),
            activeSessions
        });

        return activeSessions;
    }

    async function ensureCurrentSessionRegistered(existingLogs = []) {
        if (!window.currentUser?.username) {
            console.warn('⚠️ No hay usuario actual para registrar sesión');
            return false;
        }

        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const hasRecentLogin = existingLogs.some(record => {
            const { identifier } = extractIdentifiers(record);
            if (!identifier) return false;
            const matchesUser = [window.currentUser.username, window.currentUser.email]
                .filter(Boolean)
                .some(value => value.toLowerCase() === String(identifier).toLowerCase());
            if (!matchesUser) return false;

            if (!isLoginEvent(record)) return false;
            const timestampField = record.timestamp || record.created_at;
            if (!timestampField) return false;
            const recordDate = new Date(timestampField);
            if (Number.isNaN(recordDate.getTime())) return false;
            return recordDate >= tenMinutesAgo;
        });

        if (hasRecentLogin) {
            console.log('✅ Sesión reciente ya registrada para:', window.currentUser.username);
            return true;
        }

        console.log('🔄 Registrando nueva sesión para:', window.currentUser.username);
        const result = await window.API?.logAuditEvent?.('login', {
            email: window.currentUser.email,
            success: true,
            login_time: new Date().toISOString(),
            session_type: 'page_reload_restored'
        });

        if (result?.success) {
            console.log('✅ Sesión registrada en audit_logs para:', window.currentUser.username);
            return true;
        }

        console.warn('⚠️ No se pudo registrar sesión restaurada:', result?.error);
        return false;
    }

    async function getActiveSessionsFromAudit() {
        try {
            if (!window.API?.Audit?.getAll) {
                console.warn('⚠️ API.Audit.getAll no disponible, retornando []');
                return [];
            }

            console.log('🔄 Llamando a API.Audit.getAll() desde active-sessions...');
            const auditResponse = await window.API.Audit.getAll();
            console.log('📦 API.Audit.getAll() response:', auditResponse);

            if (!auditResponse?.success) {
                console.warn('⚠️ No se pudieron obtener audit logs:', auditResponse);
                return [];
            }

            const auditLogs = Array.isArray(auditResponse.data) ? auditResponse.data : [];
            console.log(`📋 Audit logs crudos recibidos: ${auditLogs.length}`);
            if (auditLogs.length > 0) {
                console.log('📋 Muestra de logs:', auditLogs.slice(0, 3).map(l => ({
                    username: l.username,
                    action: l.action,
                    created_at: l.created_at
                })));
            }

            const activeSessions = mapAuditLogsToActiveSessions(auditLogs);
            console.log(`🔍 Sesiones activas detectadas: ${activeSessions.length}`, activeSessions);
            return activeSessions;
        } catch (error) {
            console.error('❌ Error consultando audit logs:', error);
            return [];
        }
    }

    async function fetchActiveSessions() {
        if (!window.API) {
            console.error('❌ API no disponible para cargar sesiones activas');
            return [];
        }

        try {
            console.log('🔍 active-sessions.js: consultando usuarios activos...');

            const [activeSessions, usersResult] = await Promise.all([
                getActiveSessionsFromAudit(),
                window.API?.Users?.getAll
                    ? window.API.Users.getAll()
                    : Promise.resolve({ success: false, data: [] })
            ]);

            const usersData = (usersResult?.success && Array.isArray(usersResult.data)) ? usersResult.data : [];

            const sessions = activeSessions.map(entry => {
                const userDetails = usersData.find(user => user.username === entry.username || user.email === entry.username);
                return {
                    username: entry.username,
                    full_name: userDetails?.full_name || userDetails?.name || null,
                    email: userDetails?.email || null,
                    role: userDetails?.role || null,
                    last_login: entry.lastLogin ? entry.lastLogin.toISOString() : (userDetails?.last_login || null),
                    session_type: 'web'
                };
            });

            return {
                sessions,
                totals: {
                    active: sessions.length,
                    total: usersData.length
                }
            };
        } catch (error) {
            console.error('❌ Error obteniendo sesiones activas:', error);
            return {
                sessions: [],
                totals: {
                    active: 0,
                    total: 0
                }
            };
        }
    }

    async function refreshSessions() {
        if (isLoading) return;
        isLoading = true;
        showLoadingState(true);

        try {
            const { sessions, totals } = await fetchActiveSessions();
            renderSessions(sessions);
            updateMetrics(totals.active, totals.total, new Date());
        } finally {
            showLoadingState(false);
            isLoading = false;
        }
    }

    function setupEventListeners() {
        const refreshBtn = document.getElementById('refreshSessionsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.disabled = true;
                refreshSessions().finally(() => {
                    setTimeout(() => {
                        refreshBtn.disabled = false;
                    }, 1500);
                });
            });
        }

        const backButton = document.getElementById('backToDashboardBtn');
        if (backButton) {
            backButton.style.cursor = 'pointer';
            backButton.setAttribute('role', 'button');
            backButton.setAttribute('tabindex', '0');

            const goBackToDashboard = () => {
                window.location.href = 'dashboard.html';
            };

            backButton.addEventListener('click', goBackToDashboard);
            backButton.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    goBackToDashboard();
                }
            });
        }

        window.addEventListener('focus', () => {
            console.log('👀 Ventana activa nuevamente, refrescando sesiones...');
            refreshSessions();
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'pendingLogout') {
                console.log('🔄 Logout detectado en otra pestaña, refrescando sesiones...');
                setTimeout(refreshSessions, 1000);
            }
        });
    }

    function startAutoRefresh() {
        setInterval(() => {
            console.log('⏳ Actualización automática de sesiones activas...');
            refreshSessions();
        }, POLL_INTERVAL_MS);
    }

    window.initializeActiveSessionsPage = function () {
        console.log('✅ initializeActiveSessionsPage: iniciando');
        
        // Check role-based access control
        const userRole = window.currentUser?.role;
        if (!userRole || (userRole !== 'admin' && userRole !== 'auditor_senior')) {
            console.warn(`🚫 Acceso denegado para rol: ${userRole}. Solo admin y auditor_senior pueden ver usuarios activos.`);
            
            // Show access denied message
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: system-ui;">
                    <div style="text-align: center; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #f9f9f9;">
                        <i class="bi bi-shield-exclamation" style="font-size: 3rem; color: #dc3545; display: block; margin-bottom: 1rem;"></i>
                        <h2 style="color: #dc3545; margin-bottom: 1rem;">Acceso Restringido</h2>
                        <p style="color: #666; margin-bottom: 1.5rem;">No tienes permisos para ver esta página.</p>
                        <p style="color: #666; margin-bottom: 1.5rem;">Solo los roles <strong>Administrador</strong> y <strong>Auditor Senior</strong> pueden acceder a la lista de usuarios activos.</p>
                        <button onclick="window.location.href='dashboard.html'" style="padding: 0.5rem 1.5rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Volver al Dashboard
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        console.log(`✅ Acceso permitido para rol: ${userRole}`);
        setupEventListeners();
        refreshSessions();
        startAutoRefresh();
    };
})();
