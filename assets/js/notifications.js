/**
 * Notification Management System
 * Handles CRUD operations for notifications with localStorage and API integration
 */

// State management
let notifications = [];
let currentNotificationId = null;
let deleteTargetId = null;

// DOM elements
const createNewBtn = document.getElementById('createNewBtn');
const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
const notificationForm = document.getElementById('notificationForm');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const sendNowBtn = document.getElementById('sendNowBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// API Configuration
const API_CONFIG = {
    baseURL: '/api',
    endpoints: {
        send: '/notifications/send'
    }
};

/**
 * Initialize the notification system
 */
document.addEventListener('DOMContentLoaded', function() {
    loadNotifications();
    renderAllLists();
    updateStats();
    initializeEventListeners();
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Create new notification
    createNewBtn.addEventListener('click', openCreateModal);

    // Save as draft
    saveDraftBtn.addEventListener('click', saveAsDraft);

    // Send notification
    sendNowBtn.addEventListener('click', sendNotification);

    // Delete confirmation
    confirmDeleteBtn.addEventListener('click', deleteNotification);

    // Character count for message
    document.getElementById('notificationMessage').addEventListener('input', updateCharCount);

    // Form validation on type change
    document.getElementById('notificationType').addEventListener('change', updateTypePreview);
}

/**
 * Load notifications from localStorage
 */
function loadNotifications() {
    const stored = window.utils.storage.get('notifications');
    notifications = stored || [];
}

/**
 * Save notifications to localStorage
 */
function saveToStorage() {
    window.utils.storage.set('notifications', notifications);
}

/**
 * Render all notification lists
 */
function renderAllLists() {
    renderNotificationList('all', notifications);
    renderNotificationList('sent', notifications.filter(n => n.status === 'sent'));
    renderNotificationList('drafts', notifications.filter(n => n.status === 'draft'));
}

/**
 * Render notification list
 * @param {string} listType - Type of list (all, sent, drafts)
 * @param {Array} items - Notifications to render
 */
function renderNotificationList(listType, items) {
    const containerId = listType === 'all' ? 'allNotificationsList' :
                       listType === 'sent' ? 'sentNotificationsList' :
                       'draftNotificationsList';

    const container = document.getElementById(containerId);

    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-inbox fs-1"></i>
                <p class="mt-2">No notifications found</p>
            </div>
        `;
        return;
    }

    // Sort by created date (newest first)
    const sortedItems = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = sortedItems.map(notification => `
        <div class="notification-item border-bottom py-3" data-id="${notification.id}">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-start">
                        <div class="me-3">
                            ${getTypeIcon(notification.type)}
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${escapeHtml(notification.title)}</h6>
                            <p class="text-muted mb-1 small">${truncateText(notification.message, 100)}</p>
                            <div class="small text-muted">
                                <i class="bi bi-people"></i> ${escapeHtml(notification.targetAudience)}
                                <span class="mx-2">|</span>
                                <i class="bi bi-clock"></i> ${formatDateTime(notification.createdAt)}
                                ${notification.sentAt ? `<span class="mx-2">|</span><i class="bi bi-send"></i> Sent: ${formatDateTime(notification.sentAt)}` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 text-end">
                    ${getStatusBadge(notification.status)}
                    <div class="btn-group btn-group-sm mt-2" role="group">
                        <button class="btn btn-outline-primary" onclick="viewNotification('${notification.id}')" title="View">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${notification.status === 'draft' ? `
                            <button class="btn btn-outline-success" onclick="editNotification('${notification.id}')" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-danger" onclick="openDeleteModal('${notification.id}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Get icon based on notification type
 * @param {string} type - Notification type
 * @returns {string} HTML for icon
 */
function getTypeIcon(type) {
    const icons = {
        info: '<i class="bi bi-info-circle-fill fs-4 text-info"></i>',
        warning: '<i class="bi bi-exclamation-triangle-fill fs-4 text-warning"></i>',
        success: '<i class="bi bi-check-circle-fill fs-4 text-success"></i>',
        error: '<i class="bi bi-x-circle-fill fs-4 text-danger"></i>'
    };
    return icons[type] || icons.info;
}

/**
 * Get status badge
 * @param {string} status - Notification status
 * @returns {string} HTML for badge
 */
function getStatusBadge(status) {
    const badges = {
        sent: '<span class="badge bg-success">Sent</span>',
        draft: '<span class="badge bg-warning">Draft</span>'
    };
    return badges[status] || '';
}

/**
 * Update statistics
 */
function updateStats() {
    const total = notifications.length;
    const sent = notifications.filter(n => n.status === 'sent').length;
    const draft = notifications.filter(n => n.status === 'draft').length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('sentCount').textContent = sent;
    document.getElementById('draftCount').textContent = draft;
}

/**
 * Open create modal
 */
function openCreateModal() {
    currentNotificationId = null;
    resetForm();
    document.getElementById('modalTitle').textContent = 'Create New Notification';
    document.getElementById('readOnlyAlert').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'block';
    enableFormFields();
    notificationModal.show();
}

/**
 * View notification (read-only)
 * @param {string} id - Notification ID
 */
function viewNotification(id) {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    currentNotificationId = id;
    populateForm(notification);
    document.getElementById('modalTitle').textContent = 'View Notification';

    if (notification.status === 'sent') {
        document.getElementById('readOnlyAlert').style.display = 'block';
        document.getElementById('actionButtons').style.display = 'none';
        disableFormFields();
    } else {
        document.getElementById('readOnlyAlert').style.display = 'none';
        document.getElementById('actionButtons').style.display = 'block';
        enableFormFields();
    }

    notificationModal.show();
}

/**
 * Edit notification (drafts only)
 * @param {string} id - Notification ID
 */
function editNotification(id) {
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.status !== 'draft') return;

    currentNotificationId = id;
    populateForm(notification);
    document.getElementById('modalTitle').textContent = 'Edit Notification';
    document.getElementById('readOnlyAlert').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'block';
    enableFormFields();
    notificationModal.show();
}

/**
 * Populate form with notification data
 * @param {Object} notification - Notification object
 */
function populateForm(notification) {
    document.getElementById('notificationId').value = notification.id;
    document.getElementById('notificationTitle').value = notification.title;
    document.getElementById('notificationMessage').value = notification.message;
    document.getElementById('notificationType').value = notification.type;
    document.getElementById('targetAudience').value = notification.targetAudience;
    document.getElementById('notificationStatus').value = notification.status;
    updateCharCount();
}

/**
 * Reset form
 */
function resetForm() {
    notificationForm.reset();
    document.getElementById('notificationId').value = '';
    document.getElementById('notificationStatus').value = '';
    updateCharCount();
}

/**
 * Enable form fields
 */
function enableFormFields() {
    document.getElementById('notificationTitle').disabled = false;
    document.getElementById('notificationMessage').disabled = false;
    document.getElementById('notificationType').disabled = false;
    document.getElementById('targetAudience').disabled = false;
}

/**
 * Disable form fields
 */
function disableFormFields() {
    document.getElementById('notificationTitle').disabled = true;
    document.getElementById('notificationMessage').disabled = true;
    document.getElementById('notificationType').disabled = true;
    document.getElementById('targetAudience').disabled = true;
}

/**
 * Save notification as draft
 */
function saveAsDraft() {
    if (!validateForm()) return;

    const formData = getFormData();
    formData.status = 'draft';
    formData.sentAt = null;

    if (currentNotificationId) {
        // Update existing draft
        const index = notifications.findIndex(n => n.id === currentNotificationId);
        if (index !== -1) {
            notifications[index] = { ...notifications[index], ...formData };
        }
    } else {
        // Create new draft
        formData.id = generateId();
        formData.createdAt = new Date().toISOString();
        notifications.push(formData);
    }

    saveToStorage();
    renderAllLists();
    updateStats();
    notificationModal.hide();
    showNotification('Notification saved as draft successfully!', 'success');
}

/**
 * Send notification
 */
async function sendNotification() {
    if (!validateForm()) return;

    const formData = getFormData();

    // Show loading state
    sendNowBtn.disabled = true;
    sendNowBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';

    try {
        // Call API to send notification
        await sendNotificationAPI(formData);

        formData.status = 'sent';
        formData.sentAt = new Date().toISOString();

        if (currentNotificationId) {
            // Update existing notification
            const index = notifications.findIndex(n => n.id === currentNotificationId);
            if (index !== -1) {
                notifications[index] = { ...notifications[index], ...formData };
            }
        } else {
            // Create new notification
            formData.id = generateId();
            formData.createdAt = new Date().toISOString();
            notifications.push(formData);
        }

        saveToStorage();
        renderAllLists();
        updateStats();
        notificationModal.hide();
        showNotification('Notification sent successfully!', 'success');

    } catch (error) {
        console.error('Error sending notification:', error);
        showNotification('Failed to send notification. Please try again.', 'danger');
    } finally {
        // Reset button state
        sendNowBtn.disabled = false;
        sendNowBtn.innerHTML = '<i class="bi bi-send"></i> Send Now';
    }
}

/**
 * Send notification via API
 * @param {Object} data - Notification data
 * @returns {Promise} API response
 */
async function sendNotificationAPI(data) {
    // Mock API call using Axios
    // In production, replace with actual API endpoint

    return new Promise((resolve, reject) => {
        // Simulate API call
        setTimeout(() => {
            // Mock successful response
            const mockResponse = {
                data: {
                    success: true,
                    message: 'Notification sent successfully',
                    notificationId: data.id || generateId()
                }
            };

            console.log('Mock API Call to:', API_CONFIG.baseURL + API_CONFIG.endpoints.send);
            console.log('Request Data:', data);
            console.log('Response:', mockResponse);

            // Simulate 90% success rate
            if (Math.random() > 0.1) {
                resolve(mockResponse);
            } else {
                reject(new Error('Network error'));
            }
        }, 1500); // Simulate network delay
    });

    // Uncomment below for real API integration
    /*
    try {
        const response = await axios.post(
            API_CONFIG.baseURL + API_CONFIG.endpoints.send,
            {
                title: data.title,
                message: data.message,
                type: data.type,
                targetAudience: data.targetAudience
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        return response;
    } catch (error) {
        throw error;
    }
    */
}

/**
 * Open delete confirmation modal
 * @param {string} id - Notification ID
 */
function openDeleteModal(id) {
    deleteTargetId = id;
    deleteModal.show();
}

/**
 * Delete notification
 */
function deleteNotification() {
    if (!deleteTargetId) return;

    const index = notifications.findIndex(n => n.id === deleteTargetId);
    if (index !== -1) {
        notifications.splice(index, 1);
        saveToStorage();
        renderAllLists();
        updateStats();
        deleteModal.hide();
        showNotification('Notification deleted successfully!', 'success');
    }

    deleteTargetId = null;
}

/**
 * Get form data
 * @returns {Object} Form data
 */
function getFormData() {
    return {
        title: document.getElementById('notificationTitle').value.trim(),
        message: document.getElementById('notificationMessage').value.trim(),
        type: document.getElementById('notificationType').value,
        targetAudience: document.getElementById('targetAudience').value.trim()
    };
}

/**
 * Validate form
 * @returns {boolean} Validation result
 */
function validateForm() {
    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const type = document.getElementById('notificationType').value;
    const targetAudience = document.getElementById('targetAudience').value.trim();

    if (!title) {
        showNotification('Please enter a title', 'warning');
        return false;
    }

    if (!message) {
        showNotification('Please enter a message', 'warning');
        return false;
    }

    if (!type) {
        showNotification('Please select a notification type', 'warning');
        return false;
    }

    if (!targetAudience) {
        showNotification('Please enter target audience', 'warning');
        return false;
    }

    return true;
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Update character count
 */
function updateCharCount() {
    const message = document.getElementById('notificationMessage').value;
    document.getElementById('charCount').textContent = message.length;
}

/**
 * Update type preview (visual feedback)
 */
function updateTypePreview() {
    const type = document.getElementById('notificationType').value;
    const select = document.getElementById('notificationType');

    // Remove all type classes
    select.classList.remove('border-info', 'border-warning', 'border-success', 'border-danger');

    // Add class based on type
    if (type) {
        const classMap = {
            info: 'border-info',
            warning: 'border-warning',
            success: 'border-success',
            error: 'border-danger'
        };
        select.classList.add(classMap[type]);
    }
}

/**
 * Show notification message
 * @param {string} message - Message to show
 * @param {string} type - Message type
 */
function showNotification(message, type = 'info') {
    if (window.adminPanel && window.adminPanel.showNotification) {
        window.adminPanel.showNotification(message, type);
    } else {
        alert(message);
    }
}

/**
 * Format date and time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDateTime(dateString) {
    if (window.utils && window.utils.formatDateTime) {
        return window.utils.formatDateTime(dateString);
    }
    return new Date(dateString).toLocaleString();
}

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (window.utils && window.utils.truncateText) {
        return window.utils.truncateText(text, maxLength);
    }
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available for onclick handlers
window.viewNotification = viewNotification;
window.editNotification = editNotification;
window.openDeleteModal = openDeleteModal;
