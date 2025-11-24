/*******************************
 * CHAT ANALYTICS CONTROLLER
 * Handles chat statistics and analytics dashboard
 *******************************/

console.log('[ANALYTICS.JS] 🚀 Chat Analytics controller loading...');

/* ========== STATE MANAGEMENT ========== */
let analyticsData = null;
let dateRange = {
  startDate: null,
  endDate: null
};

console.log('[ANALYTICS.JS] ✅ State initialized');

/* ========== DOM INITIALIZATION ========== */
document.addEventListener('DOMContentLoaded', function() {
  console.log('[ANALYTICS.JS] 📄 DOM Content Loaded - Initializing...');

  setupEventListeners();
  setDefaultDateRange();
  loadAnalytics();

  console.log('[ANALYTICS.JS] ✅ Initialization complete');
});

function setupEventListeners() {
  console.log('[ANALYTICS.JS] 🎯 Setting up event listeners...');

  // No specific listeners needed for now
  // Date filter button has onclick in HTML

  console.log('[ANALYTICS.JS] ✅ Event listeners set up');
}

function setDefaultDateRange() {
  console.log('[ANALYTICS.JS] 📅 Setting default date range...');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1); // Last 30 days

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  if (startDateInput) {
    startDateInput.value = startDate.toISOString().split('T')[0];
  }

  if (endDateInput) {
    endDateInput.value = endDate.toISOString().split('T')[0];
  }

  console.log('[ANALYTICS.JS] ✅ Default date range set:', {
    start: startDateInput?.value,
    end: endDateInput?.value
  });
}

/* ========== DATA LOADING ========== */
async function loadAnalytics() {
  console.log('[ANALYTICS.JS] 📡 Loading analytics data...');

  try {
    showLoading(true);
    console.log('[ANALYTICS.JS] ⏳ Showing loading overlay...');

    const queryParams = {};

    if (dateRange.startDate) {
      queryParams.startDate = dateRange.startDate;
      console.log('[ANALYTICS.JS] 📅 Start date filter:', dateRange.startDate);
    }

    if (dateRange.endDate) {
      queryParams.endDate = dateRange.endDate;
      console.log('[ANALYTICS.JS] 📅 End date filter:', dateRange.endDate);
    }

    console.log('[ANALYTICS.JS] 📤 API Request:', {
      endpoint: API_CONFIG.endpoints.chat.analytics,
      params: queryParams
    });

    const response = await API.get(
      API_CONFIG.endpoints.chat.analytics,
      {},
      queryParams
    );

    console.log('[ANALYTICS.JS] 📥 API Response received:', response);

    if (!response.success) {
      throw new Error(response.message || 'Failed to load analytics');
    }

    // Extract nested data structure
    analyticsData = response.data || {};
    console.log('[ANALYTICS.JS] 📊 Analytics data:', analyticsData);

    renderAnalytics();

    console.log('[ANALYTICS.JS] ✅ Analytics loaded and rendered successfully');

  } catch (error) {
    console.error('[ANALYTICS.JS] ❌ Error loading analytics:', error);
    console.error('[ANALYTICS.JS] Error stack:', error.stack);
    showNotification('Failed to load analytics: ' + error.message, 'error');

    // Show error in UI
    showErrorState('Failed to load analytics data. Please try again.');

  } finally {
    showLoading(false);
    console.log('[ANALYTICS.JS] ⏳ Loading overlay hidden');
  }
}

/* ========== DATE FILTERING ========== */
function applyDateFilter() {
  console.log('[ANALYTICS.JS] 📅 Applying date filter...');

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  const startDate = startDateInput?.value;
  const endDate = endDateInput?.value;

  console.log('[ANALYTICS.JS] Selected dates:', { startDate, endDate });

  // Validation
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    console.warn('[ANALYTICS.JS] ⚠️ Invalid date range');
    showNotification('Start date must be before end date', 'error');
    return;
  }

  // Update date range
  dateRange.startDate = startDate ? new Date(startDate).toISOString() : null;
  dateRange.endDate = endDate ? new Date(endDate + 'T23:59:59').toISOString() : null;

  console.log('[ANALYTICS.JS] Date range updated:', dateRange);

  // Update badge
  updateDateRangeBadge();

  // Reload analytics
  loadAnalytics();
}

