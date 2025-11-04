/**
 * Category Management System
 * Handles CRUD operations for categories with hierarchical structure
 */

// State management
let categories = [];
let currentCategoryId = null;
let categoryImages = [];

// DOM elements (initialized after DOM loads)
let searchInput, statusFilter, levelFilter, viewModeSelect;
let categoriesContainer;
let categoryModal, categoryForm;
let totalCategoriesCount, activeCategoriesCount, featuredCategoriesCount, rootCategoriesCount;

/**
 * Initialize the category management system
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeDOMElements();
    loadCategories();
    setupEventListeners();
});

/**
 * Initialize DOM element references
 */
function initializeDOMElements() {
    // Filters
    searchInput = document.getElementById('searchInput');
    statusFilter = document.getElementById('statusFilter');
    levelFilter = document.getElementById('levelFilter');
    viewModeSelect = document.getElementById('viewMode');

    // Containers
    categoriesContainer = document.getElementById('categoriesContainer');

    // Stats counters
    totalCategoriesCount = document.getElementById('totalCategoriesCount');
    activeCategoriesCount = document.getElementById('activeCategoriesCount');
    featuredCategoriesCount = document.getElementById('featuredCategoriesCount');
    rootCategoriesCount = document.getElementById('rootCategoriesCount');

    // Modal
    categoryForm = document.getElementById('categoryForm');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search and filters with debounce
    if (searchInput) {
        searchInput.addEventListener('input', window.utils.debounce(filterCategories, 300));
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', filterCategories);
    }

    if (levelFilter) {
        levelFilter.addEventListener('change', filterCategories);
    }

    if (viewModeSelect) {
        viewModeSelect.addEventListener('change', renderCategories);
    }
}

/**
 * Load categories from API
 */
