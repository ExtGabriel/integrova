/**
 * CFE INSIGHT - Dashboard Charts
 * @description Gráficos interactivos del dashboard usando Chart.js
 */

// Variables globales para los gráficos
let commitmentStatusChart = null;
let commitmentEntityChart = null;
let activityChart = null;
let userRoleChart = null;

// Configuración global de Chart.js
Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
Chart.defaults.color = '#546E7A';
Chart.defaults.plugins.legend.display = true;
Chart.defaults.plugins.legend.position = 'bottom';

/**
 * Inicializar todos los gráficos
 */
async function initializeCharts() {
    try {
        await Promise.all([
            createCommitmentStatusChart(),
            createCommitmentEntityChart(),
            createActivityChart(),
            createUserRoleChart()
        ]);
        console.log('✅ Todos los gráficos inicializados');
    } catch (error) {
        console.error('Error inicializando gráficos:', error);
    }
}

/**
 * Gráfico de Dona: Compromisos por Estado
 */
async function createCommitmentStatusChart() {
    const ctx = document.getElementById('commitmentStatusChart');
    if (!ctx) return;

    try {
        // Obtener datos de compromisos
        let commitments = [];
        if (window.API && window.API.Commitments) {
            const response = API?.Commitments?.getAll
                ? await API.Commitments.getAll()
                : { success: false, data: [] };
            if (response.success && response.data) {
                commitments = response.data;
            }
        }

        // Contar por estado
        const statusCount = {
            'pendiente': 0,
            'en proceso': 0,
            'cumplido': 0,
            'vencido': 0
        };

        commitments.forEach(commitment => {
            const status = commitment.status?.toLowerCase() || 'pendiente';
            if (statusCount.hasOwnProperty(status)) {
                statusCount[status]++;
            }
        });

        // Destruir gráfico anterior si existe
        if (commitmentStatusChart) {
            commitmentStatusChart.destroy();
        }

        // Crear nuevo gráfico
        commitmentStatusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pendiente', 'En Proceso', 'Cumplido', 'Vencido'],
                datasets: [{
                    data: [
                        statusCount['pendiente'],
                        statusCount['en proceso'],
                        statusCount['cumplido'],
                        statusCount['vencido']
                    ],
                    backgroundColor: [
                        'rgba(255, 193, 7, 0.8)',   // Amarillo - Pendiente
                        'rgba(33, 150, 243, 0.8)',  // Azul - En Proceso
                        'rgba(76, 175, 80, 0.8)',   // Verde - Cumplido
                        'rgba(244, 67, 54, 0.8)'    // Rojo - Vencido
                    ],
                    borderColor: [
                        'rgba(255, 193, 7, 1)',
                        'rgba(33, 150, 243, 1)',
                        'rgba(76, 175, 80, 1)',
                        'rgba(244, 67, 54, 1)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

    } catch (error) {
        console.error('Error creando gráfico de estado:', error);
    }
}

/**
 * Gráfico de Barras: Compromisos por Entidad
 */
async function createCommitmentEntityChart() {
    const ctx = document.getElementById('commitmentEntityChart');
    if (!ctx) return;

    try {
        // Obtener datos
        let commitments = [];
        if (window.API && window.API.Commitments) {
            const response = API?.Commitments?.getAll
                ? await API.Commitments.getAll()
                : { success: false, data: [] };
            if (response.success && response.data) {
                commitments = response.data;
            }
        }

        // Contar por entidad (top 8)
        const entityCount = {};
        commitments.forEach(commitment => {
            // Obtener nombre de la entidad desde la relación anidada
            const entityName = commitment.entities?.name ||
                commitment.entity_name ||
                commitment.entity ||
                'Sin Entidad';
            entityCount[entityName] = (entityCount[entityName] || 0) + 1;
        });

        // Ordenar y tomar top 8
        const sortedEntities = Object.entries(entityCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        const labels = sortedEntities.map(e => e[0]);
        const data = sortedEntities.map(e => e[1]);

        // Destruir gráfico anterior
        if (commitmentEntityChart) {
            commitmentEntityChart.destroy();
        }

        // Crear gráfico
        commitmentEntityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Compromisos',
                    data: data,
                    backgroundColor: 'rgba(76, 175, 80, 0.7)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(76, 175, 80, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Barras horizontales
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return `Compromisos: ${context.parsed.x}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

    } catch (error) {
        console.error('Error creando gráfico de entidades:', error);
    }
}

/**
 * Gráfico de Líneas: Actividad del Mes
 */
async function createActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    try {
        // Obtener registros de actividad
        let records = [];
        if (window.API && window.API.Records) {
            const response = API?.Records?.getAll
                ? await API.Records.getAll()
                : { success: false, data: [] };
            if (response.success && response.data) {
                // Asegurar que records sea un array
                records = Array.isArray(response.data) ? response.data : [];
            }
        }

        // Generar datos para últimos 30 días
        const days = 30;
        const labels = [];
        const activityData = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            labels.push(dateStr);

            // Contar actividades de ese día
            const dayStart = new Date(date.setHours(0, 0, 0, 0));
            const dayEnd = new Date(date.setHours(23, 59, 59, 999));

            const count = records.filter(record => {
                const recordDate = new Date(record.timestamp);
                return recordDate >= dayStart && recordDate <= dayEnd;
            }).length;

            activityData.push(count);
        }

        // Destruir gráfico anterior
        if (activityChart) {
            activityChart.destroy();
        }

        // Crear gráfico
        activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Actividades',
                    data: activityData,
                    borderColor: 'rgba(33, 150, 243, 1)',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(33, 150, 243, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: 'rgba(33, 150, 243, 1)',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                return `Actividades: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeInOutQuart'
                }
            }
        });

    } catch (error) {
        console.error('Error creando gráfico de actividad:', error);
    }
}

