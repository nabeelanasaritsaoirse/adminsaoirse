/* ============================================================
   product.list.js
   Product listing, filters, pagination, rendering
   (NO form / modal logic here)
============================================================ */
/* ---------- Pagination state (SAFE DEFAULT) ---------- */
window.pagination = window.pagination || {
  page: 1,
  limit: 10,
  pages: 1,
  total: 0,
};
let selectedCategoryId = "";
/* ---------- Products state (OLD CODE COMPATIBLE) ---------- */
window.products = window.products || [];

/* ---------- DOM refs (list-only) ---------- */
let searchInput,
  statusFilter,
  variantsFilter,
  categoryFilter,
  productsContainer;

let totalProductsCount, publishedCount, variantsCount, totalStockCount;

/* ---------- Init ---------- */
function initPage() {
  initListDOM();
  initListEvents();
  loadListCategories();
  loadProducts();
}

// If DOM already loaded → run immediately
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage);
} else {
  initPage();
}

/* ---------- DOM Init ---------- */
function initListDOM() {
  searchInput = document.getElementById("searchProducts");
  statusFilter = document.getElementById("filterStatus");
  variantsFilter = document.getElementById("filterVariants");
  categoryFilter = document.getElementById("productCategoryFilter");

  productsContainer = document.getElementById("productsContainer");

  totalProductsCount = document.getElementById("totalProducts");
  publishedCount = document.getElementById("publishedProducts");
  variantsCount = document.getElementById("variantsCount");
  totalStockCount = document.getElementById("totalStock");
}

/* ---------- Events ---------- */
function initListEvents() {
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      window.utils
        ? window.utils.debounce(filterProducts, 300)
        : debounce(filterProducts, 300),
    );
  }

  if (statusFilter) statusFilter.addEventListener("change", filterProducts);
  if (variantsFilter) variantsFilter.addEventListener("change", filterProducts);
  if (categoryFilter) categoryFilter.addEventListener("change", filterProducts);

  const addProductBtn = document.getElementById("addProductBtn");
  if (addProductBtn) {
    function goToAddProduct() {
      window.location.href = "product-add.html";
    }

    function goToEditProduct(productId) {
      window.location.href = `product-edit.html?id=${productId}`;
    }

    window.goToAddProduct = goToAddProduct;
    window.goToEditProduct = goToEditProduct;

    addProductBtn.addEventListener("click", goToAddProduct);
  }
}

/* ---------- Debounce fallback (OLD CODE SAFE) ---------- */
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ---------- escapeHtml fallback (OLD CODE SAFE) ---------- */
if (typeof window.escapeHtml !== "function") {
  window.escapeHtml = function (text) {
    if (text === null || text === undefined) return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.toString().replace(/[&<>"']/g, (m) => map[m]);
  };
}

/* ---------- Safety guards (OLD CODE SAFE) ---------- */
if (typeof window.showLoading !== "function") {
  window.showLoading = function () {};
}

if (typeof window.showNotification !== "function") {
  window.showNotification = function () {};
}

/* ---------- Load Categories ---------- */
async function loadListCategories() {
  try {
    const res = await API.get("/categories/dropdown/all");
    const menu = document.getElementById("productCategoryMenu");
    const btn = document.getElementById("productCategoryDropdown");

    if (!menu || !btn) return;

    menu.innerHTML = "";

    // All Categories
    const allItem = document.createElement("li");
    allItem.innerHTML = `
      <a class="dropdown-item" href="#" data-id="">
        All Categories
      </a>
    `;
    menu.appendChild(allItem);

    const categories = Array.isArray(res?.data) ? res.data : [];

    categories.forEach((cat) => {
      const mainId = cat._id; // ✅ FIXED
      const mainName = cat.name;

      if (!mainId || !mainName) return;

      const mainItem = document.createElement("li");
      mainItem.innerHTML = `
        <a class="dropdown-item fw-semibold" href="#" data-id="${mainId}">
          ${mainName}
        </a>
      `;
      menu.appendChild(mainItem);

      if (Array.isArray(cat.subCategories)) {
        cat.subCategories.forEach((sub) => {
          const subId = sub._id; // ✅ FIXED
          const subName = sub.name;

          if (!subId || !subName) return;

          const subItem = document.createElement("li");
          subItem.innerHTML = `
            <a class="dropdown-item ps-4" href="#" data-id="${subId}">
              → ${subName}
            </a>
          `;
          menu.appendChild(subItem);
        });
      }
    });

    // Click handler
    menu.querySelectorAll(".dropdown-item").forEach((item) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();

        selectedCategoryId = this.dataset.id || null;
        btn.textContent = this.textContent;

        console.log("Selected Category ID:", selectedCategoryId);

        loadProducts();
      });
    });
  } catch (err) {
    showNotification?.("Failed to load categories", "error");
  }
}

