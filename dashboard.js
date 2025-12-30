
// Dashboard functionality for CFE INSIGHT
// This file contains all dashboard-specific JavaScript functions

// Navigation function for dashboard buttons
function navigateTo(page) {
    // Detectar si ya estamos en la carpeta pages/
    const isInPagesFolder = window.location.pathname.includes('/pages/');
    const prefix = isInPagesFolder ? '' : 'pages/';

    const pageMap = {
        'Registro': `${prefix}registros.html`,
        'Calendario': `${prefix}calendario.html`,
        'Entidades': `${prefix}entidades.html`,
        'Usuarios': `${prefix}usuarios.html`,
        'Grupos': `${prefix}grupos.html`,
        'Compromisos': `${prefix}compromisos.html`,
        'Chat': `${prefix}chat.html`,
        'Ayuda': `${prefix}ayuda.html`
    };

    if (pageMap[page]) {
        window.location.href = pageMap[page];
    } else {
        console.warn('Página no encontrada:', page);
    }
}

// Initialize dashboard when page loads
function initializeDashboard() {
    loadDashboardData();
    setupEventListeners();
    updateDashboardUI();

    // Initialize charts after a short delay to ensure data is loaded
    setTimeout(() => {
        if (typeof initializeCharts === 'function') {
            initializeCharts();
        }
    }, 500);
}

// Load dashboard data from API endpoints
async function loadDashboardData() {
    try {
        // Show loading state
        showLoading(true);

        // Load entities count
        const entitiesResponse = await API.Entities.getAll();
        const totalEntities = entitiesResponse.success && entitiesResponse.data ? entitiesResponse.data.length : 0;
        document.getElementById('totalEntitiesCount').textContent = totalEntities;

        // Load commitments count
        const commitmentsResponse = await API.Commitments.getAll();
        const commitmentsData = commitmentsResponse.success && commitmentsResponse.data && Array.isArray(commitmentsResponse.data) ? commitmentsResponse.data : [];
        const activeCommitments = commitmentsData.filter(c => c.status !== 'completed').length;
        document.getElementById('activeCommitmentsCount').textContent = activeCommitments;

        // Load users count
        const usersResponse = await API.Users.getAll();
        const usersData = usersResponse.success && Array.isArray(usersResponse.data) ? usersResponse.data : [];
        const activeUsers = usersData.filter(user => user.active !== false).length;
        const totalUsers = usersData.length;
        document.getElementById('activeUsersCount').textContent = activeUsers;
        document.getElementById('totalUsersCount').textContent = totalUsers;

        // Load recent activities
        await loadRecentActivities();

        // Load upcoming deadlines
        await loadUpcomingDeadlines();

        // Load calendar events
        await loadCalendarEvents();

        // Load AI insights
        loadAIInsights();

        // Hide loading state
        API.showLoading(false);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Error al cargar los datos del dashboard');
        API.showLoading(false);
    }
}

// Update dashboard UI elements
function updateDashboardUI() {
    // Update notification badge
    updateNotificationBadge();

    // Update current month display
    const now = new Date();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('currentMonth').textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// Setup event listeners for dashboard interactions
function setupEventListeners() {
    // Global search
    const searchInput = document.getElementById('globalSearchInput');
    const searchBtn = document.getElementById('globalSearchBtn');

    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performGlobalSearch();
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', performGlobalSearch);
    }

    // IA Chat
    const iaChatBtn = document.getElementById('iaChatBtn');
    if (iaChatBtn) {
        iaChatBtn.addEventListener('click', toggleIAChat);
    }

    // Notifications
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', toggleNotifications);
    }

    // Export buttons
    const exportCommitmentsBtn = document.getElementById('exportCommitmentsBtn');
    const exportEntitiesBtn = document.getElementById('exportEntitiesBtn');

    if (exportCommitmentsBtn) {
        exportCommitmentsBtn.addEventListener('click', () => exportData('commitments'));
    }

    if (exportEntitiesBtn) {
        exportEntitiesBtn.addEventListener('click', () => exportData('entities'));
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        const notificationDropdown = document.getElementById('notificationDropdown');
        const iaChatContainer = document.getElementById('iaChatContainer');

        if (notificationDropdown && !notificationDropdown.contains(e.target) &&
            !document.getElementById('notificationBtn').contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }

        if (iaChatContainer && !iaChatContainer.contains(e.target) &&
            !document.getElementById('iaChatBtn').contains(e.target)) {
            iaChatContainer.classList.remove('show');
        }
    });
}