function updateDateRangeBadge() {
  const badge = document.getElementById('dateRangeBadge');
  if (!badge) return;

  if (dateRange.startDate || dateRange.endDate) {
    const start = dateRange.startDate ? formatDate(dateRange.startDate) : 'Beginning';
    const end = dateRange.endDate ? formatDate(dateRange.endDate) : 'Now';
    badge.textContent = `${start} - ${end}`;
    badge.className = 'badge bg-primary date-range-badge';
  } else {
    badge.textContent = 'All Time';
    badge.className = 'badge bg-info date-range-badge';
  }

  console.log('[ANALYTICS.JS] 📅 Date range badge updated');
}

/* ========== RENDERING ========== */
function renderAnalytics() {
  console.log('[ANALYTICS.JS] 🎨 Rendering analytics dashboard...');

  if (!analyticsData) {
    console.error('[ANALYTICS.JS] ❌ No analytics data to render');
    return;
  }

  renderOverviewStats();
  renderMessagesByType();
  renderReportStats();
  renderTopActiveUsers();

  console.log('[ANALYTICS.JS] ✅ Analytics dashboard rendered');
}

function renderOverviewStats() {
  console.log('[ANALYTICS.JS] 🎨 Rendering overview stats...');

  const totalConversationsEl = document.getElementById('totalConversations');
  const totalMessagesEl = document.getElementById('totalMessages');
  const activeConversationsEl = document.getElementById('activeConversations');
  const avgMessagesEl = document.getElementById('avgMessages');

  if (totalConversationsEl) {
    totalConversationsEl.textContent = formatNumber(analyticsData.totalConversations || 0);
  }

  if (totalMessagesEl) {
    totalMessagesEl.textContent = formatNumber(analyticsData.totalMessages || 0);
  }

  if (activeConversationsEl) {
    activeConversationsEl.textContent = formatNumber(analyticsData.activeConversations || 0);
  }

  if (avgMessagesEl) {
    const avg = analyticsData.averageMessagesPerConversation || 0;
    avgMessagesEl.textContent = avg.toFixed(1);
  }

  console.log('[ANALYTICS.JS] ✅ Overview stats rendered');
}

