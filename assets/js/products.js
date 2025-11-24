// Products Management Controller

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
let currentProductId = null; // NOTE: this will hold product.productId (NOT Mongo _id)
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

/* DOM elements */
let searchInput, statusFilter, variantsFilter;
let productsContainer;
let productForm;
let hasVariantsCheckbox, variantsSection, variantsList;
let productImagesInput, imagePreviewContainer;
let plansList;

/* Stats elements */
let totalProductsCount, publishedCount, variantsCount, totalStockCount;

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

  if (hasVariantsCheckbox) {
    hasVariantsCheckbox.addEventListener("change", function () {
      if (this.checked) {
        variantsSection.classList.remove("d-none");
        variantsSection.style.display = "block";
        if (variantsList.innerHTML === "") {
          addVariantField();
        }
      } else {
        variantsSection.classList.add("d-none");
        variantsSection.style.display = "none";
        variantsList.innerHTML = "";
        variantCount = 0;
      }
    });
  }

  // Image preview on file select
  if (productImagesInput) {
    productImagesInput.addEventListener("change", handleImageSelect);
  }
}

/* ---------- Events ---------- */

function setupEventListeners() {
  if (searchInput)
    searchInput.addEventListener(
      "input",
      window.utils.debounce(filterProducts, 300)
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
}

/* ---------- Load Categories ---------- */

async function loadCategories() {
  console.log('📂 [PRODUCTS] loadCategories() - Loading categories for dropdown');
  try {
    // Use dropdown endpoint: GET /api/categories/dropdown/all
    console.log('🌐 [PRODUCTS] Calling API.get("/categories/dropdown/all")');
    const response = await API.get(
      "/categories/dropdown/all",
      {},
      {}
    );
    console.log('✅ [PRODUCTS] Categories response:', response);

    const categorySelect = document.getElementById("productCategory");

    if (!categorySelect) {
      console.warn('⚠️ [PRODUCTS] Category select element not found');
      return;
    }

    let categories = [];
    if (response && response.success !== false) {
      if (response.data && Array.isArray(response.data)) {
        categories = response.data;
        console.log('✅ [PRODUCTS] Found categories in data array, length:', categories.length);
      } else if (Array.isArray(response)) {
        categories = response;
        console.log('✅ [PRODUCTS] Response is direct array, length:', categories.length);
      }
    } else {
      console.warn('⚠️ [PRODUCTS] Response success is false or response is null');
    }

    console.log('🔽 [PRODUCTS] Populating category dropdown...');
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat._id || cat.id || cat.categoryId;
      option.textContent = cat.name || cat.categoryName;
      option.setAttribute('data-category-name', cat.name || cat.categoryName);
      categorySelect.appendChild(option);

      // Add subcategories if they exist
      if (cat.subCategories && Array.isArray(cat.subCategories)) {
        console.log(`📁 [PRODUCTS] Adding ${cat.subCategories.length} subcategories for:`, cat.name);
        cat.subCategories.forEach((subCat) => {
          const subOption = document.createElement("option");
          subOption.value = subCat._id || subCat.id || subCat.categoryId;
          subOption.textContent = `  → ${subCat.name || subCat.categoryName}`;
          subOption.setAttribute('data-category-name', subCat.name || subCat.categoryName);
          subOption.setAttribute('data-parent-id', cat._id || cat.id || cat.categoryId);
          subOption.setAttribute('data-parent-name', cat.name || cat.categoryName);
          categorySelect.appendChild(subOption);
        });
      }
    });
    console.log('✅ [PRODUCTS] Category dropdown populated successfully');
  } catch (err) {
    console.error("❌ [PRODUCTS] Load categories error:", err);
  }
}

/* ---------- Load Products ---------- */

