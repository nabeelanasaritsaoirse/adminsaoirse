// product.js (paste-ready)
// Products Management Controller with optional regional support (safe, non-invasive)

/* ---------- Helper Functions ---------- */

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
  alert.className = `alert ${alertClass} alert-dismissible fade show`;
  alert.setAttribute("role", "alert");
  alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
  document.body.insertBefore(alert, document.body.firstChild);
  setTimeout(() => alert.remove(), 5000);
}

/* ---------- Mapping helpers (backend <-> UI) ---------- */

function mapBackendStockStatusToUI(stockStatus) {
  switch (stockStatus) {
    case "in_stock":
      return "in-stock";
    case "out_of_stock":
      return "out-of-stock";
    case "pre_order":
      return "pre-order";
    case "low_stock":
      return "in-stock"; // still "in stock" from UI perspective
    default:
      return "in-stock";
  }
}

function mapUIAvailabilityToBackend(availabilityValue) {
  const map = {
    "in-stock": "in_stock",
    "out-of-stock": "out_of_stock",
    "pre-order": "pre_order",
  };
  const stockStatus = map[availabilityValue] || "in_stock";
  const isAvailable = availabilityValue !== "out-of-stock";

  return { stockStatus, isAvailable };
}

/* ---------- State ---------- */

let products = [];
let currentProductId = null; // NOTE: this will hold product._id for updates or productId for creation depending on flow
let variantCount = 0;
let planCount = 0;
let selectedImageFiles = [];

// Pagination state (backend pagination)
let pagination = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
};

/* DOM elements (populated in init) */
let searchInput, statusFilter, variantsFilter;
let productsContainer;
let productForm;
let hasVariantsCheckbox, variantsSection, variantsList;
let productImagesInput, imagePreviewContainer;
let plansList;

/* Stats elements */
let totalProductsCount, publishedCount, variantsCount, totalStockCount;

/* Regional DOM (optional) */
let isGlobalProductCheckbox, regionalSettingsSection, regionalSettingsTableBody;

/* ---------- Initialization ---------- */

document.addEventListener("DOMContentLoaded", function () {
  initializeDOMElements();
  setupEventListeners();
  loadCategories();
  loadProducts();
});

/* ---------- DOM init ---------- */

function initializeDOMElements() {
  searchInput = document.getElementById("searchProducts");
  statusFilter = document.getElementById("filterStatus");
  variantsFilter = document.getElementById("filterVariants");

  productsContainer = document.getElementById("productsContainer");
  productForm = document.getElementById("productForm");

  totalProductsCount = document.getElementById("totalProducts");
  publishedCount = document.getElementById("publishedProducts");
  variantsCount = document.getElementById("variantsCount");
  totalStockCount = document.getElementById("totalStock");

  hasVariantsCheckbox = document.getElementById("hasVariants");
  variantsSection = document.getElementById("variantsSection");
  variantsList = document.getElementById("variantsList");

  productImagesInput = document.getElementById("productImages");
  imagePreviewContainer = document.getElementById("imagePreviewContainer");
  plansList = document.getElementById("plansList");

  // Regional elements — optional; safe checks
  isGlobalProductCheckbox = document.getElementById("isGlobalProduct");
  regionalSettingsSection = document.getElementById("regionalSettingsSection");
  regionalSettingsTableBody = document.getElementById(
    "regionalSettingsTableBody"
  );

  // Wire up variants checkbox behavior (existing logic preserved)
  if (hasVariantsCheckbox) {
    hasVariantsCheckbox.addEventListener("change", function () {
      if (this.checked) {
        if (variantsSection) {
          variantsSection.classList.remove("d-none");
          variantsSection.style.display = "block";
        }
        if (variantsList && variantsList.innerHTML === "") {
          addVariantField();
        }
      } else {
        if (variantsSection) {
          variantsSection.classList.add("d-none");
          variantsSection.style.display = "none";
        }
        if (variantsList) variantsList.innerHTML = "";
        variantCount = 0;
      }
    });
  }

  // Image preview on file select
  if (productImagesInput) {
    productImagesInput.addEventListener("change", handleImageSelect);
  }

  // If regions-config exists and regional UI exists, populate rows
  if (
    typeof window !== "undefined" &&
    window.SUPPORTED_REGIONS &&
    Array.isArray(window.SUPPORTED_REGIONS) &&
    regionalSettingsTableBody
  ) {
    buildRegionalRowsFromConfig();
  }
}

/* ---------- Events ---------- */

function setupEventListeners() {
  if (searchInput)
    searchInput.addEventListener(
      "input",
      window.utils
        ? window.utils.debounce(filterProducts, 300)
        : debounce(filterProducts, 300)
    );
  if (statusFilter) statusFilter.addEventListener("change", filterProducts);
  if (variantsFilter) variantsFilter.addEventListener("change", filterProducts);

  const addProductBtn = document.getElementById("addProductBtn");
  if (addProductBtn) {
    addProductBtn.addEventListener("click", function () {
      openAddProductModal();
    });
  }

  const saveProductBtn = document.getElementById("saveProductBtn");
  if (saveProductBtn) {
    saveProductBtn.addEventListener("click", saveProduct);
  }

  const addVariantBtn = document.getElementById("addVariantBtn");
  if (addVariantBtn) {
    addVariantBtn.addEventListener("click", addVariantField);
  }

  const addPlanBtn = document.getElementById("addPlanBtn");
  if (addPlanBtn) {
    addPlanBtn.addEventListener("click", addPlanField);
  }

  if (productForm) {
    productForm.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      AUTH.removeToken();
      localStorage.removeItem("epi_admin_user");
      window.location.href = "login.html";
    });
  }

 // Regional: global toggle show/hide
if (isGlobalProductCheckbox && regionalSettingsSection) {
  isGlobalProductCheckbox.addEventListener("change", function () {
    if (this.checked) {
      regionalSettingsSection.classList.add("d-none");
      regionalSettingsSection.style.display = "none";

      buildRegionalRowsFromConfig(null, false, true);
    } else {
      regionalSettingsSection.classList.remove("d-none");
      regionalSettingsSection.style.display = "block";

      buildRegionalRowsFromConfig(null, true, false);
    }
  });
}
}

/* ---------- Debounce fallback (if window.utils absent) ---------- */
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ---------- Load Categories ---------- */

async function loadCategories() {
  try {
    const response = await API.get("/categories/dropdown/all", {}, {});
    const categorySelect = document.getElementById("productCategory");
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
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat._id || cat.id || cat.categoryId;
      option.textContent = cat.name || cat.categoryName;
      option.setAttribute("data-category-name", cat.name || cat.categoryName);
      categorySelect.appendChild(option);

      if (cat.subCategories && Array.isArray(cat.subCategories)) {
        cat.subCategories.forEach((subCat) => {
          const subOption = document.createElement("option");
          subOption.value = subCat._id || subCat.id || subCat.categoryId;
          subOption.textContent = `  → ${subCat.name || subCat.categoryName}`;
          subOption.setAttribute(
            "data-category-name",
            subCat.name || subCat.categoryName
          );
          subOption.setAttribute(
            "data-parent-id",
            cat._id || cat.id || cat.categoryId
          );
          subOption.setAttribute(
            "data-parent-name",
            cat.name || cat.categoryName
          );
          categorySelect.appendChild(subOption);
        });
      }
    });
  } catch (err) {
    console.error("❌ [PRODUCTS] Load categories error:", err);
  }
}

