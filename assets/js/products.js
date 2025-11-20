// Products Management Controller

/* ---------- Helper Functions ---------- */

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function showNotification(message, type = 'info') {
    const alertClass = type === 'error' ? 'alert-danger' : (type === 'success' ? 'alert-success' : 'alert-info');
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass} alert-dismissible fade show`;
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.insertBefore(alert, document.body.firstChild);
    setTimeout(() => alert.remove(), 5000);
}

/* ---------- State ---------- */

let products = [];
let currentProductId = null;
let variantCount = 0;

/* DOM elements */
let searchInput, statusFilter, variantsFilter;
let productsContainer;
let productForm;
let hasVariantsCheckbox, variantsSection, variantsList;

/* Stats elements */
let totalProductsCount, publishedCount, variantsCount, totalStockCount;

/* ---------- Initialization ---------- */

document.addEventListener('DOMContentLoaded', function () {
    initializeDOMElements();
    setupEventListeners();
    loadCategories();
    loadProducts();
});

/* ---------- DOM init ---------- */

function initializeDOMElements() {
    searchInput = document.getElementById('searchProducts');
    statusFilter = document.getElementById('filterStatus');
    variantsFilter = document.getElementById('filterVariants');

    productsContainer = document.getElementById('productsContainer');
    productForm = document.getElementById('productForm');

    totalProductsCount = document.getElementById('totalProducts');
    publishedCount = document.getElementById('publishedProducts');
    variantsCount = document.getElementById('variantsCount');
    totalStockCount = document.getElementById('totalStock');

    hasVariantsCheckbox = document.getElementById('hasVariants');
    variantsSection = document.getElementById('variantsSection');
    variantsList = document.getElementById('variantsList');

    if (hasVariantsCheckbox) {
        hasVariantsCheckbox.addEventListener('change', function () {
            if (this.checked) {
                variantsSection.classList.remove('d-none');
                variantsSection.style.display = 'block';
                if (variantsList.innerHTML === '') {
                    addVariantField();
                }
            } else {
                variantsSection.classList.add('d-none');
                variantsSection.style.display = 'none';
            }
        });
    }
}

/* ---------- Events ---------- */

function setupEventListeners() {
    if (searchInput) searchInput.addEventListener('input', window.utils.debounce(filterProducts, 300));
    if (statusFilter) statusFilter.addEventListener('change', filterProducts);
    if (variantsFilter) variantsFilter.addEventListener('change', filterProducts);

    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            currentProductId = null;
            productForm.reset();
            document.getElementById('productModalLabel').textContent = 'Add Product';
            const modal = new bootstrap.Modal(document.getElementById('productModal'));
            modal.show();
        });
    }

    const saveProductBtn = document.getElementById('saveProductBtn');
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', saveProduct);
    }

    const addVariantBtn = document.getElementById('addVariantBtn');
    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', addVariantField);
    }

    if (productForm) {
        productForm.addEventListener('submit', function (e) {
            e.preventDefault();
        });
    }

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            AUTH.removeToken();
            localStorage.removeItem('epi_admin_user');
            window.location.href = 'login.html';
        });
    }
}

/* ---------- Load Categories ---------- */

async function loadCategories() {
    try {
        const response = await API.get(API_CONFIG.endpoints.categories.dropdown, {}, {});
        const categorySelect = document.getElementById('productCategory');
        
        if (!categorySelect) return;
        
        let categories = [];
        if (response && response.success !== false) {
            if (response.data && Array.isArray(response.data)) {
                categories = response.data;
            } else if (Array.isArray(response)) {
                categories = response;
            }
        }

        categorySelect.innerHTML = '<option value="">Select Category</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat._id || cat.id;
            option.textContent = cat.name || cat.categoryName;
            categorySelect.appendChild(option);
        });
    } catch (err) {
        console.error('Load categories error:', err);
    }
}

/* ---------- Load Products ---------- */

async function loadProducts() {
    try {
        showLoading(true);
        
        const response = await API.get(API_CONFIG.endpoints.products.getAll, {}, { region: 'all' });
        
        let productsData = [];
        
        if (response && response.success !== false) {
            if (response.data && Array.isArray(response.data)) {
                productsData = response.data;
            } else if (Array.isArray(response)) {
                productsData = response;
            }
        }

        products = productsData.map(p => {
            // Normalize description - handle both string and object formats
            let descText = '';
            if (typeof p.description === 'string') {
                descText = p.description;
            } else if (p.description && typeof p.description === 'object') {
                descText = p.description.short || p.description.long || '';
            }
            
            return {
                _id: p._id || p.id || '',
                productId: p.productId || '',
                name: p.name || '',
                brand: p.brand || '',
                description: descText,
                category: p.category || { mainCategoryId: '', mainCategoryName: '', subCategoryId: '', subCategoryName: '' },
                sku: p.sku || '',
                pricing: p.pricing || { regularPrice: 0, salePrice: 0, currency: 'USD' },
                availability: p.availability || { stockQuantity: 0, lowStockLevel: 5 },
                images: Array.isArray(p.images) ? p.images : [],
                hasVariants: p.hasVariants || false,
                variants: Array.isArray(p.variants) ? p.variants : [],
                status: p.status || 'draft',
                createdAt: p.createdAt || new Date().toISOString(),
                updatedAt: p.updatedAt || new Date().toISOString()
            };
        });

        updateStats();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products: ' + (error.message || error), 'error');
    } finally {
        showLoading(false);
    }
}

/* ---------- Stats & Filters ---------- */

function updateStats() {
    const total = products.length;
    const published = products.filter(p => p.status === 'published').length;
    const withVariants = products.filter(p => p.hasVariants).length;
    const totalStock = products.reduce((sum, p) => {
        if (p.hasVariants && p.variants.length > 0) {
            return sum + p.variants.reduce((vsum, v) => vsum + (v.stock || 0), 0);
        }
        return sum + (p.availability?.stockQuantity || 0);
    }, 0);

    if (totalProductsCount) totalProductsCount.textContent = total;
    if (publishedCount) publishedCount.textContent = published;
    if (variantsCount) variantsCount.textContent = withVariants;
    if (totalStockCount) totalStockCount.textContent = totalStock;
}

function getFilteredProducts() {
    let filtered = products.slice();

    if (searchInput && searchInput.value.trim()) {
        const q = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(p =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q))
        );
    }

    if (statusFilter && statusFilter.value) {
        filtered = filtered.filter(p => p.status === statusFilter.value);
    }

    if (variantsFilter && variantsFilter.value !== '') {
        const hasVar = variantsFilter.value === 'true';
        filtered = filtered.filter(p => p.hasVariants === hasVar);
    }

    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return filtered;
}

function filterProducts() {
    renderProducts();
}

/* ---------- Render ---------- */

function renderProducts() {
    if (!productsContainer) return;

    const filtered = getFilteredProducts();
    if (filtered.length === 0) {
        productsContainer.innerHTML = '<div class="empty-state text-center py-5"><i class="bi bi-box-x fs-2"></i><p class="mt-2">No products found</p></div>';
        return;
    }

    const html = filtered.map(product => renderProductCard(product)).join('');
    productsContainer.innerHTML = html;
}

function renderProductCard(product) {
    const variantInfo = product.hasVariants && product.variants.length > 0 
        ? `<span class="badge bg-warning me-2">${product.variants.length} variants</span>` 
        : '';
    
    const stock = product.hasVariants && product.variants.length > 0
        ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : (product.availability?.stockQuantity || 0);

    return `
        <div class="card mb-3 product-card">
            <div class="card-body">
                <div class="row align-items-start">
                    <div class="col-md-8">
                        <h5>${escapeHtml(product.name)}</h5>
                        <div class="mb-2">
                            <span class="badge bg-secondary me-2">${escapeHtml(product.brand || 'N/A')}</span>
                            ${variantInfo}
                            <span class="badge ${product.status === 'published' ? 'bg-success' : 'bg-warning'}">${escapeHtml(product.status)}</span>
                        </div>
                        <p class="text-muted small mb-2">${escapeHtml((product.description || '').substring(0, 150))}${(product.description || '').length > 150 ? '...' : ''}</p>
                        <div class="small">
                            <strong>Category:</strong> ${escapeHtml(product.category.mainCategoryName || 'N/A')}
                            ${product.category.subCategoryName ? ` > ${escapeHtml(product.category.subCategoryName)}` : ''}
                        </div>
                        <div class="small">
                            <strong>SKU:</strong> ${escapeHtml(product.sku || product.productId || 'N/A')}
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">
                            <div class="h6 text-primary">$${((product.pricing?.salePrice || product.pricing?.regularPrice) || 0).toFixed(2)}</div>
                            <small class="text-muted">Stock: <strong>${stock}</strong></small>
                        </div>
                        <small class="d-block text-muted mb-3">${window.utils.formatDate(product.updatedAt)}</small>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="editProduct('${product._id}')" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="viewProductDetails('${product._id}')" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteProduct('${product._id}')" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* ---------- Modal / CRUD ---------- */

