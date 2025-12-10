/**
 * Admin Management Page - Sub-Admin CRUD Operations
 */

let allSubAdmins = [];
let editingMode = false;

// Available modules for assignment
const AVAILABLE_MODULES = [
    { id: 'users', label: 'Users Management', icon: 'bi-people' },
    { id: 'wallet', label: 'User Wallets', icon: 'bi-wallet2' },
    { id: 'kyc', label: 'KYC Verification', icon: 'bi-shield-check' },
    { id: 'categories', label: 'Categories', icon: 'bi-folder-fill' },
    { id: 'products', label: 'Products', icon: 'bi-box-seam' },
    { id: 'uploader', label: 'Image Uploader', icon: 'bi-image' },
    { id: 'coupons', label: 'Coupons', icon: 'bi-ticket-perforated' },
    { id: 'orders', label: 'Orders', icon: 'bi-cart3' },
    { id: 'analytics', label: 'Analytics', icon: 'bi-graph-up' },
    { id: 'notifications', label: 'Notifications', icon: 'bi-bell' },
    { id: 'chat', label: 'Chat Management', icon: 'bi-chat-dots' },
    { id: 'chat-reports', label: 'Chat Reports', icon: 'bi-flag' },
    { id: 'chat-analytics', label: 'Chat Analytics', icon: 'bi-bar-chart' },
    { id: 'settings', label: 'Settings', icon: 'bi-gear' }
];

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', function() {
    loadSubAdmins();
    renderModuleCheckboxes();
});

/**
 * Load all sub-admins from backend
 */
async function loadSubAdmins() {
    try {
        showLoading();

        const url = API.buildURL(API_CONFIG.endpoints.adminManagement.subAdmins);
        const response = await API.request(url, {
            method: 'GET',
            headers: AUTH.getAuthHeaders()
        });

        console.log('Sub-admins response:', response);

        if (response.success) {
            allSubAdmins = response.data || [];
            displaySubAdmins(allSubAdmins);
        } else {
            throw new Error(response.message || 'Failed to load sub-admins');
        }
    } catch (error) {
        console.error('Error loading sub-admins:', error);
        showError('Failed to load sub-admins: ' + error.message);
    }
}

/**
 * Display sub-admins in table
 */
