// Simple safe utils if window.utils is not present
window.utils = window.utils || {};
window.utils.debounce = window.utils.debounce || function (fn, delay) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), delay);
  };
};
window.utils.formatDate = window.utils.formatDate || function (d) {
  try { return new Date(d).toLocaleString(); } catch (e) { return ''; }
};

// adminPanel fallback for notifications and confirm
window.adminPanel = window.adminPanel || {
  showNotification: function (msg, type = 'info') {
    if (type === 'error') console.error(msg);
    else if (type === 'success') console.log('Success:', msg);
    else console.log(msg);
    alert(msg);
  },
  confirmAction: function (message) {
    return Promise.resolve(confirm(message));
  }
};

/* ---------- State ---------- */

let categories = [];
let currentCategoryId = null;
let categoryImages = [];

/* DOM elements (will be init on DOMContentLoaded) */
let searchInput, statusFilter, levelFilter, viewModeSelect;
let categoriesContainer;
let categoryForm;

/* Stats elements */
let totalCategoriesCount, activeCategoriesCount, featuredCategoriesCount, rootCategoriesCount;

/* ---------- Initialization ---------- */

document.addEventListener('DOMContentLoaded', function () {
  initializeDOMElements();
  setupEventListeners();
  loadCategories();
});

/* ---------- DOM init ---------- */

function initializeDOMElements() {
  searchInput = document.getElementById('searchInput');
  statusFilter = document.getElementById('statusFilter');
  levelFilter = document.getElementById('levelFilter');
  viewModeSelect = document.getElementById('viewMode');

  categoriesContainer = document.getElementById('categoriesContainer');

  categoryForm = document.getElementById('categoryForm');

  totalCategoriesCount = document.getElementById('totalCategoriesCount');
  activeCategoriesCount = document.getElementById('activeCategoriesCount');
  featuredCategoriesCount = document.getElementById('featuredCategoriesCount');
  rootCategoriesCount = document.getElementById('rootCategoriesCount');
}

/* ---------- Events ---------- */

function setupEventListeners() {
  if (searchInput) searchInput.addEventListener('input', window.utils.debounce(filterCategories, 300));
  if (statusFilter) statusFilter.addEventListener('change', filterCategories);
  if (levelFilter) levelFilter.addEventListener('change', filterCategories);
  if (viewModeSelect) viewModeSelect.addEventListener('change', renderCategories);

  // Form submit if exists
  if (categoryForm) {
    categoryForm.addEventListener('submit', function (e) {
      e.preventDefault();
      saveCategory();
    });
  }
}

/* ---------- Load ---------- */

async function loadCategories() {
  try {
    showLoading(true);
    
    // Use the correct endpoint from API_CONFIG
    const response = await API.get(API_CONFIG.endpoints.categories.getAll);
    
    // Handle response structure
    let categoriesData = [];
    
    if (response && response.success !== false) {
      // If response has data property with array
      if (response.data && Array.isArray(response.data)) {
        categoriesData = response.data;
      } 
      // If response is directly the array (fallback)
      else if (Array.isArray(response)) {
        categoriesData = response;
      }
    }

    categories = categoriesData.map(c => ({
      _id: c._id || c.id || '',
      categoryId: c.categoryId || '',
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      level: c.level || 0, // Will be calculated based on parent
      parentCategory: c.parentCategoryId || null,
      parentCategoryId: c.parentCategoryId || null,
      isActive: c.isActive !== undefined ? c.isActive : true,
      isFeatured: false, // Not in your API response
      showInMenu: true, // Not in your API response
      productCount: 0, // Not in your API response
      displayOrder: Number(c.displayOrder || 0),
      icon: '', // Not in your API response
      images: [], // Not in your API response
      seo: c.meta || {},
      subCategories: c.subCategories || [],
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString()
    }));

    // Calculate levels based on parent relationships
    calculateCategoryLevels();

    updateStats();
    renderCategories();
    populateParentCategoryDropdown();
  } catch (error) {
    console.error('Error loading categories:', error);
    window.adminPanel.showNotification('Failed to load categories: ' + (error.message || error), 'error');
  } finally {
    showLoading(false);
  }
}

