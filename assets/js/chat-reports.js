/*******************************
 * CHAT REPORTS CONTROLLER
 * Handles reported messages management and moderation actions
 *******************************/

console.log('[REPORTS.JS] 🚀 Chat Reports controller loading...');

/* ========== STATE MANAGEMENT ========== */
let reports = [];
let currentReport = null;
let autoRefreshInterval = null;

// Pagination state
let pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
};

// Filter state
let filters = {
  status: 'PENDING',
  reason: ''
};

// Modal references
let actionModal;

// DOM Elements
let statusFilter;
let reasonFilter;
let reportsContainer;
let paginationContainer;

console.log('[REPORTS.JS] ✅ State initialized');

/* ========== DOM INITIALIZATION ========== */
document.addEventListener('DOMContentLoaded', function() {
  console.log('[REPORTS.JS] 📄 DOM Content Loaded - Initializing...');

  initializeDOMElements();
  setupEventListeners();
  initializeModals();
  loadInitialData();
  startAutoRefresh();

  console.log('[REPORTS.JS] ✅ Initialization complete');
});

function initializeDOMElements() {
  console.log('[REPORTS.JS] 🔍 Caching DOM elements...');

  statusFilter = document.getElementById('statusFilter');
  reasonFilter = document.getElementById('reasonFilter');
  reportsContainer = document.getElementById('reportsContainer');
  paginationContainer = document.getElementById('paginationContainer');

  console.log('[REPORTS.JS] ✅ DOM elements cached:', {
    statusFilter: !!statusFilter,
    reasonFilter: !!reasonFilter,
    reportsContainer: !!reportsContainer
  });
}

function setupEventListeners() {
  console.log('[REPORTS.JS] 🎯 Setting up event listeners...');

  // Status filter
  if (statusFilter) {
    statusFilter.addEventListener('change', filterReports);
    console.log('[REPORTS.JS] ✅ Status filter listener attached');
  }

  // Reason filter
  if (reasonFilter) {
    reasonFilter.addEventListener('change', filterReports);
    console.log('[REPORTS.JS] ✅ Reason filter listener attached');
  }

  // Action type change
  const actionType = document.getElementById('actionType');
  if (actionType) {
    actionType.addEventListener('change', handleActionTypeChange);
    console.log('[REPORTS.JS] ✅ Action type listener attached');
  }

  // Confirm action button
  const confirmActionBtn = document.getElementById('confirmActionBtn');
  if (confirmActionBtn) {
    confirmActionBtn.addEventListener('click', confirmAction);
    console.log('[REPORTS.JS] ✅ Confirm action listener attached');
  }

  console.log('[REPORTS.JS] ✅ All event listeners set up');
}

function initializeModals() {
  console.log('[REPORTS.JS] 🎭 Initializing Bootstrap modals...');

  const actionModalEl = document.getElementById('actionModal');
  if (actionModalEl) {
    actionModal = new bootstrap.Modal(actionModalEl);
    console.log('[REPORTS.JS] ✅ Action modal initialized');
  }
}

/* ========== DATA LOADING ========== */
function loadInitialData() {
  console.log('[REPORTS.JS] 📊 Loading initial data...');
  loadReports();
}