function displaySubAdmins(admins) {
    const tbody = document.querySelector('#subAdminsTable tbody');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');

    loadingSpinner.style.display = 'none';

    if (!admins || admins.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';

    tbody.innerHTML = admins.map((admin, index) => {
        const modulesCount = admin.moduleAccess ? admin.moduleAccess.length : 0;
        const lastLogin = admin.lastLogin
            ? new Date(admin.lastLogin).toLocaleString()
            : 'Never';
        const createdBy = admin.createdBy
            ? `${admin.createdBy.name || admin.createdBy.email}`
            : 'System';

        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <i class="bi bi-person-circle me-2"></i>
                    ${escapeHtml(admin.name)}
                </td>
                <td>${escapeHtml(admin.email)}</td>
                <td>
                    <span class="badge bg-info badge-module-count">
                        ${modulesCount} module${modulesCount !== 1 ? 's' : ''}
                    </span>
                    <button class="btn btn-sm btn-link p-0 ms-2" onclick="viewModules('${admin._id}')"
                            title="View modules">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
                <td>
                    <span class="badge ${admin.isActive ? 'bg-success' : 'bg-warning'}">
                        ${admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td><small>${lastLogin}</small></td>
                <td><small>${escapeHtml(createdBy)}</small></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="editAdmin('${admin._id}')"
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="resetPassword('${admin._id}')"
                                title="Reset Password">
                            <i class="bi bi-key"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteAdmin('${admin._id}', '${escapeHtml(admin.name)}')"
                                title="Deactivate">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Show loading state
 */
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('emptyState').innerHTML = `
        <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
        <p class="mt-3 text-danger">${escapeHtml(message)}</p>
        <button class="btn btn-primary" onclick="loadSubAdmins()">
            <i class="bi bi-arrow-clockwise"></i> Retry
        </button>
    `;
    document.getElementById('emptyState').style.display = 'block';
}

/**
 * Render module checkboxes in modal
 */
function renderModuleCheckboxes() {
    const container = document.getElementById('moduleCheckboxes');

    container.innerHTML = AVAILABLE_MODULES.map(module => `
        <div class="module-checkbox-item">
            <label>
                <input type="checkbox" value="${module.id}" class="module-checkbox">
                <i class="bi ${module.icon}"></i>
                <span>${module.label}</span>
            </label>
        </div>
    `).join('');
}

/**
 * Open create modal
 */
function openCreateModal() {
    editingMode = false;
    document.getElementById('modalTitle').textContent = 'Create Sub-Admin';
    document.getElementById('adminForm').reset();
    document.getElementById('editingAdminId').value = '';
    document.getElementById('passwordRow').style.display = 'block';
    document.getElementById('adminPassword').required = true;
    document.getElementById('statusRow').style.display = 'none';

    // Uncheck all modules
    deselectAllModules();

    const modal = new bootstrap.Modal(document.getElementById('adminModal'));
    modal.show();
}

/**
 * Edit admin
 */
async function editAdmin(adminId) {
    try {
        const admin = allSubAdmins.find(a => a._id === adminId);
        if (!admin) {
            alert('Admin not found');
            return;
        }

        editingMode = true;
        document.getElementById('modalTitle').textContent = 'Edit Sub-Admin';
        document.getElementById('editingAdminId').value = adminId;
        document.getElementById('adminName').value = admin.name;
        document.getElementById('adminEmail').value = admin.email;
        document.getElementById('passwordRow').style.display = 'none';
        document.getElementById('adminPassword').required = false;
        document.getElementById('statusRow').style.display = 'block';
        document.getElementById('adminStatus').value = admin.isActive ? 'true' : 'false';

        // Check the modules
        deselectAllModules();
        const moduleCheckboxes = document.querySelectorAll('.module-checkbox');
        moduleCheckboxes.forEach(checkbox => {
            if (admin.moduleAccess && admin.moduleAccess.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });

        const modal = new bootstrap.Modal(document.getElementById('adminModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing admin:', error);
        alert('Failed to load admin details');
    }
}

/**
 * Save admin (create or update)
 */
async function saveAdmin() {
    try {
        const name = document.getElementById('adminName').value.trim();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        // Validation
        if (!name || !email) {
            alert('Please fill in all required fields');
            return;
        }

        if (!editingMode && (!password || password.length < 6)) {
            alert('Password must be at least 6 characters');
            return;
        }

        // Get selected modules
        const selectedModules = Array.from(document.querySelectorAll('.module-checkbox:checked'))
            .map(cb => cb.value);

        if (selectedModules.length === 0) {
            alert('Please select at least one module');
            return;
        }

        const data = {
            name,
            email,
            moduleAccess: selectedModules // Backend expects 'moduleAccess'
        };

        if (editingMode) {
            // Update existing admin
            const adminId = document.getElementById('editingAdminId').value;
            const isActive = document.getElementById('adminStatus').value === 'true';
            data.isActive = isActive;

            const url = API.buildURL(API_CONFIG.endpoints.adminManagement.subAdminById, { adminId });
            const response = await API.request(url, {
                method: 'PUT',
                headers: AUTH.getAuthHeaders(),
                body: JSON.stringify(data)
            });

            if (response.success) {
                alert('Sub-admin updated successfully!');
                bootstrap.Modal.getInstance(document.getElementById('adminModal')).hide();
                loadSubAdmins();
            } else {
                throw new Error(response.message || 'Failed to update sub-admin');
            }
        } else {
            // Create new admin
            data.password = password;

            const url = API.buildURL(API_CONFIG.endpoints.adminManagement.subAdmins);
            const response = await API.request(url, {
                method: 'POST',
                headers: AUTH.getAuthHeaders(),
                body: JSON.stringify(data)
            });

            if (response.success) {
                alert(`Sub-admin created successfully!\n\nShare these credentials:\nEmail: ${email}\nPassword: ${password}`);
                bootstrap.Modal.getInstance(document.getElementById('adminModal')).hide();
                loadSubAdmins();
            } else {
                throw new Error(response.message || 'Failed to create sub-admin');
            }
        }
    } catch (error) {
        console.error('Error saving admin:', error);
        alert('Error: ' + error.message);
    }
}

/**
 * Reset password
 */
async function resetPassword(adminId) {
    const admin = allSubAdmins.find(a => a._id === adminId);
    if (!admin) return;

    const newPassword = prompt(`Reset password for ${admin.name}\n\nEnter new password (minimum 6 characters):`);

    if (!newPassword) return;

    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        const url = API.buildURL(API_CONFIG.endpoints.adminManagement.resetPassword, { adminId });
        const response = await API.request(url, {
            method: 'POST',
            headers: AUTH.getAuthHeaders(),
            body: JSON.stringify({ newPassword })
        });

        if (response.success) {
            alert(`Password reset successfully!\n\nShare these credentials:\nEmail: ${response.data.email}\nPassword: ${response.data.newPassword || newPassword}`);
        } else {
            throw new Error(response.message || 'Failed to reset password');
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Error: ' + error.message);
    }
}

/**
 * Delete admin
 */
async function deleteAdmin(adminId, adminName) {
    if (!confirm(`Are you sure you want to deactivate ${adminName}?\n\nThey will no longer be able to login.`)) {
        return;
    }

    try {
        const url = API.buildURL(API_CONFIG.endpoints.adminManagement.subAdminById, { adminId });
        const response = await API.request(url, {
            method: 'DELETE',
            headers: AUTH.getAuthHeaders()
        });

        if (response.success) {
            alert('Sub-admin deactivated successfully');
            loadSubAdmins();
        } else {
            throw new Error(response.message || 'Failed to deactivate sub-admin');
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        alert('Error: ' + error.message);
    }
}

/**
 * View modules
 */
function viewModules(adminId) {
    const admin = allSubAdmins.find(a => a._id === adminId);
    if (!admin) return;

    const modules = admin.moduleAccess || [];
    const moduleNames = modules.map(moduleId => {
        const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
        return module ? module.label : moduleId;
    }).join('\n• ');

    alert(`${admin.name}'s Module Access:\n\n• ${moduleNames || 'No modules assigned'}`);
}

/**
 * Select all modules
 */
function selectAllModules() {
    document.querySelectorAll('.module-checkbox').forEach(cb => cb.checked = true);
}

/**
 * Deselect all modules
 */
function deselectAllModules() {
    document.querySelectorAll('.module-checkbox').forEach(cb => cb.checked = false);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