/* ---------- Load Products ---------- */

async function loadProducts() {
  try {
    showLoading(true);

    const queryParams = {
      page: pagination.page,
      limit: pagination.limit,
      region: "global",
    };

    if (searchInput && searchInput.value.trim()) {
      queryParams.search = searchInput.value.trim();
    }

    if (statusFilter && statusFilter.value) {
      queryParams.status = statusFilter.value;
    }

    if (variantsFilter && variantsFilter.value !== "") {
      queryParams.hasVariants = variantsFilter.value;
    }

    const response = await API.get("/products/admin/all", {}, queryParams);

    let productsData = [];

    if (response && response.success !== false) {
      if (response.data && Array.isArray(response.data)) {
        productsData = response.data;
      } else if (Array.isArray(response)) {
        productsData = response;
      }

      if (response.pagination) {
        pagination.page = response.pagination.current || pagination.page;
        pagination.pages = response.pagination.pages || 1;
        pagination.total = response.pagination.total || 0;
      }
    }

    products = productsData.map((p) => {
      let descText = "";
      if (typeof p.description === "string") {
        descText = p.description;
      } else if (p.description && typeof p.description === "object") {
        descText = p.description.short || p.description.long || "";
      }

      return {
        _id: p._id || p.id || "",
        productId: p.productId || "",
        name: p.name || "",
        brand: p.brand || "",
        description: descText,
        category: p.category || {
          mainCategoryId: "",
          mainCategoryName: "",
          subCategoryId: "",
          subCategoryName: "",
        },
        sku: p.sku || "",
        pricing: p.pricing || {
          regularPrice: 0,
          salePrice: 0,
          currency: "USD",
        },
        availability: p.availability || {
          stockQuantity: 0,
          lowStockLevel: 5,
          isAvailable: true,
          stockStatus: "in_stock",
        },
        images: Array.isArray(p.images) ? p.images : [],
        hasVariants: p.hasVariants || false,
        variants: Array.isArray(p.variants) ? p.variants : [],
        status: p.status || "draft",
        isFeatured: p.isFeatured || false,
        isPopular: p.isPopular || false,
        isBestSeller: p.isBestSeller || false,
        isTrending: p.isTrending || false,
        warranty: p.warranty || null,
        origin: p.origin || "",
        project: p.project || "",
        dimensions: p.dimensions || null,
        tags: Array.isArray(p.tags) ? p.tags : [],
        seo: p.seo || null,
        referralBonus: p.referralBonus || null,
        paymentPlan: p.paymentPlan || null,
        regionalPricing: p.regionalPricing || [],
        regionalAvailability: p.regionalAvailability || [],
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
      };
    });

    updateStats(pagination.total);
    renderProducts();
  } catch (error) {
    console.error("❌ [PRODUCTS] Error loading products:", error);
    showNotification(
      "Failed to load products: " + (error.message || error),
      "error"
    );
  } finally {
    showLoading(false);
  }
}

/* ---------- Stats & Filters ---------- */

function updateStats(totalOverride) {
  const total =
    typeof totalOverride === "number" ? totalOverride : products.length;
  const published = products.filter((p) => p.status === "published").length;
  const withVariants = products.filter((p) => p.hasVariants).length;
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

function filterProducts() {
  pagination.page = 1;
  loadProducts();
}

/* ---------- Backend Pagination ---------- */

function renderPagination() {
  if (!productsContainer) return;

  let paginationContainer = document.getElementById("productsPagination");
  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.id = "productsPagination";
    paginationContainer.className = "d-flex justify-content-center mt-3";
    productsContainer.insertAdjacentElement("afterend", paginationContainer);
  }

  const totalPages = pagination.pages || 1;
  const currentPage = pagination.page || 1;

  if (pagination.total === 0 || totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let pagesHtml = "";

  const prevDisabled = currentPage <= 1;
  pagesHtml += `
    <li class="page-item ${prevDisabled ? "disabled" : ""}">
      <button class="page-link" ${
        prevDisabled
          ? 'tabindex="-1" aria-disabled="true"'
          : `onclick="changeProductPage(${currentPage - 1})"`
      }>&laquo; Previous</button>
    </li>
  `;

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    pagesHtml += `<li class="page-item"><button class="page-link" onclick="changeProductPage(1)">1</button></li>`;
    if (startPage > 2) {
      pagesHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const active = i === currentPage;
    pagesHtml += `
      <li class="page-item ${active ? "active" : ""}">
        <button class="page-link" onclick="changeProductPage(${i})">${i}</button>
      </li>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pagesHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    pagesHtml += `<li class="page-item"><button class="page-link" onclick="changeProductPage(${totalPages})">${totalPages}</button></li>`;
  }

  const nextDisabled = currentPage >= totalPages;
  pagesHtml += `
    <li class="page-item ${nextDisabled ? "disabled" : ""}">
      <button class="page-link" ${
        nextDisabled
          ? 'tabindex="-1" aria-disabled="true"'
          : `onclick="changeProductPage(${currentPage + 1})"`
      }>Next &raquo;</button>
    </li>
  `;

  paginationContainer.innerHTML = `
    <nav aria-label="Product pagination">
      <ul class="pagination">
        ${pagesHtml}
      </ul>
      <div class="text-muted text-center mt-2 small">
        Showing page ${currentPage} of ${totalPages} (${pagination.total} total products)
      </div>
    </nav>
  `;
}

function changeProductPage(page) {
  if (page < 1 || page > pagination.pages) return;
  pagination.page = page;
  loadProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Render ---------- */

function renderProducts() {
  if (!productsContainer) return;

  if (products.length === 0) {
    productsContainer.innerHTML =
      '<div class="empty-state text-center py-5"><i class="bi bi-box-x fs-2"></i><p class="mt-2">No products found</p></div>';
    renderPagination();
    return;
  }

  const html = products.map((product) => renderProductCard(product)).join("");
  productsContainer.innerHTML = html;

  renderPagination();
}

function renderProductCard(product) {
  const variantInfo =
    product.hasVariants && product.variants.length > 0
      ? `<span class="badge bg-warning me-2">${product.variants.length} variants</span>`
      : "";

  const stock =
    product.hasVariants && product.variants.length > 0
      ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      : product.availability?.stockQuantity || 0;

  return `
        <div class="card mb-3 product-card">
            <div class="card-body">
                <div class="row align-items-start">
                    <div class="col-md-8">
                        <h5>${escapeHtml(product.name)}</h5>
                        <div class="mb-2">
                            <span class="badge bg-secondary me-2">${escapeHtml(
                              product.brand || "N/A"
                            )}</span>
                            ${variantInfo}
                            <span class="badge ${
                              product.status === "published"
                                ? "bg-success"
                                : "bg-warning"
                            }">${escapeHtml(product.status)}</span>
                        </div>
                        <p class="text-muted small mb-2">${escapeHtml(
                          (product.description || "").substring(0, 150)
                        )}${
    (product.description || "").length > 150 ? "..." : ""
  }</p>
                        <div class="small">
                            <strong>Category:</strong> ${escapeHtml(
                              product.category.mainCategoryName || "N/A"
                            )}
                            ${
                              product.category.subCategoryName
                                ? ` > ${escapeHtml(
                                    product.category.subCategoryName
                                  )}`
                                : ""
                            }
                        </div>
                        <div class="small">
                            <strong>SKU:</strong> ${escapeHtml(
                              product.sku || product.productId || "N/A"
                            )}
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">
                            <div class="h6 text-primary">₹${(
                              product.pricing?.salePrice ||
                              product.pricing?.regularPrice ||
                              0
                            ).toFixed(2)}</div>
                            <small class="text-muted">Stock: <strong>${stock}</strong></small>
                        </div>
                        <small class="d-block text-muted mb-3">${
                          window.utils
                            ? window.utils.formatDate(product.updatedAt)
                            : new Date(product.updatedAt).toLocaleString()
                        }</small>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="editProduct('${
                              product.productId
                            }')" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="viewProductDetails('${
                              product.productId
                            }')" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteProduct('${
                              product.productId
                            }')" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* ---------- Modal / CRUD / Image Upload ---------- */

function handleImageSelect(e) {
  const files = e.target.files;
  selectedImageFiles = Array.from(files);

  if (!imagePreviewContainer) return;

  if (selectedImageFiles.length === 0) {
    imagePreviewContainer.innerHTML = "";
    return;
  }

  if (selectedImageFiles.length > 10) {
    showNotification("Maximum 10 images allowed", "error");
    selectedImageFiles = selectedImageFiles.slice(0, 10);
  }

  imagePreviewContainer.innerHTML = "";

  selectedImageFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const col = document.createElement("div");
      col.className = "col-md-2";
      col.innerHTML = `
        <div class="position-relative">
          <img src="${e.target.result}" class="img-thumbnail" alt="Preview">
          <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" onclick="removeImagePreview(${index})">
            <i class="bi bi-x"></i>
          </button>
          ${
            index === 0
              ? '<span class="badge bg-primary position-absolute bottom-0 start-0 m-1">Primary</span>'
              : ""
          }
        </div>
      `;
      imagePreviewContainer.appendChild(col);
    };
    reader.readAsDataURL(file);
  });
}

