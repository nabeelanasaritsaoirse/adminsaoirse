/**
 * Featured Lists Management Controller
 * Handles all CRUD operations for featured lists and product management
 */

/* ========================================
 * HELPER FUNCTIONS
 * ======================================== */

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

function showNotification(message, type = "info") {
  const alertClass =
    type === "error"
      ? "alert-danger"
      : type === "success"
      ? "alert-success"
      : "alert-info";
  const alert = document.createElement("div");
  alert.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
  alert.style.zIndex = "9999";
  alert.setAttribute("role", "alert");
  alert.innerHTML = `
    ${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}

function showLoading(show = true) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    if (show) {
      overlay.classList.add("show");
    } else {
      overlay.classList.remove("show");
    }
  }
}

function debounce(func, wait = 300) {
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

/* ========================================
 * STATE MANAGEMENT
 * ======================================== */

let allLists = [];
let currentEditListId = null;
let currentDeleteTarget = null;
let selectedProduct = null;
let searchTimeout = null;

// Bootstrap modals
let listModal = null;
let addProductModal = null;
let deleteModal = null;

/* ========================================
 * INITIALIZATION
 * ======================================== */

document.addEventListener("DOMContentLoaded", function () {
  initializeModals();
  setupEventListeners();
  loadLists();
});

function initializeModals() {
  const listModalEl = document.getElementById("listModal");
  const addProductModalEl = document.getElementById("addProductModal");
  const deleteModalEl = document.getElementById("deleteModal");

  if (listModalEl) listModal = new bootstrap.Modal(listModalEl);
  if (addProductModalEl) addProductModal = new bootstrap.Modal(addProductModalEl);
  if (deleteModalEl) deleteModal = new bootstrap.Modal(deleteModalEl);
}

/* ========================================
 * EVENT LISTENERS
 * ======================================== */

function setupEventListeners() {
  // Create/Edit List
  const createListBtn = document.getElementById("createListBtn");
  const createFirstListBtn = document.getElementById("createFirstListBtn");
  const saveListBtn = document.getElementById("saveListBtn");

  if (createListBtn) createListBtn.addEventListener("click", openCreateListModal);
  if (createFirstListBtn) createFirstListBtn.addEventListener("click", openCreateListModal);
  if (saveListBtn) saveListBtn.addEventListener("click", saveList);

  // Auto-generate slug from name
  const listNameInput = document.getElementById("listName");
  if (listNameInput) {
    listNameInput.addEventListener("input", function () {
      const slugInput = document.getElementById("listSlug");
      if (slugInput && !currentEditListId) {
        slugInput.value = this.value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }
    });
  }

  // Search and Filter
  const searchInput = document.getElementById("searchLists");
  const filterStatus = document.getElementById("filterStatus");
  const refreshBtn = document.getElementById("refreshBtn");

  if (searchInput) searchInput.addEventListener("input", debounce(filterLists, 300));
  if (filterStatus) filterStatus.addEventListener("change", filterLists);
  if (refreshBtn) refreshBtn.addEventListener("click", loadLists);

  // Product Search
  const productSearchInput = document.getElementById("productSearchInput");
  if (productSearchInput) {
    productSearchInput.addEventListener("input", debounce(searchProducts, 500));
  }

  // Confirm Add Product
  const confirmAddProductBtn = document.getElementById("confirmAddProductBtn");
  if (confirmAddProductBtn) {
    confirmAddProductBtn.addEventListener("click", confirmAddProduct);
  }

  // Delete Confirmation
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", confirmDelete);
  }

  // Logout
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      AUTH.logout();
    });
  }
}

/* ========================================
 * LIST CRUD OPERATIONS
 * ======================================== */

async function loadLists() {
  try {
    showLoading(true);

    const response = await API.get(API_CONFIG.endpoints.featuredLists.getAll);

    if (response.success && response.data) {
      allLists = response.data;
      renderLists(allLists);
      updateStats();
    } else {
      showNotification("Failed to load lists", "error");
    }
  } catch (error) {
    console.error("Error loading lists:", error);
    showNotification("Error loading lists: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

function renderLists(lists) {
  const container = document.getElementById("listsContainer");
  const emptyState = document.getElementById("emptyState");

  if (!container) return;

  if (lists.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  container.innerHTML = lists
    .map((list) => {
      const products = list.products || [];
      const productCount = products.length;

      return `
        <div class="list-card" data-list-id="${escapeHtml(list.listId)}">
          <div class="list-card-header" onclick="toggleListCard('${escapeHtml(list.listId)}')">
            <div class="list-card-title">
              <i class="bi bi-star-fill"></i>
              ${escapeHtml(list.listName)}
              <span class="badge bg-light text-dark ms-2">${productCount} products</span>
            </div>
            <div>
              <span class="status-badge ${list.isActive ? "active" : "inactive"} me-2">
                ${list.isActive ? "Active" : "Inactive"}
              </span>
              <i class="bi bi-chevron-down list-card-toggle" id="toggle-${escapeHtml(list.listId)}"></i>
            </div>
          </div>

          <div class="list-card-body" id="body-${escapeHtml(list.listId)}">
            <!-- List Info -->
            <div class="list-info">
              <div class="list-info-row">
                <div class="list-info-item">
                  <span class="list-info-label">Slug</span>
                  <span class="list-info-value">${escapeHtml(list.slug)}</span>
                </div>
                <div class="list-info-item">
                  <span class="list-info-label">Display Order</span>
                  <span class="list-info-value">${list.displayOrder || 0}</span>
                </div>
                <div class="list-info-item">
                  <span class="list-info-label">Created</span>
                  <span class="list-info-value">${formatDate(list.createdAt)}</span>
                </div>
              </div>
              ${list.description ? `<p class="mb-0 mt-2 text-muted">${escapeHtml(list.description)}</p>` : ""}
            </div>

            <!-- Actions -->
            <div class="list-actions">
              <button class="btn btn-sm btn-primary btn-icon" onclick="openAddProductModal('${escapeHtml(list.listId)}')">
                <i class="bi bi-plus-circle"></i> Add Product
              </button>
              <button class="btn btn-sm btn-info btn-icon" onclick="syncAllProducts('${escapeHtml(list.listId)}')">
                <i class="bi bi-arrow-repeat"></i> Sync All
              </button>
              <button class="btn btn-sm btn-warning btn-icon" onclick="openEditListModal('${escapeHtml(list.listId)}')">
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button class="btn btn-sm btn-danger btn-icon" onclick="openDeleteListModal('${escapeHtml(list.listId)}', 'list')">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>

            <!-- Products Section -->
            <div class="products-section">
              <div class="products-header">
                <h6 class="mb-0">Products in this List</h6>
                <span class="products-count">${productCount} ${productCount === 1 ? "product" : "products"}</span>
              </div>

              <div id="products-${escapeHtml(list.listId)}">
                ${productCount > 0 ? renderProducts(products, list.listId) : '<p class="text-muted">No products added yet</p>'}
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderProducts(products, listId) {
  if (!products || products.length === 0) {
    return '<p class="text-muted">No products in this list</p>';
  }

  return products
    .map((product, index) => {
      const imageUrl = product.productImage || "https://via.placeholder.com/60";
      const regularPrice = product.price ? `₹${product.price.toLocaleString()}` : "N/A";
      const finalPrice = product.finalPrice ? `₹${product.finalPrice.toLocaleString()}` : regularPrice;
      const showDiscount = product.price && product.finalPrice && product.price !== product.finalPrice;

      return `
        <div class="product-item" data-product-id="${escapeHtml(product.productId)}">
          <div class="product-order">${product.order || index + 1}</div>
          <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.productName)}" class="product-image" onerror="this.src='https://via.placeholder.com/60'" />

          <div class="product-details">
            <div class="product-name">${escapeHtml(product.productName)}</div>
            <div class="product-meta">
              <span><i class="bi bi-tag"></i> ${escapeHtml(product.productId)}</span>
              ${product.lastSynced ? `<span><i class="bi bi-clock"></i> Synced ${formatDate(product.lastSynced)}</span>` : ""}
            </div>
          </div>

          <div class="product-price">
            ${showDiscount ? `<span class="price-regular">${regularPrice}</span>` : ""}
            <span class="price-final">${finalPrice}</span>
          </div>

          <div class="product-actions">
            <button class="btn btn-sm btn-outline-primary btn-order" onclick="moveProductUp('${escapeHtml(listId)}', '${escapeHtml(product.productId)}', ${product.order})" ${product.order === 1 ? "disabled" : ""}>
              <i class="bi bi-arrow-up"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary btn-order" onclick="moveProductDown('${escapeHtml(listId)}', '${escapeHtml(product.productId)}', ${product.order})" ${product.order === products.length ? "disabled" : ""}>
              <i class="bi bi-arrow-down"></i>
            </button>
            <button class="btn btn-sm btn-outline-info btn-order" onclick="syncProduct('${escapeHtml(listId)}', '${escapeHtml(product.productId)}')">
              <i class="bi bi-arrow-repeat"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-order" onclick="openDeleteProductModal('${escapeHtml(listId)}', '${escapeHtml(product.productId)}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function toggleListCard(listId) {
  const body = document.getElementById(`body-${listId}`);
  const toggle = document.getElementById(`toggle-${listId}`);

  if (body && toggle) {
    body.classList.toggle("show");
    toggle.classList.toggle("rotated");
  }
}

function openCreateListModal() {
  currentEditListId = null;
  document.getElementById("listModalLabel").textContent = "Create New List";
  document.getElementById("listForm").reset();
  document.getElementById("listId").value = "";
  document.getElementById("listIsActive").value = "true";
  document.getElementById("listDisplayOrder").value = "0";
  if (listModal) listModal.show();
}

function openEditListModal(listId) {
  const list = allLists.find((l) => l.listId === listId);
  if (!list) return;

  currentEditListId = listId;
  document.getElementById("listModalLabel").textContent = "Edit List";
  document.getElementById("listId").value = listId;
  document.getElementById("listName").value = list.listName;
  document.getElementById("listSlug").value = list.slug;
  document.getElementById("listDescription").value = list.description || "";
  document.getElementById("listDisplayOrder").value = list.displayOrder || 0;
  document.getElementById("listIsActive").value = list.isActive ? "true" : "false";

  if (listModal) listModal.show();
}

async function saveList() {
  try {
    const listId = document.getElementById("listId").value;
    const listName = document.getElementById("listName").value.trim();
    const listSlug = document.getElementById("listSlug").value.trim();
    const listDescription = document.getElementById("listDescription").value.trim();
    const displayOrder = parseInt(document.getElementById("listDisplayOrder").value) || 0;
    const isActive = document.getElementById("listIsActive").value === "true";

    if (!listName || !listSlug) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(listSlug)) {
      showNotification("Slug must contain only lowercase letters, numbers, and hyphens", "error");
      return;
    }

    showLoading(true);

    const data = {
      listName,
      slug: listSlug,
      description: listDescription,
      displayOrder,
      isActive,
    };

    let response;
    if (listId) {
      // Update existing list
      response = await API.put(
        API_CONFIG.endpoints.featuredLists.update,
        data,
        { listId }
      );
    } else {
      // Create new list
      response = await API.post(API_CONFIG.endpoints.featuredLists.create, data);
    }

    if (response.success) {
      showNotification(listId ? "List updated successfully" : "List created successfully", "success");
      if (listModal) listModal.hide();
      await loadLists();
    } else {
      showNotification(response.message || "Failed to save list", "error");
    }
  } catch (error) {
    console.error("Error saving list:", error);
    showNotification("Error: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

function openDeleteListModal(listId, type) {
  currentDeleteTarget = { listId, type };
  const message = "Are you sure you want to delete this list? All products in this list will be removed.";
  document.getElementById("deleteModalMessage").textContent = message;
  if (deleteModal) deleteModal.show();
}

function openDeleteProductModal(listId, productId) {
  currentDeleteTarget = { listId, productId, type: "product" };
  const message = "Are you sure you want to remove this product from the list?";
  document.getElementById("deleteModalMessage").textContent = message;
  if (deleteModal) deleteModal.show();
}

async function confirmDelete() {
  if (!currentDeleteTarget) return;

  try {
    showLoading(true);

    if (currentDeleteTarget.type === "list") {
      const response = await API.delete(
        API_CONFIG.endpoints.featuredLists.delete,
        { listId: currentDeleteTarget.listId }
      );

      if (response.success) {
        showNotification("List deleted successfully", "success");
        await loadLists();
      } else {
        showNotification(response.message || "Failed to delete list", "error");
      }
    } else if (currentDeleteTarget.type === "product") {
      const response = await API.delete(
        API_CONFIG.endpoints.featuredLists.removeProduct,
        {
          listId: currentDeleteTarget.listId,
          productId: currentDeleteTarget.productId,
        }
      );

      if (response.success) {
        showNotification("Product removed successfully", "success");
        await loadLists();
      } else {
        showNotification(response.message || "Failed to remove product", "error");
      }
    }

    if (deleteModal) deleteModal.hide();
    currentDeleteTarget = null;
  } catch (error) {
    console.error("Error deleting:", error);
    showNotification("Error: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

/* ========================================
 * PRODUCT MANAGEMENT
 * ======================================== */

function openAddProductModal(listId) {
  document.getElementById("currentListId").value = listId;
  document.getElementById("productSearchInput").value = "";
  document.getElementById("productOrder").value = "";
  document.getElementById("productSearchResults").innerHTML = '<div class="text-center p-3 text-muted">Start typing to search products...</div>';
  document.getElementById("selectedProductPreview").style.display = "none";
  document.getElementById("confirmAddProductBtn").disabled = true;
  selectedProduct = null;

  if (addProductModal) addProductModal.show();
}

async function searchProducts() {
  const searchQuery = document.getElementById("productSearchInput").value.trim();
  const resultsContainer = document.getElementById("productSearchResults");

  if (!searchQuery || searchQuery.length < 2) {
    resultsContainer.innerHTML = '<div class="text-center p-3 text-muted">Start typing to search products...</div>';
    return;
  }

  try {
    resultsContainer.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div> Searching...</div>';

    const response = await API.get(
      API_CONFIG.endpoints.products.search,
      {},
      { q: searchQuery, limit: 20 }
    );

    if (response.success && response.data && response.data.length > 0) {
      resultsContainer.innerHTML = response.data
        .map((product) => {
          const imageUrl = product.images && product.images[0] ? product.images[0] : "https://via.placeholder.com/50";
          const price = product.finalPrice || product.price || 0;

          return `
            <div class="product-search-item" onclick="selectProduct('${escapeHtml(product.productId)}', '${escapeHtml(product.productName)}', '${escapeHtml(imageUrl)}', ${price})">
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.productName)}" class="product-search-image" onerror="this.src='https://via.placeholder.com/50'" />
              <div class="product-search-details">
                <div class="product-search-name">${escapeHtml(product.productName)}</div>
                <div class="product-search-info">
                  <span>ID: ${escapeHtml(product.productId)}</span> |
                  <span>Price: ₹${price.toLocaleString()}</span> |
                  <span>Stock: ${product.stockQuantity || 0}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    } else {
      resultsContainer.innerHTML = '<div class="text-center p-3 text-muted">No products found</div>';
    }
  } catch (error) {
    console.error("Error searching products:", error);
    resultsContainer.innerHTML = '<div class="text-center p-3 text-danger">Error searching products</div>';
  }
}

