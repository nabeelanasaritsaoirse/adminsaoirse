/**
 * Hard Delete Management Page
 * Allows super admin to permanently delete products and categories
 */

// ===============================
// STATE
// ===============================
const state = {
  products: [],
  categories: [],
  activityLog: [],
  currentDeleteTarget: null,
};

// ===============================
// DOM ELEMENTS
// ===============================
let productSearchInput;
let categorySearchInput;
let productResults;
let categoryResults;
let activityLog;
let confirmDeleteModal;
let confirmDeleteInput;
let finalDeleteBtn;
let deleteAuditInfo;
let loadingOverlay;
let refreshActivityBtn;
let navUsername;
let logoutBtn;

// ===============================
// INITIALIZATION
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initElements();
  initEventListeners();
  loadActivityLog();
  updateNavUsername();
});

function initElements() {
  productSearchInput = document.getElementById("productSearchInput");
  categorySearchInput = document.getElementById("categorySearchInput");
  productResults = document.getElementById("productResults");
  categoryResults = document.getElementById("categoryResults");
  activityLog = document.getElementById("activityLog");
  confirmDeleteInput = document.getElementById("confirmDeleteInput");
  finalDeleteBtn = document.getElementById("finalDeleteBtn");
  deleteAuditInfo = document.getElementById("deleteAuditInfo");
  loadingOverlay = document.getElementById("loadingOverlay");
  refreshActivityBtn = document.getElementById("refreshActivityBtn");
  navUsername = document.getElementById("navUsername");
  logoutBtn = document.getElementById("logout");

  confirmDeleteModal = new bootstrap.Modal(
    document.getElementById("confirmDeleteModal")
  );
}

function initEventListeners() {
  // Product search with debounce
  productSearchInput.addEventListener(
    "input",
    window.utils.debounce(searchProducts, 500)
  );

  // Category search with debounce
  categorySearchInput.addEventListener(
    "input",
    window.utils.debounce(searchCategories, 500)
  );

  // Confirm delete input validation
  confirmDeleteInput.addEventListener("input", handleDeleteConfirmInput);

  // Final delete button
  finalDeleteBtn.addEventListener("click", executeHardDelete);

  // Refresh activity log
  refreshActivityBtn.addEventListener("click", loadActivityLog);

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      AUTH.logout();
    });
  }

  // Reset modal on close
  document
    .getElementById("confirmDeleteModal")
    .addEventListener("hidden.bs.modal", resetDeleteModal);
}

function updateNavUsername() {
  const username = AUTH.getUsername() || "Admin";
  if (navUsername) {
    navUsername.textContent = username;
  }
}

// ===============================
// PRODUCT SEARCH
// ===============================
async function searchProducts() {
  const query = productSearchInput.value.trim();

  if (!query || query.length < 2) {
    productResults.innerHTML = `
      <div class="no-results">
        <i class="bi bi-search" style="font-size: 3rem;"></i>
        <p class="mt-2">Enter at least 2 characters to search</p>
      </div>
    `;
    return;
  }

  showLoading();

  try {
    const response = await API.get("/products/admin/all", {}, {
      search: query,
      limit: 20,
      region: "global",
    });

    if (response.success && response.data) {
      state.products = response.data.products || [];
      renderProductResults();
    } else {
      throw new Error(response.message || "Failed to search products");
    }
  } catch (error) {
    console.error("Product search error:", error);
    showNotification("Failed to search products: " + error.message, "danger");
    productResults.innerHTML = `
      <div class="no-results">
        <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
        <p class="mt-2 text-danger">Error: ${escapeHtml(error.message)}</p>
      </div>
    `;
  } finally {
    hideLoading();
  }
}