// Calculate category levels based on parent relationships
function calculateCategoryLevels() {
  const categoryMap = new Map();
  categories.forEach(cat => {
    categoryMap.set(cat._id, cat);
  });

  categories.forEach(cat => {
    let level = 0;
    let current = cat;
    
    // Traverse up the parent chain to calculate level
    while (current.parentCategoryId) {
      const parent = categoryMap.get(current.parentCategoryId);
      if (!parent) break;
      level++;
      current = parent;
    }
    
    cat.level = level;
  });
}

/* ---------- Get Featured Categories ---------- */

function getFeaturedCategories() {
  return categories.filter(c => c.isFeatured && c.isActive);
}

async function fetchFeaturedCategoriesFromAPI() {
  try {
    const response = await API.get(API_CONFIG.endpoints.categories.getFeatured);
    let featured = [];
    
    if (response && response.data && Array.isArray(response.data)) {
      featured = response.data;
    } else if (Array.isArray(response)) {
      featured = response;
    }
    
    return featured;
  } catch (error) {
    console.error('Error fetching featured categories:', error);
    return [];
  }
}

/* ---------- Stats & Filters ---------- */

function updateStats() {
  const total = categories.length;
  const active = categories.filter(c => c.isActive).length;
  const featured = categories.filter(c => c.isFeatured && c.isActive).length;
  const root = categories.filter(c => !c.parentCategoryId).length;

  if (totalCategoriesCount) totalCategoriesCount.textContent = total;
  if (activeCategoriesCount) activeCategoriesCount.textContent = active;
  if (featuredCategoriesCount) featuredCategoriesCount.textContent = featured;
  if (rootCategoriesCount) rootCategoriesCount.textContent = root;
}

function getFilteredCategories() {
  let filtered = categories.slice();

  // search
  if (searchInput && searchInput.value.trim()) {
    const q = searchInput.value.trim().toLowerCase();
    filtered = filtered.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.slug && c.slug.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }

  // status
  if (statusFilter && statusFilter.value) {
    if (statusFilter.value === 'active') filtered = filtered.filter(c => c.isActive);
    else if (statusFilter.value === 'inactive') filtered = filtered.filter(c => !c.isActive);
  }

  // level
  if (levelFilter && levelFilter.value !== '') {
    const lv = parseInt(levelFilter.value, 10);
    if (!isNaN(lv)) filtered = filtered.filter(c => Number(c.level) === lv);
  }

  // sort by displayOrder then name
  filtered.sort((a, b) => {
    if ((a.displayOrder || 0) !== (b.displayOrder || 0)) return (a.displayOrder || 0) - (b.displayOrder || 0);
    return (a.name || '').localeCompare(b.name || '');
  });

  return filtered;
}

function filterCategories() {
  renderCategories();
}

/* ---------- Render ---------- */

function renderCategories() {
  if (!categoriesContainer) return;

  const viewMode = viewModeSelect ? viewModeSelect.value : 'tree';
  if (viewMode === 'list') renderListView(categoriesContainer);
  else renderTreeView(categoriesContainer);
}

/* Tree view */