async function loadCategories() {
    try {
        showLoading(true);

        const response = await API.get(
            API_CONFIG.endpoints.categories.getAll,
            {},
            { includeInactive: true }
        );

        categories = response.data || response;

        updateStats();
        renderCategories();
        populateParentCategoryDropdown();

    } catch (error) {
        console.error('Error loading categories:', error);
        window.adminPanel.showNotification('Failed to load categories: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Update statistics
 */
function updateStats() {
    const total = categories.length;
    const active = categories.filter(c => c.isActive).length;
    const featured = categories.filter(c => c.isFeatured).length;
    const root = categories.filter(c => !c.parentCategory && c.level === 0).length;

    if (totalCategoriesCount) totalCategoriesCount.textContent = total;
    if (activeCategoriesCount) activeCategoriesCount.textContent = active;
    if (featuredCategoriesCount) featuredCategoriesCount.textContent = featured;
    if (rootCategoriesCount) rootCategoriesCount.textContent = root;
}

/**
 * Render categories based on view mode
 */
function renderCategories() {
    if (!categoriesContainer) return;

    const viewMode = viewModeSelect ? viewModeSelect.value : 'tree';

    if (viewMode === 'tree') {
        renderTreeView(categoriesContainer);
    } else {
        renderListView(categoriesContainer);
    }
}

/**
 * Render tree view
 */
function renderTreeView(container) {
    const filteredCategories = getFilteredCategories();
    const rootCategories = filteredCategories.filter(c => !c.parentCategory || c.level === 0);

    if (rootCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-folder-x"></i><p>No categories found</p></div>';
        return;
    }

    const tree = document.createElement('ul');
    tree.className = 'category-tree';

    rootCategories.forEach(category => {
        tree.appendChild(renderCategoryTreeItem(category, filteredCategories));
    });

    container.innerHTML = '';
    container.appendChild(tree);
}

/**
 * Render single category tree item
 */
function renderCategoryTreeItem(category, allCategories) {
    const li = document.createElement('li');
    const children = allCategories.filter(c => c.parentCategory === category._id);
    const hasChildren = children.length > 0;

    const itemDiv = document.createElement('div');
    itemDiv.className = `category-item level-${category.level}`;
    itemDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div class="flex-grow-1">
                ${hasChildren ? `<span class="toggle-children me-2" onclick="toggleChildren(this)">
                    <i class="bi bi-chevron-down"></i>
                </span>` : ''}
                ${category.icon ? `<span class="me-2">${category.icon}</span>` : ''}
                <strong>${escapeHtml(category.name)}</strong>
                <span class="badge bg-secondary ms-2 level-badge">Level ${category.level}</span>
                ${category.isActive ?
                    '<span class="badge status-active ms-1">Active</span>' :
                    '<span class="badge status-inactive ms-1">Inactive</span>'}
                ${category.isFeatured ? '<span class="badge featured-badge ms-1">Featured</span>' : ''}
                ${category.productCount > 0 ?
                    `<span class="badge bg-info ms-1">${category.productCount} products</span>` : ''}
            </div>
            <div class="btn-group btn-group-sm category-actions">
                <button class="btn btn-outline-primary" onclick="editCategory('${category._id}')" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-${category.isActive ? 'warning' : 'success'}"
                        onclick="toggleCategoryStatus('${category._id}')"
                        title="${category.isActive ? 'Deactivate' : 'Activate'}">
                    <i class="bi bi-${category.isActive ? 'pause' : 'play'}-circle"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="deleteCategory('${category._id}')" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
        ${category.description ? `<div class="text-muted small mt-2">${escapeHtml(category.description)}</div>` : ''}
    `;

    li.appendChild(itemDiv);

    if (hasChildren) {
        const subList = document.createElement('ul');
        subList.className = 'subcategories';
        children.forEach(child => {
            subList.appendChild(renderCategoryTreeItem(child, allCategories));
        });
        li.appendChild(subList);
    }

    return li;
}

/**
 * Render list view
 */
function renderListView(container) {
    const filteredCategories = getFilteredCategories();

    if (filteredCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-folder-x"></i><p>No categories found</p></div>';
        return;
    }

    const table = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Level</th>
                        <th>Status</th>
                        <th>Products</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredCategories.map(category => `
                        <tr>
                            <td>
                                ${category.icon ? `${category.icon} ` : ''}
                                <strong>${escapeHtml(category.name)}</strong>
                                ${category.isFeatured ? '<i class="bi bi-star-fill text-warning ms-1"></i>' : ''}
                            </td>
                            <td><code>${escapeHtml(category.slug)}</code></td>
                            <td><span class="badge bg-secondary level-badge">Level ${category.level}</span></td>
                            <td>
                                ${category.isActive ?
                                    '<span class="badge status-active">Active</span>' :
                                    '<span class="badge status-inactive">Inactive</span>'}
                            </td>
                            <td>${category.productCount || 0}</td>
                            <td>${window.utils.formatDate(category.createdAt)}</td>
                            <td>
                                <div class="btn-group btn-group-sm category-actions">
                                    <button class="btn btn-outline-primary" onclick="editCategory('${category._id}')">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-${category.isActive ? 'warning' : 'success'}"
                                            onclick="toggleCategoryStatus('${category._id}')">
                                        <i class="bi bi-${category.isActive ? 'pause' : 'play'}-circle"></i>
                                    </button>
                                    <button class="btn btn-outline-danger" onclick="deleteCategory('${category._id}')">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = table;
}

/**
 * Get filtered categories
 */
function getFilteredCategories() {
    let filtered = [...categories];

    // Search filter
    if (searchInput) {
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchTerm) ||
                c.slug.toLowerCase().includes(searchTerm) ||
                (c.description && c.description.toLowerCase().includes(searchTerm))
            );
        }
    }

    // Status filter
    if (statusFilter) {
        const status = statusFilter.value;
        if (status === 'active') {
            filtered = filtered.filter(c => c.isActive);
        } else if (status === 'inactive') {
            filtered = filtered.filter(c => !c.isActive);
        }
    }

    // Level filter
    if (levelFilter) {
        const level = levelFilter.value;
        if (level !== '') {
            filtered = filtered.filter(c => c.level === parseInt(level));
        }
    }

    return filtered;
}

/**
 * Filter categories
 */
function filterCategories() {
    renderCategories();
}

/**
 * Reset filters
 */
function resetFilters() {
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (levelFilter) levelFilter.value = '';
    filterCategories();
}

/**
 * Toggle children in tree view
 */
