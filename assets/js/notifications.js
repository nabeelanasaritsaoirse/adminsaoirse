/**
 * ================================================
 * ADMIN NOTIFICATION MANAGEMENT SYSTEM
 * ================================================
 * Complete API integration following project patterns
 * Supports: Create, Edit, Delete, Publish, Schedule, Image Upload, Analytics
 */

/* ========== STATE MANAGEMENT ========== */
let notifications = [];
let products = [];
let currentNotificationId = null;
let deleteTargetId = null;
let currentEditingId = null;

let pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
};

let filters = {
  search: '',
  status: '',
  type: ''
};

/* ========== BOOTSTRAP MODALS ========== */
let notificationModal;
let imageUploadModal;
let publishModal;
let deleteModal;

/* ========== DOM INITIALIZATION ========== */
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Initializing Notification Management System...');

  // Initialize Bootstrap modals
  initializeModals();

  // Setup event listeners
  setupEventListeners();

  // Load initial data
  await loadNotifications();

  // Load products for PRODUCT_SHARE type
  await loadProducts();

  console.log('Notification system initialized successfully!');
});

/**
 * Initialize Bootstrap modals
 */
function initializeModals() {
  notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
  imageUploadModal = new bootstrap.Modal(document.getElementById('imageUploadModal'));
  publishModal = new bootstrap.Modal(document.getElementById('publishModal'));
  deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Create new notification button
  document.getElementById('createNewBtn')?.addEventListener('click', openCreateModal);

  // Save draft button
  document.getElementById('saveDraftBtn')?.addEventListener('click', saveNotification);

  // Delete confirmation
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);

  // Character count for body
  document.getElementById('notificationBody')?.addEventListener('input', updateCharCount);

  // Post type change - show/hide product selector
  document.getElementById('postType')?.addEventListener('change', handlePostTypeChange);

  // Delivery options mutual exclusion
  document.getElementById('sendPushOnly')?.addEventListener('change', handlePushOnlyChange);
  document.getElementById('sendInApp')?.addEventListener('change', handleSendInAppChange);

  // Image upload
  document.getElementById('imageFileInput')?.addEventListener('change', previewImage);
  document.getElementById('uploadImageBtn')?.addEventListener('click', uploadImage);

  // Publish modal
  document.getElementById('publishImmediate')?.addEventListener('change', toggleSchedulePicker);
  document.getElementById('publishScheduled')?.addEventListener('change', toggleSchedulePicker);
  document.getElementById('confirmPublishBtn')?.addEventListener('click', handlePublish);

  // Filters
  document.getElementById('searchInput')?.addEventListener('input', debounce(applyFilters, 500));
  document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
  document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
  document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);

  // Analytics
  document.getElementById('loadAnalyticsBtn')?.addEventListener('click', loadAnalytics);
  document.getElementById('analyticsTabBtn')?.addEventListener('click', function() {
    // Auto-set date range to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('analyticsEndDate').value = endDate.toISOString().split('T')[0];
    document.getElementById('analyticsStartDate').value = startDate.toISOString().split('T')[0];
  });
}

/* ========== LOAD NOTIFICATIONS ========== */
/**
 * Load notifications from API
 */
async function loadNotifications() {
  try {
    showLoading(true);

    const query = {
      page: pagination.page,
      limit: pagination.limit
    };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.search) query.search = filters.search;

    const response = await API.get(API_CONFIG.endpoints.notifications.getAll, {}, query);

    console.log('Notifications API response:', response);

    // Handle response structure
    let notificationsData = [];
    let paginationData = null;

    if (response && response.success !== false) {
      if (response.data && response.data.notifications) {
        notificationsData = response.data.notifications;
        paginationData = response.data.pagination;
      } else if (response.data && Array.isArray(response.data)) {
        notificationsData = response.data;
      } else if (Array.isArray(response)) {
        notificationsData = response;
      }
    }

    notifications = notificationsData.map(n => ({
      _id: n._id || n.id,
      notificationId: n.notificationId,
      type: n.type || 'ADMIN_POST',
      postType: n.postType,
      title: n.title,
      body: n.body,
      imageUrl: n.imageUrl,
      status: n.status,
      sendInApp: n.sendInApp,
      sendPush: n.sendPush,
      sendPushOnly: n.sendPushOnly,
      commentsEnabled: n.commentsEnabled,
      likesEnabled: n.likesEnabled,
      productId: n.productId,
      likeCount: n.likeCount || 0,
      commentCount: n.commentCount || 0,
      viewCount: n.viewCount || 0,
      publishedAt: n.publishedAt,
      scheduledAt: n.scheduledAt,
      createdAt: n.createdAt,
      createdBy: n.createdBy
    }));

    // Update pagination
    if (paginationData) {
      pagination.total = paginationData.total || 0;
      pagination.totalPages = paginationData.totalPages || Math.ceil(pagination.total / pagination.limit);
    }

    updateStats();
    renderNotifications();
    renderPagination();

  } catch (error) {
    console.error('Error loading notifications:', error);
    showNotification(error.message || 'Failed to load notifications', 'error');
  } finally {
    showLoading(false);
  }
}