function selectProduct(productId, productName, imageUrl, price) {
  selectedProduct = { productId, productName, imageUrl, price };

  // Highlight selected item
  document.querySelectorAll(".product-search-item").forEach((item) => {
    item.classList.remove("selected");
  });
  event.currentTarget.classList.add("selected");

  // Show preview
  const previewContainer = document.getElementById("selectedProductPreview");
  const previewInfo = document.getElementById("selectedProductInfo");

  previewInfo.innerHTML = `
    <div class="d-flex align-items-center gap-3">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(productName)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 0.375rem;" onerror="this.src='https://via.placeholder.com/60'" />
      <div>
        <strong>${escapeHtml(productName)}</strong><br>
        <small class="text-muted">ID: ${escapeHtml(productId)}</small><br>
        <small class="text-success">₹${price.toLocaleString()}</small>
      </div>
    </div>
  `;

  previewContainer.style.display = "block";
  document.getElementById("confirmAddProductBtn").disabled = false;
}

async function confirmAddProduct() {
  if (!selectedProduct) return;

  const listId = document.getElementById("currentListId").value;
  const orderInput = document.getElementById("productOrder").value;
  const order = orderInput ? parseInt(orderInput) : undefined;

  try {
    showLoading(true);

    const data = {
      productId: selectedProduct.productId,
    };

    if (order) {
      data.order = order;
    }

    const response = await API.post(
      API_CONFIG.endpoints.featuredLists.addProduct,
      data,
      { listId }
    );

    if (response.success) {
      showNotification("Product added successfully", "success");
      if (addProductModal) addProductModal.hide();
      await loadLists();
    } else {
      showNotification(response.message || "Failed to add product", "error");
    }
  } catch (error) {
    console.error("Error adding product:", error);
    showNotification("Error: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

/* ========================================
 * PRODUCT ORDERING
 * ======================================== */

async function moveProductUp(listId, productId, currentOrder) {
  if (currentOrder <= 1) return;

  const list = allLists.find((l) => l.listId === listId);
  if (!list || !list.products) return;

  const products = list.products;
  const currentIndex = products.findIndex((p) => p.productId === productId);
  if (currentIndex <= 0) return;

  const targetProduct = products[currentIndex];
  const aboveProduct = products[currentIndex - 1];

  await reorderProducts(listId, [
    { productId: targetProduct.productId, order: aboveProduct.order },
    { productId: aboveProduct.productId, order: targetProduct.order },
  ]);
}

async function moveProductDown(listId, productId, currentOrder) {
  const list = allLists.find((l) => l.listId === listId);
  if (!list || !list.products) return;

  const products = list.products;
  const currentIndex = products.findIndex((p) => p.productId === productId);
  if (currentIndex < 0 || currentIndex >= products.length - 1) return;

  const targetProduct = products[currentIndex];
  const belowProduct = products[currentIndex + 1];

  await reorderProducts(listId, [
    { productId: targetProduct.productId, order: belowProduct.order },
    { productId: belowProduct.productId, order: targetProduct.order },
  ]);
}

async function reorderProducts(listId, productsArray) {
  try {
    showLoading(true);

    const response = await API.put(
      API_CONFIG.endpoints.featuredLists.reorderProducts,
      { products: productsArray },
      { listId }
    );

    if (response.success) {
      showNotification("Products reordered successfully", "success");
      await loadLists();
    } else {
      showNotification(response.message || "Failed to reorder products", "error");
    }
  } catch (error) {
    console.error("Error reordering products:", error);
    showNotification("Error: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

/* ========================================
 * SYNC OPERATIONS
 * ======================================== */

async function syncProduct(listId, productId) {
  try {
    showLoading(true);

    const response = await API.post(
      API_CONFIG.endpoints.featuredLists.syncProduct,
      {},
      { listId, productId }
    );

    if (response.success) {
      showNotification("Product synced successfully", "success");
      await loadLists();
    } else {
      showNotification(response.message || "Failed to sync product", "error");
    }
  } catch (error) {
    console.error("Error syncing product:", error);
    showNotification("Error: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

async function syncAllProducts(listId) {
  try {
    showLoading(true);

    const response = await API.post(
      API_CONFIG.endpoints.featuredLists.syncAllProducts,
      {},
      { listId }
    );

    if (response.success) {
      showNotification("All products synced successfully", "success");
      await loadLists();
    } else {
      showNotification(response.message || "Failed to sync products", "error");
    }
  } catch (error) {
    console.error("Error syncing products:", error);
    showNotification("Error: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

/* ========================================
 * FILTERING & SEARCH
 * ======================================== */

function filterLists() {
  const searchQuery = document.getElementById("searchLists").value.toLowerCase();
  const statusFilter = document.getElementById("filterStatus").value;

  let filteredLists = allLists;

  // Filter by search query
  if (searchQuery) {
    filteredLists = filteredLists.filter(
      (list) =>
        list.listName.toLowerCase().includes(searchQuery) ||
        list.slug.toLowerCase().includes(searchQuery)
    );
  }

  // Filter by status
  if (statusFilter !== "") {
    const isActive = statusFilter === "true";
    filteredLists = filteredLists.filter((list) => list.isActive === isActive);
  }

  renderLists(filteredLists);
}

/* ========================================
 * STATISTICS
 * ======================================== */

function updateStats() {
  const totalLists = allLists.length;
  const activeLists = allLists.filter((l) => l.isActive).length;
  const totalProducts = allLists.reduce((sum, l) => sum + (l.products ? l.products.length : 0), 0);
  const avgProducts = totalLists > 0 ? (totalProducts / totalLists).toFixed(1) : 0;

  document.getElementById("totalLists").textContent = totalLists;
  document.getElementById("activeLists").textContent = activeLists;
  document.getElementById("totalProducts").textContent = totalProducts;
  document.getElementById("avgProducts").textContent = avgProducts;
}

/* ========================================
 * UTILITY FUNCTIONS
 * ======================================== */

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const options = { year: "numeric", month: "short", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

/* ========================================
 * GLOBAL EXPOSURE FOR INLINE ONCLICK
 * ======================================== */

window.toggleListCard = toggleListCard;
window.openEditListModal = openEditListModal;
window.openDeleteListModal = openDeleteListModal;
window.openDeleteProductModal = openDeleteProductModal;
window.openAddProductModal = openAddProductModal;
window.moveProductUp = moveProductUp;
window.moveProductDown = moveProductDown;
window.syncProduct = syncProduct;
window.syncAllProducts = syncAllProducts;
window.selectProduct = selectProduct;