// Perform global search using optimized backend endpoint
async function performGlobalSearch() {
    const searchTerm = document.getElementById('globalSearchInput').value.trim();
    if (!searchTerm) return;

    if (searchTerm.length < 2) {
        showError('Ingresa al menos 2 caracteres para buscar');
        return;
    }

    // Show loading state
    const searchBtn = document.getElementById('globalSearchBtn');
    const originalIcon = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
    searchBtn.disabled = true;

    try {
        showLoading(true);

        // Usar el nuevo endpoint de búsqueda global
        const response = await fetch(`http://localhost:3001/api/search?query=${encodeURIComponent(searchTerm)}&types=entities,commitments,users`);

        if (!response.ok) {
            throw new Error('Error en la búsqueda');
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error en la búsqueda');
        }

        // Formatear resultados para display
        const formattedResults = {
            entities: [],
            commitments: [],
            users: []
        };

        const isInPagesFolder = window.location.pathname.includes('/pages/');
        const prefix = isInPagesFolder ? '' : 'pages/';

        // Formatear entidades
        if (result.data.entities && Array.isArray(result.data.entities)) {
            formattedResults.entities = result.data.entities.map(entity => ({
                id: entity.id,
                title: entity.name,
                type: 'Entidad',
                meta: `${entity.entity_id || ''} - ${entity.status || ''}`,
                link: `${prefix}entidades.html`
            }));
        }

        // Formatear compromisos
        if (result.data.commitments && Array.isArray(result.data.commitments)) {
            formattedResults.commitments = result.data.commitments.map(commitment => ({
                id: commitment.id,
                title: commitment.title,
                type: 'Compromiso',
                meta: commitment.status || '',
                link: `${prefix}compromisos.html`
            }));
        }

        // Formatear usuarios
        if (result.data.users && Array.isArray(result.data.users)) {
            formattedResults.users = result.data.users.map(user => ({
                id: user.id,
                title: user.name,
                type: 'Usuario',
                meta: user.role || '',
                link: `${prefix}usuarios.html`
            }));
        }

        displaySearchResults(formattedResults);

    } catch (error) {
        console.error('Error performing search:', error);
        showError('Error al realizar la búsqueda: ' + error.message);
    } finally {
        showLoading(false);
        // Restore button state
        searchBtn.innerHTML = originalIcon;
        searchBtn.disabled = false;
    }
}