function renderProductResults() {
  if (!state.products || state.products.length === 0) {
    productResults.innerHTML = `
      <div class="no-results">
        <i class="bi bi-inbox" style="font-size: 3rem;"></i>
        <p class="mt-2">No products found</p>
      </div>
    `;
    return;
  }

  const html = state.products.map((product) => {
    const mainImage = product.images?.[0]?.url || "";
    const variantsCount = product.variants?.length || 0;
    const imagesCount = product.images?.length || 0;

    return `
      <div class="result-card">
        <div class="d-flex align-items-start">
          ${
            mainImage
              ? `<img src="${escapeHtml(mainImage)}" class="result-image me-3" alt="${escapeHtml(product.name)}" />`
              : `<div class="result-image me-3 bg-light d-flex align-items-center justify-content-center">
                   <i class="bi bi-image text-muted"></i>
                 </div>`
          }

          <div class="flex-grow-1">
            <h6 class="mb-1">${escapeHtml(product.name)}</h6>
            <p class="text-muted small mb-2">
              <strong>SKU:</strong> ${escapeHtml(product.sku || "N/A")} |
              <strong>ID:</strong> ${escapeHtml(product.productId || product._id)}
            </p>
            <div class="d-flex gap-2 flex-wrap">
              <span class="badge bg-secondary">
                <i class="bi bi-tag"></i> ${escapeHtml(product.category?.name || "No Category")}
              </span>
              <span class="badge bg-info">
                <i class="bi bi-layers"></i> ${variantsCount} Variant${variantsCount !== 1 ? "s" : ""}
              </span>
              <span class="badge bg-primary">
                <i class="bi bi-images"></i> ${imagesCount} Image${imagesCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <button
            class="btn btn-danger btn-sm"
            onclick="confirmProductDelete('${escapeHtml(product.productId || product._id)}')"
          >
            <i class="bi bi-trash3"></i> Delete
          </button>
        </div>

        <div class="audit-info">
          <strong><i class="bi bi-info-circle"></i> Will be deleted:</strong>
          <ul class="mb-0 mt-1 small">
            <li>${imagesCount} product image${imagesCount !== 1 ? "s" : ""} from S3</li>
            <li>${variantsCount} variant${variantsCount !== 1 ? "s" : ""} with their images</li>
            <li>All product data from database</li>
          </ul>
        </div>
      </div>
    `;
  }).join("");

  productResults.innerHTML = html;
}

// ===============================
// CATEGORY SEARCH
// ===============================
async function searchCategories() {
  const query = categorySearchInput.value.trim();

  if (!query || query.length < 2) {
    categoryResults.innerHTML = `
      <div class="no-results">
        <i class="bi bi-search" style="font-size: 3rem;"></i>
        <p class="mt-2">Enter at least 2 characters to search</p>
      </div>
    `;
    return;
  }

  showLoading();

  try {
    const response = await API.get("/categories", {}, {
      search: query,
      limit: 20,
    });

    if (response.success && response.data) {
      state.categories = response.data || [];
      renderCategoryResults();
    } else {
      throw new Error(response.message || "Failed to search categories");
    }
  } catch (error) {
    console.error("Category search error:", error);
    showNotification("Failed to search categories: " + error.message, "danger");
    categoryResults.innerHTML = `
      <div class="no-results">
        <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
        <p class="mt-2 text-danger">Error: ${escapeHtml(error.message)}</p>
      </div>
    `;
  } finally {
    hideLoading();
  }
}