async function loadProducts() {
  console.log('📦 [PRODUCTS] loadProducts() - Starting to load products');
  try {
    showLoading(true);
    console.log('⏳ [PRODUCTS] Loading overlay shown');

    // Build query params for backend pagination and filters
    const queryParams = {
      page: pagination.page,
      limit: pagination.limit,
      region: "global", // Default to global, can be changed based on filter
    };

    // Add search filter if exists
    if (searchInput && searchInput.value.trim()) {
      queryParams.search = searchInput.value.trim();
      console.log('🔍 [PRODUCTS] Search query:', queryParams.search);
    }

    // Add status filter if exists
    if (statusFilter && statusFilter.value) {
      queryParams.status = statusFilter.value;
      console.log('📊 [PRODUCTS] Status filter:', queryParams.status);
    }

    // Add variants filter if exists
    if (variantsFilter && variantsFilter.value !== "") {
      queryParams.hasVariants = variantsFilter.value;
      console.log('🔀 [PRODUCTS] Variants filter:', queryParams.hasVariants);
    }

    console.log('📦 [PRODUCTS] Query params:', queryParams);

    // Use API endpoint: GET /api/products with query params
    console.log('🌐 [PRODUCTS] Calling API.get("/products")');
    const response = await API.get(
      "/products",
      {},
      queryParams
    );
    console.log('✅ [PRODUCTS] API Response received:', response);

    let productsData = [];
    console.log('🔍 [PRODUCTS] Checking response structure...');

    if (response && response.success !== false) {
      if (response.data && Array.isArray(response.data)) {
        productsData = response.data;
        console.log('✅ [PRODUCTS] Found data array, length:', productsData.length);
      } else if (Array.isArray(response)) {
        productsData = response;
        console.log('✅ [PRODUCTS] Response is direct array, length:', productsData.length);
      }

      // Update pagination state from API response
      if (response.pagination) {
        pagination.page = response.pagination.current || pagination.page;
        pagination.pages = response.pagination.pages || 1;
        pagination.total = response.pagination.total || 0;
        console.log('📊 [PRODUCTS] Pagination updated:', pagination);
      }
    } else {
      console.warn('⚠️ [PRODUCTS] Response success is false or response is null');
    }

    console.log('🔄 [PRODUCTS] Mapping products data...');
    products = productsData.map((p) => {
      // Normalize description - handle both string and object formats
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
        category:
          p.category || {
            mainCategoryId: "",
            mainCategoryName: "",
            subCategoryId: "",
            subCategoryName: "",
          },
        sku: p.sku || "",
        pricing:
          p.pricing || { regularPrice: 0, salePrice: 0, currency: "USD" },
        availability:
          p.availability || {
            stockQuantity: 0,
            lowStockLevel: 5,
            isAvailable: true,
            stockStatus: "in_stock",
          },
        images: Array.isArray(p.images) ? p.images : [],
        hasVariants: p.hasVariants || false,
        variants: Array.isArray(p.variants) ? p.variants : [],
        status: p.status || "draft",
        // Product flags
        isFeatured: p.isFeatured || false,
        isPopular: p.isPopular || false,
        isBestSeller: p.isBestSeller || false,
        isTrending: p.isTrending || false,
        // Additional product details
        warranty: p.warranty || null,
        origin: p.origin || "",
        project: p.project || "",
        dimensions: p.dimensions || null,
        tags: Array.isArray(p.tags) ? p.tags : [],
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
      };
    });
    console.log('✅ [PRODUCTS] Products mapped successfully. Total count:', products.length);

    console.log('📊 [PRODUCTS] Calling updateStats()...');
    updateStats(pagination.total);
    console.log('🎨 [PRODUCTS] Calling renderProducts()...');
    renderProducts();
    console.log('✅ [PRODUCTS] loadProducts() completed successfully');
  } catch (error) {
    console.error("❌ [PRODUCTS] Error loading products:", error);
    console.error("❌ [PRODUCTS] Error details:", error.message, error.stack);
    showNotification(
      "Failed to load products: " + (error.message || error),
      "error"
    );
  } finally {
    console.log('⏳ [PRODUCTS] Hiding loading overlay');
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
      return (
        sum + p.variants.reduce((vsum, v) => vsum + (v.stock || 0), 0)
      );
    }
    return sum + (p.availability?.stockQuantity || 0);
  }, 0);

  if (totalProductsCount) totalProductsCount.textContent = total;
  if (publishedCount) publishedCount.textContent = published;
  if (variantsCount) variantsCount.textContent = withVariants;
  if (totalStockCount) totalStockCount.textContent = totalStock;
}