function renderMessagesByType() {
  console.log('[ANALYTICS.JS] 🎨 Rendering messages by type chart...');

  const container = document.getElementById('messagesByTypeContainer');
  if (!container) {
    console.error('[ANALYTICS.JS] ❌ Messages by type container not found');
    return;
  }

  const messagesByType = analyticsData.messagesByType || {};
  console.log('[ANALYTICS.JS] 📊 Messages by type data:', messagesByType);

  // Calculate total for percentages
  const total = Object.values(messagesByType).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-inbox fs-2"></i>
        <p class="mt-2">No message data available</p>
      </div>
    `;
    return;
  }

  // Type colors
  const typeColors = {
    TEXT: '#0d6efd',
    PRODUCT_SHARE: '#198754',
    ORDER_SHARE: '#ffc107',
    SYSTEM: '#6c757d'
  };

  let html = '';

  Object.entries(messagesByType).forEach(([type, count]) => {
    const percentage = ((count / total) * 100).toFixed(1);
    const color = typeColors[type] || '#6c757d';

    html += `
      <div class="message-type-bar" style="width: ${percentage}%; background-color: ${color};">
        ${type}: ${formatNumber(count)} (${percentage}%)
      </div>
    `;
  });

  container.innerHTML = html;
  console.log('[ANALYTICS.JS] ✅ Messages by type rendered');
}

function renderReportStats() {
  console.log('[ANALYTICS.JS] 🎨 Rendering report statistics...');

  const reportStats = analyticsData.reportStats || {};
  console.log('[ANALYTICS.JS] 📊 Report stats data:', reportStats);

  const totalReportsEl = document.getElementById('totalReports');
  const pendingReportsEl = document.getElementById('pendingReports');
  const actionedReportsEl = document.getElementById('actionedReports');
  const resolutionRateEl = document.getElementById('resolutionRate');
  const resolutionBarEl = document.getElementById('resolutionBar');

  const total = reportStats.totalReports || 0;
  const pending = reportStats.pendingReports || 0;
  const actioned = reportStats.actionedReports || 0;

  if (totalReportsEl) {
    totalReportsEl.textContent = formatNumber(total);
  }

  if (pendingReportsEl) {
    pendingReportsEl.textContent = formatNumber(pending);
  }

  if (actionedReportsEl) {
    actionedReportsEl.textContent = formatNumber(actioned);
  }

  // Calculate resolution rate
  const resolutionRate = total > 0 ? ((actioned / total) * 100).toFixed(1) : 0;

  if (resolutionRateEl) {
    resolutionRateEl.textContent = resolutionRate;
  }

  if (resolutionBarEl) {
    resolutionBarEl.style.width = resolutionRate + '%';
    resolutionBarEl.setAttribute('aria-valuenow', resolutionRate);
  }

  console.log('[ANALYTICS.JS] ✅ Report statistics rendered');
}

function renderTopActiveUsers() {
  console.log('[ANALYTICS.JS] 🎨 Rendering top active users...');

  const container = document.getElementById('topUsersContainer');
  if (!container) {
    console.error('[ANALYTICS.JS] ❌ Top users container not found');
    return;
  }

  const topActiveUsers = analyticsData.topActiveUsers || [];
  console.log('[ANALYTICS.JS] 👥 Top users data:', topActiveUsers.length, 'users');

  if (topActiveUsers.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-people fs-2"></i>
        <p class="mt-2">No user activity data available</p>
      </div>
    `;
    return;
  }

  let html = '<div class="row">';

  topActiveUsers.forEach((user, index) => {
    const rank = index + 1;
    const medalIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

    html += `
      <div class="col-md-6 mb-3">
        <div class="top-user-row">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <span class="fs-5 me-2">${medalIcon}</span>
              <strong>${escapeHtml(user.name || 'Unknown User')}</strong>
              <br/>
              <small class="text-muted">${escapeHtml(user.email || '')}</small>
            </div>
            <div class="text-end">
              <div class="h5 mb-0 text-primary">${formatNumber(user.messageCount || 0)}</div>
              <small class="text-muted">messages</small>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';

  container.innerHTML = html;
  console.log('[ANALYTICS.JS] ✅ Top active users rendered');
}

/* ========== ERROR STATE ========== */
function showErrorState(message) {
  console.error('[ANALYTICS.JS] 💥 Showing error state:', message);

  const containers = [
    'totalConversations',
    'totalMessages',
    'activeConversations',
    'avgMessages'
  ];

  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '-';
  });

  const messagesByTypeContainer = document.getElementById('messagesByTypeContainer');
  if (messagesByTypeContainer) {
    messagesByTypeContainer.innerHTML = `
      <div class="text-center py-5 text-danger">
        <i class="bi bi-exclamation-triangle fs-2"></i>
        <p class="mt-2">${escapeHtml(message)}</p>
        <button class="btn btn-sm btn-primary mt-2" onclick="loadAnalytics()">
          <i class="bi bi-arrow-clockwise"></i> Retry
        </button>
      </div>
    `;
  }

  const topUsersContainer = document.getElementById('topUsersContainer');
  if (topUsersContainer) {
    topUsersContainer.innerHTML = `
      <div class="text-center py-5 text-danger">
        <i class="bi bi-exclamation-triangle fs-2"></i>
        <p class="mt-2">${escapeHtml(message)}</p>
      </div>
    `;
  }
}

/* ========== UTILITY FUNCTIONS ========== */
function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    if (show) {
      overlay.classList.add('show');
    } else {
      overlay.classList.remove('show');
    }
  }
}

function showNotification(message, type = 'info') {
  console.log(`[ANALYTICS.JS] 🔔 Notification [${type}]:`, message);

  // Use global notification function if available
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
    return;
  }

  // Fallback to alert
  alert(message);
}

function escapeHtml(text) {
  if (!text && text !== 0) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.toString().replace(/[&<>"']/g, (m) => map[m]);
}

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return num.toLocaleString('en-US');
}

function formatDate(date) {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  return d.toLocaleDateString('en-US', options);
}

function formatDateTime(date) {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return d.toLocaleDateString('en-US', options);
}

/* ========== GLOBAL EXPORTS ========== */
window.loadAnalytics = loadAnalytics;
window.applyDateFilter = applyDateFilter;

console.log('[ANALYTICS.JS] ✅ Chat Analytics controller loaded and ready');