/**
 * Gráfico Polar: Usuarios por Rol
 */
async function createUserRoleChart() {
    const ctx = document.getElementById('userRoleChart');
    if (!ctx) return;

    try {
        // Obtener usuarios
        let users = [];
        if (window.API && window.API.Users) {
            const response = API?.Users?.getAll
                ? await API.Users.getAll()
                : { success: false, data: [] };
            if (response.success && response.data) {
                users = response.data;
            }
        }

        // Contar por rol
        const roleCount = {};
        users.forEach(user => {
            const role = user.role || 'Sin Rol';
            roleCount[role] = (roleCount[role] || 0) + 1;
        });

        const labels = Object.keys(roleCount);
        const data = Object.values(roleCount);

        // Colores por rol
        const colors = labels.map(role => {
            switch (role.toLowerCase()) {
                case 'administrador': return 'rgba(244, 67, 54, 0.7)';
                case 'auditor': return 'rgba(76, 175, 80, 0.7)';
                case 'programador': return 'rgba(33, 150, 243, 0.7)';
                case 'socio': return 'rgba(156, 39, 176, 0.7)';
                default: return 'rgba(158, 158, 158, 0.7)';
            }
        });

        const borderColors = labels.map(role => {
            switch (role.toLowerCase()) {
                case 'administrador': return 'rgba(244, 67, 54, 1)';
                case 'auditor': return 'rgba(76, 175, 80, 1)';
                case 'programador': return 'rgba(33, 150, 243, 1)';
                case 'socio': return 'rgba(156, 39, 176, 1)';
                default: return 'rgba(158, 158, 158, 1)';
            }
        });

        // Destruir gráfico anterior
        if (userRoleChart) {
            userRoleChart.destroy();
        }

        // Crear gráfico
        userRoleChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed.r || 0;
                                return `${label}: ${value} usuario${value !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });

    } catch (error) {
        console.error('Error creando gráfico de roles:', error);
    }
}

/**
 * Refrescar un gráfico específico
 */
async function refreshChart(chartName) {
    try {
        // Mostrar feedback
        if (typeof showToast !== 'undefined') {
            showToast('Actualizando gráfico...', 'info', 1500);
        }

        switch (chartName) {
            case 'commitmentStatusChart':
                await createCommitmentStatusChart();
                break;
            case 'commitmentEntityChart':
                await createCommitmentEntityChart();
                break;
            case 'activityChart':
                await createActivityChart();
                break;
            case 'userRoleChart':
                await createUserRoleChart();
                break;
        }

        if (typeof showToast !== 'undefined') {
            showToast('Gráfico actualizado', 'success', 2000);
        }
    } catch (error) {
        console.error(`Error refrescando ${chartName}:`, error);
        if (typeof showToast !== 'undefined') {
            showToast('Error actualizando gráfico', 'error', 3000);
        }
    }
}

/**
 * Refrescar todos los gráficos
 */
async function refreshAllCharts() {
    try {
        if (typeof showToast !== 'undefined') {
            showToast('Actualizando todos los gráficos...', 'info', 2000);
        }

        await initializeCharts();

        if (typeof showToast !== 'undefined') {
            showToast('Gráficos actualizados', 'success', 2000);
        }
    } catch (error) {
        console.error('Error refrescando gráficos:', error);
    }
}

/**
 * Destruir todos los gráficos (cleanup)
 */
function destroyAllCharts() {
    if (commitmentStatusChart) commitmentStatusChart.destroy();
    if (commitmentEntityChart) commitmentEntityChart.destroy();
    if (activityChart) activityChart.destroy();
    if (userRoleChart) userRoleChart.destroy();
}

// Exportar para uso global
window.initializeCharts = initializeCharts;
window.refreshChart = refreshChart;
window.refreshAllCharts = refreshAllCharts;
window.destroyAllCharts = destroyAllCharts;
