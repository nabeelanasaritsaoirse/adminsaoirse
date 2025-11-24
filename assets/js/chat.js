/*******************************
 * CHAT MANAGEMENT CONTROLLER
 * Handles conversations list, messages viewing, and broadcast
 *******************************/

console.log('[CHAT.JS] 🚀 Chat controller loading...');

/* ========== STATE MANAGEMENT ========== */
let conversations = [];
let currentConversationId = null;
let currentMessages = [];
let deleteTargetMessageId = null;
let autoRefreshInterval = null;

// Pagination state
let pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
};

// Messages pagination
let messagesPagination = {
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 0
};

// Filter state
let filters = {
  search: '',
  type: ''
};

// Modal references
let messagesModal;
let broadcastModal;
let deleteMessageModal;

// DOM Elements
let searchInput;
let typeFilter;
let conversationsContainer;
let paginationContainer;
let messagesContainer;
let messagesPaginationContainer;

console.log('[CHAT.JS] ✅ State initialized');

/* ========== DOM INITIALIZATION ========== */
document.addEventListener('DOMContentLoaded', function() {
  console.log('[CHAT.JS] 📄 DOM Content Loaded - Initializing...');

  initializeDOMElements();
  setupEventListeners();
  initializeModals();
  loadInitialData();
  startAutoRefresh();

  console.log('[CHAT.JS] ✅ Initialization complete');
});

function initializeDOMElements() {
  console.log('[CHAT.JS] 🔍 Caching DOM elements...');

  searchInput = document.getElementById('searchInput');
  typeFilter = document.getElementById('typeFilter');
  conversationsContainer = document.getElementById('conversationsContainer');
  paginationContainer = document.getElementById('paginationContainer');
  messagesContainer = document.getElementById('messagesContainer');
  messagesPaginationContainer = document.getElementById('messagesPagination');

  console.log('[CHAT.JS] ✅ DOM elements cached:', {
    searchInput: !!searchInput,
    typeFilter: !!typeFilter,
    conversationsContainer: !!conversationsContainer,
    paginationContainer: !!paginationContainer
  });
}

function setupEventListeners() {
  console.log('[CHAT.JS] 🎯 Setting up event listeners...');

  // Debounced search
  if (searchInput) {
    searchInput.addEventListener('input',
      window.utils?.debounce ? window.utils.debounce(filterConversations, 300) : filterConversations
    );
    console.log('[CHAT.JS] ✅ Search input listener attached');
  }

  // Type filter
  if (typeFilter) {
    typeFilter.addEventListener('change', filterConversations);
    console.log('[CHAT.JS] ✅ Type filter listener attached');
  }

  // Broadcast button
  const broadcastBtn = document.getElementById('broadcastBtn');
  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', openBroadcastModal);
    console.log('[CHAT.JS] ✅ Broadcast button listener attached');
  }

  // Broadcast message type change
  const broadcastMessageType = document.getElementById('broadcastMessageType');
  if (broadcastMessageType) {
    broadcastMessageType.addEventListener('change', handleBroadcastTypeChange);
    console.log('[CHAT.JS] ✅ Broadcast type listener attached');
  }

  // Broadcast target change
  const broadcastTargetUsers = document.getElementById('broadcastTargetUsers');
  if (broadcastTargetUsers) {
    broadcastTargetUsers.addEventListener('change', handleBroadcastTargetChange);
    console.log('[CHAT.JS] ✅ Broadcast target listener attached');
  }

  // Send broadcast button
  const sendBroadcastBtn = document.getElementById('sendBroadcastBtn');
  if (sendBroadcastBtn) {
    sendBroadcastBtn.addEventListener('click', sendBroadcast);
    console.log('[CHAT.JS] ✅ Send broadcast listener attached');
  }

  // Delete reason select
  const deleteReasonSelect = document.getElementById('deleteReasonSelect');
  const deleteReasonTextarea = document.getElementById('deleteReason');
  if (deleteReasonSelect && deleteReasonTextarea) {
    deleteReasonSelect.addEventListener('change', function() {
      if (this.value && this.value !== 'Other') {
        deleteReasonTextarea.value = this.value;
      } else if (this.value === 'Other') {
        deleteReasonTextarea.value = '';
        deleteReasonTextarea.focus();
      }
    });
    console.log('[CHAT.JS] ✅ Delete reason listener attached');
  }

  // Confirm delete message button
  const confirmDeleteMessageBtn = document.getElementById('confirmDeleteMessageBtn');
  if (confirmDeleteMessageBtn) {
    confirmDeleteMessageBtn.addEventListener('click', confirmDeleteMessage);
    console.log('[CHAT.JS] ✅ Confirm delete listener attached');
  }

  console.log('[CHAT.JS] ✅ All event listeners set up');
}

