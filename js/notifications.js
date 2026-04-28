/**
 * CFE INSIGHT - Sistema de Notificaciones Universal
 * @description Sistema completo de notificaciones con:
 * - Toast notifications (éxito, error, info, advertencia)
 * - Centro de notificaciones persistente
 * - Badges con contador
 * - Notificaciones del navegador (opcional)
 * - Almacenamiento en localStorage
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 50;
        this.storageKey = 'cfe_notifications';
        this.loadNotifications();
        this.initUI();
        this.requestBrowserPermission();
    }

    // Inicializar UI del sistema de notificaciones
    initUI() {
        // Verificar si ya existe el contenedor
        if (document.getElementById('notification-system')) return;

        // Crear contenedor principal
        const container = document.createElement('div');
        container.id = 'notification-system';
        container.innerHTML = `
            <!-- Toast Container -->
            <div id="toast-container" class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 9999;"></div>
            
            <!-- Centro de Notificaciones (Bell Icon) -->
            <div id="notification-bell" class="notification-bell" title="Notificaciones">
                <i class="bi bi-bell-fill"></i>
                <span class="notification-badge" id="notification-count" style="display: none;">0</span>
            </div>
            
            <!-- Panel de Notificaciones -->
            <div id="notification-panel" class="notification-panel">
                <div class="notification-panel-header">
                    <h5><i class="bi bi-bell"></i> Notificaciones</h5>
                    <div class="notification-actions">
                        <button class="btn btn-sm btn-outline-success" id="mark-all-read" title="Marcar todas como leídas">
                            <i class="bi bi-check-all"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" id="clear-all" title="Borrar todas">
                            <i class="bi bi-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-close-panel" id="close-panel">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
                <div class="notification-panel-body" id="notification-list">
                    <div class="text-center text-muted p-4">
                        <i class="bi bi-bell-slash fs-1"></i>
                        <p class="mt-2">No hay notificaciones</p>
                    </div>
                </div>
            </div>
            
            <!-- Overlay para cerrar panel -->
            <div id="notification-overlay" class="notification-overlay"></div>
        `;

        document.body.appendChild(container);
        this.attachEventListeners();
        this.updateBadge();
    }

    // Adjuntar event listeners
    attachEventListeners() {
        const bell = document.getElementById('notification-bell');
        const panel = document.getElementById('notification-panel');
        const overlay = document.getElementById('notification-overlay');
        const closeBtn = document.getElementById('close-panel');
        const markAllRead = document.getElementById('mark-all-read');
        const clearAll = document.getElementById('clear-all');

        // Toggle panel
        bell.addEventListener('click', () => this.togglePanel());
        overlay.addEventListener('click', () => this.closePanel());
        closeBtn.addEventListener('click', () => this.closePanel());

        // Acciones
        markAllRead.addEventListener('click', () => this.markAllAsRead());
        clearAll.addEventListener('click', () => this.clearAll());
    }

    // Toggle panel de notificaciones
    togglePanel() {
        const panel = document.getElementById('notification-panel');
        const overlay = document.getElementById('notification-overlay');
        const isOpen = panel.classList.contains('show');

        if (isOpen) {
            this.closePanel();
        } else {
            panel.classList.add('show');
            overlay.classList.add('show');
            this.renderNotifications();
        }
    }

    // Cerrar panel
    closePanel() {
        const panel = document.getElementById('notification-panel');
        const overlay = document.getElementById('notification-overlay');
        panel.classList.remove('show');
        overlay.classList.remove('show');
    }

    // Mostrar toast notification
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        const toastId = 'toast-' + Date.now();

        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        const colors = {
            success: 'text-bg-success',
            error: 'text-bg-danger',
            warning: 'text-bg-warning',
            info: 'text-bg-info'
        };

        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center ${colors[type]} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${icons[type]} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        container.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast, { delay: duration });
        bsToast.show();

        // Remover del DOM después de ocultar
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Agregar notificación persistente
    addNotification(title, message, type = 'info', data = {}) {
        const notification = {
            id: Date.now(),
            title: title,
            message: message,
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.unshift(notification);

        // Limitar cantidad de notificaciones
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        this.saveNotifications();
        this.updateBadge();

        // Mostrar toast también
        this.showToast(`${title}: ${message}`, type);

        // Notificación del navegador
        this.showBrowserNotification(title, message, type);

        return notification.id;
    }

    // Cargar notificaciones desde localStorage
    loadNotifications() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.notifications = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error cargando notificaciones:', e);
            this.notifications = [];
        }
    }

    // Guardar notificaciones en localStorage
    saveNotifications() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
        } catch (e) {
            console.error('Error guardando notificaciones:', e);
        }
    }

    // Actualizar badge con contador
    updateBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-count');

        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Renderizar lista de notificaciones
    renderNotifications() {
        const container = document.getElementById('notification-list');

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="bi bi-bell-slash fs-1"></i>
                    <p class="mt-2">No hay notificaciones</p>
                </div>
            `;
            return;
        }

        const icons = {
            success: 'bi-check-circle-fill text-success',
            error: 'bi-x-circle-fill text-danger',
            warning: 'bi-exclamation-triangle-fill text-warning',
            info: 'bi-info-circle-fill text-info'
        };

        container.innerHTML = this.notifications.map(notif => `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}" data-id="${notif.id}">
                <div class="notification-item-icon">
                    <i class="bi ${icons[notif.type]}"></i>
                </div>
                <div class="notification-item-content">
                    <div class="notification-item-title">${notif.title}</div>
                    <div class="notification-item-message">${notif.message}</div>
                    <div class="notification-item-time">
                        <i class="bi bi-clock"></i> ${this.formatTime(notif.timestamp)}
                    </div>
                </div>
                <div class="notification-item-actions">
                    ${!notif.read ? `<button class="btn btn-sm btn-outline-success mark-read" title="Marcar como leída"><i class="bi bi-check"></i></button>` : ''}
                    <button class="btn btn-sm btn-outline-danger delete-notif" title="Eliminar"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        `).join('');

        // Adjuntar event listeners a las acciones
        container.querySelectorAll('.mark-read').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.notification-item').dataset.id);
                this.markAsRead(id);
            });
        });

        container.querySelectorAll('.delete-notif').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.notification-item').dataset.id);
                this.deleteNotification(id);
            });
        });
    }

    // Formatear tiempo relativo
    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours} h`;
        if (days < 7) return `Hace ${days} días`;

        return time.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }

    // Marcar como leída
    markAsRead(id) {
        const notif = this.notifications.find(n => n.id === id);
        if (notif) {
            notif.read = true;
            this.saveNotifications();
            this.updateBadge();
            this.renderNotifications();
        }
    }

    // Marcar todas como leídas
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();
    }

    // Eliminar notificación
    deleteNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.saveNotifications();
        this.updateBadge();
        this.renderNotifications();
    }

    // Borrar todas
    clearAll() {
        if (confirm('¿Estás seguro de borrar todas las notificaciones?')) {
            this.notifications = [];
            this.saveNotifications();
            this.updateBadge();
            this.renderNotifications();
        }
    }

    // Solicitar permiso para notificaciones del navegador
    requestBrowserPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // No solicitar automáticamente, esperar acción del usuario
            // Notification.requestPermission();
        }
    }

    // Mostrar notificación del navegador
    showBrowserNotification(title, message, type) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };

            new Notification(`${icons[type]} ${title}`, {
                body: message,
                icon: 'assets/logoinsightdorado.png',
                badge: 'assets/logoinsightdorado.png',
                tag: 'cfe-insight-' + Date.now()
            });
        }
    }

    // Métodos de acceso rápido
    success(title, message, data = {}) {
        return this.addNotification(title, message, 'success', data);
    }

    error(title, message, data = {}) {
        return this.addNotification(title, message, 'error', data);
    }

    warning(title, message, data = {}) {
        return this.addNotification(title, message, 'warning', data);
    }

    info(title, message, data = {}) {
        return this.addNotification(title, message, 'info', data);
    }

    // Obtener notificaciones no leídas
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Obtener todas las notificaciones
    getAll() {
        return this.notifications;
    }

    // Obtener notificaciones por tipo
    getByType(type) {
        return this.notifications.filter(n => n.type === type);
    }
}

// Inicializar sistema global
window.NotificationSystem = window.NotificationSystem || new NotificationSystem();

// Atajos globales
window.showSuccess = (title, message) => window.NotificationSystem.success(title, message);
window.showError = (title, message) => window.NotificationSystem.error(title, message);
window.showWarning = (title, message) => window.NotificationSystem.warning(title, message);
window.showInfo = (title, message) => window.NotificationSystem.info(title, message);
window.showToast = (message, type, duration) => window.NotificationSystem.showToast(message, type, duration);