// Display search results in modal
function displaySearchResults(results) {
    const modal = document.getElementById('searchResultsModal');
    const content = document.getElementById('searchResultsContent');

    let html = '';

    // Entities results
    if (results.entities.length > 0) {
        html += `
            <div class="search-section">
                <h5><i class="bi bi-building"></i> Entidades (${results.entities.length})</h5>
                ${results.entities.map(entity => `
                    <div class="search-result-item" onclick="window.location.href='${entity.link}'">
                        <div class="result-icon">
                            <i class="bi bi-building"></i>
                        </div>
                        <div class="result-content">
                            <div class="result-title">${entity.title}</div>
                            <div class="result-meta">${entity.meta}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Commitments results
    if (results.commitments.length > 0) {
        html += `
            <div class="search-section">
                <h5><i class="bi bi-clipboard-check"></i> Compromisos (${results.commitments.length})</h5>
                ${results.commitments.map(commitment => `
                    <div class="search-result-item" onclick="window.location.href='${commitment.link}'">
                        <div class="result-icon">
                            <i class="bi bi-clipboard-check"></i>
                        </div>
                        <div class="result-content">
                            <div class="result-title">${commitment.title}</div>
                            <div class="result-meta">${commitment.meta}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Users results
    if (results.users.length > 0) {
        html += `
            <div class="search-section">
                <h5><i class="bi bi-person"></i> Usuarios (${results.users.length})</h5>
                ${results.users.map(user => `
                    <div class="search-result-item" onclick="window.location.href='${user.link}'">
                        <div class="result-icon">
                            <i class="bi bi-person"></i>
                        </div>
                        <div class="result-content">
                            <div class="result-title">${user.title}</div>
                            <div class="result-meta">${user.meta}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (!html) {
        html = '<p style="text-align: center; color: #666; padding: 2rem;">No se encontraron resultados para tu búsqueda.</p>';
    }

    content.innerHTML = html;
    modal.classList.add('show');
}

// Close search modal
function closeSearchModal() {
    document.getElementById('searchResultsModal').classList.remove('show');
}

// Toggle IA chat container
function toggleIAChat() {
    const container = document.getElementById('iaChatContainer');
    container.classList.toggle('show');
}

// Toggle notifications dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.classList.toggle('show');
}

// Update notification badge with real notifications
async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const notificationList = document.getElementById('notificationList');

    try {
        // Generate real notifications based on deadlines and activities
        const notifications = await generateRealNotifications();

        // Filter out read notifications for badge count
        const unreadNotifications = notifications.filter(n => !n.read);

        // Update badge count
        if (unreadNotifications.length > 0) {
            badge.textContent = unreadNotifications.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

        // Update notification dropdown content
        notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : ''}" onclick="handleNotificationClick('${notification.id}')">
                <div class="notification-icon">
                    <i class="bi ${notification.icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-text">${notification.text}</div>
                    <div class="notification-time">${notification.time}</div>
                </div>
                <button class="mark-read-btn" onclick="markNotificationAsRead('${notification.id}', event)" title="Marcar como leído">
                    <i class="bi bi-check"></i>
                </button>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error updating notification badge:', error);
        // Fallback: hide badge and show error in dropdown
        badge.style.display = 'none';
        notificationList.innerHTML = `
            <div class="notification-item">
                <div class="notification-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-text">Error al cargar notificaciones</div>
                    <div class="notification-time">Intente recargar</div>
                </div>
            </div>
        `;
    }
}

// Generate real notifications based on system data from API
async function generateRealNotifications() {
    const notifications = [];
    const now = new Date();

    // Notificaciones leídas en memoria (se pierden al recargar) - NO localStorage
    window.readNotificationsCache = window.readNotificationsCache || [];
    const readNotifications = window.readNotificationsCache;

    try {
        // Get commitments from API for deadlines
        const commitmentsResponse = await API.Commitments.getAll();

        if (commitmentsResponse.success) {
            const commitmentsData = commitmentsResponse.success && commitmentsResponse.data && Array.isArray(commitmentsResponse.data) ? commitmentsResponse.data : [];

            // Check for upcoming deadlines from real commitments data
            const upcomingDeadlines = commitmentsData.filter(commitment => {
                if (!commitment.due_date) return false;
                const deadlineDate = new Date(commitment.due_date);
                const daysDiff = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
                return daysDiff <= 7 && daysDiff > 0 && commitment.status !== 'completed';
            });

            upcomingDeadlines.forEach(commitment => {
                const deadlineDate = new Date(commitment.due_date);
                const daysDiff = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
                const notificationId = `deadline-${commitment.id}`;

                notifications.push({
                    id: notificationId,
                    icon: 'bi-calendar-event',
                    text: `Compromiso "${commitment.title}" vence en ${daysDiff} día${daysDiff !== 1 ? 's' : ''}`,
                    time: `${daysDiff === 1 ? 'Mañana' : `En ${daysDiff} días`}`,
                    type: 'deadline',
                    read: readNotifications.includes(notificationId)
                });
            });

            // Check for recently created commitments (last 24 hours)
            const recentCommitments = commitmentsData.filter(commitment => {
                if (!commitment.created_at) return false;
                const createdDate = new Date(commitment.created_at);
                const hoursDiff = Math.floor((now - createdDate) / (1000 * 60 * 60));
                return hoursDiff <= 24;
            });

            recentCommitments.forEach(commitment => {
                const createdDate = new Date(commitment.created_at);
                const hoursDiff = Math.floor((now - createdDate) / (1000 * 60 * 60));
                const notificationId = `activity-commitment-${commitment.id}`;

                notifications.push({
                    id: notificationId,
                    icon: 'bi-clipboard-check',
                    text: `Nuevo compromiso creado: "${commitment.title}"`,
                    time: `Hace ${hoursDiff} hora${hoursDiff !== 1 ? 's' : ''}`,
                    type: 'activity',
                    read: readNotifications.includes(notificationId)
                });
            });
        }

        // Get entities from API for recent updates
        const entitiesResponse = await API.Entities.getAll();

        if (entitiesResponse.success) {
            const entitiesData = entitiesResponse.success && entitiesResponse.data && Array.isArray(entitiesResponse.data) ? entitiesResponse.data : [];

            // Check for recently updated entities
            const recentEntities = entitiesData.filter(entity => {
                if (!entity.updated_at) return false;
                const updatedDate = new Date(entity.updated_at);
                const hoursDiff = Math.floor((now - updatedDate) / (1000 * 60 * 60));
                return hoursDiff <= 24;
            });

            recentEntities.forEach(entity => {
                const updatedDate = new Date(entity.updated_at);
                const hoursDiff = Math.floor((now - updatedDate) / (1000 * 60 * 60));
                const notificationId = `activity-entity-${entity.id}`;

                notifications.push({
                    id: notificationId,
                    icon: 'bi-building',
                    text: `Entidad actualizada: "${entity.name}"`,
                    time: `Hace ${hoursDiff} hora${hoursDiff !== 1 ? 's' : ''}`,
                    type: 'activity',
                    read: readNotifications.includes(notificationId)
                });
            });
        }

    } catch (error) {
        console.error('Error generating notifications:', error);
        // Return empty array if API fails
        return [];
    }

    // Sort by urgency (deadlines first, then activities)
    return notifications.sort((a, b) => {
        if (a.type === 'deadline' && b.type !== 'deadline') return -1;
        if (a.type !== 'deadline' && b.type === 'deadline') return 1;
        return 0;
    });
}

// Handle notification click
function handleNotificationClick(notificationId) {
    const isInPagesFolder = window.location.pathname.includes('/pages/');
    const prefix = isInPagesFolder ? '' : 'pages/';

    if (notificationId.startsWith('deadline-')) {
        // Navigate to calendar or deadlines section
        window.location.href = `${prefix}calendario.html`;
    } else {
        // Navigate to activities section
        window.location.href = `${prefix}registros.html`;
    }
}

// Mark notification as read
function markNotificationAsRead(notificationId, event) {
    event.stopPropagation(); // Prevent triggering the notification click

    // Notificaciones leídas en memoria (se pierden al recargar) - NO localStorage
    window.readNotificationsCache = window.readNotificationsCache || [];

    // Add notification to read list if not already there
    if (!window.readNotificationsCache.includes(notificationId)) {
        window.readNotificationsCache.push(notificationId);
    }

    // Update the UI
    updateNotificationBadge();
}

// Load recent activities from API
async function loadRecentActivities() {
    const activitiesList = document.getElementById('recentActivitiesList');

    try {
        // Get recent records from API
        const recordsResponse = await API.Records.getAll({ limit: 10, offset: 0 });

        if (!recordsResponse.success) {
            throw new Error('Error al cargar actividades recientes');
        }

        const records = recordsResponse.success && recordsResponse.data && Array.isArray(recordsResponse.data) ? recordsResponse.data : [];

        // Transform records to activities format
        const activities = records.map(record => {
            let icon = 'bi-activity';
            let text = record.action;

            // Customize based on action type
            switch (record.action) {
                case 'login':
                    icon = 'bi-box-arrow-in';
                    text = `Usuario ${record.username} inició sesión`;
                    break;
                case 'logout':
                    icon = 'bi-box-arrow-right';
                    text = `Usuario ${record.username} cerró sesión`;
                    break;
                case 'create_commitment':
                    icon = 'bi-clipboard-check';
                    text = `Nuevo compromiso creado`;
                    break;
                case 'update_commitment':
                    icon = 'bi-clipboard-check';
                    text = `Compromiso actualizado`;
                    break;
                case 'create_entity':
                    icon = 'bi-building';
                    text = `Nueva entidad registrada`;
                    break;
                case 'update_entity':
                    icon = 'bi-building';
                    text = `Entidad actualizada`;
                    break;
                case 'create_user':
                    icon = 'bi-person-plus';
                    text = `Nuevo usuario registrado`;
                    break;
                case 'update_user':
                    icon = 'bi-person';
                    text = `Usuario actualizado`;
                    break;
                default:
                    icon = 'bi-activity';
                    text = record.action;
            }

            // Calculate relative time
            const recordDate = new Date(record.timestamp);
            const now = new Date();
            const diffMs = now - recordDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);

            let meta;
            if (diffHours < 1) {
                meta = 'Hace menos de 1 hora';
            } else if (diffHours < 24) {
                meta = `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
            } else {
                meta = `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
            }

            return {
                icon,
                text,
                meta
            };
        });

        // If no activities, show a message
        if (activities.length === 0) {
            activitiesList.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-info-circle fs-4"></i>
                    <p class="mt-2">No hay actividades recientes</p>
                </div>
            `;
            return;
        }

        activitiesList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="bi ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-meta">${activity.meta}</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading recent activities:', error);
        // Show empty state
        activitiesList.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-info-circle fs-4"></i>
                <p class="mt-2">No hay actividades recientes</p>
            </div>
        `;
    }
}

// Load upcoming deadlines from API
async function loadUpcomingDeadlines() {
    const deadlinesList = document.getElementById('upcomingDeadlinesList');

    try {
        // Get commitments from API
        const commitmentsResponse = await API.Commitments.getAll();

        if (!commitmentsResponse.success) {
            throw new Error('Error al cargar compromisos');
        }

        const commitments = commitmentsResponse.success && commitmentsResponse.data && Array.isArray(commitmentsResponse.data) ? commitmentsResponse.data : [];

        // Filter upcoming deadlines (next 30 days, not completed)
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const upcomingDeadlines = commitments
            .filter(commitment => {
                if (!commitment.due_date || commitment.status === 'completed') return false;
                const deadlineDate = new Date(commitment.due_date);
                return deadlineDate >= now && deadlineDate <= thirtyDaysFromNow;
            })
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 5); // Limit to 5 items

        // Transform to display format
        const deadlines = upcomingDeadlines.map(commitment => {
            const deadlineDate = new Date(commitment.due_date);
            const daysDiff = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

            // Format date in Spanish
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const formattedDate = `${deadlineDate.getDate()} ${months[deadlineDate.getMonth()]} ${deadlineDate.getFullYear()}`;

            // Determine urgency
            let status = 'normal';
            if (daysDiff <= 3) {
                status = 'urgent';
            } else if (daysDiff <= 7) {
                status = 'warning';
            }

            return {
                title: commitment.title,
                date: formattedDate,
                status: status,
                daysLeft: daysDiff
            };
        });

        // If no deadlines, show a message
        if (deadlines.length === 0) {
            deadlinesList.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-calendar-check fs-4"></i>
                    <p class="mt-2">No hay fechas límite próximas</p>
                </div>
            `;
            return;
        }

        deadlinesList.innerHTML = deadlines.map(deadline => `
            <div class="deadline-item">
                <div class="deadline-icon">
                    <i class="bi bi-calendar-event"></i>
                </div>
                <div class="deadline-content">
                    <div class="deadline-title">${deadline.title}</div>
                    <div class="deadline-date">${deadline.date}</div>
                </div>
                ${deadline.status === 'urgent' ? '<div class="deadline-status urgent">URGENTE</div>' :
                deadline.status === 'warning' ? '<div class="deadline-status warning">PRÓXIMO</div>' : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading upcoming deadlines:', error);
        // Show empty state
        deadlinesList.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-info-circle fs-4"></i>
                <p class="mt-2">No hay fechas límite próximas</p>
            </div>
        `;
    }
}

// Load calendar events from API
async function loadCalendarEvents() {
    const eventsList = document.getElementById('calendarEvents');

    try {
        // Get commitments from API for calendar events
        const commitmentsResponse = await API.Commitments.getAll();

        if (!commitmentsResponse.success) {
            throw new Error('Error al cargar eventos del calendario');
        }

        const commitments = commitmentsResponse.success && commitmentsResponse.data && Array.isArray(commitmentsResponse.data) ? commitmentsResponse.data : [];

        // Get current month and year from display
        const currentMonthEl = document.getElementById('currentMonth');
        const currentText = currentMonthEl.textContent;
        const [monthName, year] = currentText.split(' ');
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const monthIndex = months.indexOf(monthName);

        // Filter commitments for current month and year
        const currentMonthEvents = commitments.filter(commitment => {
            if (!commitment.due_date) return false;
            const deadlineDate = new Date(commitment.due_date);
            return deadlineDate.getMonth() === monthIndex && deadlineDate.getFullYear() === parseInt(year);
        });

        // Transform to display format
        const events = currentMonthEvents.slice(0, 5).map(commitment => {
            const deadlineDate = new Date(commitment.due_date);
            const day = deadlineDate.getDate();

            // Format time (assuming deadline is the event time)
            const time = deadlineDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            return {
                date: day,
                title: commitment.title,
                time: time
            };
        });

        // If no events, show a message
        if (events.length === 0) {
            eventsList.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-calendar-x fs-4"></i>
                    <p class="mt-2">No hay eventos este mes</p>
                </div>
            `;
            return;
        }

        eventsList.innerHTML = events.map(event => `
            <div class="calendar-event">
                <div class="event-date">${event.date}</div>
                <div class="event-content">
                    <div class="event-title">${event.title}</div>
                    <div class="event-time">${event.time}</div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading calendar events:', error);
        // Show empty state
        eventsList.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-info-circle fs-4"></i>
                <p class="mt-2">No hay eventos este mes</p>
            </div>
        `;
    }
}

// Load AI insights
async function loadAIInsights() {
    const insightsElement = document.getElementById('aiInsightsContent');
    const loadingElement = document.getElementById('aiInsightsLoading');

    // Show loading spinner
    loadingElement.style.display = 'inline-block';
    insightsElement.style.display = 'none';

    try {
        // Generate insights based on real database data
        const insights = await generateDatabaseInsights();

        // Hide loading spinner and show content
        loadingElement.style.display = 'none';
        insightsElement.style.display = 'block';
        insightsElement.textContent = insights;
    } catch (error) {
        console.error('Error loading insights:', error);
        // Hide loading spinner and show empty content
        loadingElement.style.display = 'none';
        insightsElement.style.display = 'block';
        insightsElement.textContent = '';
    }
}

// Generate insights based on real database data
async function generateDatabaseInsights() {
    try {
        // Fetch real data from database
        const [entitiesResponse, commitmentsResponse, usersResponse, recordsResponse] = await Promise.all([
            API.Entities.getAll(),
            API.Commitments.getAll(),
            API.Users.getAll(),
            API.Records.getAll({ limit: 50, offset: 0 })
        ]);

        const entities = entitiesResponse.success && entitiesResponse.data && Array.isArray(entitiesResponse.data) ? entitiesResponse.data : [];
        const commitments = commitmentsResponse.success && commitmentsResponse.data && Array.isArray(commitmentsResponse.data) ? commitmentsResponse.data : [];
        const users = usersResponse.success && usersResponse.data && Array.isArray(usersResponse.data) ? usersResponse.data : [];
        const records = recordsResponse.success && recordsResponse.data && Array.isArray(recordsResponse.data) ? recordsResponse.data : [];

        // Calculate metrics
        const totalEntities = entities.length;
        const totalCommitments = commitments.length;
        const activeCommitments = commitments.filter(c => c.status !== 'completed').length;
        const completedCommitments = commitments.filter(c => c.status === 'completed').length;
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.active !== false).length;

        // Calculate recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentRecords = records.filter(r => new Date(r.timestamp) > sevenDaysAgo);
        const recentActivity = recentRecords.length;

        // Calculate upcoming deadlines (next 7 days)
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        const upcomingDeadlines = commitments.filter(c => {
            if (!c.due_date || c.status === 'completed') return false;
            const deadline = new Date(c.due_date);
            return deadline >= now && deadline <= nextWeek;
        }).length;

        // Generate insights based on data
        let insights = '';

        if (totalEntities === 0 && totalCommitments === 0) {
            insights = 'Sistema inicializado. No hay entidades ni compromisos registrados aún.';
        } else {
            const completionRate = totalCommitments > 0 ? Math.round((completedCommitments / totalCommitments) * 100) : 0;

            insights = `Sistema operativo con ${totalEntities} entidades, ${totalCommitments} compromisos totales (${activeCommitments} activos). `;

            if (completionRate > 0) {
                insights += `Tasa de cumplimiento: ${completionRate}%. `;
            }

            if (recentActivity > 0) {
                insights += `Actividad reciente: ${recentActivity} acciones en los últimos 7 días. `;
            }

            if (upcomingDeadlines > 0) {
                insights += `${upcomingDeadlines} compromisos con fecha límite próxima.`;
            } else if (activeCommitments > 0) {
                insights += 'Todos los compromisos en tiempo y forma.';
            }
        }

        return insights;

    } catch (error) {
        console.error('Error generating database insights:', error);
        return 'No se pudieron cargar las estadísticas del sistema.';
    }
}

// Handle AI widget click
function handleAIWidgetClick() {
    navigateTo('Soporte IA');
}

// Export data functionality
async function exportData(type) {
    try {
        let data = [];
        let filename = '';

        if (type === 'commitments') {
            // Export real commitments data from API
            const commitmentsResponse = await API.Commitments.getAll();
            if (commitmentsResponse.success && commitmentsResponse.data && Array.isArray(commitmentsResponse.data)) {
                data = commitmentsResponse.data.map(commitment => ({
                    id: commitment.id,
                    nombre: commitment.title,
                    descripcion: commitment.description || '',
                    estado: commitment.status,
                    fecha_creacion: commitment.created_at || '',
                    fecha_limite: commitment.due_date || '',
                    entidad: commitment.entity_id || '',
                    responsable: commitment.assigned_to || ''
                }));
            }
            filename = 'compromisos_cfe_insight.csv';
        } else if (type === 'entities') {
            // Export entities data from API
            const entitiesResponse = await API.Entities.getAll();
            if (entitiesResponse.success && entitiesResponse.data && Array.isArray(entitiesResponse.data)) {
                data = entitiesResponse.data.map(entity => ({
                    id: entity.id,
                    nombre: entity.name,
                    comercial: entity.commercial || '',
                    pais: entity.country,
                    estado: entity.state,
                    fecha_registro: entity.created_at || entity.date || ''
                }));
            }
            filename = 'entidades_cfe_insight.csv';
        }

        if (data.length === 0) {
            alert('No hay datos para exportar.');
            return;
        }

        // Convert to CSV
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert(`Datos exportados exitosamente como ${filename}`);

    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error al exportar los datos.');
    }
}

// Send IA chat message
async function sendIAChatMessage() {
    const input = document.getElementById('iaChatInput');
    const message = input.value.trim();
    if (!message) return;

    const messagesContainer = document.getElementById('iaChatMessages');

    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message user';
    userMessage.textContent = message;
    messagesContainer.appendChild(userMessage);

    // Clear input
    input.value = '';

    // Add typing indicator
    const typingMessage = document.createElement('div');
    typingMessage.className = 'chat-message ai typing';
    typingMessage.textContent = 'Escribiendo...';
    messagesContainer.appendChild(typingMessage);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        // Get AI response
        const response = await intelligentChatResponse(message, [], getCurrentSession()?.role || 'cliente');

        // Remove typing indicator
        messagesContainer.removeChild(typingMessage);

        // Add AI response
        const aiMessage = document.createElement('div');
        aiMessage.className = 'chat-message ai';
        aiMessage.textContent = response;
        messagesContainer.appendChild(aiMessage);

    } catch (error) {
        console.error('Error getting AI response:', error);
        messagesContainer.removeChild(typingMessage);

        const errorMessage = document.createElement('div');
        errorMessage.className = 'chat-message ai';
        errorMessage.textContent = 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';
        messagesContainer.appendChild(errorMessage);
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Handle chat key press
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendIAChatMessage();
    }
}