function initializeModals() {
  console.log('[CHAT.JS] 🎭 Initializing Bootstrap modals...');

  const messagesModalEl = document.getElementById('messagesModal');
  const broadcastModalEl = document.getElementById('broadcastModal');
  const deleteMessageModalEl = document.getElementById('deleteMessageModal');

  if (messagesModalEl) {
    messagesModal = new bootstrap.Modal(messagesModalEl);
    console.log('[CHAT.JS] ✅ Messages modal initialized');
  }

  if (broadcastModalEl) {
    broadcastModal = new bootstrap.Modal(broadcastModalEl);
    console.log('[CHAT.JS] ✅ Broadcast modal initialized');
  }

  if (deleteMessageModalEl) {
    deleteMessageModal = new bootstrap.Modal(deleteMessageModalEl);
    console.log('[CHAT.JS] ✅ Delete message modal initialized');
  }
}

/* ========== DATA LOADING ========== */
function loadInitialData() {
  console.log('[CHAT.JS] 📊 Loading initial data...');
  loadConversations();
}

async function loadConversations() {
  console.log('[CHAT.JS] 📡 Loading conversations - Page:', pagination.page, 'Filters:', filters);

  try {
    showLoading(true);
    console.log('[CHAT.JS] ⏳ Showing loading overlay...');

    const queryParams = {
      page: pagination.page,
      limit: pagination.limit,
    };

    if (filters.search) {
      queryParams.search = filters.search;
      console.log('[CHAT.JS] 🔍 Search filter applied:', filters.search);
    }

    if (filters.type) {
      queryParams.type = filters.type;
      console.log('[CHAT.JS] 🏷️ Type filter applied:', filters.type);
    }

    console.log('[CHAT.JS] 📤 API Request:', {
      endpoint: API_CONFIG.endpoints.chat.conversations,
      params: queryParams
    });

    const response = await API.get(
      API_CONFIG.endpoints.chat.conversations,
      {},
      queryParams
    );

    console.log('[CHAT.JS] 📥 API Response received:', response);

    if (!response.success) {
      throw new Error(response.message || 'Failed to load conversations');
    }

    // Extract nested data structure
    const responseData = response.data || {};
    console.log('[CHAT.JS] 📦 Response data structure:', {
      hasConversations: !!responseData.conversations,
      hasPagination: !!responseData.pagination,
      conversationsCount: responseData.conversations?.length || 0
    });

    // Handle conversations
    let conversationsData = responseData.conversations || [];
    if (!Array.isArray(conversationsData)) {
      console.warn('[CHAT.JS] ⚠️ Conversations is not an array, converting...');
      conversationsData = [];
    }

    console.log('[CHAT.JS] 💬 Conversations loaded:', conversationsData.length);

    // Normalize conversation data
    conversations = conversationsData.map((conv, index) => {
      console.log(`[CHAT.JS] 🔄 Normalizing conversation ${index + 1}:`, conv.conversationId);
      return {
        conversationId: conv.conversationId,
        type: conv.type,
        participants: conv.participants || [],
        groupName: conv.groupName,
        groupOwnerId: conv.groupOwnerId,
        groupMembers: conv.groupMembers || [],
        messageCount: conv.messageCount || 0,
        lastMessageAt: conv.lastMessageAt,
        hasReports: conv.hasReports || false,
        reportCount: conv.reportCount || 0,
        isActive: conv.isActive !== undefined ? conv.isActive : true,
        createdAt: conv.createdAt
      };
    });

    // Update pagination
    if (responseData.pagination) {
      pagination.page = responseData.pagination.page || responseData.pagination.current || pagination.page;
      pagination.totalPages = responseData.pagination.totalPages || responseData.pagination.pages || 1;
      pagination.total = responseData.pagination.totalConversations || responseData.pagination.total || 0;
      console.log('[CHAT.JS] 📄 Pagination updated:', pagination);
    }

    updateStats();
    renderConversations();
    renderPagination();
    updateLastRefreshTime();

    console.log('[CHAT.JS] ✅ Conversations loaded and rendered successfully');

  } catch (error) {
    console.error('[CHAT.JS] ❌ Error loading conversations:', error);
    console.error('[CHAT.JS] Error stack:', error.stack);
    showNotification('Failed to load conversations: ' + error.message, 'error');

    // Show error in UI
    if (conversationsContainer) {
      conversationsContainer.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5 text-danger">
            <i class="bi bi-exclamation-triangle fs-2"></i>
            <p class="mt-2">Failed to load conversations</p>
            <small>${escapeHtml(error.message)}</small>
            <br/>
            <button class="btn btn-sm btn-primary mt-3" onclick="loadConversations()">
              <i class="bi bi-arrow-clockwise"></i> Retry
            </button>
          </td>
        </tr>
      `;
    }
  } finally {
    showLoading(false);
    console.log('[CHAT.JS] ⏳ Loading overlay hidden');
  }
}

async function loadConversationMessages(conversationId, page = 1) {
  console.log('[CHAT.JS] 💬 Loading messages for conversation:', conversationId, 'Page:', page);

  try {
    currentConversationId = conversationId;
    messagesPagination.page = page;

    console.log('[CHAT.JS] 📤 API Request: Load messages');

    const response = await API.get(
      API_CONFIG.endpoints.chat.messages,
      { conversationId },
      { page: messagesPagination.page, limit: messagesPagination.limit }
    );

    console.log('[CHAT.JS] 📥 Messages response:', response);

    if (!response.success) {
      throw new Error(response.message || 'Failed to load messages');
    }

    const responseData = response.data || {};
    const conversation = responseData.conversation || {};
    const messagesData = responseData.messages || [];

    console.log('[CHAT.JS] 💬 Messages loaded:', messagesData.length);

    // Update modal title
    const modalTitle = document.getElementById('messagesModalTitle');
    const conversationInfo = document.getElementById('conversationInfo');

    if (modalTitle) {
      modalTitle.textContent = `Conversation: ${conversationId}`;
    }

    if (conversationInfo) {
      if (conversation.type === 'INDIVIDUAL') {
        const participantNames = (conversation.participants || []).map(p => p.name).join(' ↔ ');
        conversationInfo.textContent = participantNames;
      } else {
        conversationInfo.textContent = `${conversation.groupName || 'Group'} (${(conversation.participants || []).length} members)`;
      }
    }

    // Normalize messages
    currentMessages = messagesData.map((msg, index) => {
      console.log(`[CHAT.JS] 🔄 Normalizing message ${index + 1}:`, msg.messageId);
      return {
        messageId: msg.messageId,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderEmail: msg.senderEmail,
        senderAvatar: msg.senderAvatar,
        messageType: msg.messageType,
        text: msg.text,
        sharedProduct: msg.sharedProduct,
        sharedOrder: msg.sharedOrder,
        isDeleted: msg.isDeleted || false,
        deletedAt: msg.deletedAt,
        deletedBy: msg.deletedBy,
        deleteReason: msg.deleteReason,
        isEdited: msg.isEdited || false,
        createdAt: msg.createdAt,
        deliveryStatus: msg.deliveryStatus || []
      };
    });

    // Update messages pagination
    if (responseData.pagination) {
      messagesPagination.page = responseData.pagination.page || messagesPagination.page;
      messagesPagination.totalPages = responseData.pagination.totalPages || responseData.pagination.pages || 1;
      messagesPagination.total = responseData.pagination.totalMessages || responseData.pagination.total || 0;
      console.log('[CHAT.JS] 📄 Messages pagination updated:', messagesPagination);
    }

    renderMessages();
    renderMessagesPagination();

    console.log('[CHAT.JS] ✅ Messages loaded and rendered');

  } catch (error) {
    console.error('[CHAT.JS] ❌ Error loading messages:', error);
    showNotification('Failed to load messages: ' + error.message, 'error');

    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="text-center py-5 text-danger">
          <i class="bi bi-exclamation-triangle fs-2"></i>
          <p class="mt-2">Failed to load messages</p>
          <small>${escapeHtml(error.message)}</small>
        </div>
      `;
    }
  }
}