function openAddProductModal() {
    currentProductId = null;
    variantCount = 0;
    document.getElementById('productModalTitle').textContent = 'Add Product';
    if (productForm) productForm.reset();
    document.getElementById('hasVariants').checked = false;
    variantsSection.style.display = 'none';
    variantsList.innerHTML = '';
    const modalEl = document.getElementById('productModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

async function editProduct(productId) {
    // Verify product exists in loaded products
    const product = products.find(p => p._id === productId);
    if (!product) {
        alert('Product not found in list. Please refresh the page.');
        return;
    }

    currentProductId = productId;
    
    document.getElementById('productModalLabel').textContent = 'Edit Product';
    
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productBrand').value = product.brand || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productCategory').value = product.category?.mainCategoryId || '';
    document.getElementById('productSku').value = product.sku || '';
    document.getElementById('productPrice').value = product.pricing?.regularPrice || '';
    document.getElementById('productSalePrice').value = product.pricing?.salePrice || '';
    document.getElementById('productStock').value = product.availability?.stockQuantity || '';
    document.getElementById('productAvailability').value = product.availability?.status || 'in-stock';
    
    document.getElementById('hasVariants').checked = product.hasVariants || false;
    variantsSection.style.display = product.hasVariants ? 'block' : 'none';

    if (product.hasVariants && product.variants.length > 0) {
        variantsList.innerHTML = product.variants.map((v, idx) => renderVariantField(v, idx)).join('');
        variantCount = product.variants.length;
    } else {
        variantsList.innerHTML = '';
        variantCount = 0;
    }

    const statusRadio = document.querySelector(`input[name="status"][value="${product.status}"]`);
    if (statusRadio) statusRadio.checked = true;

    const modalEl = document.getElementById('productModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

function addVariantField() {
    variantCount++;
    const html = `
        <div class="variant-card" id="variant-${variantCount}">
            <div class="variant-header d-flex justify-content-between align-items-center">
                <span><strong>Variant ${variantCount}</strong></span>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeVariantField(${variantCount})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="row mb-2">
                <div class="col-md-6">
                    <label class="form-label">Color</label>
                    <input type="text" class="form-control form-control-sm" data-variant-color placeholder="e.g., Black" />
                </div>
                <div class="col-md-6">
                    <label class="form-label">Storage/Size</label>
                    <input type="text" class="form-control form-control-sm" data-variant-storage placeholder="e.g., 128GB" />
                </div>
            </div>
            <div class="row mb-2">
                <div class="col-md-3">
                    <label class="form-label">Price *</label>
                    <input type="number" class="form-control form-control-sm" data-variant-price step="0.01" min="0" required />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Sale Price</label>
                    <input type="number" class="form-control form-control-sm" data-variant-sale-price step="0.01" min="0" />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Stock</label>
                    <input type="number" class="form-control form-control-sm" data-variant-stock min="0" value="0" />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Image URL</label>
                    <input type="url" class="form-control form-control-sm" data-variant-image placeholder="Optional" />
                </div>
            </div>
        </div>
    `;
    variantsList.insertAdjacentHTML('beforeend', html);
}

function renderVariantField(variant, idx) {
    const color = variant.attributes?.color || '';
    const storage = variant.attributes?.storage || '';
    const imageUrl = variant.images?.[0]?.url || '';

    return `
        <div class="variant-card" id="variant-${idx}">
            <div class="variant-header d-flex justify-content-between align-items-center">
                <span><strong>Variant ${idx + 1}</strong></span>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeVariantField(${idx})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="row mb-2">
                <div class="col-md-6">
                    <label class="form-label">Color</label>
                    <input type="text" class="form-control form-control-sm" data-variant-color value="${escapeHtml(color)}" />
                </div>
                <div class="col-md-6">
                    <label class="form-label">Storage/Size</label>
                    <input type="text" class="form-control form-control-sm" data-variant-storage value="${escapeHtml(storage)}" />
                </div>
            </div>
            <div class="row mb-2">
                <div class="col-md-3">
                    <label class="form-label">Price *</label>
                    <input type="number" class="form-control form-control-sm" data-variant-price step="0.01" min="0" value="${variant.price || ''}" required />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Sale Price</label>
                    <input type="number" class="form-control form-control-sm" data-variant-sale-price step="0.01" min="0" value="${variant.salePrice || ''}" />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Stock</label>
                    <input type="number" class="form-control form-control-sm" data-variant-stock min="0" value="${variant.stock || '0'}" />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Image URL</label>
                    <input type="url" class="form-control form-control-sm" data-variant-image value="${escapeHtml(imageUrl)}" placeholder="Optional" />
                </div>
            </div>
        </div>
    `;
}

function removeVariantField(idx) {
    document.getElementById(`variant-${idx}`)?.remove();
}

async function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const brand = document.getElementById('productBrand').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const categoryId = document.getElementById('productCategory').value.trim();
    const sku = document.getElementById('productSku').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const salePrice = parseFloat(document.getElementById('productSalePrice').value) || 0;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const availability = document.getElementById('productAvailability').value;
    const status = document.querySelector('input[name="status"]:checked').value || 'draft';
    const hasVariants = document.getElementById('hasVariants').checked;

    if (!name) {
        alert('Product name is required');
        return;
    }
    if (!categoryId) {
        alert('Category is required');
        return;
    }
    if (price <= 0) {
        alert('Price must be greater than 0');
        return;
    }
    if (!description) {
        alert('Description is required');
        return;
    }

    // Get category name from selected option
    const categorySelect = document.getElementById('productCategory');
    const categoryName = categorySelect.options[categorySelect.selectedIndex].text;

    const payload = {
        name,
        brand,
        description: {
            short: description,
            long: description
        },
        category: {
            mainCategoryId: categoryId,
            mainCategoryName: categoryName,
            subCategoryId: null,
            subCategoryName: null
        },
        sku,
        pricing: {
            regularPrice: price,
            salePrice: salePrice > 0 ? salePrice : price,
            currency: 'USD'
        },
        availability: {
            stockQuantity: stock,
            lowStockLevel: 5,
            status: availability
        },
        status,
        hasVariants
    };

    if (hasVariants) {
        const variantCards = document.querySelectorAll('.variant-card');
        const variants = [];

        variantCards.forEach((card, idx) => {
            const colorInput = card.querySelector('[data-variant-color]');
            const storageInput = card.querySelector('[data-variant-storage]');
            const variantPrice = card.querySelector('[data-variant-price]');
            const variantSalePrice = card.querySelector('[data-variant-sale-price]');
            const variantStock = card.querySelector('[data-variant-stock]');
            const variantImage = card.querySelector('[data-variant-image]');

            const variant = {
                attributes: {
                    color: colorInput?.value?.trim() || '',
                    storage: storageInput?.value?.trim() || ''
                },
                price: parseFloat(variantPrice?.value) || 0,
                salePrice: parseFloat(variantSalePrice?.value) || 0,
                stock: parseInt(variantStock?.value) || 0,
                images: variantImage?.value?.trim() ? [{ url: variantImage.value.trim(), isPrimary: true }] : []
            };

            if (variant.price > 0) {
                variants.push(variant);
            }
        });

        if (variants.length === 0) {
            alert('Add at least one variant with valid price');
            return;
        }

        payload.variants = variants;
    }

    try {
        showLoading(true);
        if (currentProductId) {
            console.log('Updating product:', currentProductId);
            console.log('API endpoint:', API_CONFIG.endpoints.products.update);
            console.log('Payload:', payload);
            await API.put(API_CONFIG.endpoints.products.update, payload, { productId: currentProductId });
            alert('Product updated successfully');
        } else {
            console.log('Creating new product');
            console.log('API endpoint:', API_CONFIG.endpoints.products.create);
            console.log('Payload:', payload);
            await API.post(API_CONFIG.endpoints.products.create, payload);
            alert('Product created successfully');
        }
        
        const modalEl = document.getElementById('productModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        
        productForm.reset();
        currentProductId = null;
        await loadProducts();
    } catch (err) {
        console.error('Save product error:', err);
        console.error('Current Product ID:', currentProductId);
        alert('Error: ' + (err.message || 'Failed to save product'));
    } finally {
        showLoading(false);
    }
}

async function toggleProductStatus(productId) {
    try {
        showLoading(true);
        const product = products.find(p => p._id === productId);
        if (!product) throw new Error('Product not found');

        const newStatus = product.status === 'published' ? 'draft' : 'published';
        
        // Build full product payload with updated status
        const payload = {
            name: product.name,
            brand: product.brand,
            description: {
                short: product.description,
                long: product.description
            },
            category: {
                mainCategoryId: product.category?.mainCategoryId,
                mainCategoryName: product.category?.mainCategoryName,
                subCategoryId: product.category?.subCategoryId || null,
                subCategoryName: product.category?.subCategoryName || null
            },
            sku: product.sku,
            pricing: {
                regularPrice: product.pricing?.regularPrice,
                salePrice: product.pricing?.salePrice,
                currency: product.pricing?.currency || 'USD'
            },
            availability: {
                stockQuantity: product.availability?.stockQuantity,
                lowStockLevel: product.availability?.lowStockLevel || 5,
                status: product.availability?.status || 'in-stock'
            },
            status: newStatus,
            hasVariants: product.hasVariants,
            variants: product.variants || []
        };
        
        await API.put(API_CONFIG.endpoints.products.update, payload, { productId: productId });
        showNotification(`Product ${newStatus} successfully`, 'success');
        await loadProducts();
    } catch (err) {
        console.error('Toggle status error:', err);
        showNotification('Failed to update product status', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteProduct(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    const confirmed = confirm(`Delete "${product.name}"?`);
    if (!confirmed) return;

    try {
        showLoading(true);
        await API.delete(API_CONFIG.endpoints.products.delete, { productId: productId });
        showNotification('Product deleted successfully', 'success');
        await loadProducts();
    } catch (err) {
        console.error('Delete product error:', err);
        showNotification(err.message || 'Failed to delete product', 'error');
    } finally {
        showLoading(false);
    }
}

async function viewProductDetails(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    const stock = product.hasVariants && product.variants.length > 0
        ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : (product.availability?.stockQuantity || 0);

    let details = `<div class="container-fluid">`;
    
    // Header
    details += `<div class="mb-4 pb-3 border-bottom">`;
    details += `<h5>${escapeHtml(product.name)}</h5>`;
    details += `<div class="mb-2">`;
    details += `<span class="badge bg-secondary me-2">${escapeHtml(product.brand || 'N/A')}</span>`;
    details += `<span class="badge ${product.status === 'published' ? 'bg-success' : 'bg-warning'}">${escapeHtml(product.status)}</span>`;
    details += `</div>`;
    details += `</div>`;
    
    // Description
    if (product.description) {
        details += `<div class="mb-3">`;
        details += `<strong>Description:</strong>`;
        details += `<p>${escapeHtml(product.description)}</p>`;
        details += `</div>`;
    }
    
    // Category and SKU
    details += `<div class="row mb-3">`;
    details += `<div class="col-md-6">`;
    details += `<div><strong>Category:</strong> ${escapeHtml(product.category?.mainCategoryName || 'N/A')}`;
    if (product.category?.subCategoryName) {
        details += ` > ${escapeHtml(product.category.subCategoryName)}`;
    }
    details += `</div>`;
    details += `</div>`;
    details += `<div class="col-md-6">`;
    details += `<div><strong>SKU:</strong> ${escapeHtml(product.sku || product.productId || 'N/A')}</div>`;
    details += `</div>`;
    details += `</div>`;
    
    // Pricing and Stock
    details += `<div class="row mb-3 pb-3 border-bottom">`;
    details += `<div class="col-md-4">`;
    details += `<div><strong>Regular Price:</strong> $${((product.pricing?.regularPrice) || 0).toFixed(2)}</div>`;
    details += `</div>`;
    details += `<div class="col-md-4">`;
    details += `<div><strong>Sale Price:</strong> $${((product.pricing?.salePrice) || 0).toFixed(2)}</div>`;
    details += `</div>`;
    details += `<div class="col-md-4">`;
    details += `<div><strong>Total Stock:</strong> <span class="badge bg-info">${stock}</span></div>`;
    details += `</div>`;
    details += `</div>`;
    
    // Availability
    details += `<div class="mb-3 pb-3 border-bottom">`;
    details += `<strong>Availability:</strong>`;
    details += `<div>`;
    details += `<span class="badge ${product.availability?.available !== false ? 'bg-success' : 'bg-danger'}">`;
    details += product.availability?.available !== false ? 'Available' : 'Unavailable';
    details += `</span>`;
    details += `</div>`;
    details += `</div>`;
    
    // Variants (if applicable)
    if (product.hasVariants && product.variants.length > 0) {
        details += `<div class="mb-3">`;
        details += `<strong class="d-block mb-2">Variants (${product.variants.length})</strong>`;
        details += `<div class="table-responsive"><table class="table table-sm table-striped">`;
        details += `<thead><tr><th>Color</th><th>Storage</th><th>Price</th><th>Sale Price</th><th>Stock</th></tr></thead><tbody>`;
        
        product.variants.forEach((v, idx) => {
            const color = v.attributes?.color || 'N/A';
            const storage = v.attributes?.storage || 'N/A';
            details += `<tr>`;
            details += `<td>${escapeHtml(color)}</td>`;
            details += `<td>${escapeHtml(storage)}</td>`;
            details += `<td>$${(v.price || 0).toFixed(2)}</td>`;
            details += `<td>$${(v.salePrice || 0).toFixed(2)}</td>`;
            details += `<td>${v.stock || 0}</td>`;
            details += `</tr>`;
        });
        
        details += `</tbody></table></div>`;
        details += `</div>`;
    }
    
    details += `</div>`;

    const viewModal = document.getElementById('viewProductModal');
    if (viewModal) {
        document.getElementById('viewProductContent').innerHTML = details;
        new bootstrap.Modal(viewModal).show();
    }
}

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
    } else if (overlay) {
        overlay.remove();
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/* ---------- Expose to global ---------- */

window.openAddProductModal = openAddProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.toggleProductStatus = toggleProductStatus;
window.viewProductDetails = viewProductDetails;
window.addVariantField = addVariantField;
window.removeVariantField = removeVariantField;
window.saveProduct = saveProduct;
window.resetFilters = function () {
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (variantsFilter) variantsFilter.value = '';
    filterProducts();
};