/* ========== LOAD PRODUCTS ========== */
/**
 * Load products for PRODUCT_SHARE dropdown
 */
async function loadProducts() {
  try {
    const response = await API.get(API_CONFIG.endpoints.products.getAll);

    let productsData = [];
    if (response && response.success !== false) {
      productsData = response.data && Array.isArray(response.data)
        ? response.data
        : Array.isArray(response) ? response : [];
    }

    products = productsData.map(p => ({
      _id: p._id || p.id,
      productId: p.productId,
      name: p.name,
      sku: p.sku
    }));

    populateProductDropdown();

  } catch (error) {
    console.error('Error loading products:', error);
  }
}

/**
 * Populate product dropdown
 */
function populateProductForm(p) {
  if (!p) return;

  // Basic fields
  document.getElementById("productName").value = p.name || "";
  document.getElementById("productBrand").value = p.brand || "";
  document.getElementById("productDescription").value = (p.description && (p.description.short || p.description.long)) || "";
  document.getElementById("productSku").value = p.sku || "";

  // Pricing
  if (p.pricing) {
    document.getElementById("productPrice").value = p.pricing.regularPrice !== undefined ? p.pricing.regularPrice : "";
    document.getElementById("productSalePrice").value = p.pricing.salePrice !== undefined ? p.pricing.salePrice : "";
  } else {
    document.getElementById("productPrice").value = "";
    document.getElementById("productSalePrice").value = "";
  }

  // Availability
  if (p.availability) {
    document.getElementById("productStock").value = p.availability.stockQuantity ?? "";
    // map stockStatus -> UI value if needed (implement mapBackendToUIAvailability)
    const uiAvailabilityVal = mapBackendToUIAvailability(p.availability.stockStatus);
    if (uiAvailabilityVal) document.getElementById("productAvailability").value = uiAvailabilityVal;
    document.querySelector('input[name="status"][value="' + (p.status || "draft") + '"]')?.checked && null;
  }

  // Category select (if select exists)
  if (p.category && p.category.subCategoryId) {
    // try set selected by value
    const select = document.getElementById("productCategory");
    if (select) {
      const toSelect = p.category.subCategoryId || p.category.mainCategoryId;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === (toSelect || "")) {
          select.selectedIndex = i;
          break;
        }
      }
    }
  }

  // Flags
  document.getElementById("isFeatured").checked = !!p.isFeatured;
  document.getElementById("isPopular").checked = !!p.isPopular;
  document.getElementById("isBestSeller").checked = !!p.isBestSeller;
  document.getElementById("isTrending").checked = !!p.isTrending;

  // Warranty
  document.getElementById("warrantyPeriod").value = p.warranty?.period ?? "";
  document.getElementById("warrantyReturnPolicy").value = p.warranty?.returnPolicy ?? "";

  // Origin & Project — ensure individual input fields exist
  // if you have single input boxes, adapt names; prefer splitting origin into two fields: country & manufacturer
  document.getElementById("productOriginCountry") && (document.getElementById("productOriginCountry").value = p.origin?.country || "");
  document.getElementById("productOriginManufacturer") && (document.getElementById("productOriginManufacturer").value = p.origin?.manufacturer || "");
  document.getElementById("productProjectId") && (document.getElementById("productProjectId").value = p.project?.projectId || "");
  document.getElementById("productProjectName") && (document.getElementById("productProjectName").value = p.project?.projectName || "");

  // Dimensions
  document.getElementById("dimensionLength") && (document.getElementById("dimensionLength").value = p.dimensions?.length ?? "");
  document.getElementById("dimensionWidth") && (document.getElementById("dimensionWidth").value = p.dimensions?.width ?? "");
  document.getElementById("dimensionHeight") && (document.getElementById("dimensionHeight").value = p.dimensions?.height ?? "");
  document.getElementById("productWeight") && (document.getElementById("productWeight").value = p.dimensions?.weight ?? "");

  // Tags
  document.getElementById("productTags") && (document.getElementById("productTags").value = Array.isArray(p.tags) ? p.tags.join(", ") : "");

  // SEO
  document.getElementById("productMetaTitle") && (document.getElementById("productMetaTitle").value = p.seo?.metaTitle || "");
  document.getElementById("productMetaDescription") && (document.getElementById("productMetaDescription").value = p.seo?.metaDescription || "");
  document.getElementById("productMetaKeywords") && (document.getElementById("productMetaKeywords").value = Array.isArray(p.seo?.keywords) ? p.seo.keywords.join(", ") : "");

  // Payment plan global
  if (p.paymentPlan) {
    document.getElementById("paymentPlanEnabled") && (document.getElementById("paymentPlanEnabled").checked = !!p.paymentPlan.enabled);
    document.getElementById("paymentPlanMinDown") && (document.getElementById("paymentPlanMinDown").value = p.paymentPlan.minDownPayment ?? "");
    document.getElementById("paymentPlanMaxDown") && (document.getElementById("paymentPlanMaxDown").value = p.paymentPlan.maxDownPayment ?? "");
    document.getElementById("paymentPlanInterest") && (document.getElementById("paymentPlanInterest").value = p.paymentPlan.interestRate ?? "");
  }

  // Plans (per-day) — clear then render
  if (plansList) plansList.innerHTML = "";
  if (Array.isArray(p.plans) && p.plans.length > 0) {
    p.plans.forEach((pl, idx) => {
      // create UI card (your existing markup probably similar) — adapt if you have helper
      const card = document.createElement("div");
      card.id = `plan-${idx}`;
      card.className = "plan-card mb-2 p-2 border rounded";
      card.innerHTML = `
        <div class="row g-2 align-items-center">
          <div class="col-auto">
            <input data-plan-name class="form-control form-control-sm" placeholder="Plan name" value="${escapeHtml(pl.name || "")}" />
          </div>
          <div class="col-auto">
            <input data-plan-days type="number" class="form-control form-control-sm" placeholder="Days" value="${Number(pl.days || 0)}" />
          </div>
          <div class="col-auto">
            <input data-plan-amount type="number" class="form-control form-control-sm" placeholder="Per day amount" value="${Number(pl.perDayAmount || 0)}" />
          </div>
          <div class="col">
            <input data-plan-description class="form-control form-control-sm" placeholder="Description" value="${escapeHtml(pl.description || "")}" />
          </div>
          <div class="col-auto">
            <label class="form-check form-switch mb-0">
              <input data-plan-recommended class="form-check-input" type="checkbox" ${pl.isRecommended ? "checked" : ""}>
              <small>Recommended</small>
            </label>
          </div>
        </div>
      `;
      plansList.appendChild(card);
    });
  }

  // Variants — you likely have variant rendering helper; populate it
  if (variantsList) {
    variantsList.innerHTML = "";
    if (Array.isArray(p.variants) && p.variants.length > 0) {
      p.variants.forEach((v, idx) => {
        // minimal render: adapt to your exact UI
        const vcard = document.createElement("div");
        vcard.className = "variant-card mb-2";
        vcard.innerHTML = `
          <input data-variant-color class="form-control form-control-sm mb-1" placeholder="Color" value="${escapeHtml(v.attributes?.color || "")}" />
          <input data-variant-price type="number" class="form-control form-control-sm mb-1" placeholder="Price" value="${Number(v.price || 0)}" />
          <input data-variant-sale-price type="number" class="form-control form-control-sm mb-1" placeholder="Sale price" value="${Number(v.salePrice || 0)}" />
          <input data-variant-stock type="number" class="form-control form-control-sm mb-1" placeholder="Stock" value="${Number(v.stock || 0)}" />
        `;
        variantsList.appendChild(vcard);
      });
    }
  }

  // Regional pricing & availability — populate if table exists
  if (Array.isArray(p.regionalPricing) && p.regionalPricing.length > 0 && typeof populateRegionalUI === "function") {
    populateRegionalUI(p.regionalPricing, p.regionalAvailability || []);
  }

  // Images preview - adapt to your renderImagePreview method or reuse
  categoryImages = Array.isArray(p.images) ? p.images.map(img => ({ url: img.url, altText: img.altText || "", isPrimary: !!img.isPrimary })) : [];
  renderImagePreview();

  console.log("✅ [PRODUCTS] populateProductForm done for", p.productId || p._id);
}


