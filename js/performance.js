/**
 * CFE INSIGHT - Performance Optimizations
 * Optimizaciones de rendimiento para la aplicación
 */

// ============================================
// DEBOUNCE Y THROTTLE UTILITIES
// ============================================

/**
 * Debounce: Retrasa la ejecución de una función hasta que pasen X ms sin que se llame
 * Útil para: búsquedas, validación de formularios mientras se escribe
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle: Limita la ejecución de una función a una vez cada X ms
 * Útil para: scroll events, resize events, clicks rápidos
 */
function throttle(func, limit = 100) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// CACHE SIMPLE CON TTL
// ============================================

class SimpleCache {
    constructor(defaultTTL = 300000) { // 5 minutos por defecto
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }

    set(key, value, ttl = this.defaultTTL) {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { value, expiry });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Verificar si expiró
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    clear() {
        this.cache.clear();
    }

    delete(key) {
        this.cache.delete(key);
    }
}

// Instancia global de cache
const dataCache = new SimpleCache(300000); // 5 minutos

// ============================================
// LAZY LOADING DE IMÁGENES
// ============================================

function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        // Observar todas las imágenes con clase 'lazy'
        document.querySelectorAll('img.lazy').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ============================================
// VIRTUAL SCROLLING BÁSICO
// ============================================

/**
 * Virtual Scrolling: Solo renderiza los elementos visibles en viewport
 * Útil para listas muy largas (> 100 items)
 */
class VirtualScroller {
    constructor(container, items, renderItem, itemHeight = 50) {
        this.container = container;
        this.items = items;
        this.renderItem = renderItem;
        this.itemHeight = itemHeight;
        this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        this.scrollTop = 0;

        this.init();
    }

    init() {
        // Crear contenedor interno
        this.innerContainer = document.createElement('div');
        this.innerContainer.style.height = `${this.items.length * this.itemHeight}px`;
        this.innerContainer.style.position = 'relative';
        this.container.appendChild(this.innerContainer);

        // Event listener para scroll
        this.container.addEventListener('scroll', throttle(() => {
            this.scrollTop = this.container.scrollTop;
            this.render();
        }, 50));

        this.render();
    }

    render() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleItems, this.items.length);

        this.innerContainer.innerHTML = '';

        for (let i = startIndex; i < endIndex; i++) {
            const itemElement = this.renderItem(this.items[i], i);
            itemElement.style.position = 'absolute';
            itemElement.style.top = `${i * this.itemHeight}px`;
            itemElement.style.width = '100%';
            this.innerContainer.appendChild(itemElement);
        }
    }

    update(newItems) {
        this.items = newItems;
        this.innerContainer.style.height = `${this.items.length * this.itemHeight}px`;
        this.render();
    }
}

// ============================================
// PAGINACIÓN OPTIMIZADA
// ============================================

class Paginator {
    constructor(items, itemsPerPage = 10) {
        this.items = items;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalPages = Math.ceil(items.length / itemsPerPage);
    }

    getCurrentPageItems() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.items.slice(start, end);
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return false;
        this.currentPage = page;
        return true;
    }

    nextPage() {
        return this.goToPage(this.currentPage + 1);
    }

    prevPage() {
        return this.goToPage(this.currentPage - 1);
    }

    updateItems(newItems) {
        this.items = newItems;
        this.totalPages = Math.ceil(newItems.length / this.itemsPerPage);
        this.currentPage = 1;
    }
}

// ============================================
// OPTIMIZACIÓN DE BÚSQUEDA
// ============================================

/**
 * Búsqueda optimizada con cache y debounce
 */
function createOptimizedSearch(searchFunction, cacheKey = 'search') {
    const searchCache = new SimpleCache(600000); // 10 minutos

    return debounce(async function (query) {
        if (!query || query.trim().length < 2) return;

        const cacheKeyFull = `${cacheKey}_${query.toLowerCase()}`;

        // Verificar cache
        if (searchCache.has(cacheKeyFull)) {
            console.log('Resultado de búsqueda desde cache');
            return searchCache.get(cacheKeyFull);
        }

        // Ejecutar búsqueda
        const results = await searchFunction(query);

        // Guardar en cache
        searchCache.set(cacheKeyFull, results);

        return results;
    }, 300);
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Ejecuta múltiples operaciones async en batches para no sobrecargar el servidor
 */
async function batchProcess(items, operation, batchSize = 5) {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(item => operation(item))
        );
        results.push(...batchResults);

        // Pequeña pausa entre batches
        if (i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
}

// ============================================
// COMPRESSION DE DATOS PARA LOCALSTORAGE
// ============================================

/**
 * Comprime datos grandes antes de guardar en localStorage
 * Útil para datasets grandes que se guardan localmente
 */
function compressData(data) {
    try {
        const jsonString = JSON.stringify(data);
        // Usar compresión LZ si está disponible (requiere librería)
        // Por ahora, solo reducir espacios
        return jsonString;
    } catch (error) {
        console.error('Error comprimiendo datos:', error);
        return null;
    }
}

function decompressData(compressedData) {
    try {
        return JSON.parse(compressedData);
    } catch (error) {
        console.error('Error descomprimiendo datos:', error);
        return null;
    }
}

// ============================================
// MONITOREO DE PERFORMANCE
// ============================================

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
    }

    start(label) {
        this.metrics.set(label, performance.now());
    }

    end(label) {
        const startTime = this.metrics.get(label);
        if (!startTime) {
            console.warn(`No se encontró métrica para: ${label}`);
            return null;
        }

        const duration = performance.now() - startTime;
        this.metrics.delete(label);

        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        return duration;
    }

    async measure(label, asyncFunction) {
        this.start(label);
        try {
            const result = await asyncFunction();
            this.end(label);
            return result;
        } catch (error) {
            this.end(label);
            throw error;
        }
    }
}

// Instancia global
const perfMonitor = new PerformanceMonitor();

// ============================================
// EXPORTAR FUNCIONES
// ============================================

// Si se usa en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        SimpleCache,
        dataCache,
        initLazyLoading,
        VirtualScroller,
        Paginator,
        createOptimizedSearch,
        batchProcess,
        compressData,
        decompressData,
        PerformanceMonitor,
        perfMonitor
    };
}