function renderTreeView(container) {
  const filtered = getFilteredCategories();
  const roots = filtered.filter(c => !c.parentCategoryId);

  if (roots.length === 0) {
    container.innerHTML = '<div class="empty-state text-center py-5"><i class="bi bi-folder-x fs-2"></i><p class="mt-2">No categories found</p></div>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'category-tree list-unstyled p-0';

  roots.forEach(root => {
    ul.appendChild(renderCategoryTreeItem(root, filtered));
  });

  container.innerHTML = '';
  container.appendChild(ul);
}

function renderCategoryTreeItem(category, allCategories) {
  const li = document.createElement('li');
  const children = allCategories.filter(c => c.parentCategoryId === category._id);
  const hasChildren = children.length > 0;

  const itemDiv = document.createElement('div');
  itemDiv.className = `category-item d-flex justify-content-between align-items-start py-2 px-2 level-${category.level}`;

  const left = document.createElement('div');
  left.className = 'd-flex align-items-start flex-grow-1';

  // toggle icon
  if (hasChildren) {
    const toggle = document.createElement('button');
    toggle.className = 'btn btn-sm btn-link p-0 me-2 toggle-children';
    toggle.setAttribute('type', 'button');
    toggle.onclick = function () {
      const sub = li.querySelector('.subcategories');
      if (!sub) return;
      const isHidden = sub.style.display === 'none';
      sub.style.display = isHidden ? 'block' : 'none';
      toggle.innerHTML = isHidden ? `<i class="bi bi-chevron-down"></i>` : `<i class="bi bi-chevron-right"></i>`;
    };
    toggle.innerHTML = '<i class="bi bi-chevron-down"></i>';
    left.appendChild(toggle);
  } else {
    const spacer = document.createElement('span');
    spacer.className = 'me-3';
    spacer.style.width = '1.4rem';
    left.appendChild(spacer);
  }

  // icon / name
  const iconSpan = document.createElement('span');
  iconSpan.className = 'me-2';
  iconSpan.innerHTML = category.icon ? escapeHtml(category.icon) : `<i class="bi bi-folder"></i>`;
  left.appendChild(iconSpan);

  const titleWrap = document.createElement('div');
  titleWrap.innerHTML = `<strong>${escapeHtml(category.name)}</strong>
    <div class="small text-muted">${escapeHtml(category.description || '')}</div>
    <div class="small"><code>${escapeHtml(category.categoryId)}</code></div>`;
  left.appendChild(titleWrap);

  // badges
  const badges = document.createElement('div');
  badges.className = 'ms-3';
  badges.innerHTML = `
    <span class="badge bg-secondary me-1">Level ${category.level}</span>
    ${category.isActive ? '<span class="badge bg-success me-1">Active</span>' : '<span class="badge bg-warning me-1">Inactive</span>'}
    ${category.isFeatured ? '<span class="badge bg-info me-1">Featured</span>' : ''}
    ${category.productCount ? `<span class="badge bg-primary">${category.productCount} products</span>` : ''}
  `;
  left.appendChild(badges);

  itemDiv.appendChild(left);

  // actions
  const actions = document.createElement('div');
  actions.className = 'btn-group btn-group-sm';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-outline-primary';
  editBtn.title = 'Edit';
  editBtn.onclick = () => editCategory(category._id);
  editBtn.innerHTML = '<i class="bi bi-pencil"></i>';

  const featuredBtn = document.createElement('button');
  featuredBtn.className = `btn btn-outline-${category.isFeatured ? 'info' : 'secondary'}`;
  featuredBtn.title = category.isFeatured ? 'Unfeature' : 'Feature';
  featuredBtn.onclick = () => toggleCategoryFeatured(category._id);
  featuredBtn.innerHTML = `<i class="bi bi-${category.isFeatured ? 'star-fill' : 'star'}"></i>`;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = `btn btn-outline-${category.isActive ? 'warning' : 'success'}`;
  toggleBtn.title = category.isActive ? 'Deactivate' : 'Activate';
  toggleBtn.onclick = () => toggleCategoryStatus(category._id);
  toggleBtn.innerHTML = `<i class="bi bi-${category.isActive ? 'pause' : 'play'}-circle"></i>`;

  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-outline-danger';
  delBtn.title = 'Delete';
  delBtn.onclick = () => deleteCategory(category._id);
  delBtn.innerHTML = '<i class="bi bi-trash"></i>';

  actions.appendChild(editBtn);
  actions.appendChild(featuredBtn);
  actions.appendChild(toggleBtn);
  actions.appendChild(delBtn);

  itemDiv.appendChild(actions);

  li.appendChild(itemDiv);

  if (hasChildren) {
    const subUl = document.createElement('ul');
    subUl.className = 'subcategories list-unstyled ms-4';
    children.forEach(child => {
      subUl.appendChild(renderCategoryTreeItem(child, allCategories));
    });
    li.appendChild(subUl);
  }

  return li;
}

/* List view */

function renderListView(container) {
  const filtered = getFilteredCategories();
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state text-center py-5"><i class="bi bi-folder-x fs-2"></i><p class="mt-2">No categories found</p></div>';
    return;
  }

  const rows = filtered.map(category => `
    <tr>
      <td>
        ${category.icon ? escapeHtml(category.icon) + ' ' : ''}
        <strong>${escapeHtml(category.name)}</strong>
        ${category.isFeatured ? '<i class="bi bi-star-fill text-warning ms-1"></i>' : ''}
      </td>
      <td><code>${escapeHtml(category.slug)}</code></td>
      <td><span class="badge bg-secondary">Level ${category.level}</span></td>
      <td>${category.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-warning">Inactive</span>'}</td>
      <td>${category.productCount || 0}</td>
      <td>${window.utils.formatDate(category.createdAt)}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="editCategory('${category._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-${category.isFeatured ? 'info' : 'secondary'}" onclick="toggleCategoryFeatured('${category._id}')">
            <i class="bi bi-${category.isFeatured ? 'star-fill' : 'star'}"></i>
          </button>
          <button class="btn btn-outline-${category.isActive ? 'warning' : 'success'}" onclick="toggleCategoryStatus('${category._id}')">
            <i class="bi bi-${category.isActive ? 'pause' : 'play'}-circle"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteCategory('${category._id}')"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Name</th><th>Slug</th><th>Level</th><th>Status</th><th>Products</th><th>Created</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ---------- Parent dropdown ---------- */

function populateParentCategoryDropdown(excludeId = null) {
  const select = document.getElementById('parentCategory');
  if (!select) return;

  const availableParents = categories.filter(c =>
    c._id !== excludeId &&
    c.level < (APP_CONFIG?.categories?.maxLevels || 5) - 1 &&
    c.isActive
  );

  select.innerHTML = '<option value="">None (Root Category)</option>';

  availableParents.forEach(category => {
    const indent = '\u00A0\u00A0'.repeat(Math.max(0, category.level || 0));
    const opt = document.createElement('option');
    opt.value = category._id;
    opt.innerHTML = `${indent}${escapeHtml(category.name)} (Level ${category.level})`;
    select.appendChild(opt);
  });
}

/* ---------- Modal / CRUD ---------- */

function openAddCategoryModal() {
  currentCategoryId = null;
  categoryImages = [];
  document.getElementById('categoryModalTitle').textContent = 'Add Category';
  if (categoryForm) categoryForm.reset();
  const imagesPreview = document.getElementById('imagesPreview');
  if (imagesPreview) imagesPreview.innerHTML = '';
  populateParentCategoryDropdown();
  const modalEl = document.getElementById('categoryModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

async function editCategory(categoryId) {
  currentCategoryId = categoryId;
  const category = categories.find(c => c._id === categoryId);
  if (!category) {
    window.adminPanel.showNotification('Category not found', 'error');
    return;
  }

  document.getElementById('categoryModalTitle').textContent = 'Edit Category';

  document.getElementById('categoryName').value = category.name || '';
  document.getElementById('categoryDescription').value = category.description || '';
  document.getElementById('categoryIcon').value = category.icon || '';
  document.getElementById('displayOrder').value = category.displayOrder || 0;
  document.getElementById('isActive').checked = !!category.isActive;
  document.getElementById('isFeatured').checked = !!category.isFeatured;
  document.getElementById('showInMenu').checked = !!category.showInMenu;

  // SEO fields from meta object
  document.getElementById('metaTitle').value = (category.seo && category.seo.title) ? category.seo.title : '';
  document.getElementById('metaDescription').value = (category.seo && category.seo.description) ? category.seo.description : '';
  document.getElementById('metaKeywords').value = (category.seo && Array.isArray(category.seo.keywords)) ? category.seo.keywords.join(', ') : '';

  categoryImages = Array.isArray(category.images) ? JSON.parse(JSON.stringify(category.images)) : [];
  renderImagePreview();

  populateParentCategoryDropdown(categoryId);
  document.getElementById('parentCategory').value = category.parentCategoryId || '';

  const modalEl = document.getElementById('categoryModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

function addImage() {
  const urlEl = document.getElementById('imageUrl');
  const altEl = document.getElementById('imageAltText');
  if (!urlEl) return;
  const url = urlEl.value.trim();
  const alt = altEl ? altEl.value.trim() : '';
  if (!url) {
    window.adminPanel.showNotification('Please enter image URL', 'error');
    return;
  }
  categoryImages.push({ url, altText: alt, isPrimary: categoryImages.length === 0 });
  urlEl.value = '';
  if (altEl) altEl.value = '';
  renderImagePreview();
}

function removeImage(index) {
  if (index < 0 || index >= categoryImages.length) return;
  const wasPrimary = categoryImages[index].isPrimary;
  categoryImages.splice(index, 1);
  if (wasPrimary && categoryImages.length > 0) categoryImages[0].isPrimary = true;
  renderImagePreview();
}

function setPrimaryImage(index) {
  categoryImages.forEach((img, i) => img.isPrimary = i === index);
  renderImagePreview();
}

function renderImagePreview() {
  const container = document.getElementById('imagesPreview');
  if (!container) return;
  if (!categoryImages || categoryImages.length === 0) {
    container.innerHTML = '<p class="text-muted small">No images added yet</p>';
    return;
  }
  container.innerHTML = categoryImages.map((img, i) => `
    <div class="image-preview-item d-inline-block me-2 position-relative" style="width:100px;">
      <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.altText || 'Category image')}" onerror="this.src='https://via.placeholder.com/100?text=Error'" class="img-fluid rounded">
      <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" onclick="removeImage(${i})">×</button>
      <div class="mt-1 text-center">
        ${img.isPrimary ? '<span class="badge bg-success">Primary</span>' : `<button class="btn btn-sm btn-outline-secondary" onclick="setPrimaryImage(${i})">Set Primary</button>`}
      </div>
    </div>
  `).join('');
}

async function saveCategory() {
  const name = (document.getElementById('categoryName')?.value || '').trim();
  if (!name) {
    window.adminPanel.showNotification('Category name is required', 'error');
    return;
  }

  const keywords = (document.getElementById('metaKeywords')?.value || '')
    .split(',')
    .map(k => k.trim())
    .filter(k => k);

  const payload = {
    name,
    description: (document.getElementById('categoryDescription')?.value || '').trim(),
    parentCategoryId: document.getElementById('parentCategory')?.value || null,
    displayOrder: Number(document.getElementById('displayOrder')?.value || 0),
    isActive: !!document.getElementById('isActive')?.checked,
    isFeatured: !!document.getElementById('isFeatured')?.checked,
    showInMenu: !!document.getElementById('showInMenu')?.checked,
    meta: {
      title: (document.getElementById('metaTitle')?.value || '').trim(),
      description: (document.getElementById('metaDescription')?.value || '').trim(),
      keywords: keywords
    }
  };

  // Add optional fields if they exist
  const icon = (document.getElementById('categoryIcon')?.value || '').trim();
  if (icon) payload.icon = icon;

  if (categoryImages.length > 0) {
    payload.images = categoryImages;
  }

  try {
    showLoading(true);
    if (currentCategoryId) {
      await API.put(API_CONFIG.endpoints.categories.update, payload, { categoryId: currentCategoryId });
      window.adminPanel.showNotification('Category updated successfully', 'success');
    } else {
      await API.post(API_CONFIG.endpoints.categories.create, payload);
      window.adminPanel.showNotification('Category created successfully', 'success');
    }
    // close modal
    const modalEl = document.getElementById('categoryModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    await loadCategories();
  } catch (err) {
    console.error('Save category error:', err);
    window.adminPanel.showNotification(err.message || 'Failed to save category', 'error');
  } finally {
    showLoading(false);
  }
}

async function toggleCategoryStatus(categoryId) {
  try {
    showLoading(true);
    const category = categories.find(c => c._id === categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const payload = {
      isActive: !category.isActive
    };

    await API.put(API_CONFIG.endpoints.categories.update, payload, { categoryId: categoryId });
    window.adminPanel.showNotification(`Category ${payload.isActive ? 'activated' : 'deactivated'} successfully`, 'success');
    await loadCategories();
  } catch (err) {
    console.error('Toggle status error:', err);
    window.adminPanel.showNotification('Failed to update category status', 'error');
  } finally {
    showLoading(false);
  }
}

async function toggleCategoryFeatured(categoryId) {
  try {
    showLoading(true);
    const category = categories.find(c => c._id === categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const payload = {
      isFeatured: !category.isFeatured
    };

    await API.put(API_CONFIG.endpoints.categories.update, payload, { categoryId: categoryId });
    window.adminPanel.showNotification(`Category ${payload.isFeatured ? 'featured' : 'unfeatured'} successfully`, 'success');
    await loadCategories();
  } catch (err) {
    console.error('Toggle featured error:', err);
    window.adminPanel.showNotification('Failed to update category featured status', 'error');
  } finally {
    showLoading(false);
  }
}

async function deleteCategory(categoryId) {
  const cat = categories.find(c => c._id === categoryId);
  if (!cat) {
    window.adminPanel.showNotification('Category not found', 'error');
    return;
  }

  const hasChildren = categories.some(c => c.parentCategoryId === categoryId);

  let message = `Are you sure you want to delete "${cat.name}"?`;
  if (hasChildren) message += '\n\nThis category has subcategories. They will also be deleted.';
  if (cat.productCount > 0) message += `\n\nThis category has ${cat.productCount} products. You may need to reassign them.`;

  const confirmed = await window.adminPanel.confirmAction(message);
  if (!confirmed) return;

  try {
    showLoading(true);
    await API.delete(API_CONFIG.endpoints.categories.delete, { categoryId: categoryId });
    window.adminPanel.showNotification('Category deleted successfully', 'success');
    await loadCategories();
  } catch (err) {
    console.error('Delete category error:', err);
    window.adminPanel.showNotification(err.message || 'Failed to delete category', 'error');
  } finally {
    showLoading(false);
  }
}

/* ---------- Loading overlay ---------- */

function showLoading(show) {
  let overlay = document.getElementById('loadingOverlay');
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(255,255,255,0.6)';
      overlay.style.zIndex = '9999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';
      document.body.appendChild(overlay);
    }
  } else {
    if (overlay) overlay.remove();
  }
}

/* ---------- Helpers ---------- */

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/* ---------- Expose to global (used by inline HTML) ---------- */

window.openAddCategoryModal = openAddCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.toggleCategoryStatus = toggleCategoryStatus;
window.toggleCategoryFeatured = toggleCategoryFeatured;
window.toggleChildren = function (el) {
  if (!el) return;
  const li = el.closest('li');
  if (!li) return;
  const sub = li.querySelector('.subcategories');
  if (!sub) return;
  const isHidden = sub.style.display === 'none';
  sub.style.display = isHidden ? 'block' : 'none';
  const icon = el.querySelector('i');
  if (icon) icon.className = isHidden ? 'bi bi-chevron-down' : 'bi bi-chevron-right';
};
window.resetFilters = function () {
  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = '';
  if (levelFilter) levelFilter.value = '';
  filterCategories();
};
window.addImage = addImage;
window.removeImage = removeImage;
window.setPrimaryImage = setPrimaryImage;
window.saveCategory = saveCategory;
window.getFeaturedCategories = getFeaturedCategories;
window.fetchFeaturedCategoriesFromAPI = fetchFeaturedCategoriesFromAPI;