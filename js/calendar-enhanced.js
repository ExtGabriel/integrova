/**
 * CFE INSIGHT - Enhanced Calendar System
 * @description Sistema de calendario mejorado con funciones interactivas
 */

class EnhancedCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.events = [];
        this.commitments = [];
        this.view = 'month'; // month, week, day
        this.filters = {
            commitment: true,
            deadline: true,
            meeting: true,
            reminder: true
        };
    }

    /**
     * Inicializar calendario
     */
    async init() {
        try {
            await this.loadEvents();
            this.render();
            this.setupEventListeners();
            console.log('✅ Enhanced Calendar inicializado');
        } catch (error) {
            console.error('Error inicializando calendario:', error);
        }
    }

    /**
     * Cargar eventos desde API
     */
    async loadEvents() {
        try {
            // Cargar compromisos
            if (window.API && window.API.Commitments) {
                const response = API?.Commitments?.getAll
                    ? await API.Commitments.getAll()
                    : { success: false, data: [] };
                if (response.success && response.data) {
                    this.commitments = response.data;
                }
            }

            // Convertir compromisos a eventos
            this.events = this.commitmentsToEvents(this.commitments);

            // Cargar eventos adicionales del localStorage
            const savedEvents = localStorage.getItem('calendarEvents');
            if (savedEvents) {
                const additionalEvents = JSON.parse(savedEvents);
                this.events = [...this.events, ...additionalEvents];
            }

            // Ordenar eventos por fecha
            this.events.sort((a, b) => new Date(a.date) - new Date(b.date));

        } catch (error) {
            console.error('Error cargando eventos:', error);
        }
    }

    /**
     * Convertir compromisos en eventos de calendario
     */
    commitmentsToEvents(commitments) {
        const events = [];

        commitments.forEach(commitment => {
            // Evento de inicio
            events.push({
                id: `commitment-${commitment.id}-start`,
                title: `📋 ${commitment.name || commitment.description}`,
                description: commitment.description || '',
                date: commitment.startDate || commitment.start_date,
                type: 'commitment',
                status: commitment.status,
                entity: commitment.entity,
                allDay: true,
                color: this.getColorByStatus(commitment.status),
                commitment: commitment
            });

            // Evento de deadline
            if (commitment.endDate || commitment.end_date) {
                const endDate = commitment.endDate || commitment.end_date;
                events.push({
                    id: `commitment-${commitment.id}-end`,
                    title: `⏰ Vence: ${commitment.name || commitment.description}`,
                    description: `Fecha límite para: ${commitment.description || ''}`,
                    date: endDate,
                    type: 'deadline',
                    status: commitment.status,
                    entity: commitment.entity,
                    allDay: true,
                    color: '#F44336',
                    commitment: commitment
                });
            }
        });

        return events;
    }

    /**
     * Obtener color según estado
     */
    getColorByStatus(status) {
        const colors = {
            'pendiente': '#FFC107',
            'en proceso': '#2196F3',
            'cumplido': '#4CAF50',
            'vencido': '#F44336'
        };
        return colors[status?.toLowerCase()] || '#9E9E9E';
    }

    /**
     * Renderizar calendario
     */
    render() {
        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) return;

        if (this.view === 'month') {
            this.renderMonthView(calendarGrid);
        } else if (this.view === 'week') {
            this.renderWeekView(calendarGrid);
        } else if (this.view === 'day') {
            this.renderDayView(calendarGrid);
        }

        this.updateHeader();
        this.renderMiniCalendar();
        this.renderUpcomingEvents();
    }

    /**
     * Renderizar vista mensual
     */
    renderMonthView(container) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Limpiar contenedor
        container.innerHTML = '';
        container.className = 'calendar-grid-month';

        // Headers de días
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        daysOfWeek.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            container.appendChild(header);
        });

        // Obtener primer y último día del mes
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generar días
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 42; i++) {
            const dayElement = this.createDayElement(startDate, month, today);
            container.appendChild(dayElement);
            startDate.setDate(startDate.getDate() + 1);
        }
    }

    /**
     * Crear elemento de día
     */
    createDayElement(date, currentMonth, today) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = date.toISOString().split('T')[0];

        // Clases especiales
        if (date.getMonth() !== currentMonth) {
            dayElement.classList.add('other-month');
        }
        if (date.getTime() === today.getTime()) {
            dayElement.classList.add('today');
        }
        if (this.selectedDate && date.toDateString() === this.selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }
        if (date.getDay() === 0 || date.getDay() === 6) {
            dayElement.classList.add('weekend');
        }

        // Número del día
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);

        // Eventos del día
        const dayEvents = this.getEventsForDate(date);
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';

        // Mostrar máximo 3 eventos
        const visibleEvents = dayEvents.slice(0, 3);
        visibleEvents.forEach(event => {
            if (this.filters[event.type]) {
                const eventElement = this.createEventBadge(event);
                eventsContainer.appendChild(eventElement);
            }
        });

        // Mostrar "+N más" si hay más eventos
        if (dayEvents.length > 3) {
            const moreElement = document.createElement('div');
            moreElement.className = 'event-more';
            moreElement.textContent = `+${dayEvents.length - 3} más`;
            eventsContainer.appendChild(moreElement);
        }

        dayElement.appendChild(eventsContainer);

        // Event listener
        dayElement.addEventListener('click', () => this.handleDayClick(date));

        return dayElement;
    }

    /**
     * Crear badge de evento
     */
    createEventBadge(event) {
        const badge = document.createElement('div');
        badge.className = `event-badge event-${event.type}`;
        badge.style.backgroundColor = event.color;
        badge.title = `${event.title}\n${event.description || ''}`;

        const icon = document.createElement('span');
        icon.className = 'event-icon';
        icon.textContent = this.getEventIcon(event.type);

        const title = document.createElement('span');
        title.className = 'event-title';
        title.textContent = event.title;

        badge.appendChild(icon);
        badge.appendChild(title);

        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showEventDetails(event);
        });

        return badge;
    }

    /**
     * Obtener icono por tipo de evento
     */
    getEventIcon(type) {
        const icons = {
            commitment: '📋',
            deadline: '⏰',
            meeting: '👥',
            reminder: '🔔'
        };
        return icons[type] || '📌';
    }

    /**
     * Obtener eventos para una fecha
     */
    getEventsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.events.filter(event => {
            const eventDate = new Date(event.date).toISOString().split('T')[0];
            return eventDate === dateStr;
        });
    }

    /**
     * Manejar click en día
     */
    handleDayClick(date) {
        this.selectedDate = date;
        this.render();
        this.showDayDetails(date);
    }

    /**
     * Mostrar detalles del día
     */
    showDayDetails(date) {
        const modal = document.getElementById('dayDetailsModal');
        if (!modal) return;

        const events = this.getEventsForDate(date);
        const dateStr = date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');

        modalTitle.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        if (events.length === 0) {
            modalBody.innerHTML = `
                <div class="no-events-day">
                    <i class="bi bi-calendar-x"></i>
                    <p>No hay eventos programados para este día</p>
                    <button class="btn btn-primary" onclick="calendar.showAddEventModal('${date.toISOString()}')">
                        <i class="bi bi-plus-circle"></i> Agregar Evento
                    </button>
                </div>
            `;
        } else {
            let html = '<div class="day-events-list">';
            events.forEach(event => {
                html += `
                    <div class="event-detail-card event-${event.type}">
                        <div class="event-detail-header">
                            <span class="event-icon">${this.getEventIcon(event.type)}</span>
                            <h5>${event.title}</h5>
                        </div>
                        <p class="event-description">${event.description || 'Sin descripción'}</p>
                        ${event.entity ? `<p class="event-entity"><i class="bi bi-building"></i> ${event.entity}</p>` : ''}
                        <div class="event-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="calendar.editEvent('${event.id}')">
                                <i class="bi bi-pencil"></i> Editar
                            </button>
                            ${event.type === 'commitment' && event.commitment ? `
                                <button class="btn btn-sm btn-outline-success" onclick="window.location.href='${window.location.pathname.includes('/pages/') ? '' : 'pages/'}compromisos-detalles.html?id=${event.commitment.id}'">
                                    <i class="bi bi-eye"></i> Ver Compromiso
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            modalBody.innerHTML = html;
        }

        // Mostrar modal (Bootstrap)
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * Mostrar detalles de evento
     */
    showEventDetails(event) {
        const modal = document.getElementById('eventDetailsModal');
        if (!modal) return;

        const modalBody = modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="event-details-full">
                <h4>${event.title}</h4>
                <div class="event-info">
                    <p><strong>Tipo:</strong> ${this.getEventTypeLabel(event.type)}</p>
                    <p><strong>Fecha:</strong> ${new Date(event.date).toLocaleDateString('es-ES')}</p>
                    ${event.description ? `<p><strong>Descripción:</strong> ${event.description}</p>` : ''}
                    ${event.entity ? `<p><strong>Entidad:</strong> ${event.entity}</p>` : ''}
                    ${event.status ? `<p><strong>Estado:</strong> <span class="badge bg-${this.getStatusBadgeColor(event.status)}">${event.status}</span></p>` : ''}
                </div>
                ${event.commitment ? `
                    <button class="btn btn-primary w-100" onclick="window.location.href='${window.location.pathname.includes('/pages/') ? '' : 'pages/'}compromisos-detalles.html?id=${event.commitment.id}'">
                        <i class="bi bi-box-arrow-up-right"></i> Ver Compromiso Completo
                    </button>
                ` : ''}
            </div>
        `;

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * Obtener etiqueta de tipo de evento
     */
    getEventTypeLabel(type) {
        const labels = {
            commitment: 'Compromiso',
            deadline: 'Fecha Límite',
            meeting: 'Reunión',
            reminder: 'Recordatorio'
        };
        return labels[type] || type;
    }

    /**
     * Obtener color de badge según estado
     */
    getStatusBadgeColor(status) {
        const colors = {
            'pendiente': 'warning',
            'en proceso': 'info',
            'cumplido': 'success',
            'vencido': 'danger'
        };
        return colors[status?.toLowerCase()] || 'secondary';
    }

    /**
     * Actualizar encabezado
     */
    updateHeader() {
        const monthElement = document.getElementById('currentMonth');
        if (!monthElement) return;

        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        if (this.view === 'month') {
            monthElement.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        } else if (this.view === 'week') {
            const weekStart = this.getWeekStart(this.currentDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            monthElement.textContent = `${weekStart.getDate()} - ${weekEnd.getDate()} ${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        } else {
            monthElement.textContent = this.currentDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    /**
     * Renderizar mini calendario
     */
    renderMiniCalendar() {
        const miniCalendar = document.getElementById('miniCalendar');
        if (!miniCalendar) return;

        // Implementar mini calendario lateral (opcional)
        // Por ahora, dejamos esto para una futura mejora
    }

    /**
     * Renderizar eventos próximos
     */
    renderUpcomingEvents() {
        const upcomingContainer = document.getElementById('upcomingEvents');
        if (!upcomingContainer) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filtrar eventos futuros (próximos 7 días)
        const upcoming = this.events.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            const diffTime = eventDate - today;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 7;
        }).slice(0, 5);

        if (upcoming.length === 0) {
            upcomingContainer.innerHTML = '<p class="text-muted text-center">No hay eventos próximos</p>';
            return;
        }

        let html = '<div class="upcoming-events-list">';
        upcoming.forEach(event => {
            const eventDate = new Date(event.date);
            const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
            const timeLabel = daysUntil === 0 ? 'Hoy' : daysUntil === 1 ? 'Mañana' : `En ${daysUntil} días`;

            html += `
                <div class="upcoming-event-item" onclick="calendar.showEventDetails(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                    <span class="upcoming-icon">${this.getEventIcon(event.type)}</span>
                    <div class="upcoming-info">
                        <div class="upcoming-title">${event.title}</div>
                        <div class="upcoming-time">${timeLabel}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        upcomingContainer.innerHTML = html;
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Navegación
        const prevBtn = document.getElementById('prevPeriod');
        const nextBtn = document.getElementById('nextPeriod');
        const todayBtn = document.getElementById('todayBtn');

        if (prevBtn) prevBtn.addEventListener('click', () => this.previousPeriod());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextPeriod());
        if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());

        // Filtros
        const filterBtns = document.querySelectorAll('[data-filter]');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => this.toggleFilter(btn.dataset.filter));
        });

        // Vista
        const viewBtns = document.querySelectorAll('[data-view]');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => this.changeView(btn.dataset.view));
        });
    }

    /**
     * Navegación: período anterior
     */
    previousPeriod() {
        if (this.view === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        } else if (this.view === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() - 7);
        } else {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
        }
        this.render();
    }

    /**
     * Navegación: período siguiente
     */
    nextPeriod() {
        if (this.view === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        } else if (this.view === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + 7);
        } else {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
        }
        this.render();
    }

    /**
     * Ir a hoy
     */
    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.render();
    }

    /**
     * Cambiar vista
     */
    changeView(view) {
        this.view = view;
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.render();
    }

    /**
     * Toggle filtro
     */
    toggleFilter(filterType) {
        this.filters[filterType] = !this.filters[filterType];
        const btn = document.querySelector(`[data-filter="${filterType}"]`);
        if (btn) {
            btn.classList.toggle('active', this.filters[filterType]);
        }
        this.render();
    }

    /**
     * Refrescar calendario
     */
    async refresh() {
        await this.loadEvents();
        this.render();

        if (typeof showToast === 'function') {
            showToast('Calendario actualizado', 'success', 2000);
        }
    }

    /**
     * Obtener inicio de semana
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
}

// Inicializar calendario global
let calendar;

// Exportar para uso global
window.EnhancedCalendar = EnhancedCalendar;

// Función de inicialización
window.initEnhancedCalendar = async function () {
    calendar = new EnhancedCalendar();
    await calendar.init();
    window.calendar = calendar; // Hacer accesible globalmente
    return calendar;
};