/* ---------- Load Products ---------- */
async function loadProducts() {
  try {
    showLoading(true);

    const qp = {
      page: window.pagination.page,
      limit: window.pagination.limit,
      region: "global",
      showDeleted: false,
    };

    // 🔎 Search
    if (searchInput?.value?.trim()) {
      qp.search = searchInput.value.trim();
    }

    // 📦 Status filter
    if (statusFilter?.value) {
      qp.status = statusFilter.value;
    }

    // 🔁 Variants filter
    if (variantsFilter?.value !== "") {
      qp.hasVariants = variantsFilter.value;
    }

    // 📂 Category filter → send to backend (IMPORTANT)
    if (selectedCategoryId) {
      qp.category = selectedCategoryId;
    }

    const res = await API.get("/products/admin/all", {}, qp);

    const data = Array.isArray(res?.data) ? res.data : [];
    const stats = res?.stats || {};
    const pagination = res?.pagination || {};

    // 🧠 Normalize (NO frontend filtering now)
    window.products = data.map(normalizeProduct);

    // 📊 Proper backend pagination
    window.pagination.total = pagination.total || 0;
    window.pagination.pages = pagination.pages || 1;
    window.pagination.page = pagination.current || 1;

    // 📈 GLOBAL STATS (from backend — NOT page-based)
    if (totalProductsCount)
      totalProductsCount.textContent = stats.totalProducts || 0;

    if (publishedCount) publishedCount.textContent = stats.totalPublished || 0;

    if (variantsCount) variantsCount.textContent = stats.totalWithVariants || 0;

    if (totalStockCount) totalStockCount.textContent = stats.totalStock || 0;

    renderProducts();
  } catch (err) {
    console.error("❌ Load products error:", err);
    showNotification("Failed to load products", "error");
  } finally {
    showLoading(false);
  }
}

/* ---------- Normalize ---------- */
function normalizeProduct(p) {
  return {
    productId: p.productId,
    name: p.name || "",
    brand: p.brand || "",
    description:
      typeof p.description === "object"
        ? p.description.short || ""
        : p.description || "",
    category: p.category || {},
    sku: p.sku || "",
    pricing: p.pricing || {},
    availability: p.availability || {},
    variants: Array.isArray(p.variants) ? p.variants : [],
    hasVariants: !!p.hasVariants,
    status: p.status || "draft",
    updatedAt: p.updatedAt || new Date(),
  };
}

/* ---------- Stats ---------- */
function updateStats() {
  const list = window.products;

  if (totalProductsCount)
    totalProductsCount.textContent = window.pagination.total || list.length;

  if (publishedCount)
    publishedCount.textContent = list.filter(
      (p) => p.status === "published",
    ).length;

  if (variantsCount)
    variantsCount.textContent = list.filter((p) => p.hasVariants).length;

  if (totalStockCount)
    totalStockCount.textContent = list.reduce(
      (s, p) => s + (p.availability?.stockQuantity || 0),
      0,
    );
}

/* ---------- Filters ---------- */
function filterProducts() {
  window.pagination.page = 1;
  loadProducts();
}

