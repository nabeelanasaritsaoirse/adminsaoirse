/**
 * Chart.js Utilities
 * Shared chart helpers for Admin Dashboard
 * SAFE for dynamic API-driven analytics
 */

/* =========================
   INTERNAL HELPERS
========================= */

/**
 * Destroy existing chart on canvas (prevents duplicates)
 */
function destroyIfExists(ctx) {
  if (ctx && ctx._chartInstance) {
    ctx._chartInstance.destroy();
    ctx._chartInstance = null;
  }
}

/* =========================
   BAR / HORIZONTAL BAR
========================= */

/**
 * Create or replace a bar chart
 * @param {string} canvasId
 * @param {object} config
 */
function createBarChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  destroyIfExists(ctx);

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: config.labels || [],
      datasets: [
        {
          label: config.label || "",
          data: config.values || [],
          backgroundColor: config.backgroundColor || "#4dabf7",
          borderRadius: 6,
          barThickness: config.barThickness || 18,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: config.horizontal ? "y" : "x",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: config.tooltipTitle || undefined,
            label: (ctx) => `₹${ctx.raw}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { display: false }, beginAtZero: true },
      },
    },
  });

  ctx._chartInstance = chart;
  return chart;
}

/* =========================
   LINE CHART
========================= */

/**
 * Create or replace a line chart
 */
function createLineChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  destroyIfExists(ctx);

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: config.labels || [],
      datasets: [
        {
          label: config.label || "",
          data: config.values || [],
          borderColor: config.color || "#339af0",
          backgroundColor: config.fill
            ? "rgba(51,154,240,0.15)"
            : "transparent",
          tension: 0.35,
          fill: !!config.fill,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          grid: { color: "#f1f3f5" },
          ticks: {
            callback: (v) => `₹${v}`,
          },
        },
      },
    },
  });

  ctx._chartInstance = chart;
  return chart;
}

/* =========================
   PIE / DOUGHNUT
========================= */

/**
 * Create or replace a pie / doughnut chart
 */
function createPieChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  destroyIfExists(ctx);

  const chart = new Chart(ctx, {
    type: config.type || "pie",
    data: {
      labels: config.labels || [],
      datasets: [
        {
          data: config.values || [],
          backgroundColor: config.colors || ["#339af0", "#ff6b6b", "#51cf66"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: config.type === "doughnut" ? "60%" : undefined,
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true },
        },
      },
    },
  });

  ctx._chartInstance = chart;
  return chart;
}

/* =========================
   UPDATE EXISTING CHART
========================= */

/**
 * Update chart data safely
 */
function updateChart(chart, values, labels = null) {
  if (!chart) return;

  if (labels) {
    chart.data.labels = labels;
  }

  chart.data.datasets[0].data = values;
  chart.update();
}

/* =========================
   EXPORT GLOBAL
========================= */

window.ChartUtils = {
  createBarChart,
  createLineChart,
  createPieChart,
  updateChart,
};