/* ========== RENDER FUNCTIONS ========== */
/**
 * Render notifications list
 */
function renderNotifications() {
  const container = document.getElementById('notificationsList');
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-inbox fs-1"></i>
        <p class="mt-2">No notifications found</p>
        ${filters.search || filters.status || filters.type ? '<button class="btn btn-sm btn-secondary" onclick="window.resetFilters()">Clear Filters</button>' : ''}
      </div>
    `;
    return;
  }

  const html = notifications.map(notification => `
    <div class="notification-item border-bottom py-3">
      <div class="row align-items-center">
        <div class="col-md-8">
          <div class="d-flex align-items-start">
            ${notification.imageUrl ? `
              <div class="me-3">
                <img src="${notification.imageUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />
              </div>
            ` : ''}
            <div class="flex-grow-1">
              <div class="d-flex align-items-center mb-1">
                <h6 class="mb-0">${escapeHtml(notification.title)}</h6>
                <span class="ms-2">${getPostTypeBadge(notification.postType)}</span>
                <span class="ms-2">${getStatusBadge(notification.status)}</span>
              </div>
              <p class="text-muted mb-2 small">${truncateText(notification.body, 150)}</p>
              <div class="small text-muted">
                <i class="bi bi-calendar"></i> ${formatDateTime(notification.createdAt)}
                ${notification.publishedAt ? `<span class="mx-2">|</span><i class="bi bi-send"></i> Published: ${formatDateTime(notification.publishedAt)}` : ''}
                ${notification.scheduledAt ? `<span class="mx-2">|</span><i class="bi bi-clock"></i> Scheduled: ${formatDateTime(notification.scheduledAt)}` : ''}
                ${notification.status === 'PUBLISHED' ? `<span class="mx-2">|</span>👁️ ${notification.viewCount} 👍 ${notification.likeCount} 💬 ${notification.commentCount}` : ''}
              </div>
              <div class="small mt-1">
                ${notification.sendInApp ? '<span class="badge bg-info me-1">In-App</span>' : ''}
                ${notification.sendPush ? '<span class="badge bg-warning me-1">Push</span>' : ''}
                ${notification.sendPushOnly ? '<span class="badge bg-danger me-1">Push Only</span>' : ''}
                ${notification.commentsEnabled ? '<span class="badge bg-secondary me-1">Comments</span>' : ''}
                ${notification.likesEnabled ? '<span class="badge bg-secondary me-1">Likes</span>' : ''}
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4 text-end">
          <div class="btn-group btn-group-sm" role="group">
            ${notification.status === 'DRAFT' || notification.status === 'SCHEDULED' ? `
              <button class="btn btn-outline-primary" onclick="window.editNotification('${notification._id}')" title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
              ${!notification.imageUrl ? `
                <button class="btn btn-outline-info" onclick="window.openImageUpload('${notification._id}')" title="Add Image">
                  <i class="bi bi-image"></i>
                </button>
              ` : ''}
              <button class="btn btn-outline-success" onclick="window.openPublishModal('${notification._id}')" title="Publish">
                <i class="bi bi-send"></i>
              </button>
            ` : ''}
            <button class="btn btn-outline-danger" onclick="window.openDeleteModal('${notification._id}')" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

/**
 * Render pagination
 */
function renderPagination() {
  const container = document.getElementById('paginationList');
  if (!container) return;

  const showingFrom = (pagination.page - 1) * pagination.limit + 1;
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total);

  document.getElementById('showingFrom').textContent = pagination.total > 0 ? showingFrom : 0;
  document.getElementById('showingTo').textContent = showingTo;
  document.getElementById('totalItems').textContent = pagination.total;

  if (pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `
    <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="window.changePage(${pagination.page - 1}); return false;">Previous</a>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= pagination.totalPages; i++) {
    if (i === 1 || i === pagination.totalPages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
      html += `
        <li class="page-item ${i === pagination.page ? 'active' : ''}">
          <a class="page-link" href="#" onclick="window.changePage(${i}); return false;">${i}</a>
        </li>
      `;
    } else if (i === pagination.page - 3 || i === pagination.page + 3) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  // Next button
  html += `
    <li class="page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="window.changePage(${pagination.page + 1}); return false;">Next</a>
    </li>
  `;

  container.innerHTML = html;
}

/**
 * Update statistics
 */
function updateStats() {
  const total = notifications.length;
  const published = notifications.filter(n => n.status === 'PUBLISHED').length;
  const draft = notifications.filter(n => n.status === 'DRAFT').length;
  const scheduled = notifications.filter(n => n.status === 'SCHEDULED').length;
  const deleted = notifications.filter(n => n.status === 'DELETED').length;

  document.getElementById('totalCount').textContent = pagination.total || total;
  document.getElementById('publishedCount').textContent = published;
  document.getElementById('draftCount').textContent = draft;
  document.getElementById('scheduledCount').textContent = scheduled;
  document.getElementById('deletedCount').textContent = deleted;
}

/* ========== CREATE/EDIT NOTIFICATION ========== */
/**
 * Open create modal
 */
function openCreateModal() {
  currentNotificationId = null;
  currentEditingId = null;
  resetForm();
  document.getElementById('modalTitle').textContent = 'Create New Notification';
  document.getElementById('readOnlyAlert').style.display = 'none';
  document.getElementById('actionButtons').style.display = 'block';
  notificationModal.show();
}

/**
 * Edit notification
 */
async function editNotification(id) {
  try {
    showLoading(true);

    const notification = notifications.find(n => n._id === id);
    if (!notification) {
      showNotification('Notification not found', 'error');
      return;
    }

    if (notification.status === 'PUBLISHED') {
      showNotification('Published notifications cannot be edited', 'warning');
      return;
    }

    currentEditingId = id;
    currentNotificationId = notification.notificationId;

    // Populate form
    document.getElementById('notificationId').value = notification._id;
    document.getElementById('postType').value = notification.postType || '';
    document.getElementById('notificationTitle').value = notification.title || '';
    document.getElementById('notificationBody').value = notification.body || '';
    document.getElementById('sendInApp').checked = notification.sendInApp !== false;
    document.getElementById('sendPush').checked = notification.sendPush === true;
    document.getElementById('sendPushOnly').checked = notification.sendPushOnly === true;
    document.getElementById('commentsEnabled').checked = notification.commentsEnabled !== false;
    document.getElementById('likesEnabled').checked = notification.likesEnabled !== false;
    document.getElementById('currentImageUrl').value = notification.imageUrl || '';

    if (notification.productId) {
      document.getElementById('productId').value = notification.productId;
      document.getElementById('productSelectorContainer').style.display = 'block';
    }

    updateCharCount();
    handlePostTypeChange();

    document.getElementById('modalTitle').textContent = 'Edit Notification';
    document.getElementById('readOnlyAlert').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'block';

    notificationModal.show();

  } catch (error) {
    console.error('Error loading notification:', error);
    showNotification(error.message || 'Failed to load notification', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Save notification (create or update)
 */
async function saveNotification() {
  if (!validateForm()) return;

  try {
    showLoading(true);

    const payload = {
      postType: document.getElementById('postType').value,
      title: document.getElementById('notificationTitle').value.trim(),
      body: document.getElementById('notificationBody').value.trim(),
      sendInApp: document.getElementById('sendInApp').checked,
      sendPush: document.getElementById('sendPush').checked,
      sendPushOnly: document.getElementById('sendPushOnly').checked,
      commentsEnabled: document.getElementById('commentsEnabled').checked,
      likesEnabled: document.getElementById('likesEnabled').checked
    };

    // Add productId if PRODUCT_SHARE type
    if (payload.postType === 'PRODUCT_SHARE') {
      payload.productId = document.getElementById('productId').value;
      if (!payload.productId) {
        showNotification('Please select a product', 'warning');
        return;
      }
    }

    let response;

    if (currentEditingId) {
      // Update existing notification
      response = await API.patch(API_CONFIG.endpoints.notifications.update, payload, { id: currentEditingId });
      showNotification('Notification updated successfully', 'success');
    } else {
      // Create new notification
      response = await API.post(API_CONFIG.endpoints.notifications.create, payload);
      showNotification('Notification created as draft', 'success');

      // Store the new notification ID for image upload
      if (response.data && response.data.notificationId) {
        currentNotificationId = response.data.notificationId;
        currentEditingId = response.data._id;
      }
    }

    notificationModal.hide();
    await loadNotifications();

  } catch (error) {
    console.error('Error saving notification:', error);
    showNotification(error.message || 'Failed to save notification', 'error');
  } finally {
    showLoading(false);
  }
}

/* ========== IMAGE UPLOAD ========== */
/**
 * Open image upload modal
 */
function openImageUpload(id) {
  const notification = notifications.find(n => n._id === id);
  if (!notification) return;

  currentEditingId = id;
  currentNotificationId = notification.notificationId;

  document.getElementById('imageFileInput').value = '';
  document.getElementById('imagePreviewContainer').style.display = 'none';

  imageUploadModal.show();
}

/**
 * Preview selected image
 */
function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    showNotification('Image must be less than 5MB', 'warning');
    event.target.value = '';
    return;
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    showNotification('Only JPEG, PNG, and WebP images are allowed', 'warning');
    event.target.value = '';
    return;
  }

  // Show preview
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('imagePreview');
    preview.src = e.target.result;
    document.getElementById('imagePreviewContainer').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

/**
 * Upload image to notification
 */
async function uploadImage() {
  const fileInput = document.getElementById('imageFileInput');
  const file = fileInput.files[0];

  if (!file) {
    showNotification('Please select an image', 'warning');
    return;
  }

  if (!currentEditingId) {
    showNotification('No notification selected', 'error');
    return;
  }

  try {
    showLoading(true);

    const formData = new FormData();
    formData.append('image', file);

    const url = API.buildURL(API_CONFIG.endpoints.notifications.uploadImage, { id: currentEditingId });

    const response = await fetch(url, {
      method: 'PUT',
      headers: AUTH.getAuthHeaders(),
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Upload failed');
    }

    showNotification('Image uploaded successfully', 'success');
    imageUploadModal.hide();
    await loadNotifications();

  } catch (error) {
    console.error('Error uploading image:', error);
    showNotification(error.message || 'Failed to upload image', 'error');
  } finally {
    showLoading(false);
  }
}

/* ========== PUBLISH/SCHEDULE ========== */
/**
 * Open publish modal
 */
function openPublishModal(id) {
  const notification = notifications.find(n => n._id === id);
  if (!notification) return;

  currentEditingId = id;
  currentNotificationId = notification.notificationId;

  // Reset to immediate publish
  document.getElementById('publishImmediate').checked = true;
  document.getElementById('schedulePicker').style.display = 'none';

  // Set min datetime to 5 minutes from now
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 5);
  const minDateStr = minDate.toISOString().slice(0, 16);
  document.getElementById('scheduledAt').min = minDateStr;
  document.getElementById('scheduledAt').value = minDateStr;

  publishModal.show();
}

/**
 * Toggle schedule picker visibility
 */
function toggleSchedulePicker() {
  const isScheduled = document.getElementById('publishScheduled').checked;
  document.getElementById('schedulePicker').style.display = isScheduled ? 'block' : 'none';
}

/**
 * Handle publish (immediate or scheduled)
 */
async function handlePublish() {
  const isScheduled = document.getElementById('publishScheduled').checked;

  if (isScheduled) {
    await scheduleNotification();
  } else {
    await publishNotification();
  }
}

/**
 * Publish notification immediately
 */
async function publishNotification() {
  if (!currentEditingId) return;

  try {
    showLoading(true);

    const response = await API.post(API_CONFIG.endpoints.notifications.publish, {}, { id: currentEditingId });

    const sent = response.data?.sent || 0;
    const failed = response.data?.failed || 0;

    showNotification(`Notification published! Sent: ${sent}, Failed: ${failed}`, 'success');
    publishModal.hide();
    await loadNotifications();

  } catch (error) {
    console.error('Error publishing notification:', error);
    showNotification(error.message || 'Failed to publish notification', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Schedule notification for later
 */
async function scheduleNotification() {
  if (!currentEditingId) return;

  const scheduledAt = document.getElementById('scheduledAt').value;

  if (!scheduledAt) {
    showNotification('Please select a date and time', 'warning');
    return;
  }

  // Validate that scheduled time is at least 5 minutes in future
  const scheduledDate = new Date(scheduledAt);
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 5);

  if (scheduledDate < minDate) {
    showNotification('Scheduled time must be at least 5 minutes in the future', 'warning');
    return;
  }

  try {
    showLoading(true);

    const payload = {
      scheduledAt: new Date(scheduledAt).toISOString()
    };

    const response = await API.post(API_CONFIG.endpoints.notifications.schedule, payload, { id: currentEditingId });

    showNotification('Notification scheduled successfully', 'success');
    publishModal.hide();
    await loadNotifications();

  } catch (error) {
    console.error('Error scheduling notification:', error);
    showNotification(error.message || 'Failed to schedule notification', 'error');
  } finally {
    showLoading(false);
  }
}

/* ========== DELETE ========== */
/**
 * Open delete confirmation modal
 */
function openDeleteModal(id) {
  deleteTargetId = id;
  deleteModal.show();
}

/**
 * Confirm and delete notification
 */
async function confirmDelete() {
  if (!deleteTargetId) return;

  try {
    showLoading(true);

    await API.delete(API_CONFIG.endpoints.notifications.delete, { id: deleteTargetId });

    showNotification('Notification deleted successfully', 'success');
    deleteModal.hide();
    deleteTargetId = null;
    await loadNotifications();

  } catch (error) {
    console.error('Error deleting notification:', error);
    showNotification(error.message || 'Failed to delete notification', 'error');
  } finally {
    showLoading(false);
  }
}

/* ========== ANALYTICS ========== */
/**
 * Load analytics data
 */
async function loadAnalytics() {
  const startDate = document.getElementById('analyticsStartDate').value;
  const endDate = document.getElementById('analyticsEndDate').value;

  if (!startDate || !endDate) {
    showNotification('Please select both start and end dates', 'warning');
    return;
  }

  try {
    showLoading(true);

    const query = {
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString()
    };

    const response = await API.get(API_CONFIG.endpoints.notifications.analytics, {}, query);

    renderAnalytics(response.data || response);

  } catch (error) {
    console.error('Error loading analytics:', error);
    showNotification(error.message || 'Failed to load analytics', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Render analytics data
 */
function renderAnalytics(data) {
  const container = document.getElementById('analyticsContent');
  if (!container) return;

  const html = `
    <!-- Summary Cards -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="mb-0">${data.totalNotifications || 0}</h3>
            <p class="text-muted mb-0">Total Posts</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="mb-0">${data.totalLikes || 0}</h3>
            <p class="text-muted mb-0">Total Likes</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="mb-0">${data.totalComments || 0}</h3>
            <p class="text-muted mb-0">Total Comments</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="mb-0">${data.totalViews || 0}</h3>
            <p class="text-muted mb-0">Total Views</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Average Engagement -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-body text-center">
            <h4>Average Engagement Rate</h4>
            <h2 class="text-primary">${(data.averageEngagement || 0).toFixed(2)}%</h2>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Performing Post -->
    ${data.topPerformingPost ? `
      <div class="row mb-4">
        <div class="col-12">
          <div class="top-post-card">
            <h5 class="mb-3">🏆 Top Performing Post</h5>
            <h4 class="mb-2">${escapeHtml(data.topPerformingPost.title)}</h4>
            <div class="d-flex gap-4">
              <div>
                <strong>👁️ Views:</strong> ${data.topPerformingPost.viewCount || 0}
              </div>
              <div>
                <strong>👍 Likes:</strong> ${data.topPerformingPost.likeCount || 0}
              </div>
              <div>
                <strong>💬 Comments:</strong> ${data.topPerformingPost.commentCount || 0}
              </div>
              <div>
                <strong>📊 Engagement:</strong> ${(data.topPerformingPost.engagementRate || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Posts by Type -->
    ${data.postsByType ? `
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <h5 class="mb-3">Posts by Type</h5>
              <div class="row">
                <div class="col-md-3 text-center">
                  <h3>${data.postsByType.OFFER || 0}</h3>
                  <p class="text-muted">📢 Offers</p>
                </div>
                <div class="col-md-3 text-center">
                  <h3>${data.postsByType.POST || 0}</h3>
                  <p class="text-muted">📝 Posts</p>
                </div>
                <div class="col-md-3 text-center">
                  <h3>${data.postsByType.POST_WITH_IMAGE || 0}</h3>
                  <p class="text-muted">🖼️ With Images</p>
                </div>
                <div class="col-md-3 text-center">
                  <h3>${data.postsByType.PRODUCT_SHARE || 0}</h3>
                  <p class="text-muted">🛍️ Product Shares</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ` : ''}
  `;

  container.innerHTML = html;
}

/* ========== FILTERS & PAGINATION ========== */
/**
 * Apply filters
 */
function applyFilters() {
  filters.search = document.getElementById('searchInput').value.trim();
  filters.status = document.getElementById('statusFilter').value;
  filters.type = document.getElementById('typeFilter').value;

  pagination.page = 1; // Reset to first page
  loadNotifications();
}

/**
 * Reset filters
 */
function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('typeFilter').value = '';

  filters = { search: '', status: '', type: '' };
  pagination.page = 1;

  loadNotifications();
}

/**
 * Change page
 */
function changePage(page) {
  if (page < 1 || page > pagination.totalPages) return;
  pagination.page = page;
  loadNotifications();
}

/* ========== EVENT HANDLERS ========== */
/**
 * Handle post type change
 */
function handlePostTypeChange() {
  const postType = document.getElementById('postType').value;
  const productContainer = document.getElementById('productSelectorContainer');

  if (postType === 'PRODUCT_SHARE') {
    productContainer.style.display = 'block';
  } else {
    productContainer.style.display = 'none';
  }
}

/**
 * Handle sendPushOnly checkbox
 */
function handlePushOnlyChange(event) {
  if (event.target.checked) {
    document.getElementById('sendInApp').checked = false;
    document.getElementById('sendPush').checked = true;
    document.getElementById('sendInApp').disabled = true;
  } else {
    document.getElementById('sendInApp').disabled = false;
  }
}

/**
 * Handle sendInApp checkbox
 */
function handleSendInAppChange(event) {
  if (event.target.checked && document.getElementById('sendPushOnly').checked) {
    document.getElementById('sendPushOnly').checked = false;
  }
}

/**
 * Update character count
 */
function updateCharCount() {
  const body = document.getElementById('notificationBody').value;
  document.getElementById('charCount').textContent = body.length;
}

/* ========== VALIDATION ========== */
/**
 * Validate form
 */
function validateForm() {
  const postType = document.getElementById('postType').value;
  const title = document.getElementById('notificationTitle').value.trim();
  const body = document.getElementById('notificationBody').value.trim();
  const sendInApp = document.getElementById('sendInApp').checked;
  const sendPush = document.getElementById('sendPush').checked;
  const sendPushOnly = document.getElementById('sendPushOnly').checked;

  if (!postType) {
    showNotification('Please select a post type', 'warning');
    return false;
  }

  if (!title) {
    showNotification('Please enter a title', 'warning');
    return false;
  }

  if (title.length > 200) {
    showNotification('Title must be 200 characters or less', 'warning');
    return false;
  }

  if (!body) {
    showNotification('Please enter a message', 'warning');
    return false;
  }

  if (body.length > 5000) {
    showNotification('Message must be 5000 characters or less', 'warning');
    return false;
  }

  if (!sendInApp && !sendPush && !sendPushOnly) {
    showNotification('Please select at least one delivery option', 'warning');
    return false;
  }

  return true;
}

/**
 * Reset form
 */
function resetForm() {
  document.getElementById('notificationForm').reset();
  document.getElementById('notificationId').value = '';
  document.getElementById('currentImageUrl').value = '';
  document.getElementById('sendInApp').checked = true;
  document.getElementById('sendPush').checked = false;
  document.getElementById('sendPushOnly').checked = false;
  document.getElementById('commentsEnabled').checked = true;
  document.getElementById('likesEnabled').checked = true;
  document.getElementById('productSelectorContainer').style.display = 'none';
  updateCharCount();
}

/* ========== UTILITY FUNCTIONS ========== */
/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const badges = {
    DRAFT: '<span class="badge badge-draft">Draft</span>',
    SCHEDULED: '<span class="badge badge-scheduled">Scheduled</span>',
    PUBLISHED: '<span class="badge badge-published">Published</span>',
    DELETED: '<span class="badge badge-deleted">Deleted</span>'
  };
  return badges[status] || '';
}