function renderCategoryResults() {
  if (!state.categories || state.categories.length === 0) {
    categoryResults.innerHTML = `
      <div class="no-results">
        <i class="bi bi-inbox" style="font-size: 3rem;"></i>
        <p class="mt-2">No categories found</p>
      </div>
    `;
    return;
  }

  const html = state.categories.map((category) => {
    const imageUrl = category.image?.url || category.imageUrl || "";
    const subcategoriesCount = category.subCategories?.length || 0;
    const hasSubcategories = subcategoriesCount > 0;

    return `
      <div class="result-card">
        <div class="d-flex align-items-start">
          ${
            imageUrl
              ? `<img src="${escapeHtml(imageUrl)}" class="result-image me-3" alt="${escapeHtml(category.name)}" />`
              : `<div class="result-image me-3 bg-light d-flex align-items-center justify-content-center">
                   <i class="bi bi-folder text-muted"></i>
                 </div>`
          }

          <div class="flex-grow-1">
            <h6 class="mb-1">${escapeHtml(category.name)}</h6>
            <p class="text-muted small mb-2">
              <strong>Slug:</strong> ${escapeHtml(category.slug || "N/A")} |
              <strong>ID:</strong> ${escapeHtml(category._id)}
            </p>
            <div class="d-flex gap-2 flex-wrap">
              <span class="badge ${category.isActive ? "bg-success" : "bg-secondary"}">
                ${category.isActive ? "Active" : "Inactive"}
              </span>
              <span class="badge bg-info">
                <i class="bi bi-diagram-3"></i> ${subcategoriesCount} Subcategory${subcategoriesCount !== 1 ? "ies" : "y"}
              </span>
              ${category.parentCategoryId ? '<span class="badge bg-warning">Has Parent</span>' : ""}
            </div>
          </div>

          <button
            class="btn btn-danger btn-sm"
            onclick="confirmCategoryDelete('${escapeHtml(category._id)}')"
            ${hasSubcategories ? 'disabled title="Cannot delete category with subcategories"' : ""}
          >
            <i class="bi bi-trash3"></i> Delete
          </button>
        </div>

        ${
          hasSubcategories
            ? `
          <div class="audit-info bg-danger bg-opacity-10 border-danger">
            <strong><i class="bi bi-exclamation-triangle text-danger"></i> Cannot Delete:</strong>
            <p class="mb-0 mt-1 small">
              This category has ${subcategoriesCount} subcategory${subcategoriesCount !== 1 ? "ies" : "y"}.
              Please delete or move subcategories first.
            </p>
          </div>
        `
            : `
          <div class="audit-info">
            <strong><i class="bi bi-info-circle"></i> Will be deleted:</strong>
            <ul class="mb-0 mt-1 small">
              <li>Category image from storage</li>
              <li>All category data from database</li>
              <li>References from parent category (if any)</li>
            </ul>
          </div>
        `
        }
      </div>
    `;
  }).join("");

  categoryResults.innerHTML = html;
}

// ===============================
// DELETE CONFIRMATION
// ===============================
window.confirmProductDelete = async function (productId) {
  showLoading();

  try {
    // Fetch full product details
    const response = await API.get("/products/:productId", { productId });

    if (!response.success || !response.data) {
      throw new Error("Failed to fetch product details");
    }

    const product = response.data;
    const imagesCount = product.images?.length || 0;
    const variantsCount = product.variants?.length || 0;
    let variantImagesCount = 0;

    if (product.variants) {
      product.variants.forEach((variant) => {
        variantImagesCount += variant.images?.length || 0;
      });
    }

    state.currentDeleteTarget = {
      type: "product",
      id: productId,
      data: product,
    };

    deleteAuditInfo.innerHTML = `
      <div class="mb-3">
        <h5>Product: ${escapeHtml(product.name)}</h5>
        <p class="text-muted mb-0">
          <strong>SKU:</strong> ${escapeHtml(product.sku || "N/A")} |
          <strong>ID:</strong> ${escapeHtml(productId)}
        </p>
      </div>

      <div class="alert alert-danger">
        <h6 class="alert-heading">The following will be permanently deleted:</h6>
        <ul class="mb-0">
          <li><strong>${imagesCount}</strong> main product image${imagesCount !== 1 ? "s" : ""} from S3</li>
          <li><strong>${variantsCount}</strong> variant${variantsCount !== 1 ? "s" : ""} with <strong>${variantImagesCount}</strong> variant image${variantImagesCount !== 1 ? "s" : ""}</li>
          <li>All product data, pricing, and metadata</li>
          <li>Product references in orders (will show as "Product Deleted")</li>
        </ul>
      </div>

      <p class="text-danger mb-0">
        <i class="bi bi-exclamation-triangle"></i>
        <strong>This action is irreversible!</strong> The product and all its data will be permanently removed.
      </p>
    `;

    confirmDeleteModal.show();
  } catch (error) {
    console.error("Error fetching product details:", error);
    showNotification("Failed to load product details: " + error.message, "danger");
  } finally {
    hideLoading();
  }
};