function removeImagePreview(index) {
  selectedImageFiles.splice(index, 1);

  if (productImagesInput) {
    const dt = new DataTransfer();
    selectedImageFiles.forEach((file) => dt.items.add(file));
    productImagesInput.files = dt.files;
  }

  handleImageSelect({ target: { files: selectedImageFiles } });
}

async function uploadProductImages(productId) {
  if (!selectedImageFiles || selectedImageFiles.length === 0) return;

  try {
    let uploadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedImageFiles.length; i++) {
      const file = selectedImageFiles[i];
      const formData = new FormData();
      formData.append("images", file);
      formData.append("altText", "Product image");

      try {
        const url = `${window.BASE_URL}/products/${productId}/images`;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${AUTH.getToken()}`,
          },
          body: formData,
        });
        const result = await response.json();
        if (result.success) {
          uploadedCount++;
        } else {
          failedCount++;
          console.error("Image upload failed:", result);
        }
      } catch (err) {
        failedCount++;
        console.error("Image upload error:", err);
      }
    }

    if (uploadedCount > 0) {
      showNotification(
        `${uploadedCount} images uploaded successfully${
          failedCount > 0 ? `, ${failedCount} failed` : ""
        }`,
        uploadedCount === selectedImageFiles.length ? "success" : "info"
      );
    } else {
      showNotification("Failed to upload images", "error");
    }
  } catch (err) {
    console.error("❌ [PRODUCTS] Image upload error:", err);
    showNotification("Failed to upload images: " + err.message, "error");
  }
}

async function uploadVariantImages(
  productId,
  variantImageFiles,
  createdVariants
) {
  if (!variantImageFiles || variantImageFiles.length === 0) return;

  try {
    let uploadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < variantImageFiles.length; i++) {
      const { variantIndex, file } = variantImageFiles[i];
      const variant = createdVariants && createdVariants[variantIndex];
      if (!variant || !variant.variantId) {
        failedCount++;
        continue;
      }

      const formData = new FormData();
      formData.append("images", file);
      formData.append("altText", "Variant image");

      try {
        const url = `${window.BASE_URL}/products/${productId}/variants/${variant.variantId}/images`;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${AUTH.getToken()}`,
          },
          body: formData,
        });
        const result = await response.json();
        if (result.success) {
          uploadedCount++;
        } else {
          failedCount++;
          console.error("Variant image upload failed:", result);
        }
      } catch (err) {
        failedCount++;
        console.error("Variant image upload error:", err);
      }
    }

    if (uploadedCount > 0) {
      showNotification(
        `${uploadedCount} variant images uploaded${
          failedCount > 0 ? `, ${failedCount} failed` : ""
        }`,
        "info"
      );
    }
  } catch (err) {
    console.error("❌ [PRODUCTS] Variant image upload error:", err);
  }
}

/* ---------- Payment Plan Functions (per-day plans list) ---------- */

function addPlanField() {
  planCount++;
  const html = `
    <div class="card mb-2" id="plan-${planCount}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>Plan ${planCount}</strong>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="removePlanField(${planCount})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
        <div class="row mb-2">
          <div class="col-md-6">
            <label class="form-label">Plan Name *</label>
            <input type="text" class="form-control form-control-sm" data-plan-name placeholder="e.g., Quick Plan" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Days *</label>
            <input type="number" class="form-control form-control-sm" data-plan-days min="1" placeholder="e.g., 30" required />
          </div>
        </div>
        <div class="row mb-2">
          <div class="col-md-6">
            <label class="form-label">Per Day Amount (₹) *</label>
            <input type="number" class="form-control form-control-sm" data-plan-amount min="0" step="0.01" placeholder="e.g., 1500" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Total Amount (₹)</label>
            <input type="number" class="form-control form-control-sm" data-plan-total readonly placeholder="Auto-calculated" />
          </div>
        </div>
        <div class="row mb-2">
          <div class="col-md-12">
            <label class="form-label">Description (Optional)</label>
            <input type="text" class="form-control form-control-sm" data-plan-description placeholder="e.g., Pay in 30 days" />
          </div>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" data-plan-recommended />
          <label class="form-check-label">Recommended Plan</label>
        </div>
      </div>
    </div>
  `;
  plansList.insertAdjacentHTML("beforeend", html);

  const card = document.getElementById(`plan-${planCount}`);
  const daysInput = card.querySelector("[data-plan-days]");
  const amountInput = card.querySelector("[data-plan-amount]");
  const totalInput = card.querySelector("[data-plan-total]");

  const calculateTotal = () => {
    const days = parseFloat(daysInput.value) || 0;
    const amount = parseFloat(amountInput.value) || 0;
    totalInput.value = (days * amount).toFixed(2);
  };

  daysInput.addEventListener("input", calculateTotal);
  amountInput.addEventListener("input", calculateTotal);
}