/* ========== FILTERING ========== */
function filterConversations() {
  console.log('[CHAT.JS] 🔍 Filtering conversations...');

  filters.search = searchInput?.value.trim() || '';
  filters.type = typeFilter?.value || '';

  console.log('[CHAT.JS] Applied filters:', filters);

  pagination.page = 1;  // Reset to page 1
  loadConversations();
}

function resetFilters() {
  console.log('[CHAT.JS] 🔄 Resetting filters...');

  if (searchInput) searchInput.value = '';
  if (typeFilter) typeFilter.value = '';

  filters = { search: '', type: '' };
  pagination.page = 1;

  console.log('[CHAT.JS] ✅ Filters reset');
  loadConversations();
}

/* ========== RENDERING ========== */
function renderConversations() {
  console.log('[CHAT.JS] 🎨 Rendering conversations...');

  if (!conversationsContainer) {
    console.error('[CHAT.JS] ❌ Conversations container not found');
    return;
  }

  if (conversations.length === 0) {
    console.log('[CHAT.JS] ℹ️ No conversations to display');
    conversationsContainer.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5">
          <i class="bi bi-inbox fs-2 text-muted"></i>
          <p class="mt-2 text-muted">No conversations found</p>
          ${filters.search || filters.type ? '<small>Try adjusting your filters</small>' : ''}
        </td>
      </tr>
    `;
    return;
  }

  console.log('[CHAT.JS] 🎨 Rendering', conversations.length, 'conversations');

  conversationsContainer.innerHTML = conversations.map((conv, index) => {
    console.log(`[CHAT.JS] 🎨 Rendering conversation ${index + 1}:`, conv.conversationId);

    // Determine participant display
    let participantDisplay = '';
    if (conv.type === 'INDIVIDUAL') {
      participantDisplay = conv.participants.map(p => escapeHtml(p.name)).join(' ↔ ');
    } else {
      const memberCount = conv.groupMembers?.length || 0;
      participantDisplay = `<strong>${escapeHtml(conv.groupName || 'Group')}</strong> (${memberCount} members)`;
    }

    // Format last activity
    const lastActivity = conv.lastMessageAt
      ? formatDateTime(conv.lastMessageAt)
      : 'No activity';

    // Type badge
    const typeBadge = conv.type === 'INDIVIDUAL'
      ? '<span class="badge bg-primary">Individual</span>'
      : '<span class="badge bg-info">Group/Broadcast</span>';

    // Reports badge
    const reportsBadge = conv.hasReports
      ? `<span class="badge bg-danger badge-report">${conv.reportCount}</span>`
      : '<span class="text-muted">-</span>';

    // Status badge
    const statusBadge = conv.isActive
      ? '<span class="badge bg-success">Active</span>'
      : '<span class="badge bg-secondary">Inactive</span>';

    return `
      <tr class="conversation-row" onclick="viewConversation('${conv.conversationId}')">
        <td><code>${escapeHtml(conv.conversationId)}</code></td>
        <td>${typeBadge}</td>
        <td>${participantDisplay}</td>
        <td><span class="badge bg-secondary">${conv.messageCount}</span></td>
        <td><small>${lastActivity}</small></td>
        <td class="text-center">${reportsBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); viewConversation('${conv.conversationId}')">
            <i class="bi bi-eye"></i> View
          </button>
        </td>
      </tr>
    `;
  }).join('');

  console.log('[CHAT.JS] ✅ Conversations rendered');
}

function renderMessages() {
  console.log('[CHAT.JS] 🎨 Rendering messages...');

  if (!messagesContainer) {
    console.error('[CHAT.JS] ❌ Messages container not found');
    return;
  }

  if (currentMessages.length === 0) {
    console.log('[CHAT.JS] ℹ️ No messages to display');
    messagesContainer.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-chat-dots fs-2"></i>
        <p class="mt-2">No messages in this conversation</p>
      </div>
    `;
    return;
  }

  console.log('[CHAT.JS] 🎨 Rendering', currentMessages.length, 'messages');

  messagesContainer.innerHTML = currentMessages.map((msg, index) => {
    console.log(`[CHAT.JS] 🎨 Rendering message ${index + 1}:`, msg.messageId);

    let messageHTML = '';

    // Deleted message
    if (msg.isDeleted) {
      messageHTML = `
        <div class="mb-3">
          <div class="d-flex align-items-start">
            <div class="flex-grow-1">
              <div class="message-bubble message-deleted">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <strong>${escapeHtml(msg.senderName)}</strong>
                    ${msg.senderEmail ? `<br/><small class="text-muted">${escapeHtml(msg.senderEmail)}</small>` : ''}
                  </div>
                  <small class="text-muted">${formatDateTime(msg.createdAt)}</small>
                </div>
                <div class="alert alert-warning mb-2">
                  <i class="bi bi-trash"></i> <strong>Message Deleted</strong>
                  ${msg.deletedAt ? `<br/><small>Deleted: ${formatDateTime(msg.deletedAt)}</small>` : ''}
                  ${msg.deleteReason ? `<br/><small>Reason: ${escapeHtml(msg.deleteReason)}</small>` : ''}
                </div>
                <div class="text-muted">
                  <small><em>Original: ${escapeHtml(msg.text || '[No text]')}</em></small>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    // Regular message
    else {
      let messageContent = escapeHtml(msg.text || '');

      // Product share
      if (msg.messageType === 'PRODUCT_SHARE' && msg.sharedProduct) {
        const product = msg.sharedProduct;
        messageContent += `
          <div class="product-share-preview mt-2">
            <div class="d-flex align-items-center">
              ${product.productImage ? `<img src="${product.productImage}" alt="Product" style="width:60px;height:60px;object-fit:cover;border-radius:4px;" class="me-2"/>` : ''}
              <div>
                <strong>${escapeHtml(product.productName)}</strong>
                <br/>
                <span class="text-success">$${product.productPrice}</span>
              </div>
            </div>
          </div>
        `;
      }

      // Order share
      if (msg.messageType === 'ORDER_SHARE' && msg.sharedOrder) {
        const order = msg.sharedOrder;
        messageContent += `
          <div class="product-share-preview mt-2">
            <strong>Order: ${escapeHtml(order.orderId)}</strong>
            <br/>
            <small>Status: ${escapeHtml(order.status)}</small>
          </div>
        `;
      }

      messageHTML = `
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <div>
              <strong>${escapeHtml(msg.senderName)}</strong>
              ${msg.senderEmail ? `<small class="text-muted ms-2">${escapeHtml(msg.senderEmail)}</small>` : ''}
              ${msg.isEdited ? '<small class="text-muted ms-2"><i class="bi bi-pencil"></i> Edited</small>' : ''}
            </div>
            <small class="text-muted">${formatDateTime(msg.createdAt)}</small>
          </div>
          <div class="message-bubble message-received">
            ${messageContent}
          </div>
          <div class="mt-1">
            <button class="btn btn-sm btn-outline-danger" onclick="openDeleteMessageModal('${msg.messageId}')">
              <i class="bi bi-trash"></i> Delete
            </button>
          </div>
        </div>
      `;
    }

    return messageHTML;
  }).join('');

  console.log('[CHAT.JS] ✅ Messages rendered');
}

function renderPagination() {
  console.log('[CHAT.JS] 🎨 Rendering pagination...');

  if (!paginationContainer) {
    console.error('[CHAT.JS] ❌ Pagination container not found');
    return;
  }

  const totalPages = pagination.totalPages || 1;
  const currentPage = pagination.page || 1;

  if (pagination.total === 0 || totalPages <= 1) {
    paginationContainer.innerHTML = '';
    console.log('[CHAT.JS] ℹ️ No pagination needed (total pages:', totalPages, ')');
    return;
  }

  console.log('[CHAT.JS] 🎨 Rendering pagination - Page', currentPage, 'of', totalPages);

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
        Page ${currentPage} of ${totalPages} (${pagination.total} total conversations)
      </div>
    </nav>
  `;

  paginationContainer.innerHTML = html;
  console.log('[CHAT.JS] ✅ Pagination rendered');
}

function renderMessagesPagination() {
  console.log('[CHAT.JS] 🎨 Rendering messages pagination...');

  if (!messagesPaginationContainer) {
    console.error('[CHAT.JS] ❌ Messages pagination container not found');
    return;
  }

  const totalPages = messagesPagination.totalPages || 1;
  const currentPage = messagesPagination.page || 1;

  if (messagesPagination.total === 0 || totalPages <= 1) {
    messagesPaginationContainer.innerHTML = '';
    console.log('[CHAT.JS] ℹ️ No messages pagination needed');
    return;
  }

  console.log('[CHAT.JS] 🎨 Rendering messages pagination - Page', currentPage, 'of', totalPages);

  let html = `
    <nav>
      <ul class="pagination pagination-sm mb-0">
        <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
          <button class="page-link" onclick="changeMessagesPage(${currentPage - 1})">Prev</button>
        </li>
        <li class="page-item active">
          <span class="page-link">${currentPage} / ${totalPages}</span>
        </li>
        <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
          <button class="page-link" onclick="changeMessagesPage(${currentPage + 1})">Next</button>
        </li>
      </ul>
    </nav>
  `;

  messagesPaginationContainer.innerHTML = html;
  console.log('[CHAT.JS] ✅ Messages pagination rendered');
}

/* ========== PAGINATION CONTROLS ========== */
function changePage(page) {
  console.log('[CHAT.JS] 📄 Changing to page:', page);

  if (page < 1 || page > pagination.totalPages) {
    console.warn('[CHAT.JS] ⚠️ Invalid page number:', page);
    return;
  }

  pagination.page = page;
  loadConversations();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changeMessagesPage(page) {
  console.log('[CHAT.JS] 📄 Changing messages to page:', page);

  if (page < 1 || page > messagesPagination.totalPages) {
    console.warn('[CHAT.JS] ⚠️ Invalid messages page number:', page);
    return;
  }

  if (!currentConversationId) {
    console.error('[CHAT.JS] ❌ No conversation selected');
    return;
  }

  loadConversationMessages(currentConversationId, page);
}

/* ========== STATS UPDATE ========== */
function updateStats() {
  console.log('[CHAT.JS] 📊 Updating stats...');

  const totalConversationsEl = document.getElementById('totalConversations');
  const activeTodayEl = document.getElementById('activeToday');
  const totalMessagesEl = document.getElementById('totalMessages');

  if (totalConversationsEl) {
    totalConversationsEl.textContent = pagination.total || 0;
  }

  if (activeTodayEl) {
    // Count conversations with activity today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeCount = conversations.filter(conv => {
      if (!conv.lastMessageAt) return false;
      const lastActivity = new Date(conv.lastMessageAt);
      return lastActivity >= today;
    }).length;
    activeTodayEl.textContent = activeCount;
  }

  if (totalMessagesEl) {
    const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0);
    totalMessagesEl.textContent = totalMessages;
  }

  console.log('[CHAT.JS] ✅ Stats updated');
}

/* ========== VIEW CONVERSATION ========== */
function viewConversation(conversationId) {
  console.log('[CHAT.JS] 👁️ Viewing conversation:', conversationId);

  if (!messagesModal) {
    console.error('[CHAT.JS] ❌ Messages modal not initialized');
    return;
  }

  loadConversationMessages(conversationId);
  messagesModal.show();
}

/* ========== BROADCAST MESSAGE ========== */
function openBroadcastModal() {
  console.log('[CHAT.JS] 📢 Opening broadcast modal...');

  if (!broadcastModal) {
    console.error('[CHAT.JS] ❌ Broadcast modal not initialized');
    return;
  }

  // Reset form
  const form = document.getElementById('broadcastForm');
  if (form) {
    form.reset();
  }

  // Hide optional fields
  document.getElementById('productIdContainer').style.display = 'none';
  document.getElementById('specificUsersContainer').style.display = 'none';

  broadcastModal.show();
  console.log('[CHAT.JS] ✅ Broadcast modal opened');
}

function handleBroadcastTypeChange() {
  const messageType = document.getElementById('broadcastMessageType').value;
  const productIdContainer = document.getElementById('productIdContainer');

  console.log('[CHAT.JS] 📝 Broadcast type changed to:', messageType);

  if (messageType === 'PRODUCT_SHARE') {
    productIdContainer.style.display = 'block';
  } else {
    productIdContainer.style.display = 'none';
  }
}

function handleBroadcastTargetChange() {
  const targetUsers = document.getElementById('broadcastTargetUsers').value;
  const specificUsersContainer = document.getElementById('specificUsersContainer');

  console.log('[CHAT.JS] 🎯 Broadcast target changed to:', targetUsers);

  if (targetUsers === 'SPECIFIC') {
    specificUsersContainer.style.display = 'block';
  } else {
    specificUsersContainer.style.display = 'none';
  }
}

async function sendBroadcast() {
  console.log('[CHAT.JS] 📤 Sending broadcast message...');

  const messageType = document.getElementById('broadcastMessageType').value;
  const targetUsers = document.getElementById('broadcastTargetUsers').value;
  const text = document.getElementById('broadcastText').value.trim();
  const productId = document.getElementById('broadcastProductId').value.trim();
  const specificUsers = document.getElementById('broadcastSpecificUsers').value.trim();

  console.log('[CHAT.JS] 📋 Broadcast data:', { messageType, targetUsers, textLength: text.length });

  // Validation
  if (!text) {
    console.warn('[CHAT.JS] ⚠️ Validation failed: No message text');
    showNotification('Please enter a message', 'error');
    return;
  }

  if (messageType === 'PRODUCT_SHARE' && !productId) {
    console.warn('[CHAT.JS] ⚠️ Validation failed: No product ID');
    showNotification('Please enter a product ID for product share', 'error');
    return;
  }

  if (targetUsers === 'SPECIFIC' && !specificUsers) {
    console.warn('[CHAT.JS] ⚠️ Validation failed: No specific users');
    showNotification('Please enter user IDs for specific targeting', 'error');
    return;
  }

  // Build payload
  const payload = {
    messageType,
    text,
    targetUsers
  };

  if (messageType === 'PRODUCT_SHARE') {
    payload.productId = productId;
  }

  if (targetUsers === 'SPECIFIC') {
    payload.specificUserIds = specificUsers.split(',').map(id => id.trim()).filter(id => id);
    console.log('[CHAT.JS] 👥 Specific users:', payload.specificUserIds);
  }

  try {
    showLoading(true);
    console.log('[CHAT.JS] 📤 API Request: Send broadcast');
    console.log('[CHAT.JS] Payload:', payload);

    const response = await API.post(
      API_CONFIG.endpoints.chat.broadcast,
      payload
    );

    console.log('[CHAT.JS] 📥 Broadcast response:', response);

    if (!response.success) {
      throw new Error(response.message || 'Failed to send broadcast');
    }

    const resultData = response.data || {};
    const successMsg = `Broadcast sent successfully! Sent to ${resultData.sentTo || 0} users` +
      (resultData.failedTo ? ` (${resultData.failedTo} failed)` : '');

    showNotification(successMsg, 'success');

    broadcastModal.hide();
    console.log('[CHAT.JS] ✅ Broadcast sent successfully');

  } catch (error) {
    console.error('[CHAT.JS] ❌ Error sending broadcast:', error);
    showNotification('Failed to send broadcast: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

/* ========== DELETE MESSAGE ========== */
function openDeleteMessageModal(messageId) {
  console.log('[CHAT.JS] 🗑️ Opening delete message modal for:', messageId);

  deleteTargetMessageId = messageId;

  // Reset form
  const deleteReasonSelect = document.getElementById('deleteReasonSelect');
  const deleteReason = document.getElementById('deleteReason');
  if (deleteReasonSelect) deleteReasonSelect.value = '';
  if (deleteReason) deleteReason.value = '';

  if (deleteMessageModal) {
    deleteMessageModal.show();
    console.log('[CHAT.JS] ✅ Delete message modal opened');
  }
}

async function confirmDeleteMessage() {
  console.log('[CHAT.JS] ⚠️ Confirming message deletion:', deleteTargetMessageId);

  if (!deleteTargetMessageId) {
    console.error('[CHAT.JS] ❌ No message selected for deletion');
    return;
  }

  const reason = document.getElementById('deleteReason').value.trim();

  if (!reason) {
    console.warn('[CHAT.JS] ⚠️ Validation failed: No deletion reason');
    showNotification('Please provide a reason for deletion', 'error');
    return;
  }

  try {
    showLoading(true);
    console.log('[CHAT.JS] 📤 API Request: Delete message');
    console.log('[CHAT.JS] Message ID:', deleteTargetMessageId);
    console.log('[CHAT.JS] Reason:', reason);

    const response = await API.post(
      API_CONFIG.endpoints.chat.deleteMessage,
      { reason },
      { messageId: deleteTargetMessageId }
    );

    console.log('[CHAT.JS] 📥 Delete response:', response);

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete message');
    }

    showNotification('Message deleted successfully', 'success');

    deleteMessageModal.hide();

    // Reload messages
    if (currentConversationId) {
      loadConversationMessages(currentConversationId, messagesPagination.page);
    }

    console.log('[CHAT.JS] ✅ Message deleted successfully');

  } catch (error) {
    console.error('[CHAT.JS] ❌ Error deleting message:', error);
    showNotification('Failed to delete message: ' + error.message, 'error');
  } finally {
    showLoading(false);
    deleteTargetMessageId = null;
  }
}

/* ========== AUTO-REFRESH ========== */
function startAutoRefresh() {
  console.log('[CHAT.JS] 🔄 Starting auto-refresh (30 seconds interval)...');

  // Clear any existing interval
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  autoRefreshInterval = setInterval(() => {
    console.log('[CHAT.JS] 🔄 Auto-refresh triggered');
    loadConversations();
  }, 30000); // 30 seconds

  updateAutoRefreshStatus(true);
  console.log('[CHAT.JS] ✅ Auto-refresh started');
}

function stopAutoRefresh() {
  console.log('[CHAT.JS] ⏸️ Stopping auto-refresh...');

  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }

  updateAutoRefreshStatus(false);
  console.log('[CHAT.JS] ✅ Auto-refresh stopped');
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
  console.log(`[CHAT.JS] 🔔 Notification [${type}]:`, message);

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
window.viewConversation = viewConversation;
window.changePage = changePage;
window.changeMessagesPage = changeMessagesPage;
window.resetFilters = resetFilters;
window.loadConversations = loadConversations;
window.openDeleteMessageModal = openDeleteMessageModal;

console.log('[CHAT.JS] ✅ Chat controller loaded and ready');