function filterProducts() {
  // whenever filters/search change, go back to page 1 and reload from backend
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
        prevDisabled ? 'tabindex="-1" aria-disabled="true"' : `onclick="changeProductPage(${currentPage - 1})"`
      }>&laquo; Previous</button>
    </li>
  `;

  // Show max 5 page numbers with ellipsis
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
        nextDisabled ? 'tabindex="-1" aria-disabled="true"' : `onclick="changeProductPage(${currentPage + 1})"`
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
                              (product.pricing?.salePrice ||
                                product.pricing?.regularPrice) || 0
                            ).toFixed(2)}</div>
                            <small class="text-muted">Stock: <strong>${stock}</strong></small>
                        </div>
                        <small class="d-block text-muted mb-3">${
                          window.utils.formatDate(product.updatedAt)
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

/* ---------- Modal / CRUD ---------- */

/* ---------- Image Upload Functions ---------- */

function handleImageSelect(e) {
  const files = e.target.files;
  selectedImageFiles = Array.from(files);

  if (!imagePreviewContainer) return;

  if (selectedImageFiles.length === 0) {
    imagePreviewContainer.innerHTML = '';
    return;
  }

  if (selectedImageFiles.length > 10) {
    showNotification('Maximum 10 images allowed', 'error');
    selectedImageFiles = selectedImageFiles.slice(0, 10);
  }

  imagePreviewContainer.innerHTML = '';

  selectedImageFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const col = document.createElement('div');
      col.className = 'col-md-2';
      col.innerHTML = `
        <div class="position-relative">
          <img src="${e.target.result}" class="img-thumbnail" alt="Preview">
          <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" onclick="removeImagePreview(${index})">
            <i class="bi bi-x"></i>
          </button>
          ${index === 0 ? '<span class="badge bg-primary position-absolute bottom-0 start-0 m-1">Primary</span>' : ''}
        </div>
      `;
      imagePreviewContainer.appendChild(col);
    };
    reader.readAsDataURL(file);
  });
}

function removeImagePreview(index) {
  selectedImageFiles.splice(index, 1);

  // Re-render preview
  if (productImagesInput) {
    const dt = new DataTransfer();
    selectedImageFiles.forEach(file => dt.items.add(file));
    productImagesInput.files = dt.files;
  }

  // Trigger change event to re-render
  handleImageSelect({ target: { files: selectedImageFiles } });
}

async function uploadProductImages(productId) {
  console.log('🖼️ [PRODUCTS] uploadProductImages() - productId:', productId);
  console.log('🖼️ [PRODUCTS] Selected image files:', selectedImageFiles);

  if (!selectedImageFiles || selectedImageFiles.length === 0) {
    console.log('⚠️ [PRODUCTS] No images to upload');
    return;
  }

  try {
    let uploadedCount = 0;
    let failedCount = 0;

    // Upload each image one by one
    console.log(`🖼️ [PRODUCTS] Uploading ${selectedImageFiles.length} images one by one...`);
    for (let i = 0; i < selectedImageFiles.length; i++) {
      const file = selectedImageFiles[i];
      console.log(`📤 [PRODUCTS] Uploading image ${i + 1}/${selectedImageFiles.length}:`, file.name);

      const formData = new FormData();

      // Ek image ek baar mein
      formData.append('images', file);
      formData.append('altText', 'Product image');

      try {
        // PUT /api/products/:productId/images - har image ke liye alag call
        const url = `${window.BASE_URL}/products/${productId}/images`;
        console.log(`🌐 [PRODUCTS] Uploading to URL:`, url);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${AUTH.getToken()}`
            },
            body: formData
          }
        );

        const result = await response.json();
        console.log(`📥 [PRODUCTS] Image ${i + 1} response:`, result);

        if (result.success) {
          uploadedCount++;
          console.log(`✅ [PRODUCTS] Image ${i + 1} uploaded successfully`);
        } else {
          failedCount++;
          console.error(`❌ [PRODUCTS] Failed to upload image ${i + 1}:`, result.message);
        }
      } catch (err) {
        failedCount++;
        console.error(`❌ [PRODUCTS] Error uploading image ${i + 1}:`, err);
      }
    }

    console.log(`📊 [PRODUCTS] Upload summary - Success: ${uploadedCount}, Failed: ${failedCount}`);

    if (uploadedCount > 0) {
      showNotification(`${uploadedCount} images uploaded successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`, uploadedCount === selectedImageFiles.length ? 'success' : 'info');
    } else {
      showNotification('Failed to upload images', 'error');
    }
  } catch (err) {
    console.error('❌ [PRODUCTS] Image upload error:', err);
    showNotification('Failed to upload images: ' + err.message, 'error');
  }
}