// Calendar navigation functions
function previousMonth() {
    const currentMonthEl = document.getElementById('currentMonth');
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    let currentText = currentMonthEl.textContent;
    let [month, year] = currentText.split(' ');
    let monthIndex = months.indexOf(month);
    if (monthIndex === 0) {
        monthIndex = 11;
        year = parseInt(year) - 1;
    } else {
        monthIndex--;
    }
    currentMonthEl.textContent = `${months[monthIndex]} ${year}`;
    loadCalendarEvents(); // Reload events for new month
}

function nextMonth() {
    const currentMonthEl = document.getElementById('currentMonth');
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    let currentText = currentMonthEl.textContent;
    let [month, year] = currentText.split(' ');
    let monthIndex = months.indexOf(month);
    if (monthIndex === 11) {
        monthIndex = 0;
        year = parseInt(year) + 1;
    } else {
        monthIndex++;
    }
    currentMonthEl.textContent = `${months[monthIndex]} ${year}`;
    loadCalendarEvents(); // Reload events for new month
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Check session
    const userData = getCurrentSession();
    if (!userData) {
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        const loginPath = isInPagesFolder ? 'login.html' : 'pages/login.html';
        window.location.href = loginPath;
        return;
    }

    // Set welcome message
    document.getElementById('welcomeText').textContent = `Bienvenido, ${userData.name}`;

    // Apply role restrictions to quick actions
    applyRoleRestrictions(userData.role);

    // Initialize dashboard
    initializeDashboard();
});