function toggleChildren(element) {
    const li = element.closest('li');
    const subList = li.querySelector('.subcategories');
    if (subList) {
        const isHidden = subList.style.display === 'none';
        subList.style.display = isHidden ? 'block' : 'none';
        element.querySelector('i').className = isHidden ? 'bi bi-chevron-down' : 'bi bi-chevron-right';
    }
}

/**
 * Populate parent category dropdown
 */
function populateParentCategoryDropdown(excludeId = null) {
    const select = document.getElementById('parentCategory');
    if (!select) return;

    const currentLevel = excludeId ? categories.find(c => c._id === excludeId)?.level || 0 : 0;

    // Get categories that can be parents (level < 4 to allow 5 levels)
    const availableParents = categories.filter(c =>
        c._id !== excludeId &&
        c.level < APP_CONFIG.categories.maxLevels - 1 &&
        c.isActive
    );

    select.innerHTML = '<option value="">None (Root Category)</option>';

    availableParents.forEach(category => {
        const indent = '&nbsp;&nbsp;'.repeat(category.level);
        const option = document.createElement('option');
        option.value = category._id;
        option.innerHTML = `${indent}${category.icon ? category.icon + ' ' : ''}${escapeHtml(category.name)} (Level ${category.level})`;
        select.appendChild(option);
    });
}

/**
 * Open add category modal
 */
function openAddCategoryModal() {
    currentCategoryId = null;
    categoryImages = [];

    document.getElementById('categoryModalTitle').textContent = 'Add Category';

    if (categoryForm) categoryForm.reset();

    document.getElementById('imagesPreview').innerHTML = '';
    populateParentCategoryDropdown();

    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    modal.show();
}

/**
 * Edit category
 */
async function editCategory(categoryId) {
    currentCategoryId = categoryId;
    const category = categories.find(c => c._id === categoryId);

    if (!category) {
        window.adminPanel.showNotification('Category not found', 'error');
        return;
    }

    document.getElementById('categoryModalTitle').textContent = 'Edit Category';

    // Basic fields
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryIcon').value = category.icon || '';
    document.getElementById('displayOrder').value = category.displayOrder || 0;
    document.getElementById('isActive').checked = category.isActive;
    document.getElementById('isFeatured').checked = category.isFeatured;
    document.getElementById('showInMenu').checked = category.showInMenu;

    // SEO fields
    document.getElementById('metaTitle').value = category.seo?.metaTitle || '';
    document.getElementById('metaDescription').value = category.seo?.metaDescription || '';
    document.getElementById('metaKeywords').value = category.seo?.metaKeywords?.join(', ') || '';

    // Images
    categoryImages = category.images || [];
    renderImagePreview();

    // Parent category
    populateParentCategoryDropdown(categoryId);
    document.getElementById('parentCategory').value = category.parentCategory || '';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    modal.show();
}

/**
 * Add image
 */
function addImage() {
    const url = document.getElementById('imageUrl').value.trim();
    const altText = document.getElementById('imageAltText').value.trim();

    if (!url) {
        window.adminPanel.showNotification('Please enter image URL', 'error');
        return;
    }

    categoryImages.push({
        url: url,
        altText: altText,
        isPrimary: categoryImages.length === 0
    });

    document.getElementById('imageUrl').value = '';
    document.getElementById('imageAltText').value = '';
    renderImagePreview();
}

/**
 * Remove image
 */
function removeImage(index) {
    const wasPrimary = categoryImages[index].isPrimary;
    categoryImages.splice(index, 1);

    // If removed image was primary, make first image primary
    if (wasPrimary && categoryImages.length > 0) {
        categoryImages[0].isPrimary = true;
    }

    renderImagePreview();
}

/**
 * Set primary image
 */
function setPrimaryImage(index) {
    categoryImages.forEach((img, i) => {
        img.isPrimary = i === index;
    });
    renderImagePreview();
}

/**
 * Render image preview
 */