/**
 * Get post type badge HTML
 */
function getPostTypeBadge(postType) {
  const badges = {
    OFFER: '<span class="badge bg-warning text-dark">Offer</span>',
    POST: '<span class="badge bg-primary">Post</span>',
    POST_WITH_IMAGE: '<span class="badge bg-info">Post+Image</span>',
    PRODUCT_SHARE: '<span class="badge bg-success">Product</span>'
  };
  return badges[postType] || '';
}

/**
 * Format date and time
 */
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  if (window.utils && window.utils.formatDateTime) {
    return window.utils.formatDateTime(dateString);
  }
  return new Date(dateString).toLocaleString();
}

/**
 * Truncate text
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (window.utils && window.utils.truncateText) {
    return window.utils.truncateText(text, maxLength);
  }
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  if (window.adminPanel && window.adminPanel.showNotification) {
    window.adminPanel.showNotification(message, type);
  } else {
    alert(message);
  }
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
  let overlay = document.getElementById('loadingOverlay');

  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `;
      overlay.innerHTML = '<div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  } else {
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}

/**
 * Debounce function
 */
function debounce(func, wait) {
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

/* ========== GLOBAL EXPORTS ========== */
// Make functions available globally for onclick handlers
window.editNotification = editNotification;
window.openDeleteModal = openDeleteModal;
window.openImageUpload = openImageUpload;
window.openPublishModal = openPublishModal;
window.changePage = changePage;
window.resetFilters = resetFilters;

console.log('Notification management system loaded successfully!');