// Navigation function for dashboard buttons (alternativa)
// Esta función está duplicada - usar la de arriba que es más eficiente
// La mantenemos por compatibilidad pero debería usar navigateTo() principal

// Logout function - clear session and redirect to login
function logout() {
    try {
        // Clear user session from sessionStorage
        sessionStorage.removeItem('userSession');
        window.appSession = null;
        window.readNotificationsCache = [];

        // Redirect to login page
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        const loginPath = isInPagesFolder ? 'login.html' : 'pages/login.html';
        window.location.href = loginPath;
    } catch (error) {
        console.error('Error during logout:', error);
        // Fallback: force redirect even if there's an error
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        const loginPath = isInPagesFolder ? 'login.html' : 'pages/login.html';
        window.location.href = loginPath;
    }
}

// Apply role-based restrictions to dashboard elements
function applyRoleRestrictions(role) {
    const actionBtns = document.querySelectorAll('.action-btn');

    actionBtns.forEach(btn => {
        const section = btn.onclick.toString().match(/'([^']+)'/)[1];

        if (role === 'cliente') {
            // Cliente solo puede ver compromisos
            if (section !== 'Compromisos') {
                btn.style.display = 'none';
            }
        } else if (role === 'auditor') {
            // Auditor puede ver entidades y compromisos
            if (!['Entidades', 'Compromisos'].includes(section)) {
                btn.style.display = 'none';
            }
        } else if (role === 'auditor_senior') {
            // Auditor senior puede ver todo menos usuarios
            if (section === 'Usuarios') {
                btn.style.display = 'none';
            }
        }
        // Administrador y programador tienen acceso completo
    });
}
