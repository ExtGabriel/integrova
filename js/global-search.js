/**
 * CFE INSIGHT - Sistema de Búsqueda Global
 * @description Búsqueda universal en toda la aplicación con:
 * - Búsqueda en compromisos, entidades, usuarios, registros, grupos
 * - Filtros avanzados por tipo, fecha, estado
 * - Resultados en tiempo real mientras escribes
 * - Navegación directa a los resultados
 * - Historial de búsquedas recientes
 */

class GlobalSearch {
    constructor() {
        this.searchHistory = [];
        this.maxHistory = 10;
        this.storageKey = 'cfe_search_history';
        this.searchTimeout = null;
        this.loadSearchHistory();
        this.initUI();
    }

    // Inicializar UI del buscador
    initUI() {
        // Verificar si ya existe
        if (document.getElementById('global-search-system')) return;

        const container = document.createElement('div');
        container.id = 'global-search-system';
        container.innerHTML = `
            <!-- Botón flotante de búsqueda -->
            <button id="search-trigger" class="search-trigger" title="Búsqueda Global (Ctrl+K)">
                <i class="bi bi-search"></i>
            </button>

            <!-- Modal de búsqueda -->
            <div id="search-modal" class="search-modal">
                <div class="search-modal-content">
                    <!-- Header -->
                    <div class="search-header">
                        <div class="search-input-wrapper">
                            <i class="bi bi-search search-icon"></i>
                            <input 
                                type="text" 
                                id="global-search-input" 
                                class="search-input" 
                                placeholder="Buscar en compromisos, entidades, usuarios..."
                                autocomplete="off"
                            >
                            <button class="search-clear" id="search-clear" style="display: none;">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <button class="search-close" id="search-close">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <!-- Filtros -->
                    <div class="search-filters">
                        <button class="filter-btn active" data-filter="all">
                            <i class="bi bi-grid"></i> Todos
                        </button>
                        <button class="filter-btn" data-filter="commitments">
                            <i class="bi bi-file-earmark-text"></i> Compromisos
                        </button>
                        <button class="filter-btn" data-filter="entities">
                            <i class="bi bi-building"></i> Entidades
                        </button>
                        <button class="filter-btn" data-filter="users">
                            <i class="bi bi-people"></i> Usuarios
                        </button>
                        <button class="filter-btn" data-filter="records">
                            <i class="bi bi-list-ul"></i> Registros
                        </button>
                        <button class="filter-btn" data-filter="groups">
                            <i class="bi bi-diagram-3"></i> Grupos
                        </button>
                    </div>

                    <!-- Resultados -->
                    <div class="search-results" id="search-results">
                        <!-- Contenido dinámico -->
                    </div>

                    <!-- Footer con shortcuts -->
                    <div class="search-footer">
                        <div class="search-shortcuts">
                            <span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span>
                            <span><kbd>Enter</kbd> seleccionar</span>
                            <span><kbd>Esc</kbd> cerrar</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Overlay -->
            <div id="search-overlay" class="search-overlay"></div>
        `;

        document.body.appendChild(container);
        this.attachEventListeners();
    }