function renderImagePreview() {
    const container = document.getElementById('imagesPreview');
    if (!container) return;

    if (categoryImages.length === 0) {
        container.innerHTML = '<p class="text-muted small">No images added yet</p>';
        return;
    }

    container.innerHTML = categoryImages.map((img, index) => `
        <div class="image-preview-item ${img.isPrimary ? 'primary' : ''}">
            <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.altText || 'Category image')}"
                 onerror="this.src='https://via.placeholder.com/100?text=Error'">
            <button class="remove-image" onclick="removeImage(${index})" type="button">×</button>
            ${!img.isPrimary ?
                `<button class="set-primary" onclick="setPrimaryImage(${index})" type="button">Set Primary</button>` :
                '<span class="set-primary" style="background: rgba(40, 167, 69, 0.9);">Primary</span>'}
        </div>
    `).join('');
}

/**
 * Save category
 */
async function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();

    if (!name) {
        window.adminPanel.showNotification('Category name is required', 'error');
        return;
    }

    const keywords = document.getElementById('metaKeywords').value
        .split(',')
        .map(k => k.trim())
        .filter(k => k);

    const categoryData = {
        name: name,
        description: document.getElementById('categoryDescription').value.trim(),
        icon: document.getElementById('categoryIcon').value.trim(),
        parentCategory: document.getElementById('parentCategory').value || null,
        images: categoryImages,
        displayOrder: parseInt(document.getElementById('displayOrder').value) || 0,
        isActive: document.getElementById('isActive').checked,
        isFeatured: document.getElementById('isFeatured').checked,
        showInMenu: document.getElementById('showInMenu').checked,
        seo: {
            metaTitle: document.getElementById('metaTitle').value.trim(),
            metaDescription: document.getElementById('metaDescription').value.trim(),
            metaKeywords: keywords
        }
    };

    try {
        showLoading(true);

        if (currentCategoryId) {
            // Update
            await API.put(
                API_CONFIG.endpoints.categories.update,
                categoryData,
                { id: currentCategoryId }
            );
            window.adminPanel.showNotification('Category updated successfully', 'success');
        } else {
            // Create
            await API.post(
                API_CONFIG.endpoints.categories.create,
                categoryData
            );
            window.adminPanel.showNotification('Category created successfully', 'success');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
        modal.hide();

        // Reload categories
        await loadCategories();

    } catch (error) {
        console.error('Error saving category:', error);
        window.adminPanel.showNotification(error.message || 'Failed to save category', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Toggle category status
 */
async function toggleCategoryStatus(categoryId) {
    try {
        showLoading(true);

        await API.put(
            API_CONFIG.endpoints.categories.toggleStatus,
            {},
            { id: categoryId }
        );

        window.adminPanel.showNotification('Category status updated', 'success');
        await loadCategories();

    } catch (error) {
        console.error('Error toggling category status:', error);
        window.adminPanel.showNotification('Failed to update category status', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Delete category
 */
async function deleteCategory(categoryId) {
    const category = categories.find(c => c._id === categoryId);
    if (!category) return;

    const hasChildren = categories.some(c => c.parentCategory === categoryId);

    let message = `Are you sure you want to delete "${category.name}"?`;
    if (hasChildren) {
        message += '\n\nThis category has subcategories. They will also be deleted.';
    }
    if (category.productCount > 0) {
        message += `\n\nThis category has ${category.productCount} products. You may need to reassign them.`;
    }

    const confirmed = await window.adminPanel.confirmAction(message);
    if (!confirmed) return;

    try {
        showLoading(true);

        await API.delete(
            API_CONFIG.endpoints.categories.delete,
            { id: categoryId },
            { force: true }
        );

        window.adminPanel.showNotification('Category deleted successfully', 'success');
        await loadCategories();

    } catch (error) {
        console.error('Error deleting category:', error);
        window.adminPanel.showNotification(error.message || 'Failed to delete category', 'error');
    } finally {
        showLoading(false);
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
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
        }
    } else {
        if (overlay) {
            overlay.remove();
        }
    }
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

// Make functions available globally for onclick handlers
window.openAddCategoryModal = openAddCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.toggleCategoryStatus = toggleCategoryStatus;
window.toggleChildren = toggleChildren;
window.resetFilters = resetFilters;
window.addImage = addImage;
window.removeImage = removeImage;
window.setPrimaryImage = setPrimaryImage;
window.saveCategory = saveCategory;