window.confirmCategoryDelete = async function (categoryId) {
  showLoading();

  try {
    // Fetch full category details
    const response = await API.get("/categories/:categoryId", { categoryId });

    if (!response.success || !response.data) {
      throw new Error("Failed to fetch category details");
    }

    const category = response.data;
    const subcategoriesCount = category.subCategories?.length || 0;

    if (subcategoriesCount > 0) {
      showNotification(
        "Cannot delete category with subcategories. Please delete subcategories first.",
        "warning"
      );
      return;
    }

    state.currentDeleteTarget = {
      type: "category",
      id: categoryId,
      data: category,
    };

    deleteAuditInfo.innerHTML = `
      <div class="mb-3">
        <h5>Category: ${escapeHtml(category.name)}</h5>
        <p class="text-muted mb-0">
          <strong>Slug:</strong> ${escapeHtml(category.slug || "N/A")} |
          <strong>ID:</strong> ${escapeHtml(categoryId)}
        </p>
      </div>

      <div class="alert alert-danger">
        <h6 class="alert-heading">The following will be permanently deleted:</h6>
        <ul class="mb-0">
          <li>Category image from storage</li>
          <li>All category data and metadata</li>
          <li>References from parent category (if any)</li>
          ${category.parentCategoryId ? "<li>Will be removed from parent category's subcategories list</li>" : ""}
        </ul>
      </div>

      <p class="text-danger mb-0">
        <i class="bi bi-exclamation-triangle"></i>
        <strong>This action is irreversible!</strong> The category will be permanently removed.
      </p>
    `;

    confirmDeleteModal.show();
  } catch (error) {
    console.error("Error fetching category details:", error);
    showNotification("Failed to load category details: " + error.message, "danger");
  } finally {
    hideLoading();
  }
};

function handleDeleteConfirmInput(e) {
  const value = e.target.value.trim();
  finalDeleteBtn.disabled = value !== "DELETE";
}

function resetDeleteModal() {
  confirmDeleteInput.value = "";
  finalDeleteBtn.disabled = true;
  deleteAuditInfo.innerHTML = "";
  state.currentDeleteTarget = null;
}

// ===============================
// EXECUTE HARD DELETE
// ===============================
async function executeHardDelete() {
  if (!state.currentDeleteTarget) {
    showNotification("No delete target selected", "danger");
    return;
  }

  const { type, id, data } = state.currentDeleteTarget;

  showLoading();
  confirmDeleteModal.hide();

  try {
    let response;

    if (type === "product") {
      response = await API.delete(
        "/products/:productId/hard",
        { productId: id },
        { confirmDelete: true }
      );

      if (response.success) {
        showNotification(
          `Product "${data.name}" has been permanently deleted!`,
          "success"
        );

        // Log activity
        await logActivity("product", "delete", {
          productId: id,
          productName: data.name,
          sku: data.sku,
        });

        // Refresh search results
        await searchProducts();
      } else {
        throw new Error(response.message || "Failed to delete product");
      }
    } else if (type === "category") {
      response = await API.delete(
        "/categories/:categoryId/hard",
        { categoryId: id },
        { confirmDelete: true }
      );

      if (response.success) {
        showNotification(
          `Category "${data.name}" has been permanently deleted!`,
          "success"
        );

        // Log activity
        await logActivity("category", "delete", {
          categoryId: id,
          categoryName: data.name,
          slug: data.slug,
        });

        // Refresh search results
        await searchCategories();
      } else {
        throw new Error(response.message || "Failed to delete category");
      }
    }

    // Reload activity log
    await loadActivityLog();
  } catch (error) {
    console.error("Hard delete error:", error);
    showNotification("Failed to delete: " + error.message, "danger");
  } finally {
    hideLoading();
    resetDeleteModal();
  }
}