    // Adjuntar event listeners
    attachEventListeners() {
        const trigger = document.getElementById('search-trigger');
        const modal = document.getElementById('search-modal');
        const overlay = document.getElementById('search-overlay');
        const closeBtn = document.getElementById('search-close');
        const input = document.getElementById('global-search-input');
        const clearBtn = document.getElementById('search-clear');
        const filterBtns = document.querySelectorAll('.filter-btn');

        // Abrir modal
        trigger.addEventListener('click', () => this.openSearch());

        // Cerrar modal
        closeBtn.addEventListener('click', () => this.closeSearch());
        overlay.addEventListener('click', () => this.closeSearch());

        // Atajo de teclado Ctrl+K o Cmd+K
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearch();
            }
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                this.closeSearch();
            }
        });

        // Búsqueda en tiempo real
        input.addEventListener('input', (e) => {
            const query = e.target.value;
            clearBtn.style.display = query ? 'block' : 'none';

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        // Limpiar búsqueda
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            this.showInitialState();
            input.focus();
        });

        // Filtros
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.performSearch(input.value);
            });
        });

        // Navegación con teclado
        input.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
    }

    // Abrir modal de búsqueda
    openSearch() {
        const modal = document.getElementById('search-modal');
        const overlay = document.getElementById('search-overlay');
        const input = document.getElementById('global-search-input');

        modal.classList.add('show');
        overlay.classList.add('show');

        setTimeout(() => {
            input.focus();
            this.showInitialState();
        }, 100);
    }

    // Cerrar modal
    closeSearch() {
        const modal = document.getElementById('search-modal');
        const overlay = document.getElementById('search-overlay');
        const input = document.getElementById('global-search-input');

        modal.classList.remove('show');
        overlay.classList.remove('show');
        input.value = '';
        document.getElementById('search-clear').style.display = 'none';
    }

    // Mostrar estado inicial (búsquedas recientes)
    showInitialState() {
        const container = document.getElementById('search-results');

        if (this.searchHistory.length === 0) {
            container.innerHTML = `
                <div class="search-empty">
                    <i class="bi bi-search fs-1 text-muted"></i>
                    <p class="mt-3 text-muted">Busca en toda la aplicación</p>
                    <small class="text-muted">Presiona Ctrl+K para abrir el buscador desde cualquier lugar</small>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="search-section">
                    <div class="search-section-header">
                        <h6><i class="bi bi-clock-history"></i> Búsquedas Recientes</h6>
                        <button class="btn btn-sm btn-link text-danger" onclick="window.GlobalSearch.clearHistory()">Borrar</button>
                    </div>
                    <div class="search-section-body">
                        ${this.searchHistory.map(term => `
                            <div class="search-result-item" onclick="window.GlobalSearch.searchFromHistory('${term}')">
                                <i class="bi bi-clock-history"></i>
                                <span>${term}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    // Realizar búsqueda
    async performSearch(query) {
        if (!query || query.trim().length < 2) {
            this.showInitialState();
            return;
        }

        const container = document.getElementById('search-results');
        const filter = this.currentFilter || 'all';

        // Mostrar loading
        container.innerHTML = '<div class="search-loading"><div class="spinner-border text-success"></div></div>';

        try {
            const results = await this.search(query, filter);
            this.displayResults(results, query);
            this.addToHistory(query);
        } catch (error) {
            container.innerHTML = `
                <div class="search-error">
                    <i class="bi bi-exclamation-triangle fs-1 text-danger"></i>
                    <p class="mt-3 text-danger">Error al buscar</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    // Buscar en todos los datos
    async search(query, filter = 'all') {
        const results = {
            commitments: [],
            entities: [],
            users: [],
            records: [],
            groups: []
        };

        const searchTerm = query.toLowerCase();

        try {
            // Buscar en compromisos
            if (filter === 'all' || filter === 'commitments') {
                if (window.API && window.API.Commitments) {
                    const response = API?.Commitments?.getAll
                        ? await API.Commitments.getAll()
                        : { success: false, data: [] };
                    if (response.success && response.data) {
                        results.commitments = response.data.filter(item =>
                            item.description?.toLowerCase().includes(searchTerm) ||
                            item.entity?.toLowerCase().includes(searchTerm) ||
                            item.status?.toLowerCase().includes(searchTerm)
                        );
                    }
                }
            }

            // Buscar en entidades
            if (filter === 'all' || filter === 'entities') {
                if (window.API && window.API.Entities) {
                    const response = API?.Entities?.getAll
                        ? await API.Entities.getAll()
                        : { success: false, data: [] };
                    if (response.success && response.data) {
                        results.entities = response.data.filter(item =>
                            item.name?.toLowerCase().includes(searchTerm) ||
                            item.responsible?.toLowerCase().includes(searchTerm)
                        );
                    }
                }
            }

            // Buscar en usuarios
            if (filter === 'all' || filter === 'users') {
                if (window.API && window.API.Users) {
                    const response = API?.Users?.getAll
                        ? await API.Users.getAll()
                        : { success: false, data: [] };
                    if (response.success && response.data) {
                        results.users = response.data.filter(item =>
                            item.username?.toLowerCase().includes(searchTerm) ||
                            item.name?.toLowerCase().includes(searchTerm) ||
                            item.email?.toLowerCase().includes(searchTerm) ||
                            item.role?.toLowerCase().includes(searchTerm)
                        );
                    }
                }
            }

            // Buscar en registros
            if (filter === 'all' || filter === 'records') {
                if (window.API && window.API.Records) {
                    const response = API?.Records?.getAll
                        ? await API.Records.getAll()
                        : { success: false, data: [] };
                    if (response.success && response.data) {
                        results.records = response.data.filter(item =>
                            item.action?.toLowerCase().includes(searchTerm) ||
                            item.user?.toLowerCase().includes(searchTerm)
                        );
                    }
                }
            }

            // Buscar en grupos
            if (filter === 'all' || filter === 'groups') {
                if (window.API && window.API.WorkGroups) {
                    const response = API?.WorkGroups?.getAll
                        ? await API.WorkGroups.getAll()
                        : { success: false, data: [] };
                    if (response.success && response.data) {
                        results.groups = response.data.filter(item =>
                            item.name?.toLowerCase().includes(searchTerm) ||
                            item.description?.toLowerCase().includes(searchTerm)
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error en búsqueda:', error);
        }

        return results;
    }

    // Mostrar resultados
    displayResults(results, query) {
        const container = document.getElementById('search-results');
        const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

        if (totalResults === 0) {
            container.innerHTML = `
                <div class="search-empty">
                    <i class="bi bi-inbox fs-1 text-muted"></i>
                    <p class="mt-3 text-muted">No se encontraron resultados para "${query}"</p>
                    <small class="text-muted">Intenta con otros términos de búsqueda</small>
                </div>
            `;
            return;
        }

        let html = '';

        // Compromisos
        if (results.commitments.length > 0) {
            html += this.renderSection('Compromisos', results.commitments, 'commitments', query);
        }

        // Entidades
        if (results.entities.length > 0) {
            html += this.renderSection('Entidades', results.entities, 'entities', query);
        }

        // Usuarios
        if (results.users.length > 0) {
            html += this.renderSection('Usuarios', results.users, 'users', query);
        }

        // Registros
        if (results.records.length > 0) {
            html += this.renderSection('Registros', results.records, 'records', query);
        }

        // Grupos
        if (results.groups.length > 0) {
            html += this.renderSection('Grupos', results.groups, 'groups', query);
        }

        container.innerHTML = html;

        // Adjuntar event listeners a los resultados
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                const id = item.dataset.id;
                this.navigateToResult(type, id);
            });
        });
    }

    // Renderizar sección de resultados
    renderSection(title, items, type, query) {
        const icons = {
            commitments: 'bi-file-earmark-text',
            entities: 'bi-building',
            users: 'bi-people',
            records: 'bi-list-ul',
            groups: 'bi-diagram-3'
        };

        const maxItems = 5;
        const displayItems = items.slice(0, maxItems);
        const hasMore = items.length > maxItems;

        return `
            <div class="search-section">
                <div class="search-section-header">
                    <h6><i class="bi ${icons[type]}"></i> ${title} (${items.length})</h6>
                </div>
                <div class="search-section-body">
                    ${displayItems.map(item => this.renderResultItem(item, type, query)).join('')}
                    ${hasMore ? `<div class="search-more">+${items.length - maxItems} más resultados</div>` : ''}
                </div>
            </div>
        `;
    }

    // Renderizar item de resultado
    renderResultItem(item, type, query) {
        let title = '';
        let subtitle = '';
        let badge = '';

        switch (type) {
            case 'commitments':
                title = item.description || 'Sin descripción';
                subtitle = `Entidad: ${item.entity || 'N/A'} | Vence: ${this.formatDate(item.deadline)}`;
                badge = `<span class="badge bg-${this.getStatusColor(item.status)}">${item.status}</span>`;
                break;
            case 'entities':
                title = item.name || 'Sin nombre';
                subtitle = `Responsable: ${item.responsible || 'N/A'}`;
                break;
            case 'users':
                title = item.name || item.username || 'Sin nombre';
                subtitle = `${item.email || ''} | Rol: ${item.role || 'N/A'}`;
                badge = `<span class="badge bg-info">${item.role}</span>`;
                break;
            case 'records':
                title = item.action || 'Sin acción';
                subtitle = `Usuario: ${item.user || 'N/A'} | ${this.formatDate(item.timestamp)}`;
                break;
            case 'groups':
                title = item.name || 'Sin nombre';
                subtitle = item.description || 'Sin descripción';
                break;
        }

        // Resaltar término de búsqueda
        const highlightTerm = (text) => {
            if (!query) return text;
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };

        return `
            <div class="search-result-item" data-type="${type}" data-id="${item.id}">
                <div class="search-result-content">
                    <div class="search-result-title">${highlightTerm(title)}</div>
                    <div class="search-result-subtitle">${highlightTerm(subtitle)}</div>
                </div>
                ${badge ? `<div class="search-result-badge">${badge}</div>` : ''}
            </div>
        `;
    }

    // Navegar al resultado
    navigateToResult(type, id) {
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        const prefix = isInPagesFolder ? '' : 'pages/';

        const pages = {
            commitments: `${prefix}compromisos.html`,
            entities: `${prefix}entidades.html`,
            users: `${prefix}usuarios.html`,
            records: `${prefix}registros.html`,
            groups: `${prefix}grupos.html`
        };

        const page = pages[type];
        if (page) {
            this.closeSearch();
            window.location.href = `${page}?highlight=${id}`;
        }
    }

    // Historial de búsquedas
    addToHistory(query) {
        if (!query || query.trim().length < 2) return;

        const term = query.trim();
        this.searchHistory = [term, ...this.searchHistory.filter(t => t !== term)];
        this.searchHistory = this.searchHistory.slice(0, this.maxHistory);
        this.saveSearchHistory();
    }

    searchFromHistory(term) {
        const input = document.getElementById('global-search-input');
        input.value = term;
        this.performSearch(term);
    }

    clearHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        this.showInitialState();
    }

    loadSearchHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.searchHistory = JSON.parse(stored);
            }
        } catch (e) {
            this.searchHistory = [];
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.searchHistory));
        } catch (e) {
            console.error('Error guardando historial:', e);
        }
    }

    // Utilidades
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    getStatusColor(status) {
        const colors = {
            'pendiente': 'warning',
            'en proceso': 'info',
            'cumplido': 'success',
            'vencido': 'danger'
        };
        return colors[status?.toLowerCase()] || 'secondary';
    }

    // Navegación con teclado
    handleKeyboardNavigation(e) {
        const items = document.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        let currentIndex = Array.from(items).findIndex(item => item.classList.contains('active'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        } else if (e.key === 'Enter' && currentIndex >= 0) {
            e.preventDefault();
            items[currentIndex].click();
            return;
        } else {
            return;
        }

        // Actualizar clases
        items.forEach(item => item.classList.remove('active'));
        items[currentIndex].classList.add('active');
        items[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// Inicializar sistema global
window.GlobalSearch = window.GlobalSearch || new GlobalSearch();