function removePlanField(idx) {
  document.getElementById(`plan-${idx}`)?.remove();
}

/* ---------- Modal Functions ---------- */

function openAddProductModal() {
  currentProductId = null;
  variantCount = 0;
  planCount = 0;
  selectedImageFiles = [];

  if (productForm) productForm.reset();

  const titleEl = document.getElementById("productModalLabel");
  if (titleEl) titleEl.textContent = "Add Product";

  if (hasVariantsCheckbox) hasVariantsCheckbox.checked = false;
  if (variantsSection) {
    variantsSection.classList.add("d-none");
    variantsSection.style.display = "none";
  }
  if (variantsList) variantsList.innerHTML = "";
  if (plansList) plansList.innerHTML = "";
  if (imagePreviewContainer) imagePreviewContainer.innerHTML = "";
  if (productImagesInput) productImagesInput.value = "";

  const isFeaturedEl = document.getElementById("isFeatured");
  const isPopularEl = document.getElementById("isPopular");
  const isBestSellerEl = document.getElementById("isBestSeller");
  const isTrendingEl = document.getElementById("isTrending");

  if (isFeaturedEl) isFeaturedEl.checked = false;
  if (isPopularEl) isPopularEl.checked = false;
  if (isBestSellerEl) isBestSellerEl.checked = false;
  if (isTrendingEl) isTrendingEl.checked = false;

  const metaTitleEl = document.getElementById("productMetaTitle");
  const metaDescEl = document.getElementById("productMetaDescription");
  const metaKeywordsEl = document.getElementById("productMetaKeywords");
  if (metaTitleEl) metaTitleEl.value = "";
  if (metaDescEl) metaDescEl.value = "";
  if (metaKeywordsEl) metaKeywordsEl.value = "";

  const referralEnabledEl = document.getElementById("referralEnabled");
  const referralTypeEl = document.getElementById("referralType");
  const referralValueEl = document.getElementById("referralValue");
  const referralMinPurchaseEl = document.getElementById("referralMinPurchase");
  if (referralEnabledEl) referralEnabledEl.checked = false;
  if (referralTypeEl) referralTypeEl.value = "percentage";
  if (referralValueEl) referralValueEl.value = "";
  if (referralMinPurchaseEl) referralMinPurchaseEl.value = "";

  const ppEnabledEl = document.getElementById("paymentPlanEnabled");
  const ppMinEl = document.getElementById("paymentPlanMinDown");
  const ppMaxEl = document.getElementById("paymentPlanMaxDown");
  const ppInterestEl = document.getElementById("paymentPlanInterest");
  if (ppEnabledEl) ppEnabledEl.checked = false;
  if (ppMinEl) ppMinEl.value = "";
  if (ppMaxEl) ppMaxEl.value = "";
  if (ppInterestEl) ppInterestEl.value = "";

  // Regional reset — only if UI exists
  if (isGlobalProductCheckbox) isGlobalProductCheckbox.checked = true;
  if (regionalSettingsSection) {
    regionalSettingsSection.classList.add("d-none");
    regionalSettingsSection.style.display = "none";
  }
  if (regionalSettingsTableBody) regionalSettingsTableBody.innerHTML = "";

  const modalEl = document.getElementById("productModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();

  // rebuild regional rows with defaults if config present
  if (window.SUPPORTED_REGIONS && regionalSettingsTableBody) {
    buildRegionalRowsFromConfig();
  }
}

async function editProduct(productId) {
  const product = products.find((p) => p.productId === productId);
  if (!product) {
    alert("Product not found in list. Please refresh the page.");
    return;
  }

  // Store Mongo _id for update endpoints (consistent with previous logic)
  currentProductId = product._id || product.productId;

  const labelEl = document.getElementById("productModalLabel");
  if (labelEl) labelEl.textContent = "Edit Product";

  document.getElementById("productName").value = product.name || "";
  document.getElementById("productBrand").value = product.brand || "";
  document.getElementById("productDescription").value =
    product.description || "";
  document.getElementById("productCategory").value =
    product.category?.mainCategoryId || "";
  document.getElementById("productSku").value = product.sku || "";
  document.getElementById("productPrice").value =
    product.pricing?.regularPrice || "";
  document.getElementById("productSalePrice").value =
    product.pricing?.salePrice || "";
  document.getElementById("productStock").value =
    product.availability?.stockQuantity ?? "";

  const uiAvailability = mapBackendStockStatusToUI(
    product.availability?.stockStatus
  );
  const availabilityEl = document.getElementById("productAvailability");
  if (availabilityEl) availabilityEl.value = uiAvailability;

  const hasVariantsEl = document.getElementById("hasVariants");
  if (hasVariantsEl) hasVariantsEl.checked = product.hasVariants || false;
  if (variantsSection)
    variantsSection.style.display = product.hasVariants ? "block" : "none";

  if (product.hasVariants && product.variants.length > 0) {
    variantsList.innerHTML = product.variants
      .map((v, idx) => renderVariantField(v, idx))
      .join("");
    variantCount = product.variants.length;
  } else {
    variantsList.innerHTML = "";
    variantCount = 0;
  }

  const isFeaturedEl = document.getElementById("isFeatured");
  const isPopularEl = document.getElementById("isPopular");
  const isBestSellerEl = document.getElementById("isBestSeller");
  const isTrendingEl = document.getElementById("isTrending");

  if (isFeaturedEl) isFeaturedEl.checked = product.isFeatured || false;
  if (isPopularEl) isPopularEl.checked = product.isPopular || false;
  if (isBestSellerEl) isBestSellerEl.checked = product.isBestSeller || false;
  if (isTrendingEl) isTrendingEl.checked = product.isTrending || false;

  const warrantyPeriodEl = document.getElementById("warrantyPeriod");
  const warrantyReturnPolicyEl = document.getElementById(
    "warrantyReturnPolicy"
  );
  if (warrantyPeriodEl) warrantyPeriodEl.value = product.warranty?.period || "";
  if (warrantyReturnPolicyEl)
    warrantyReturnPolicyEl.value = product.warranty?.returnPolicy || "";

  const productOriginEl = document.getElementById("productOrigin");
  const productProjectEl = document.getElementById("productProject");
  if (productOriginEl) productOriginEl.value = product.origin || "";
  if (productProjectEl) productProjectEl.value = product.project || "";

  const dimensionLengthEl = document.getElementById("dimensionLength");
  const dimensionWidthEl = document.getElementById("dimensionWidth");
  const dimensionHeightEl = document.getElementById("dimensionHeight");
  const productWeightEl = document.getElementById("productWeight");

  if (dimensionLengthEl)
    dimensionLengthEl.value = product.dimensions?.length || "";
  if (dimensionWidthEl)
    dimensionWidthEl.value = product.dimensions?.width || "";
  if (dimensionHeightEl)
    dimensionHeightEl.value = product.dimensions?.height || "";
  if (productWeightEl) productWeightEl.value = product.dimensions?.weight || "";

  const productTagsEl = document.getElementById("productTags");
  if (productTagsEl) {
    const tagsValue = Array.isArray(product.tags)
      ? product.tags.join(", ")
      : "";
    productTagsEl.value = tagsValue;
  }

  const metaTitleEl = document.getElementById("productMetaTitle");
  const metaDescEl = document.getElementById("productMetaDescription");
  const metaKeywordsEl = document.getElementById("productMetaKeywords");
  if (metaTitleEl) metaTitleEl.value = product.seo?.metaTitle || "";
  if (metaDescEl) metaDescEl.value = product.seo?.metaDescription || "";
  if (metaKeywordsEl)
    metaKeywordsEl.value = Array.isArray(product.seo?.keywords)
      ? product.seo.keywords.join(", ")
      : "";

  const referralEnabledEl = document.getElementById("referralEnabled");
  const referralTypeEl = document.getElementById("referralType");
  const referralValueEl = document.getElementById("referralValue");
  const referralMinPurchaseEl = document.getElementById("referralMinPurchase");

  if (referralEnabledEl)
    referralEnabledEl.checked = product.referralBonus?.enabled || false;
  if (referralTypeEl)
    referralTypeEl.value = product.referralBonus?.type || "percentage";
  if (referralValueEl)
    referralValueEl.value = product.referralBonus?.value ?? "";
  if (referralMinPurchaseEl)
    referralMinPurchaseEl.value = product.referralBonus?.minPurchase ?? "";

  const ppEnabledEl = document.getElementById("paymentPlanEnabled");
  const ppMinEl = document.getElementById("paymentPlanMinDown");
  const ppMaxEl = document.getElementById("paymentPlanMaxDown");
  const ppInterestEl = document.getElementById("paymentPlanInterest");

  if (ppEnabledEl) ppEnabledEl.checked = product.paymentPlan?.enabled || false;
  if (ppMinEl) ppMinEl.value = product.paymentPlan?.minDownPayment ?? "";
  if (ppMaxEl) ppMaxEl.value = product.paymentPlan?.maxDownPayment ?? "";
  if (ppInterestEl)
    ppInterestEl.value = product.paymentPlan?.interestRate ?? "";

  const statusRadio = document.querySelector(
    `input[name="status"][value="${product.status}"]`
  );
  if (statusRadio) statusRadio.checked = true;

  // Regional: populate regional rows with product data when available
  if (regionalSettingsTableBody && window.SUPPORTED_REGIONS) {
    buildRegionalRowsFromConfig(product);
  }

  const modalEl = document.getElementById("productModal");
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
                    <label class="form-label">Variant Image (Optional)</label>
                    <input type="file" class="form-control form-control-sm" data-variant-image accept="image/jpeg,image/jpg,image/png,image/webp" />
                </div>
            </div>
        </div>
    `;
  variantsList.insertAdjacentHTML("beforeend", html);
}

function renderVariantField(variant, idx) {
  const color = variant.attributes?.color || "";
  const storage = variant.attributes?.storage || "";
  const hasExistingImage = variant.images && variant.images.length > 0;
  const existingImageUrl = hasExistingImage ? variant.images[0]?.url : "";

  // idx might be 0-based; ensure unique DOM id
  const domIdx = typeof idx === "number" ? idx + 1 : variantCount + 1;

  return `
        <div class="variant-card" id="variant-${domIdx}">
            <div class="variant-header d-flex justify-content-between align-items-center">
                <span><strong>Variant ${domIdx}</strong></span>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeVariantField(${domIdx})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="row mb-2">
                <div class="col-md-6">
                    <label class="form-label">Color</label>
                    <input type="text" class="form-control form-control-sm" data-variant-color value="${escapeHtml(
                      color
                    )}" />
                </div>
                <div class="col-md-6">
                    <label class="form-label">Storage/Size</label>
                    <input type="text" class="form-control form-control-sm" data-variant-storage value="${escapeHtml(
                      storage
                    )}" />
                </div>
            </div>
            <div class="row mb-2">
                <div class="col-md-3">
                    <label class="form-label">Price *</label>
                    <input type="number" class="form-control form-control-sm" data-variant-price step="0.01" min="0" value="${
                      variant.price || ""
                    }" required />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Sale Price</label>
                    <input type="number" class="form-control form-control-sm" data-variant-sale-price step="0.01" min="0" value="${
                      variant.salePrice || ""
                    }" />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Stock</label>
                    <input type="number" class="form-control form-control-sm" data-variant-stock min="0" value="${
                      variant.stock || "0"
                    }" />
                </div>
                <div class="col-md-3">
                    <label class="form-label">Variant Image (Optional)</label>
                    <input type="file" class="form-control form-control-sm" data-variant-image accept="image/jpeg,image/jpg,image/png,image/webp" />
                    ${
                      hasExistingImage
                        ? `<small class="text-muted">Current: ${escapeHtml(
                            existingImageUrl.split("/").pop()
                          )}</small>`
                        : ""
                    }
                </div>
            </div>
        </div>
    `;
}

function removeVariantField(idx) {
  document.getElementById(`variant-${idx}`)?.remove();
}

/* ---------- Regional helpers (optional) ---------- */

/**
 * buildRegionalRowsFromConfig
 * - If called with a product, fills the rows with product.regionalPricing/regionalAvailability values
 * - If called without product, builds empty/default rows from SUPPORTED_REGIONS
 * Safe: does nothing if SUPPORTED_REGIONS or regionalSettingsTableBody are not present.
 */
function buildRegionalRowsFromConfig(
  product = null,
  forceAllOff = false,
  forceAllOn = false
) {
  if (!regionalSettingsTableBody || typeof window === "undefined") return;
  regionalSettingsTableBody.innerHTML = "";

  const regions = Array.isArray(window.SUPPORTED_REGIONS)
    ? window.SUPPORTED_REGIONS
    : [];

  regions.forEach((r) => {
    const existingPricing =
      product && Array.isArray(product.regionalPricing)
        ? product.regionalPricing.find((p) => p.region === r.code)
        : null;

    const existingAvailability =
      product && Array.isArray(product.regionalAvailability)
        ? product.regionalAvailability.find((a) => a.region === r.code)
        : null;

    let checkedState = "";

    // ------------------------------
    //  NEW LOGIC
    // ------------------------------
    if (forceAllOff) {
      checkedState = ""; // all unchecked
    } else if (forceAllOn) {
      checkedState = "checked"; // all checked
    } else {
      // editing existing product → use stored values
      checkedState = existingAvailability
        ? existingAvailability.isAvailable
          ? "checked"
          : ""
        : "checked"; // default old behavior
    }

    const row = document.createElement("tr");
    row.setAttribute("data-region", r.code);
    row.innerHTML = `
      <td>${r.flag} ${
      r.name
    } <input type="hidden" class="regional-region" value="${r.code}" /></td>

      <td>
        <div class="form-check form-switch">
          <input class="form-check-input regional-available" type="checkbox" ${checkedState}>
        </div>
      </td>

      <td>
        <input type="number" class="form-control form-control-sm regional-stock"
          value="${
            existingAvailability ? existingAvailability.stockQuantity : 0
          }"
          min="0"
        />
      </td>

      <td>
        <input type="number" class="form-control form-control-sm regional-price"
          value="${
            existingPricing
              ? existingPricing.finalPrice ||
                existingPricing.salePrice ||
                existingPricing.regularPrice ||
                0
              : 0
          }"
          step="0.01"
          min="0"
        />
      </td>

      <td>
        <input type="number" class="form-control form-control-sm regional-sale-price"
          value="${existingPricing ? existingPricing.salePrice || "" : ""}"
          step="0.01"
          min="0"
        />
      </td>
    `;

    regionalSettingsTableBody.appendChild(row);
  });
}

/**
 * collectRegionalPayloadFromUI
 * - Reads the regional rows and returns arrays: regionalPricing[] and regionalAvailability[]
 * - Safe: returns empty arrays if regional UI not present
 */
function collectRegionalPayloadFromUI() {
  const pricing = [];
  const availability = [];

  if (!regionalSettingsTableBody)
    return { regionalPricing: pricing, regionalAvailability: availability };

  const rows = Array.from(regionalSettingsTableBody.querySelectorAll("tr"));
  rows.forEach((row) => {
    const region = row.querySelector(".regional-region")?.value;
    if (!region) return;

    const isAvailable = !!row.querySelector(".regional-available")?.checked;
    const stockQuantity =
      parseInt(row.querySelector(".regional-stock")?.value) || 0;
    const finalPrice =
      parseFloat(row.querySelector(".regional-price")?.value) || 0;
    const salePriceVal = row.querySelector(".regional-sale-price")?.value;
    const salePrice = salePriceVal === "" ? null : parseFloat(salePriceVal);

    pricing.push({
      region,
      currency:
        RegionUtils && RegionUtils.getRegionByCode
          ? RegionUtils.getRegionByCode(region)?.currency || "USD"
          : "USD",
      regularPrice: finalPrice,
      salePrice: salePrice || finalPrice,
      costPrice: null,
      finalPrice: salePrice || finalPrice,
    });

    let stockStatus = "in_stock";
    if (stockQuantity <= 0) stockStatus = "out_of_stock";
    else if (stockQuantity <= 10) stockStatus = "low_stock";

    availability.push({
      region,
      stockQuantity,
      lowStockLevel: 10,
      isAvailable,
      stockStatus,
    });
  });

  return { regionalPricing: pricing, regionalAvailability: availability };
}

/* ---------- Save Product (create/update) ---------- */

async function saveProduct() {
  const name = document.getElementById("productName").value.trim();
  const brand = document.getElementById("productBrand").value.trim();
  const description = document
    .getElementById("productDescription")
    .value.trim();
  const categoryId = document.getElementById("productCategory").value.trim();
  const sku = document.getElementById("productSku").value.trim();

  const priceInput = document.getElementById("productPrice");
  const salePriceInput = document.getElementById("productSalePrice");
  const stockInput = document.getElementById("productStock");

  const price = parseFloat(priceInput.value);
  const salePrice = parseFloat(salePriceInput.value) || 0;
  const stockRaw = stockInput.value;
  const stock =
    stockRaw === "" || isNaN(parseInt(stockRaw, 10))
      ? NaN
      : parseInt(stockRaw, 10);

  const availabilityValue = document.getElementById(
    "productAvailability"
  ).value;
  const status =
    document.querySelector('input[name="status"]:checked')?.value || "draft";
  const hasVariants = document.getElementById("hasVariants").checked;

  // basic validations (kept identical to previous logic)
  if (!name) {
    alert("Product name is required");
    return;
  }
  if (!categoryId) {
    alert("Category is required");
    return;
  }
  if (isNaN(price) || price <= 0) {
    alert("Price must be greater than 0");
    return;
  }
  if (!description) {
    alert("Description is required");
    return;
  }
  if (stockRaw === "") {
    alert("Stock is required");
    return;
  }
  if (isNaN(stock) || stock <= 0) {
    alert("Stock must be greater than 0");
    return;
  }
  if (!isNaN(salePrice) && salePrice > 0 && salePrice > price) {
    alert("Sale price cannot be greater than regular price");
    return;
  }

  const { stockStatus, isAvailable } =
    mapUIAvailabilityToBackend(availabilityValue);

  const categorySelect = document.getElementById("productCategory");
  const selectedOption = categorySelect.options[categorySelect.selectedIndex];
  const categoryName =
    selectedOption.getAttribute("data-category-name") ||
    selectedOption.text.trim();
  const parentId = selectedOption.getAttribute("data-parent-id");
  const parentName = selectedOption.getAttribute("data-parent-name");

  const isFeatured = document.getElementById("isFeatured")?.checked || false;
  const isPopular = document.getElementById("isPopular")?.checked || false;
  const isBestSeller =
    document.getElementById("isBestSeller")?.checked || false;
  const isTrending = document.getElementById("isTrending")?.checked || false;

  const warrantyPeriod =
    parseInt(document.getElementById("warrantyPeriod")?.value) || 0;
  const warrantyReturnPolicy =
    parseInt(document.getElementById("warrantyReturnPolicy")?.value) || 0;
  const productOrigin =
    document.getElementById("productOrigin")?.value.trim() || "";
  const productProject =
    document.getElementById("productProject")?.value.trim() || "";

  const dimensionLength =
    parseFloat(document.getElementById("dimensionLength")?.value) || 0;
  const dimensionWidth =
    parseFloat(document.getElementById("dimensionWidth")?.value) || 0;
  const dimensionHeight =
    parseFloat(document.getElementById("dimensionHeight")?.value) || 0;
  const productWeight =
    parseFloat(document.getElementById("productWeight")?.value) || 0;

  const productTags =
    document.getElementById("productTags")?.value.trim() || "";

  const payload = {
    name,
    brand,
    description: { short: description, long: description },
    category: {
      mainCategoryId: parentId || categoryId,
      mainCategoryName: parentName || categoryName,
      subCategoryId: parentId ? categoryId : null,
      subCategoryName: parentId ? categoryName : null,
    },
    sku,
    pricing: {
      regularPrice: price,
      salePrice: !isNaN(salePrice) && salePrice > 0 ? salePrice : price,
      currency: "INR",
    },
    availability: {
      isAvailable,
      stockQuantity: stock,
      lowStockLevel: 5,
      stockStatus,
    },
    status,
    hasVariants,
    isFeatured,
    isPopular,
    isBestSeller,
    isTrending,
  };

  if (warrantyPeriod > 0 || warrantyReturnPolicy > 0) {
    payload.warranty = {
      period: warrantyPeriod > 0 ? warrantyPeriod : undefined,
      returnPolicy: warrantyReturnPolicy > 0 ? warrantyReturnPolicy : undefined,
    };
  }

  if (productOrigin) payload.origin = productOrigin;
  if (productProject) payload.project = productProject;

  if (
    dimensionLength > 0 ||
    dimensionWidth > 0 ||
    dimensionHeight > 0 ||
    productWeight > 0
  ) {
    payload.dimensions = {
      length: dimensionLength || 0,
      width: dimensionWidth || 0,
      height: dimensionHeight || 0,
      weight: productWeight || 0,
      unit: "cm",
    };
  }

  if (productTags) {
    payload.tags = productTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  const metaTitle =
    document.getElementById("productMetaTitle")?.value.trim() || "";
  const metaDescription =
    document.getElementById("productMetaDescription")?.value.trim() || "";
  const metaKeywordsRaw =
    document.getElementById("productMetaKeywords")?.value.trim() || "";

  if (metaTitle || metaDescription || metaKeywordsRaw) {
    const keywords = metaKeywordsRaw
      ? metaKeywordsRaw
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0)
      : [];
    payload.seo = {
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      keywords,
    };
  }

  // Referral
  const referralEnabled =
    document.getElementById("referralEnabled")?.checked || false;
  const referralType =
    document.getElementById("referralType")?.value || "percentage";
  const referralValue =
    parseFloat(document.getElementById("referralValue")?.value) || 0;
  const referralMinPurchase =
    parseFloat(document.getElementById("referralMinPurchase")?.value) || 0;

  if (referralEnabled && referralValue > 0) {
    payload.referralBonus = {
      enabled: true,
      type: referralType,
      value: referralValue,
      minPurchase: referralMinPurchase || 0,
    };
  } else {
    if (currentProductId) {
      payload.referralBonus = {
        enabled: false,
        type: referralType,
        value: referralValue || 0,
        minPurchase: referralMinPurchase || 0,
      };
    }
  }

  // Global Payment Plan Config
  const ppEnabled =
    document.getElementById("paymentPlanEnabled")?.checked || false;
  const ppMinDown =
    parseFloat(document.getElementById("paymentPlanMinDown")?.value) || 0;
  const ppMaxDown =
    parseFloat(document.getElementById("paymentPlanMaxDown")?.value) || 0;
  const ppInterest =
    parseFloat(document.getElementById("paymentPlanInterest")?.value) || 0;

  if (ppEnabled && (ppMinDown > 0 || ppMaxDown > 0 || ppInterest > 0)) {
    payload.paymentPlan = {
      enabled: true,
      minDownPayment: ppMinDown || 0,
      maxDownPayment: ppMaxDown || 0,
      interestRate: ppInterest || 0,
    };
  } else {
    if (currentProductId) {
      payload.paymentPlan = {
        enabled: false,
        minDownPayment: ppMinDown || 0,
        maxDownPayment: ppMaxDown || 0,
        interestRate: ppInterest || 0,
      };
    }
  }

  // Collect payment plans list
  const planCards = document.querySelectorAll('[id^="plan-"]');
  const plans = [];
  planCards.forEach((card) => {
    const nameInput = card.querySelector("[data-plan-name]");
    const daysInput = card.querySelector("[data-plan-days]");
    const amountInput = card.querySelector("[data-plan-amount]");
    const descInput = card.querySelector("[data-plan-description]");
    const recommendedInput = card.querySelector("[data-plan-recommended]");

    const planName = nameInput?.value?.trim();
    const days = parseInt(daysInput?.value) || 0;
    const perDayAmount = parseFloat(amountInput?.value) || 0;

    if (planName && days > 0 && perDayAmount > 0) {
      const plan = {
        name: planName,
        days: days,
        perDayAmount: perDayAmount,
        totalAmount: days * perDayAmount,
        isRecommended: recommendedInput?.checked || false,
        description: descInput?.value?.trim() || "",
      };
      plans.push(plan);
    }
  });

  if (plans.length > 0) payload.plans = plans;

  // Collect variants
  let variantImageFiles = [];
  if (hasVariants) {
    const variantCards = document.querySelectorAll(".variant-card");
    const variants = [];

    variantCards.forEach((card, idx) => {
      const colorInput = card.querySelector("[data-variant-color]");
      const storageInput = card.querySelector("[data-variant-storage]");
      const variantPrice = card.querySelector("[data-variant-price]");
      const variantSalePrice = card.querySelector("[data-variant-sale-price]");
      const variantStock = card.querySelector("[data-variant-stock]");
      const variantImageInput = card.querySelector("[data-variant-image]");

      const vPrice = parseFloat(variantPrice?.value) || 0;
      const vSalePrice = parseFloat(variantSalePrice?.value) || 0;

      if (vPrice <= 0) return;
      if (vSalePrice > 0 && vSalePrice > vPrice) return;

      const variant = {
        attributes: {
          color: colorInput?.value?.trim() || "",
          storage: storageInput?.value?.trim() || "",
        },
        price: vPrice,
        salePrice: vSalePrice > 0 ? vSalePrice : vPrice,
        stock: parseInt(variantStock?.value) || 0,
      };

      if (
        variantImageInput &&
        variantImageInput.files &&
        variantImageInput.files.length > 0
      ) {
        variantImageFiles.push({
          variantIndex: idx,
          file: variantImageInput.files[0],
        });
      }

      variants.push(variant);
    });

    if (variants.length === 0) {
      alert("Add at least one variant with valid price");
      return;
    }

    payload.variants = variants;
  }

  // Regional: collect regional pricing & availability if UI present AND user unchecked global
  if (regionalSettingsTableBody) {
    // if global checkbox exists and is checked => treat as global product (no regional override)
    const isGlobal = isGlobalProductCheckbox
      ? !!isGlobalProductCheckbox.checked
      : true;
    if (!isGlobal) {
      const { regionalPricing, regionalAvailability } =
        collectRegionalPayloadFromUI();
      payload.regionalPricing = regionalPricing;
      payload.regionalAvailability = regionalAvailability;
    } else {
      // If global, ensure at least one global entry exists (backend default handles fallback)
      // Optionally, include global pricing from main payload.pricing
      payload.regionalPricing = payload.regionalPricing || [];
      payload.regionalAvailability = payload.regionalAvailability || [];
    }
  }

  // Save/start API call
  try {
    showLoading(true);
    let savedProductId = currentProductId;
    let createdVariants = null;

    if (currentProductId) {
      // Update mode: use existing API.put flow (preserve your API util usage)
      const updateResponse = await API.put("/products/:id", payload, {
        id: currentProductId,
      });
      if (
        updateResponse &&
        updateResponse.data &&
        updateResponse.data.variants
      ) {
        createdVariants = updateResponse.data.variants;
      }
      showNotification("Product updated successfully", "success");
    } else {
      // Create mode
      const response = await API.post("/products", payload);
      if (response && response.data) {
        if (response.data.productId) savedProductId = response.data.productId;
        if (response.data.variants) createdVariants = response.data.variants;
      }
      showNotification("Product created successfully", "success");
    }

    // Upload product images (if any)
    if (savedProductId && selectedImageFiles.length > 0) {
      await uploadProductImages(savedProductId);
    }

    // Upload variant images
    if (savedProductId && variantImageFiles.length > 0 && createdVariants) {
      await uploadVariantImages(
        savedProductId,
        variantImageFiles,
        createdVariants
      );
    }

    // Close modal, reset
    const modalEl = document.getElementById("productModal");
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    if (productForm) productForm.reset();
    currentProductId = null;
    variantCount = 0;
    planCount = 0;
    selectedImageFiles = [];
    if (variantsList) variantsList.innerHTML = "";
    if (plansList) plansList.innerHTML = "";
    if (imagePreviewContainer) imagePreviewContainer.innerHTML = "";
    if (productImagesInput) productImagesInput.value = "";

    await loadProducts();
  } catch (err) {
    console.error("❌ [PRODUCTS] Save product error:", err);
    showNotification(
      "Error: " + (err.message || "Failed to save product"),
      "error"
    );
  } finally {
    showLoading(false);
  }
}

/* ---------- Toggle / Delete / View ---------- */

async function toggleProductStatus(productId) {
  try {
    showLoading(true);
    const product = products.find((p) => p.productId === productId);
    if (!product) throw new Error("Product not found");

    const newStatus = product.status === "published" ? "draft" : "published";

    const payload = { status: newStatus };

    await API.put("/products/:productId", payload, { productId });
    showNotification(`Product ${newStatus} successfully`, "success");
    await loadProducts();
  } catch (err) {
    console.error("Toggle status error:", err);
    showNotification("Failed to update product status", "error");
  } finally {
    showLoading(false);
  }
}

async function deleteProduct(productId) {
  const product = products.find((p) => p.productId === productId);
  if (!product) {
    showNotification("Product not found", "error");
    return;
  }

  const confirmed = confirm(`Delete "${product.name}"?`);
  if (!confirmed) return;

  try {
    showLoading(true);
    await API.delete("/products/:productId", { productId });
    showNotification("Product deleted successfully", "success");
    await loadProducts();
  } catch (err) {
    console.error("❌ [PRODUCTS] Delete product error:", err);
    showNotification(err.message || "Failed to delete product", "error");
  } finally {
    showLoading(false);
  }
}

async function viewProductDetails(productId) {
  const product = products.find((p) => p.productId === productId);
  if (!product) {
    showNotification("Product not found", "error");
    return;
  }

  const stock =
    product.hasVariants && product.variants.length > 0
      ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      : product.availability?.stockQuantity || 0;

  let details = `<div class="container-fluid">`;

  details += `<div class="mb-4 pb-3 border-bottom">`;
  details += `<h5>${escapeHtml(product.name)}</h5>`;
  details += `<div class="mb-2">`;
  details += `<span class="badge bg-secondary me-2">${escapeHtml(
    product.brand || "N/A"
  )}</span>`;
  details += `<span class="badge ${
    product.status === "published" ? "bg-success" : "bg-warning"
  }">${escapeHtml(product.status)}</span>`;
  details += `</div>`;
  details += `</div>`;

  if (product.description) {
    details += `<div class="mb-3">`;
    details += `<strong>Description:</strong>`;
    details += `<p>${escapeHtml(product.description)}</p>`;
    details += `</div>`;
  }

  details += `<div class="row mb-3">`;
  details += `<div class="col-md-6">`;
  details += `<div><strong>Category:</strong> ${escapeHtml(
    product.category?.mainCategoryName || "N/A"
  )}`;
  if (product.category?.subCategoryName)
    details += ` > ${escapeHtml(product.category.subCategoryName)}`;
  details += `</div>`;
  details += `</div>`;
  details += `<div class="col-md-6">`;
  details += `<div><strong>SKU:</strong> ${escapeHtml(
    product.sku || product.productId || "N/A"
  )}</div>`;
  details += `</div>`;
  details += `</div>`;

  details += `<div class="row mb-3 pb-3 border-bottom">`;
  details += `<div class="col-md-4">`;
  details += `<div><strong>Regular Price:</strong> ₹${(
    product.pricing?.regularPrice || 0
  ).toFixed(2)}</div>`;
  details += `</div>`;
  details += `<div class="col-md-4">`;
  details += `<div><strong>Sale Price:</strong> ₹${(
    product.pricing?.salePrice || 0
  ).toFixed(2)}</div>`;
  details += `</div>`;
  details += `<div class="col-md-4">`;
  details += `<div><strong>Total Stock:</strong> <span class="badge bg-info">${stock}</span></div>`;
  details += `</div>`;
  details += `</div>`;

  details += `<div class="mb-3 pb-3 border-bottom">`;
  details += `<strong>Availability:</strong>`;
  details += `<div>`;
  const available = product.availability?.isAvailable !== false;
  details += `<span class="badge ${available ? "bg-success" : "bg-danger"}">`;
  details += available ? "Available" : "Unavailable";
  details += `</span>`;
  details += `</div>`;
  details += `</div>`;

  if (product.hasVariants && product.variants.length > 0) {
    details += `<div class="mb-3">`;
    details += `<strong class="d-block mb-2">Variants (${product.variants.length})</strong>`;
    details += `<div class="table-responsive"><table class="table table-sm table-striped">`;
    details += `<thead><tr><th>Color</th><th>Storage</th><th>Price</th><th>Sale Price</th><th>Stock</th></tr></thead><tbody>`;

    product.variants.forEach((v) => {
      const color = v.attributes?.color || "N/A";
      const storage = v.attributes?.storage || "N/A";
      details += `<tr>`;
      details += `<td>${escapeHtml(color)}</td>`;
      details += `<td>${escapeHtml(storage)}</td>`;
      details += `<td>₹${(v.price || 0).toFixed(2)}</td>`;
      details += `<td>₹${(v.salePrice || 0).toFixed(2)}</td>`;
      details += `<td>${v.stock || 0}</td>`;
      details += `</tr>`;
    });

    details += `</tbody></table></div>`;
    details += `</div>`;
  }

  // Regional summary (if available)
  if (product.regionalAvailability && product.regionalAvailability.length > 0) {
    details += `<div class="mb-3">`;
    details += `<strong class="d-block mb-2">Regional Availability</strong>`;
    details += `<ul class="list-unstyled small">`;
    product.regionalAvailability.forEach((a) => {
      const regionLabel =
        (window.RegionUtils &&
          RegionUtils.getRegionByCode &&
          RegionUtils.getRegionByCode(a.region)?.name) ||
        a.region;
      details += `<li>${regionLabel}: ${
        a.isAvailable ? "Available" : "Unavailable"
      } — Stock: ${a.stockQuantity} (${a.stockStatus})</li>`;
    });
    details += `</ul>`;
    details += `</div>`;
  }

  details += `</div>`;

  const viewModal = document.getElementById("viewProductModal");
  if (viewModal) {
    document.getElementById("viewProductContent").innerHTML = details;
    new bootstrap.Modal(viewModal).show();
  }
}

/* ---------- Loading Overlay ---------- */

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;

  if (show) {
    overlay.classList.add("show");
  } else {
    overlay.classList.remove("show");
  }
}

/* ---------- Expose to global ---------- */

window.openAddProductModal = openAddProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.toggleProductStatus = toggleProductStatus;
window.viewProductDetails = viewProductDetails;
window.addVariantField = addVariantField;
window.removeVariantField = removeVariantField;
window.addPlanField = addPlanField;
window.removePlanField = removePlanField;
window.removeImagePreview = removeImagePreview;
window.saveProduct = saveProduct;
window.resetFilters = function () {
  if (searchInput) searchInput.value = "";
  if (statusFilter) statusFilter.value = "";
  if (variantsFilter) variantsFilter.value = "";
  filterProducts();
};
window.changeProductPage = changeProductPage;