/* ---------- Render ---------- */
function renderProductCard(product) {
  const variantInfo =
    product.hasVariants && product.variants?.length
      ? `<span class="badge bg-warning me-2">${product.variants.length} variants</span>`
      : "";

  const stock = product.availability?.stockQuantity ?? 0;

  return `
    <div class="card mb-3 product-card">
      <div class="card-body">
        <div class="row align-items-start">
          <div class="col-md-8">
            <h5>${escapeHtml(product.name)}</h5>

            <div class="mb-2">
              <span class="badge bg-secondary me-2">
                ${escapeHtml(product.brand || "N/A")}
              </span>
              ${variantInfo}
              <span class="badge ${
                product.status === "published" ? "bg-success" : "bg-warning"
              }">
                ${escapeHtml(product.status)}
              </span>
            </div>

            <p class="text-muted small mb-2">
              ${escapeHtml((product.description || "").slice(0, 150))}
              ${(product.description || "").length > 150 ? "..." : ""}
            </p>

            <div class="small">
              <strong>Category:</strong>
              ${escapeHtml(product.category?.mainCategoryName || "N/A")}
              ${
                product.category?.subCategoryName
                  ? ` > ${escapeHtml(product.category.subCategoryName)}`
                  : ""
              }
            </div>

            <div class="small">
              <strong>SKU:</strong>
              ${escapeHtml(product.sku || product.productId || "N/A")}
            </div>
          </div>

          <div class="col-md-4 text-end">
            <div class="mb-2">
              <div class="h6 text-primary">
                ₹${(
                  product.pricing?.salePrice ||
                  product.pricing?.regularPrice ||
                  0
                ).toFixed(2)}
              </div>
              <small class="text-muted">
                Stock: <strong>${stock}</strong>
              </small>
            </div>

            <small class="d-block text-muted mb-3">
              ${
                window.utils
                  ? window.utils.formatDate(product.updatedAt)
                  : new Date(product.updatedAt).toLocaleString()
              }
            </small>

            <div class="btn-group btn-group-sm">
              <button
                class="btn btn-outline-primary"
                title="Edit"
                onclick="goToEditProduct('${product.productId}')">
                <i class="bi bi-pencil"></i>
              </button>

              <button
                class="btn btn-outline-info"
                title="View"
                onclick="viewProductDetails('${product.productId}')">
                <i class="bi bi-eye"></i>
              </button>

              <button
                class="btn btn-outline-danger"
                title="Delete"
                onclick="deleteProduct('${product.productId}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProducts() {
  if (!productsContainer) return;

  if (!window.products.length) {
    productsContainer.innerHTML =
      '<div class="text-center py-5 text-muted">No products found</div>';
    renderPagination();
    return;
  }

  productsContainer.innerHTML = window.products.map(renderProductCard).join("");

  renderPagination();
}

/* ---------- Pagination ---------- */
function renderPagination() {
  const { page, pages, total } = window.pagination;
  if (pages <= 1) return;

  let el = document.getElementById("productsPagination");
  if (!el) {
    el = document.createElement("div");
    el.id = "productsPagination";
    el.className = "d-flex justify-content-center mt-3";
    productsContainer.after(el);
  }

  el.innerHTML = `
    <nav>
      <ul class="pagination">
        <li class="page-item ${page === 1 ? "disabled" : ""}">
          <button class="page-link" onclick="changeProductPage(${
            page - 1
          })">Prev</button>
        </li>
        <li class="page-item active">
          <span class="page-link">${page}</span>
        </li>
        <li class="page-item ${page === pages ? "disabled" : ""}">
          <button class="page-link" onclick="changeProductPage(${
            page + 1
          })">Next</button>
        </li>
      </ul>
      <div class="small text-muted text-center">${total} total products</div>
    </nav>
  `;
}

function changeProductPage(p) {
  if (p < 1 || p > window.pagination.pages) return;
  window.pagination.page = p;
  loadProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
/* ---------- Delete Product (Soft Delete) ---------- */
async function deleteProduct(productId) {
  if (!productId) return;

  const confirmed = confirm(
    "Are you sure you want to delete this product?\n\n" +
      "• Product will be hidden from users\n" +
      "• You can restore it later from deleted products\n\n" +
      "This action is reversible.",
  );

  if (!confirmed) return;

  try {
    showLoading(true);

    await API.delete("/products/:productId", {
      productId,
    });

    showNotification("Product deleted successfully", "success");

    // 🔥 Remove from local list (soft delete UX)
    window.products = window.products.filter((p) => p.productId !== productId);

    updateStats();
    renderProducts();
  } catch (err) {
    console.error("❌ Delete failed:", err);
    showNotification(err?.message || "Failed to delete product", "error");
  } finally {
    showLoading(false);
  }
}

window.deleteProduct = deleteProduct;
window.goToDeletedProducts = () => {
  window.location.href = "products-deleted.html";
};

/* ---------- Reset Filters (OLD UX PARITY) ---------- */
window.resetFilters = function () {
  if (searchInput) searchInput.value = "";
  if (statusFilter) statusFilter.value = "";
  if (variantsFilter) variantsFilter.value = "";
  if (categoryFilter) categoryFilter.value = "";
  filterProducts();
};

/* ---------- Expose ---------- */
window.changeProductPage = changeProductPage;
window.deleteProduct = deleteProduct;