// Upload variant images after product creation
async function uploadVariantImages(productId, variantImageFiles, createdVariants) {
  console.log('🖼️ [PRODUCTS] uploadVariantImages() - productId:', productId);
  console.log('🖼️ [PRODUCTS] Variant image files:', variantImageFiles);
  console.log('🖼️ [PRODUCTS] Created variants:', createdVariants);

  if (!variantImageFiles || variantImageFiles.length === 0) {
    console.log('⚠️ [PRODUCTS] No variant images to upload');
    return;
  }

  try {
    let uploadedCount = 0;
    let failedCount = 0;

    // Upload each variant image one by one
    console.log(`🖼️ [PRODUCTS] Uploading ${variantImageFiles.length} variant images one by one...`);
    for (let i = 0; i < variantImageFiles.length; i++) {
      const { variantIndex, file } = variantImageFiles[i];
      console.log(`📤 [PRODUCTS] Uploading variant image ${i + 1}/${variantImageFiles.length} for variant index:`, variantIndex);

      // Get the corresponding variant from created variants
      const variant = createdVariants && createdVariants[variantIndex];
      console.log(`🔍 [PRODUCTS] Found variant for index ${variantIndex}:`, variant);

      if (!variant || !variant.variantId) {
        console.error(`❌ [PRODUCTS] Variant ID not found for variant index ${variantIndex}`);
        failedCount++;
        continue;
      }

      const formData = new FormData();
      formData.append('images', file);
      formData.append('altText', 'Variant image');

      try {
        // PUT /api/products/:productId/variants/:variantId/images
        const url = `${window.BASE_URL}/products/${productId}/variants/${variant.variantId}/images`;
        console.log(`🌐 [PRODUCTS] Uploading variant image to URL:`, url);

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${AUTH.getToken()}`
            },
            body: formData
          }
        );

        const result = await response.json();
        console.log(`📥 [PRODUCTS] Variant image ${i + 1} response:`, result);

        if (result.success) {
          uploadedCount++;
          console.log(`✅ [PRODUCTS] Variant image ${i + 1} uploaded successfully`);
        } else {
          failedCount++;
          console.error(`❌ [PRODUCTS] Failed to upload variant image ${i + 1}:`, result.message);
        }
      } catch (err) {
        failedCount++;
        console.error(`❌ [PRODUCTS] Error uploading variant image ${i + 1}:`, err);
      }
    }

    console.log(`📊 [PRODUCTS] Variant images upload summary - Success: ${uploadedCount}, Failed: ${failedCount}`);

    if (uploadedCount > 0) {
      showNotification(`${uploadedCount} variant images uploaded${failedCount > 0 ? `, ${failedCount} failed` : ''}`, 'info');
    }
  } catch (err) {
    console.error('❌ [PRODUCTS] Variant image upload error:', err);
  }
}

/* ---------- Payment Plan Functions ---------- */

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
  plansList.insertAdjacentHTML('beforeend', html);

  // Add auto-calculation for total
  const card = document.getElementById(`plan-${planCount}`);
  const daysInput = card.querySelector('[data-plan-days]');
  const amountInput = card.querySelector('[data-plan-amount]');
  const totalInput = card.querySelector('[data-plan-total]');

  const calculateTotal = () => {
    const days = parseFloat(daysInput.value) || 0;
    const amount = parseFloat(amountInput.value) || 0;
    totalInput.value = (days * amount).toFixed(2);
  };

  daysInput.addEventListener('input', calculateTotal);
  amountInput.addEventListener('input', calculateTotal);
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

  // Reset product flags
  const isFeaturedEl = document.getElementById("isFeatured");
  const isPopularEl = document.getElementById("isPopular");
  const isBestSellerEl = document.getElementById("isBestSeller");
  const isTrendingEl = document.getElementById("isTrending");

  if (isFeaturedEl) isFeaturedEl.checked = false;
  if (isPopularEl) isPopularEl.checked = false;
  if (isBestSellerEl) isBestSellerEl.checked = false;
  if (isTrendingEl) isTrendingEl.checked = false;

  const modalEl = document.getElementById("productModal");
  if (modalEl) new bootstrap.Modal(modalEl).show();
}

async function editProduct(productId) {
  // productId is business ID (e.g., "PROD123"), not Mongo _id
  const product = products.find((p) => p.productId === productId);
  if (!product) {
    alert("Product not found in list. Please refresh the page.");
    return;
  }

  currentProductId = product.productId;

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
  document.getElementById("productAvailability").value = uiAvailability;

  document.getElementById("hasVariants").checked = product.hasVariants || false;
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

  // Populate product flags
  const isFeaturedEl = document.getElementById("isFeatured");
  const isPopularEl = document.getElementById("isPopular");
  const isBestSellerEl = document.getElementById("isBestSeller");
  const isTrendingEl = document.getElementById("isTrending");

  if (isFeaturedEl) isFeaturedEl.checked = product.isFeatured || false;
  if (isPopularEl) isPopularEl.checked = product.isPopular || false;
  if (isBestSellerEl) isBestSellerEl.checked = product.isBestSeller || false;
  if (isTrendingEl) isTrendingEl.checked = product.isTrending || false;

  // Populate warranty information
  const warrantyDaysEl = document.getElementById("warrantyDays");
  const warrantyTypeEl = document.getElementById("warrantyType");
  if (warrantyDaysEl) warrantyDaysEl.value = product.warranty?.days || "";
  if (warrantyTypeEl) warrantyTypeEl.value = product.warranty?.type || "";

  // Populate origin and project
  const productOriginEl = document.getElementById("productOrigin");
  const productProjectEl = document.getElementById("productProject");
  if (productOriginEl) productOriginEl.value = product.origin || "";
  if (productProjectEl) productProjectEl.value = product.project || "";

  // Populate dimensions
  const dimensionLengthEl = document.getElementById("dimensionLength");
  const dimensionWidthEl = document.getElementById("dimensionWidth");
  const dimensionHeightEl = document.getElementById("dimensionHeight");
  const productWeightEl = document.getElementById("productWeight");

  if (dimensionLengthEl) dimensionLengthEl.value = product.dimensions?.length || "";
  if (dimensionWidthEl) dimensionWidthEl.value = product.dimensions?.width || "";
  if (dimensionHeightEl) dimensionHeightEl.value = product.dimensions?.height || "";
  if (productWeightEl) productWeightEl.value = product.dimensions?.weight || "";

  // Populate tags (convert array to comma-separated string)
  const productTagsEl = document.getElementById("productTags");
  if (productTagsEl) {
    const tagsValue = Array.isArray(product.tags) ? product.tags.join(', ') : "";
    productTagsEl.value = tagsValue;
  }

  const statusRadio = document.querySelector(
    `input[name="status"][value="${product.status}"]`
  );
  if (statusRadio) statusRadio.checked = true;

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
                    ${hasExistingImage ? `<small class="text-muted">Current: ${escapeHtml(existingImageUrl.split('/').pop())}</small>` : ''}
                </div>
            </div>
        </div>
    `;
}

function removeVariantField(idx) {
  document.getElementById(`variant-${idx}`)?.remove();
}

async function saveProduct() {
  console.log('💾 [PRODUCTS] saveProduct() - Starting save process');
  const name = document.getElementById("productName").value.trim();
  const brand = document.getElementById("productBrand").value.trim();
  const description = document
    .getElementById("productDescription")
    .value.trim();
  const categoryId = document.getElementById("productCategory").value.trim();
  const sku = document.getElementById("productSku").value.trim();

  console.log('📝 [PRODUCTS] Form data:', { name, brand, categoryId, sku });

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

  console.log('💰 [PRODUCTS] Pricing data:', { price, salePrice, stock });

  const availabilityValue =
    document.getElementById("productAvailability").value;
  const status =
    document.querySelector('input[name="status"]:checked')?.value || "draft";
  const hasVariants = document.getElementById("hasVariants").checked;

  console.log('📊 [PRODUCTS] Status data:', { availabilityValue, status, hasVariants });

  // Validation
  if (!name) {
    console.warn('⚠️ [PRODUCTS] Validation failed: Product name is required');
    alert("Product name is required");
    return;
  }
  if (!categoryId) {
    console.warn('⚠️ [PRODUCTS] Validation failed: Category is required');
    alert("Category is required");
    return;
  }
  if (isNaN(price) || price <= 0) {
    console.warn('⚠️ [PRODUCTS] Validation failed: Price must be greater than 0');
    alert("Price must be greater than 0");
    return;
  }
  if (!description) {
    console.warn('⚠️ [PRODUCTS] Validation failed: Description is required');
    alert("Description is required");
    return;
  }

  // Stock required and MUST be > 0 (QA requirement)
  if (stockRaw === "") {
    console.warn('⚠️ [PRODUCTS] Validation failed: Stock is required');
    alert("Stock is required");
    return;
  }
  if (isNaN(stock) || stock <= 0) {
    console.warn('⚠️ [PRODUCTS] Validation failed: Stock must be greater than 0');
    alert("Stock must be greater than 0");
    return;
  }

  // Sale price validation
  if (!isNaN(salePrice) && salePrice > 0 && salePrice > price) {
    console.warn('⚠️ [PRODUCTS] Validation failed: Sale price cannot be greater than regular price');
    alert("Sale price cannot be greater than regular price");
    return;
  }

  console.log('✅ [PRODUCTS] All validations passed');

  // Map UI availability to backend format
  const { stockStatus, isAvailable } =
    mapUIAvailabilityToBackend(availabilityValue);
  console.log('🔄 [PRODUCTS] Mapped availability:', { stockStatus, isAvailable });

  // Get category name and parent info from selected option
  const categorySelect = document.getElementById("productCategory");
  const selectedOption = categorySelect.options[categorySelect.selectedIndex];
  const categoryName = selectedOption.getAttribute('data-category-name') || selectedOption.text.trim();
  const parentId = selectedOption.getAttribute('data-parent-id');
  const parentName = selectedOption.getAttribute('data-parent-name');
  console.log('📁 [PRODUCTS] Category info:', { categoryId, categoryName, parentId, parentName });

  // Collect additional fields
  const isFeatured = document.getElementById("isFeatured")?.checked || false;
  const isPopular = document.getElementById("isPopular")?.checked || false;
  const isBestSeller = document.getElementById("isBestSeller")?.checked || false;
  const isTrending = document.getElementById("isTrending")?.checked || false;
  console.log('🏷️ [PRODUCTS] Product flags:', { isFeatured, isPopular, isBestSeller, isTrending });

  const warrantyDays = parseInt(document.getElementById("warrantyDays")?.value) || 0;
  const warrantyType = document.getElementById("warrantyType")?.value.trim() || "";
  const productOrigin = document.getElementById("productOrigin")?.value.trim() || "";
  const productProject = document.getElementById("productProject")?.value.trim() || "";

  const dimensionLength = parseFloat(document.getElementById("dimensionLength")?.value) || 0;
  const dimensionWidth = parseFloat(document.getElementById("dimensionWidth")?.value) || 0;
  const dimensionHeight = parseFloat(document.getElementById("dimensionHeight")?.value) || 0;
  const productWeight = parseFloat(document.getElementById("productWeight")?.value) || 0;

  const productTags = document.getElementById("productTags")?.value.trim() || "";

  const payload = {
    name,
    brand,
    description: {
      short: description,
      long: description,
    },
    category: {
      mainCategoryId: parentId || categoryId, // If it's a subcategory, use parent as main
      mainCategoryName: parentName || categoryName, // If it's a subcategory, use parent name
      subCategoryId: parentId ? categoryId : null, // If has parent, current is sub
      subCategoryName: parentId ? categoryName : null, // If has parent, use current name as sub
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

  // Add warranty if provided
  if (warrantyDays > 0 || warrantyType) {
    payload.warranty = {
      days: warrantyDays,
      type: warrantyType || "Standard Warranty"
    };
  }

  // Add origin if provided
  if (productOrigin) {
    payload.origin = productOrigin;
  }

  // Add project if provided
  if (productProject) {
    payload.project = productProject;
  }

  // Add dimensions if any provided
  if (dimensionLength > 0 || dimensionWidth > 0 || dimensionHeight > 0 || productWeight > 0) {
    payload.dimensions = {
      length: dimensionLength,
      width: dimensionWidth,
      height: dimensionHeight,
      weight: productWeight,
      unit: "cm" // length, width, height in cm
    };
  }

  // Add tags if provided (convert comma-separated string to array)
  if (productTags) {
    payload.tags = productTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  }

  // Collect payment plans
  const planCards = document.querySelectorAll('[id^="plan-"]');
  const plans = [];

  planCards.forEach((card) => {
    const nameInput = card.querySelector('[data-plan-name]');
    const daysInput = card.querySelector('[data-plan-days]');
    const amountInput = card.querySelector('[data-plan-amount]');
    const descInput = card.querySelector('[data-plan-description]');
    const recommendedInput = card.querySelector('[data-plan-recommended]');

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
        description: descInput?.value?.trim() || ""
      };
      plans.push(plan);
    }
  });

  if (plans.length > 0) {
    payload.plans = plans;
  }

  console.log('📦 [PRODUCTS] Building payload...');

  // Collect variant data and files
  let variantImageFiles = []; // Store variant image files with variant index

  if (hasVariants) {
    console.log('🔀 [PRODUCTS] Collecting variants...');
    const variantCards = document.querySelectorAll(".variant-card");
    const variants = [];
    console.log('🔢 [PRODUCTS] Found variant cards:', variantCards.length);

    variantCards.forEach((card, idx) => {
      const colorInput = card.querySelector("[data-variant-color]");
      const storageInput = card.querySelector("[data-variant-storage]");
      const variantPrice = card.querySelector("[data-variant-price]");
      const variantSalePrice = card.querySelector(
        "[data-variant-sale-price]"
      );
      const variantStock = card.querySelector("[data-variant-stock]");
      const variantImageInput = card.querySelector("[data-variant-image]");

      const vPrice = parseFloat(variantPrice?.value) || 0;
      const vSalePrice = parseFloat(variantSalePrice?.value) || 0;

      if (vPrice <= 0) return; // skip invalid variant

      if (vSalePrice > 0 && vSalePrice > vPrice) {
        // prevent nonsense variant pricing too
        return;
      }

      const variant = {
        attributes: {
          color: colorInput?.value?.trim() || "",
          storage: storageInput?.value?.trim() || "",
        },
        price: vPrice,
        salePrice: vSalePrice > 0 ? vSalePrice : vPrice,
        stock: parseInt(variantStock?.value) || 0,
        // Don't send images in payload - will upload separately
      };

      // Collect variant image file if selected
      if (variantImageInput && variantImageInput.files && variantImageInput.files.length > 0) {
        variantImageFiles.push({
          variantIndex: idx,
          file: variantImageInput.files[0]
        });
      }

      variants.push(variant);
    });

    if (variants.length === 0) {
      console.warn('⚠️ [PRODUCTS] No valid variants found');
      alert("Add at least one variant with valid price");
      return;
    }

    console.log('✅ [PRODUCTS] Collected variants:', variants);
    payload.variants = variants;
  }

  console.log('📦 [PRODUCTS] Final payload:', payload);

  try {
    showLoading(true);
    console.log('⏳ [PRODUCTS] Loading overlay shown');

    let savedProductId = currentProductId;
    let createdVariants = null;

    if (currentProductId) {
      // UPDATE: PUT /api/products/:productId - use productId in URL
      console.log('🔄 [PRODUCTS] UPDATE mode - productId:', currentProductId);
      console.log('🌐 [PRODUCTS] Calling API.put("/products/:productId")');
      const updateResponse = await API.put("/products/:productId", payload, {
        productId: currentProductId,
      });
      console.log('✅ [PRODUCTS] Update response:', updateResponse);

      // Get updated variants from response
      if (updateResponse && updateResponse.data && updateResponse.data.variants) {
        createdVariants = updateResponse.data.variants;
        console.log('🔀 [PRODUCTS] Got updated variants from response:', createdVariants);
      }

      showNotification("Product updated successfully", "success");
    } else {
      // CREATE: POST /api/products
      console.log('➕ [PRODUCTS] CREATE mode - new product');
      console.log('🌐 [PRODUCTS] Calling API.post("/products")');
      const response = await API.post("/products", payload);
      console.log('✅ [PRODUCTS] Create response:', response);

      // Get the created product ID and variants from response
      if (response && response.data) {
        if (response.data.productId) {
          savedProductId = response.data.productId;
          console.log('🆔 [PRODUCTS] Got product ID from response:', savedProductId);
        }
        if (response.data.variants) {
          createdVariants = response.data.variants;
          console.log('🔀 [PRODUCTS] Got created variants from response:', createdVariants);
        }
      }

      showNotification("Product created successfully", "success");
    }

    // Upload product images if any selected (one by one)
    if (savedProductId && selectedImageFiles.length > 0) {
      console.log(`🖼️ [PRODUCTS] Uploading ${selectedImageFiles.length} product images...`);
      await uploadProductImages(savedProductId);
    }

    // Upload variant images if any selected (one by one)
    if (savedProductId && variantImageFiles.length > 0 && createdVariants) {
      console.log(`🖼️ [PRODUCTS] Uploading ${variantImageFiles.length} variant images...`);
      await uploadVariantImages(savedProductId, variantImageFiles, createdVariants);
    }

    console.log('🚪 [PRODUCTS] Closing modal...');
    const modalEl = document.getElementById("productModal");
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    console.log('🧹 [PRODUCTS] Cleaning up form...');
    productForm.reset();
    currentProductId = null;
    variantCount = 0;
    planCount = 0;
    selectedImageFiles = [];
    if (variantsList) variantsList.innerHTML = "";
    if (plansList) plansList.innerHTML = "";
    if (imagePreviewContainer) imagePreviewContainer.innerHTML = "";
    if (productImagesInput) productImagesInput.value = "";

    console.log('🔄 [PRODUCTS] Reloading products...');
    await loadProducts();
    console.log('✅ [PRODUCTS] saveProduct() completed successfully');
  } catch (err) {
    console.error("❌ [PRODUCTS] Save product error:", err);
    console.error("❌ [PRODUCTS] Error details:", err.message, err.stack);
    console.error("❌ [PRODUCTS] Current Product ID:", currentProductId);
    showNotification("Error: " + (err.message || "Failed to save product"), "error");
  } finally {
    console.log('⏳ [PRODUCTS] Hiding loading overlay');
    showLoading(false);
  }
}

async function toggleProductStatus(productId) {
  try {
    showLoading(true);
    const product = products.find((p) => p.productId === productId);
    if (!product) throw new Error("Product not found");

    const newStatus = product.status === "published" ? "draft" : "published";

    const payload = {
      status: newStatus,
    };

    // UPDATE: PUT /api/products/:productId
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
  console.log('🗑️ [PRODUCTS] deleteProduct() - productId:', productId);
  const product = products.find((p) => p.productId === productId);
  console.log('🔍 [PRODUCTS] Found product:', product);

  if (!product) {
    console.error('❌ [PRODUCTS] Product not found');
    showNotification("Product not found", "error");
    return;
  }

  console.log('❓ [PRODUCTS] Showing confirmation dialog...');
  const confirmed = confirm(`Delete "${product.name}"?`);
  console.log('✅ [PRODUCTS] User confirmed:', confirmed);

  if (!confirmed) {
    console.log('❌ [PRODUCTS] User cancelled deletion');
    return;
  }

  try {
    showLoading(true);
    console.log('⏳ [PRODUCTS] Loading overlay shown');
    // DELETE: DELETE /api/products/:productId
    console.log('🌐 [PRODUCTS] Calling API.delete("/products/:productId")');
    await API.delete("/products/:productId", { productId });
    console.log('✅ [PRODUCTS] Product deleted successfully');
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

  // Header
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
  details += `<div><strong>Category:</strong> ${escapeHtml(
    product.category?.mainCategoryName || "N/A"
  )}`;
  if (product.category?.subCategoryName) {
    details += ` > ${escapeHtml(product.category.subCategoryName)}`;
  }
  details += `</div>`;
  details += `</div>`;
  details += `<div class="col-md-6">`;
  details += `<div><strong>SKU:</strong> ${escapeHtml(
    product.sku || product.productId || "N/A"
  )}</div>`;
  details += `</div>`;
  details += `</div>`;

  // Pricing and Stock
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

  // Availability
  details += `<div class="mb-3 pb-3 border-bottom">`;
  details += `<strong>Availability:</strong>`;
  details += `<div>`;
  const available = product.availability?.isAvailable !== false;
  details += `<span class="badge ${
    available ? "bg-success" : "bg-danger"
  }">`;
  details += available ? "Available" : "Unavailable";
  details += `</span>`;
  details += `</div>`;
  details += `</div>`;

  // Variants (if applicable)
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

  details += `</div>`;

  const viewModal = document.getElementById("viewProductModal");
  if (viewModal) {
    document.getElementById("viewProductContent").innerHTML = details;
    new bootstrap.Modal(viewModal).show();
  }
}

/* ---------- Loading Overlay ---------- */

function showLoading(show) {
  let overlay = document.getElementById("loadingOverlay");
  if (show) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "loadingOverlay";
      overlay.style.position = "fixed";
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(255,255,255,0.6)";
      overlay.style.zIndex = "9999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.innerHTML =
        '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';
      document.body.appendChild(overlay);
    }
  } else if (overlay) {
    overlay.remove();
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
