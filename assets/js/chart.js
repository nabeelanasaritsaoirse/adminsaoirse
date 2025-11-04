/**
 * Chart.js Configuration
 * Dashboard charts and visualizations
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
});

/**
 * Initialize all charts
 */
function initializeCharts() {
    createSalesChart();
    createRevenueChart();
}

/**
 * Create sales overview chart
 */
function createSalesChart() {
    const ctx = document.getElementById('salesChart');

    if (!ctx) return;

    const salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Sales 2024',
                data: [12, 19, 15, 25, 22, 30, 28, 35, 32, 38, 42, 45],
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }, {
                label: 'Sales 2023',
                data: [8, 15, 12, 20, 18, 25, 22, 28, 25, 30, 35, 38],
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                borderColor: 'rgba(118, 75, 162, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgba(118, 75, 162, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += '$' + context.parsed.y + 'k';
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value + 'k';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

/**
 * Create revenue sources pie chart
 */
function createRevenueChart() {
    const ctx = document.getElementById('revenueChart');

    if (!ctx) return;

    const revenueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Online Sales', 'Retail Store', 'Partners', 'Others'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(54, 185, 204, 0.8)',
                    'rgba(246, 194, 62, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)',
                    'rgba(54, 185, 204, 1)',
                    'rgba(246, 194, 62, 1)'
                ],
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed + '%';
                            return label;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

/**
 * Create bar chart (example for other pages)
 * @param {string} canvasId - Canvas element ID
 * @param {object} data - Chart data
 */
function createBarChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);

    if (!ctx) return;

    const barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: data.label,
                data: data.values,
                backgroundColor: 'rgba(102, 126, 234, 0.6)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    return barChart;
}

/**
 * Update chart data dynamically
 * @param {object} chart - Chart instance
 * @param {array} newData - New data array
 */
function updateChartData(chart, newData) {
    chart.data.datasets[0].data = newData;
    chart.update();
}

// Export chart functions
window.chartFunctions = {
    createBarChart,
    updateChartData,
    initializeCharts
};