// ===============================
// ACTIVITY LOGGING
// ===============================
async function logActivity(resourceType, action, details) {
  const user = AUTH.getCurrentUser();

  const activityEntry = {
    timestamp: new Date().toISOString(),
    admin: {
      userId: user?.userId,
      name: user?.name,
      email: user?.email,
    },
    resourceType,
    action,
    details,
  };

  // Store in localStorage for now (in production, this would go to backend)
  const existingLog = JSON.parse(localStorage.getItem("hardDeleteLog") || "[]");
  existingLog.unshift(activityEntry);

  // Keep only last 100 entries
  if (existingLog.length > 100) {
    existingLog.splice(100);
  }

  localStorage.setItem("hardDeleteLog", JSON.stringify(existingLog));
}

async function loadActivityLog() {
  try {
    // Load from localStorage (in production, fetch from backend API)
    const log = JSON.parse(localStorage.getItem("hardDeleteLog") || "[]");
    state.activityLog = log;
    renderActivityLog();
  } catch (error) {
    console.error("Failed to load activity log:", error);
    activityLog.innerHTML = `
      <div class="text-center text-danger">
        <i class="bi bi-exclamation-triangle"></i>
        Failed to load activity log
      </div>
    `;
  }
}

function renderActivityLog() {
  if (!state.activityLog || state.activityLog.length === 0) {
    activityLog.innerHTML = `
      <div class="text-center text-muted">
        <i class="bi bi-inbox"></i>
        No activity logged yet
      </div>
    `;
    return;
  }

  const html = state.activityLog.map((entry) => {
    const timestamp = new Date(entry.timestamp);
    const formattedTime = window.utils?.formatDateTime
      ? window.utils.formatDateTime(timestamp)
      : timestamp.toLocaleString();

    let detailsHtml = "";
    if (entry.resourceType === "product") {
      detailsHtml = `
        <strong>Product:</strong> ${escapeHtml(entry.details.productName || "Unknown")}
        (SKU: ${escapeHtml(entry.details.sku || "N/A")})
      `;
    } else if (entry.resourceType === "category") {
      detailsHtml = `
        <strong>Category:</strong> ${escapeHtml(entry.details.categoryName || "Unknown")}
        (Slug: ${escapeHtml(entry.details.slug || "N/A")})
      `;
    }

    return `
      <div class="activity-item">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <span class="badge bg-danger">
              <i class="bi bi-trash3"></i> Hard Delete
            </span>
            <span class="badge bg-secondary">
              ${escapeHtml(entry.resourceType)}
            </span>
          </div>
          <small class="text-muted">${formattedTime}</small>
        </div>
        <div class="mt-2 small">
          ${detailsHtml}
        </div>
        <div class="small text-muted mt-1">
          <i class="bi bi-person"></i> By: ${escapeHtml(entry.admin.name)}
          (${escapeHtml(entry.admin.email)})
        </div>
      </div>
    `;
  }).join("");

  activityLog.innerHTML = html;
}

// ===============================
// UTILITY FUNCTIONS
// ===============================
function showLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.add("show");
  }
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove("show");
  }
}

function showNotification(message, type = "info") {
  // Create toast notification
  const toastHtml = `
    <div class="toast align-items-center text-white bg-${type} border-0" role="alert" style="position: fixed; top: 80px; right: 20px; z-index: 9999;">
      <div class="d-flex">
        <div class="toast-body">
          ${escapeHtml(message)}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  const toastContainer = document.createElement("div");
  toastContainer.innerHTML = toastHtml;
  document.body.appendChild(toastContainer);

  const toastElement = toastContainer.querySelector(".toast");
  const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
  toast.show();

  toastElement.addEventListener("hidden.bs.toast", () => {
    toastContainer.remove();
  });
}

function escapeHtml(text) {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