async function loadReports() {
  console.log('[REPORTS.JS] 📡 Loading reports - Page:', pagination.page, 'Filters:', filters);

  try {
    showLoading(true);
    console.log('[REPORTS.JS] ⏳ Showing loading overlay...');

    const queryParams = {
      page: pagination.page,
      limit: pagination.limit,
    };

    if (filters.status) {
      queryParams.status = filters.status;
      console.log('[REPORTS.JS] 🏷️ Status filter applied:', filters.status);
    }

    if (filters.reason) {
      queryParams.reason = filters.reason;
      console.log('[REPORTS.JS] 🏷️ Reason filter applied:', filters.reason);
    }

    console.log('[REPORTS.JS] 📤 API Request:', {
      endpoint: API_CONFIG.endpoints.chat.reports,
      params: queryParams
    });

    const response = await API.get(
      API_CONFIG.endpoints.chat.reports,
      {},
      queryParams
    );

    console.log('[REPORTS.JS] 📥 API Response received:', response);

    if (!response.success) {
      throw new Error(response.message || 'Failed to load reports');
    }

    // Extract nested data structure
    const responseData = response.data || {};
    console.log('[REPORTS.JS] 📦 Response data structure:', {
      hasReports: !!responseData.reports,
      hasPagination: !!responseData.pagination,
      reportsCount: responseData.reports?.length || 0
    });

    // Handle reports
    let reportsData = responseData.reports || [];
    if (!Array.isArray(reportsData)) {
      console.warn('[REPORTS.JS] ⚠️ Reports is not an array, converting...');
      reportsData = [];
    }

    console.log('[REPORTS.JS] 🚩 Reports loaded:', reportsData.length);

    // Normalize report data
    reports = reportsData.map((report, index) => {
      console.log(`[REPORTS.JS] 🔄 Normalizing report ${index + 1}:`, report.reportId);
      return {
        reportId: report.reportId,
        message: report.message || {},
        reportedBy: report.reportedBy || {},
        reportedUser: report.reportedUser || {},
        reason: report.reason,
        description: report.description,
        status: report.status,
        adminAction: report.adminAction,
        adminNotes: report.adminNotes,
        reviewedBy: report.reviewedBy,
        reviewedAt: report.reviewedAt,
        createdAt: report.createdAt
      };
    });

    // Update pagination
    if (responseData.pagination) {
      pagination.page = responseData.pagination.page || responseData.pagination.current || pagination.page;
      pagination.totalPages = responseData.pagination.totalPages || responseData.pagination.pages || 1;
      pagination.total = responseData.pagination.totalReports || responseData.pagination.total || 0;
      console.log('[REPORTS.JS] 📄 Pagination updated:', pagination);
    }

    updateStats();
    renderReports();
    renderPagination();
    updateLastRefreshTime();

    console.log('[REPORTS.JS] ✅ Reports loaded and rendered successfully');

  } catch (error) {
    console.error('[REPORTS.JS] ❌ Error loading reports:', error);
    console.error('[REPORTS.JS] Error stack:', error.stack);
    showNotification('Failed to load reports: ' + error.message, 'error');

    // Show error in UI
    if (reportsContainer) {
      reportsContainer.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5 text-danger">
            <i class="bi bi-exclamation-triangle fs-2"></i>
            <p class="mt-2">Failed to load reports</p>
            <small>${escapeHtml(error.message)}</small>
            <br/>
            <button class="btn btn-sm btn-primary mt-3" onclick="loadReports()">
              <i class="bi bi-arrow-clockwise"></i> Retry
            </button>
          </td>
        </tr>
      `;
    }
  } finally {
    showLoading(false);
    console.log('[REPORTS.JS] ⏳ Loading overlay hidden');
  }
}

/* ========== FILTERING ========== */
function filterReports() {
  console.log('[REPORTS.JS] 🔍 Filtering reports...');

  filters.status = statusFilter?.value || '';
  filters.reason = reasonFilter?.value || '';

  console.log('[REPORTS.JS] Applied filters:', filters);

  pagination.page = 1;  // Reset to page 1
  loadReports();
}

function resetFilters() {
  console.log('[REPORTS.JS] 🔄 Resetting filters...');

  if (statusFilter) statusFilter.value = 'PENDING';
  if (reasonFilter) reasonFilter.value = '';

  filters = { status: 'PENDING', reason: '' };
  pagination.page = 1;

  console.log('[REPORTS.JS] ✅ Filters reset');
  loadReports();
}

/* ========== RENDERING ========== */
function renderReports() {
  console.log('[REPORTS.JS] 🎨 Rendering reports...');

  if (!reportsContainer) {
    console.error('[REPORTS.JS] ❌ Reports container not found');
    return;
  }

  if (reports.length === 0) {
    console.log('[REPORTS.JS] ℹ️ No reports to display');
    reportsContainer.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5">
          <i class="bi bi-check-circle fs-2 text-success"></i>
          <p class="mt-2 text-muted">No reports found</p>
          ${filters.status || filters.reason ? '<small>Try adjusting your filters</small>' : '<small>All clear! No pending reports.</small>'}
        </td>
      </tr>
    `;
    return;
  }

  console.log('[REPORTS.JS] 🎨 Rendering', reports.length, 'reports');

  reportsContainer.innerHTML = reports.map((report, index) => {
    console.log(`[REPORTS.JS] 🎨 Rendering report ${index + 1}:`, report.reportId);

    // Message preview
    const messageText = report.message?.text || '[No message content]';
    const messagePreview = messageText.length > 50
      ? messageText.substring(0, 50) + '...'
      : messageText;

    // Reported user
    const reportedUserName = report.reportedUser?.name || 'Unknown';
    const reportedUserEmail = report.reportedUser?.email || '';

    // Reporter
    const reporterName = report.reportedBy?.name || 'Unknown';
    const reporterEmail = report.reportedBy?.email || '';

    // Reason badge
    const reasonBadge = `<span class="badge badge-${report.reason}">${report.reason}</span>`;

    // Status badge
    const statusBadge = `<span class="badge badge-${report.status}">${report.status}</span>`;

    // Created time
    const createdTime = formatDateTime(report.createdAt);

    // Action buttons
    let actionButtons = '';
    if (report.status === 'PENDING') {
      actionButtons = `
        <button class="btn btn-sm btn-primary" onclick="openActionModal('${report.reportId}')">
          <i class="bi bi-shield-check"></i> Take Action
        </button>
      `;
    } else {
      actionButtons = `
        <span class="text-muted small">
          ${report.adminAction || 'No action'}
          ${report.reviewedAt ? `<br/><small>${formatDateTime(report.reviewedAt)}</small>` : ''}
        </span>
      `;
    }

    return `
      <tr class="report-row" onclick="openActionModal('${report.reportId}')">
        <td><code class="small">${escapeHtml(report.reportId)}</code></td>
        <td>
          <div class="message-preview" title="${escapeHtml(messageText)}">
            ${escapeHtml(messagePreview)}
          </div>
          <small class="text-muted">${report.message?.messageType || 'TEXT'}</small>
        </td>
        <td>
          <strong>${escapeHtml(reportedUserName)}</strong>
          ${reportedUserEmail ? `<br/><small class="text-muted">${escapeHtml(reportedUserEmail)}</small>` : ''}
        </td>
        <td>
          ${escapeHtml(reporterName)}
          ${reporterEmail ? `<br/><small class="text-muted">${escapeHtml(reporterEmail)}</small>` : ''}
        </td>
        <td>${reasonBadge}</td>
        <td>${statusBadge}</td>
        <td><small>${createdTime}</small></td>
        <td onclick="event.stopPropagation()">
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join('');

  console.log('[REPORTS.JS] ✅ Reports rendered');
}

function renderPagination() {
  console.log('[REPORTS.JS] 🎨 Rendering pagination...');

  if (!paginationContainer) {
    console.error('[REPORTS.JS] ❌ Pagination container not found');
    return;
  }

  const totalPages = pagination.totalPages || 1;
  const currentPage = pagination.page || 1;

  if (pagination.total === 0 || totalPages <= 1) {
    paginationContainer.innerHTML = '';
    console.log('[REPORTS.JS] ℹ️ No pagination needed (total pages:', totalPages, ')');
    return;
  }

  console.log('[REPORTS.JS] 🎨 Rendering pagination - Page', currentPage, 'of', totalPages);

  let html = `
    <nav>
      <ul class="pagination">
        <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
          <button class="page-link" onclick="changePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
            <i class="bi bi-chevron-left"></i> Previous
          </button>
        </li>
  `;

  // Page numbers (max 5 visible)
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    html += `<li class="page-item"><button class="page-link" onclick="changePage(1)">1</button></li>`;
    if (startPage > 2) {
      html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <button class="page-link" onclick="changePage(${i})">${i}</button>
      </li>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    html += `<li class="page-item"><button class="page-link" onclick="changePage(${totalPages})">${totalPages}</button></li>`;
  }

  html += `
        <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
          <button class="page-link" onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
            Next <i class="bi bi-chevron-right"></i>
          </button>
        </li>
      </ul>
      <div class="text-muted text-center mt-2 small">
        Page ${currentPage} of ${totalPages} (${pagination.total} total reports)
      </div>
    </nav>
  `;

  paginationContainer.innerHTML = html;
  console.log('[REPORTS.JS] ✅ Pagination rendered');
}

/* ========== PAGINATION CONTROLS ========== */
function changePage(page) {
  console.log('[REPORTS.JS] 📄 Changing to page:', page);

  if (page < 1 || page > pagination.totalPages) {
    console.warn('[REPORTS.JS] ⚠️ Invalid page number:', page);
    return;
  }

  pagination.page = page;
  loadReports();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ========== STATS UPDATE ========== */
function updateStats() {
  console.log('[REPORTS.JS] 📊 Updating stats...');

  // Count by status
  const pending = reports.filter(r => r.status === 'PENDING').length;
  const actioned = reports.filter(r => r.status === 'ACTIONED').length;
  const dismissed = reports.filter(r => r.status === 'DISMISSED').length;

  const pendingEl = document.getElementById('pendingReports');
  const actionedEl = document.getElementById('actionedReports');
  const dismissedEl = document.getElementById('dismissedReports');
  const totalEl = document.getElementById('totalReports');

  if (pendingEl) {
    // If filtering by status, show filtered count, else show total pending
    if (filters.status === 'PENDING') {
      pendingEl.textContent = pagination.total;
    } else {
      pendingEl.textContent = pending;
    }
  }

  if (actionedEl) {
    if (filters.status === 'ACTIONED') {
      actionedEl.textContent = pagination.total;
    } else {
      actionedEl.textContent = actioned;
    }
  }

  if (dismissedEl) {
    if (filters.status === 'DISMISSED') {
      dismissedEl.textContent = pagination.total;
    } else {
      dismissedEl.textContent = dismissed;
    }
  }

  if (totalEl) {
    totalEl.textContent = pagination.total || 0;
  }

  console.log('[REPORTS.JS] ✅ Stats updated:', { pending, actioned, dismissed, total: pagination.total });
}

/* ========== TAKE ACTION ========== */
function openActionModal(reportId) {
  console.log('[REPORTS.JS] ⚙️ Opening action modal for report:', reportId);

  const report = reports.find(r => r.reportId === reportId);
  if (!report) {
    console.error('[REPORTS.JS] ❌ Report not found:', reportId);
    showNotification('Report not found', 'error');
    return;
  }

  currentReport = report;
  console.log('[REPORTS.JS] 📋 Current report:', currentReport);

  // Populate modal
  document.getElementById('modalReportId').textContent = report.reportId;
  document.getElementById('modalMessageContent').innerHTML = escapeHtml(report.message?.text || '[No message content]');

  document.getElementById('modalReportedBy').innerHTML = `
    <strong>${escapeHtml(report.reportedBy?.name || 'Unknown')}</strong><br/>
    <small class="text-muted">${escapeHtml(report.reportedBy?.email || '')}</small>
  `;

  document.getElementById('modalReason').innerHTML = `
    <span class="badge badge-${report.reason}">${report.reason}</span>
    ${report.description ? `<p class="mt-2 mb-0">${escapeHtml(report.description)}</p>` : ''}
  `;

  // Reset form
  document.getElementById('actionType').value = '';
  document.getElementById('adminNotes').value = '';
  document.getElementById('deleteMessageCheckContainer').style.display = 'none';
  document.getElementById('actionWarning').style.display = 'none';

  // If already actioned, show current action
  if (report.status !== 'PENDING') {
    document.getElementById('actionType').value = report.adminAction || '';
    document.getElementById('adminNotes').value = report.adminNotes || '';
    document.getElementById('actionType').disabled = true;
    document.getElementById('adminNotes').disabled = true;
    document.getElementById('confirmActionBtn').style.display = 'none';
  } else {
    document.getElementById('actionType').disabled = false;
    document.getElementById('adminNotes').disabled = false;
    document.getElementById('confirmActionBtn').style.display = 'block';
  }

  if (actionModal) {
    actionModal.show();
    console.log('[REPORTS.JS] ✅ Action modal opened');
  }
}

function handleActionTypeChange() {
  const actionType = document.getElementById('actionType').value;
  const deleteCheckContainer = document.getElementById('deleteMessageCheckContainer');
  const actionWarning = document.getElementById('actionWarning');
  const actionWarningText = document.getElementById('actionWarningText');

  console.log('[REPORTS.JS] 📝 Action type changed to:', actionType);

  // Show/hide delete checkbox
  if (actionType === 'MESSAGE_DELETED') {
    deleteCheckContainer.style.display = 'block';
    actionWarning.style.display = 'none';
  } else if (actionType === 'WARNING_SENT' || actionType === 'USER_SUSPENDED') {
    deleteCheckContainer.style.display = 'none';
    actionWarning.style.display = 'block';
    actionWarningText.textContent = 'Note: This action is recorded but not yet implemented on the backend. No actual warning/suspension will occur.';
  } else {
    deleteCheckContainer.style.display = 'none';
    actionWarning.style.display = 'none';
  }
}

async function confirmAction() {
  console.log('[REPORTS.JS] ⚠️ Confirming action for report:', currentReport?.reportId);

  if (!currentReport) {
    console.error('[REPORTS.JS] ❌ No report selected');
    return;
  }

  const actionType = document.getElementById('actionType').value;
  const adminNotes = document.getElementById('adminNotes').value.trim();
  const deleteMessage = document.getElementById('deleteMessageCheck')?.checked || false;

  console.log('[REPORTS.JS] 📋 Action details:', { actionType, adminNotes, deleteMessage });

  // Validation
  if (!actionType) {
    console.warn('[REPORTS.JS] ⚠️ Validation failed: No action type');
    showNotification('Please select an action', 'error');
    return;
  }

  if (!adminNotes) {
    console.warn('[REPORTS.JS] ⚠️ Validation failed: No admin notes');
    showNotification('Please provide admin notes', 'error');
    return;
  }

  // Build payload
  const payload = {
    action: actionType,
    adminNotes: adminNotes
  };

  if (actionType === 'MESSAGE_DELETED') {
    payload.deleteMessage = deleteMessage;
  }

  try {
    showLoading(true);
    console.log('[REPORTS.JS] 📤 API Request: Take action on report');
    console.log('[REPORTS.JS] Payload:', payload);

    const response = await API.post(
      API_CONFIG.endpoints.chat.reportAction,
      payload,
      { reportId: currentReport.reportId }
    );

    console.log('[REPORTS.JS] 📥 Action response:', response);

    if (!response.success) {
      throw new Error(response.message || 'Failed to take action');
    }

    showNotification('Action taken successfully', 'success');

    actionModal.hide();
    currentReport = null;

    // Reload reports
    loadReports();

    console.log('[REPORTS.JS] ✅ Action completed successfully');

  } catch (error) {
    console.error('[REPORTS.JS] ❌ Error taking action:', error);
    showNotification('Failed to take action: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

/* ========== AUTO-REFRESH ========== */
function startAutoRefresh() {
  console.log('[REPORTS.JS] 🔄 Starting auto-refresh (30 seconds interval)...');

  // Clear any existing interval
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  autoRefreshInterval = setInterval(() => {
    console.log('[REPORTS.JS] 🔄 Auto-refresh triggered');
    loadReports();
  }, 30000); // 30 seconds

  updateAutoRefreshStatus(true);
  console.log('[REPORTS.JS] ✅ Auto-refresh started');
}

function stopAutoRefresh() {
  console.log('[REPORTS.JS] ⏸️ Stopping auto-refresh...');

  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }

  updateAutoRefreshStatus(false);
  console.log('[REPORTS.JS] ✅ Auto-refresh stopped');
}

function updateAutoRefreshStatus(isActive) {
  const statusEl = document.getElementById('autoRefreshStatus');
  if (statusEl) {
    if (isActive) {
      statusEl.innerHTML = '<span class="badge bg-success"><i class="bi bi-arrow-repeat"></i> Auto-refresh ON</span>';
    } else {
      statusEl.innerHTML = '<span class="badge bg-secondary">Auto-refresh OFF</span>';
    }
  }
}

function updateLastRefreshTime() {
  const timeEl = document.getElementById('lastRefreshTime');
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = `Last refresh: ${formatDateTime(now)}`;
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
  console.log(`[REPORTS.JS] 🔔 Notification [${type}]:`, message);

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
window.openActionModal = openActionModal;
window.changePage = changePage;
window.resetFilters = resetFilters;
window.loadReports = loadReports;

console.log('[REPORTS.JS] ✅ Chat Reports controller loaded and ready');
