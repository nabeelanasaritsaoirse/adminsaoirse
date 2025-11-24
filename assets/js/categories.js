// Simple safe utils if window.utils is not present
window.utils = window.utils || {};
window.utils.debounce =
  window.utils.debounce ||
  function (fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  };
window.utils.formatDate =
  window.utils.formatDate ||
  function (d) {
    try {
      return new Date(d).toLocaleString();
    } catch (e) {
      return "";
    }
  };

// adminPanel fallback for notifications and confirm
window.adminPanel = window.adminPanel || {
  showNotification: function (msg, type = "info") {
    if (type === "error") console.error(msg);
    else if (type === "success") console.log("Success:", msg);
    else console.log(msg);
    alert(msg);
  },
  confirmAction: function (message, callback) {
    const ok = confirm(message);
    if (typeof callback === "function") {
      callback(ok);
    }
    return ok;
  },
};

/* ---------- State ---------- */

let categories = [];
let currentCategoryId = null;
let categoryImages = [];

// Pagination state (backend pagination) - Note: API doc doesn't show pagination for categories, but we'll add it for consistency
let pagination = {
  page: 1,
  limit: 50,
  total: 0,
};

/* DOM elements (will be init on DOMContentLoaded) */
let searchInput, statusFilter, levelFilter, viewModeSelect;
let categoriesContainer;
let categoryForm;

/* Stats elements */
let totalCategoriesCount,
  activeCategoriesCount,
  featuredCategoriesCount,
  rootCategoriesCount;

/* ---------- Initialization ---------- */

document.addEventListener("DOMContentLoaded", function () {
  initializeDOMElements();
  setupEventListeners();
  loadCategories();
});

/* ---------- DOM init ---------- */

function initializeDOMElements() {
  searchInput = document.getElementById("searchInput");
  statusFilter = document.getElementById("statusFilter");
  levelFilter = document.getElementById("levelFilter");
  viewModeSelect = document.getElementById("viewMode");

  categoriesContainer = document.getElementById("categoriesContainer");

  categoryForm = document.getElementById("categoryForm");

  totalCategoriesCount = document.getElementById("totalCategoriesCount");
  activeCategoriesCount = document.getElementById("activeCategoriesCount");
  featuredCategoriesCount = document.getElementById("featuredCategoriesCount");
  rootCategoriesCount = document.getElementById("rootCategoriesCount");
}

/* ---------- Events ---------- */

function setupEventListeners() {
  if (searchInput)
    searchInput.addEventListener(
      "input",
      window.utils.debounce(filterCategories, 300)
    );
  if (statusFilter) statusFilter.addEventListener("change", filterCategories);
  if (levelFilter) levelFilter.addEventListener("change", filterCategories);
  if (viewModeSelect)
    viewModeSelect.addEventListener("change", renderCategories);

  // Form submit if exists
  if (categoryForm) {
    categoryForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveCategory();
    });
  }
}

/* ---------- Load ---------- */

async function loadCategories() {
  console.log("📂 [CATEGORIES] loadCategories() - Starting to load categories");
  try {
    showLoading(true);
    console.log("⏳ [CATEGORIES] Loading overlay shown");

    // IMPORTANT: fetch ALL categories (active + inactive)
    console.log('🌐 [CATEGORIES] Calling API.get("/categories?isActive=all")');
    const response = await API.get("/categories", {}, { isActive: "all" });
    console.log("✅ [CATEGORIES] API Response received:", response);

    // Handle response structure
    let categoriesData = [];
    console.log("🔍 [CATEGORIES] Checking response structure...");

    if (response && response.success !== false) {
      // If response has data property with array
      if (response.data && Array.isArray(response.data)) {
        categoriesData = response.data;
        console.log(
          "✅ [CATEGORIES] Found data array, length:",
          categoriesData.length
        );
      }
      // If response is directly the array (fallback)
      else if (Array.isArray(response)) {
        categoriesData = response;
        console.log(
          "✅ [CATEGORIES] Response is direct array, length:",
          categoriesData.length
        );
      }
    } else {
      console.warn(
        "⚠️ [CATEGORIES] Response success is false or response is null"
      );
    }

    console.log("🔄 [CATEGORIES] Mapping categories data...");
    categories = categoriesData.map((c) => ({
      _id: c._id || c.id || "",
      categoryId: c.categoryId || "",
      name: c.name || "",
      slug: c.slug || "",
      description: c.description || "",
      level: c.level || 0,
      path: c.path || [],
      parentCategory: c.parentCategoryId || null,
      parentCategoryId: c.parentCategoryId || null,
      isActive: c.isActive !== undefined ? c.isActive : true,
      isFeatured:
        c.isFeatured === true || c.isFeatured === "true" || c.isFeatured === 1,
      showInMenu: c.showInMenu !== undefined ? c.showInMenu : true,
      productCount: 0, // Not in your API response
      displayOrder: Number(c.displayOrder || 0),
      icon: c.icon || "",
      image: c.image || {},
      banner: c.banner || {},
      images: c.images || [],
      meta: c.meta || {},
      subCategories: c.subCategories || [],
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString(),
    }));
    console.log(
      "✅ [CATEGORIES] Categories mapped successfully. Total count:",
      categories.length
    );

    // Update pagination total
    pagination.total = categories.length;
    console.log("📊 [CATEGORIES] Pagination total updated:", pagination.total);

    console.log("📊 [CATEGORIES] Calling updateStats()...");
    updateStats();
    console.log("🎨 [CATEGORIES] Calling renderCategories()...");
    renderCategories();
    console.log("🔽 [CATEGORIES] Calling populateParentCategoryDropdown()...");
    populateParentCategoryDropdown();
    console.log("✅ [CATEGORIES] loadCategories() completed successfully");
  } catch (error) {
    console.error("❌ [CATEGORIES] Error loading categories:", error);
    console.error("❌ [CATEGORIES] Error details:", error.message, error.stack);
    window.adminPanel.showNotification(
      "Failed to load categories: " + (error.message || error),
      "error"
    );
  } finally {
    console.log("⏳ [CATEGORIES] Hiding loading overlay");
    showLoading(false);
  }
}

/* ---------- Get Featured Categories ---------- */

function getFeaturedCategories() {
  return categories.filter((c) => c.isFeatured && c.isActive);
}

async function fetchFeaturedCategoriesFromAPI() {
  try {
    // GET /api/categories/featured
    const response = await API.get("/categories/featured");
    let featured = [];

    if (response && response.data && Array.isArray(response.data)) {
      featured = response.data;
    } else if (Array.isArray(response)) {
      featured = response;
    }

    return featured;
  } catch (error) {
    console.error("Error fetching featured categories:", error);
    return [];
  }
}

/* ---------- Stats & Filters ---------- */

function updateStats() {
  const total = categories.length;
  const active = categories.filter((c) => c.isActive).length;
  const featured = categories.filter((c) => c.isFeatured && c.isActive).length;
  const root = categories.filter((c) => !c.parentCategoryId).length;

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
    filtered = filtered.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.slug && c.slug.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }

  // status
  if (statusFilter && statusFilter.value) {
    if (statusFilter.value === "active")
      filtered = filtered.filter((c) => c.isActive);
    else if (statusFilter.value === "inactive")
      filtered = filtered.filter((c) => !c.isActive);
  }

  // level
  if (levelFilter && levelFilter.value !== "") {
    const lv = parseInt(levelFilter.value, 10);
    if (!isNaN(lv)) filtered = filtered.filter((c) => Number(c.level) === lv);
  }

  // sort by displayOrder then name
  filtered.sort((a, b) => {
    if ((a.displayOrder || 0) !== (b.displayOrder || 0))
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    return (a.name || "").localeCompare(b.name || "");
  });

  return filtered;
}

function filterCategories() {
  renderCategories();
}

/* ---------- Render ---------- */

function renderCategories() {
  if (!categoriesContainer) return;

  try {
    const viewMode = viewModeSelect ? viewModeSelect.value : "tree";
    if (viewMode === "list") renderListView(categoriesContainer);
    else renderTreeView(categoriesContainer);
  } catch (error) {
    console.error("Error rendering categories:", error);
    categoriesContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Error rendering categories. Please refresh the page.
        <br><small>${error.message}</small>
      </div>
    `;
  }
}

/* Tree view */

function renderTreeView(container) {
  const filtered = getFilteredCategories();
  const roots = filtered.filter((c) => !c.parentCategoryId);

  if (roots.length === 0) {
    container.innerHTML =
      '<div class="empty-state text-center py-5"><i class="bi bi-folder-x fs-2"></i><p class="mt-2">No categories found</p></div>';
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "category-tree list-unstyled p-0";

  roots.forEach((root) => {
    ul.appendChild(renderCategoryTreeItem(root, filtered));
  });

  container.innerHTML = "";
  container.appendChild(ul);
}

function renderCategoryTreeItem(
  category,
  allCategories,
  visitedIds = new Set(),
  depth = 0
) {
  // Prevent infinite loops with circular references
  if (visitedIds.has(category._id)) {
    console.warn(`Circular reference detected for category: ${category.name}`);
    return document.createElement("li"); // Return empty element
  }

  // Limit depth to prevent performance issues
  const MAX_DEPTH = 10;
  if (depth >= MAX_DEPTH) {
    console.warn(
      `Maximum depth (${MAX_DEPTH}) reached for category: ${category.name}`
    );
    const li = document.createElement("li");
    li.innerHTML = '<div class="text-muted small">Max depth reached...</div>';
    return li;
  }

  visitedIds.add(category._id);

  const li = document.createElement("li");
  const children = allCategories.filter(
    (c) => c.parentCategoryId === category._id
  );
  const hasChildren = children.length > 0;

  const itemDiv = document.createElement("div");
  itemDiv.className = `category-item d-flex justify-content-between align-items-start py-2 px-2 level-${category.level}`;

  const left = document.createElement("div");
  left.className = "d-flex align-items-start flex-grow-1";

  // toggle icon
  if (hasChildren) {
    const toggle = document.createElement("button");
    toggle.className = "btn btn-sm btn-link p-0 me-2 toggle-children";
    toggle.setAttribute("type", "button");
    toggle.onclick = function () {
      const sub = li.querySelector(".subcategories");
      if (!sub) return;
      const isHidden = sub.style.display === "none";
      sub.style.display = isHidden ? "block" : "none";
      toggle.innerHTML = isHidden
        ? `<i class="bi bi-chevron-down"></i>`
        : `<i class="bi bi-chevron-right"></i>`;
    };
    toggle.innerHTML = '<i class="bi bi-chevron-down"></i>';
    left.appendChild(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "me-3";
    spacer.style.width = "1.4rem";
    left.appendChild(spacer);
  }

  // icon / name
  const iconSpan = document.createElement("span");
  iconSpan.className = "me-2";
  iconSpan.innerHTML = category.icon
    ? escapeHtml(category.icon)
    : `<i class="bi bi-folder"></i>`;
  left.appendChild(iconSpan);

  const titleWrap = document.createElement("div");
  titleWrap.innerHTML = `<strong>${escapeHtml(category.name)}</strong>
    <div class="small text-muted">${escapeHtml(
      category.description || ""
    )}</div>
    <div class="small"><code>${escapeHtml(category.categoryId)}</code></div>`;
  left.appendChild(titleWrap);

  // badges
  const badges = document.createElement("div");
  badges.className = "ms-3";
  badges.innerHTML = `
    <span class="badge bg-secondary me-1">Level ${category.level}</span>
    ${
      category.isActive
        ? '<span class="badge bg-success me-1">Active</span>'
        : '<span class="badge bg-warning me-1">Inactive</span>'
    }
    ${
      category.isFeatured
        ? '<span class="badge bg-info me-1">Featured</span>'
        : ""
    }
    ${
      category.productCount
        ? `<span class="badge bg-primary">${category.productCount} products</span>`
        : ""
    }
  `;
  left.appendChild(badges);

  itemDiv.appendChild(left);

  // actions
  const actions = document.createElement("div");
  actions.className = "btn-group btn-group-sm";

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-outline-primary";
  editBtn.title = "Edit";
  editBtn.onclick = () => editCategory(category._id);
  editBtn.innerHTML = '<i class="bi bi-pencil"></i>';

  const featuredBtn = document.createElement("button");
  featuredBtn.className = `btn btn-outline-${
    category.isFeatured ? "info" : "secondary"
  }`;
  featuredBtn.title = category.isFeatured ? "Unfeature" : "Feature";
  featuredBtn.onclick = () => toggleCategoryFeatured(category._id);
  featuredBtn.innerHTML = `<i class="bi bi-${
    category.isFeatured ? "star-fill" : "star"
  }"></i>`;

  const toggleBtn = document.createElement("button");
  toggleBtn.className = `btn btn-outline-${
    category.isActive ? "warning" : "success"
  }`;
  toggleBtn.title = category.isActive ? "Deactivate" : "Activate";
  toggleBtn.onclick = () => toggleCategoryStatus(category._id);
  toggleBtn.innerHTML = `<i class="bi bi-${
    category.isActive ? "pause" : "play"
  }-circle"></i>`;

  const delBtn = document.createElement("button");
  delBtn.className = "btn btn-outline-danger";
  delBtn.title = "Delete";
  delBtn.onclick = () => deleteCategory(category._id);
  delBtn.innerHTML = '<i class="bi bi-trash"></i>';

  actions.appendChild(editBtn);
  actions.appendChild(featuredBtn);
  actions.appendChild(toggleBtn);
  actions.appendChild(delBtn);

  itemDiv.appendChild(actions);

  li.appendChild(itemDiv);

  if (hasChildren) {
    const subUl = document.createElement("ul");
    subUl.className = "subcategories list-unstyled ms-4";
    children.forEach((child) => {
      // Pass a copy of visitedIds to each branch to allow siblings with same children
      const childVisited = new Set(visitedIds);
      subUl.appendChild(
        renderCategoryTreeItem(child, allCategories, childVisited, depth + 1)
      );
    });
    li.appendChild(subUl);
  }

  return li;
}

/* List view */

function renderListView(container) {
  const filtered = getFilteredCategories();
  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="empty-state text-center py-5"><i class="bi bi-folder-x fs-2"></i><p class="mt-2">No categories found</p></div>';
    return;
  }

  const rows = filtered
    .map(
      (category) => `
    <tr>
      <td>
        ${category.icon ? escapeHtml(category.icon) + " " : ""}
        <strong>${escapeHtml(category.name)}</strong>
        ${
          category.isFeatured
            ? '<i class="bi bi-star-fill text-warning ms-1"></i>'
            : ""
        }
      </td>
      <td><code>${escapeHtml(category.slug)}</code></td>
      <td><span class="badge bg-secondary">Level ${category.level}</span></td>
      <td>${
        category.isActive
          ? '<span class="badge bg-success">Active</span>'
          : '<span class="badge bg-warning">Inactive</span>'
      }</td>
      <td>${category.productCount || 0}</td>
      <td>${window.utils.formatDate(category.createdAt)}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="editCategory('${
            category._id
          }')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-${
            category.isFeatured ? "info" : "secondary"
          }" onclick="toggleCategoryFeatured('${category._id}')">
            <i class="bi bi-${category.isFeatured ? "star-fill" : "star"}"></i>
          </button>
          <button class="btn btn-outline-${
            category.isActive ? "warning" : "success"
          }" onclick="toggleCategoryStatus('${category._id}')">
            <i class="bi bi-${category.isActive ? "pause" : "play"}-circle"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteCategory('${
            category._id
          }')"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");

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
  const select = document.getElementById("parentCategory");
  if (!select) return;

  const availableParents = categories.filter(
    (c) =>
      c._id !== excludeId &&
      c.level < (APP_CONFIG?.categories?.maxLevels || 5) - 1 &&
      c.isActive
  );

  select.innerHTML = '<option value="">None (Root Category)</option>';

  availableParents.forEach((category) => {
    const indent = "\u00A0\u00A0".repeat(Math.max(0, category.level || 0));
    const opt = document.createElement("option");
    opt.value = category._id;
    opt.innerHTML = `${indent}${escapeHtml(category.name)} (Level ${
      category.level
    })`;
    select.appendChild(opt);
  });
}

/* ---------- Modal / CRUD ---------- */

function openAddCategoryModal() {
  currentCategoryId = null;
  categoryImages = [];
  document.getElementById("categoryModalTitle").textContent = "Add Category";
  if (categoryForm) categoryForm.reset();
  const imagesPreview = document.getElementById("imagesPreview");
  if (imagesPreview) imagesPreview.innerHTML = "";
  populateParentCategoryDropdown();
  // IMPORTANT: do NOT manually show modal here.
  // The button already has data-bs-toggle="modal" & data-bs-target="#categoryModal"
}

async function editCategory(categoryId) {
  currentCategoryId = categoryId;
  const category = categories.find((c) => c._id === categoryId);
  if (!category) {
    window.adminPanel.showNotification("Category not found", "error");
    return;
  }

  document.getElementById("categoryModalTitle").textContent = "Edit Category";

  document.getElementById("categoryName").value = category.name || "";
  document.getElementById("categoryDescription").value =
    category.description || "";
  document.getElementById("categoryIcon").value = category.icon || "";
  document.getElementById("displayOrder").value = category.displayOrder || 0;
  document.getElementById("isActive").checked = !!category.isActive;
  document.getElementById("isFeatured").checked = !!category.isFeatured;
  document.getElementById("showInMenu").checked = !!category.showInMenu;

  // SEO fields from meta object
  document.getElementById("metaTitle").value =
    category.meta && category.meta.title ? category.meta.title : "";
  document.getElementById("metaDescription").value =
    category.meta && category.meta.description ? category.meta.description : "";
  document.getElementById("metaKeywords").value =
    category.meta && Array.isArray(category.meta.keywords)
      ? category.meta.keywords.join(", ")
      : "";

  // Handle images - single image object from API
  categoryImages = [];
  if (category.image && category.image.url) {
    categoryImages.push(category.image);
  } else if (Array.isArray(category.images) && category.images.length > 0) {
    categoryImages = JSON.parse(JSON.stringify(category.images));
  }
  renderImagePreview();

  populateParentCategoryDropdown(categoryId);
  document.getElementById("parentCategory").value =
    category.parentCategoryId || "";

  const modalEl = document.getElementById("categoryModal");
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

function addImage() {
  const urlEl = document.getElementById("imageUrl");
  const altEl = document.getElementById("imageAltText");
  if (!urlEl) return;
  const url = urlEl.value.trim();
  const alt = altEl ? altEl.value.trim() : "";
  if (!url) {
    window.adminPanel.showNotification("Please enter image URL", "error");
    return;
  }
  categoryImages.push({
    url,
    altText: alt,
    isPrimary: categoryImages.length === 0,
  });
  urlEl.value = "";
  if (altEl) altEl.value = "";
  renderImagePreview();
}

function removeImage(index) {
  if (index < 0 || index >= categoryImages.length) return;
  const wasPrimary = categoryImages[index].isPrimary;
  categoryImages.splice(index, 1);
  if (wasPrimary && categoryImages.length > 0)
    categoryImages[0].isPrimary = true;
  renderImagePreview();
}

function setPrimaryImage(index) {
  categoryImages.forEach((img, i) => (img.isPrimary = i === index));
  renderImagePreview();
}

function renderImagePreview() {
  const container = document.getElementById("imagesPreview");
  if (!container) return;
  if (!categoryImages || categoryImages.length === 0) {
    container.innerHTML = '<p class="text-muted small">No images added yet</p>';
    return;
  }
  container.innerHTML = categoryImages
    .map(
      (img, i) => `
    <div class="image-preview-item d-inline-block me-2 position-relative" style="width:100px;">
      <img src="${escapeHtml(img.url)}" alt="${escapeHtml(
        img.altText || "Category image"
      )}" onerror="this.src='https://via.placeholder.com/100?text=Error'" class="img-fluid rounded">
      <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" onclick="removeImage(${i})">×</button>
      <div class="mt-1 text-center">
        ${
          img.isPrimary
            ? '<span class="badge bg-success">Primary</span>'
            : `<button class="btn btn-sm btn-outline-secondary" onclick="setPrimaryImage(${i})">Set Primary</button>`
        }
      </div>
    </div>
  `
    )
    .join("");
}

async function saveCategory() {
  console.log("💾 [CATEGORIES] saveCategory() - Starting save process");
  const name = (document.getElementById("categoryName")?.value || "").trim();
  console.log("📝 [CATEGORIES] Category name:", name);

  if (!name) {
    console.warn(
      "⚠️ [CATEGORIES] Validation failed: Category name is required"
    );
    window.adminPanel.showNotification("Category name is required", "error");
    return;
  }

  const keywords = (document.getElementById("metaKeywords")?.value || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k);
  console.log("🏷️ [CATEGORIES] Keywords:", keywords);

  console.log("📦 [CATEGORIES] Building payload...");
  const payload = {
    name,
    description: (
      document.getElementById("categoryDescription")?.value || ""
    ).trim(),
    parentCategoryId: document.getElementById("parentCategory")?.value || null,
    displayOrder: Number(document.getElementById("displayOrder")?.value || 0),
    isActive: !!document.getElementById("isActive")?.checked,
    isFeatured: !!document.getElementById("isFeatured")?.checked,
    showInMenu: !!document.getElementById("showInMenu")?.checked,
    meta: {
      title: (document.getElementById("metaTitle")?.value || "").trim(),
      description: (
        document.getElementById("metaDescription")?.value || ""
      ).trim(),
      keywords: keywords,
    },
  };

  // Add optional fields if they exist
  const icon = (document.getElementById("categoryIcon")?.value || "").trim();
  if (icon) {
    payload.icon = icon;
    console.log("🎨 [CATEGORIES] Icon added to payload:", icon);
  }

  // Note: Image uploads should use separate endpoint PUT /api/categories/:categoryId/image
  // For now, we'll only handle image objects if they exist
  if (categoryImages.length > 0) {
    // Only send first image as per API doc structure { url, altText }
    payload.image = categoryImages[0];
    console.log("🖼️ [CATEGORIES] Image added to payload:", payload.image);
  }

  console.log("📦 [CATEGORIES] Final payload:", payload);

  try {
    showLoading(true);
    console.log("⏳ [CATEGORIES] Loading overlay shown");

    if (currentCategoryId) {
      // UPDATE: PUT /api/categories/:categoryId
      console.log(
        "🔄 [CATEGORIES] UPDATE mode - categoryId:",
        currentCategoryId
      );
      console.log('🌐 [CATEGORIES] Calling API.put("/categories/:categoryId")');
      await API.put("/categories/:categoryId", payload, {
        categoryId: currentCategoryId,
      });
      console.log("✅ [CATEGORIES] Category updated successfully");
      window.adminPanel.showNotification(
        "Category updated successfully",
        "success"
      );
    } else {
      // CREATE: POST /api/categories
      console.log("➕ [CATEGORIES] CREATE mode - new category");
      console.log('🌐 [CATEGORIES] Calling API.post("/categories")');
      await API.post("/categories", payload);
      console.log("✅ [CATEGORIES] Category created successfully");
      window.adminPanel.showNotification(
        "Category created successfully",
        "success"
      );
    }
    // close modal
    console.log("🚪 [CATEGORIES] Closing modal...");
    const modalEl = document.getElementById("categoryModal");
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    console.log("🔄 [CATEGORIES] Reloading categories...");
    await loadCategories();
    updateStats();
  } catch (err) {
    console.error("❌ [CATEGORIES] Save category error:", err);
    console.error("❌ [CATEGORIES] Error details:", err.message, err.stack);
    window.adminPanel.showNotification(
      err.message || "Failed to save category",
      "error"
    );
  } finally {
    console.log("⏳ [CATEGORIES] Hiding loading overlay");
    showLoading(false);
  }
}

async function toggleCategoryStatus(categoryId) {
  console.log(
    "🔄 [CATEGORIES] toggleCategoryStatus() - categoryId:",
    categoryId
  );
  try {
    showLoading(true);
    const category = categories.find((c) => c._id === categoryId);
    console.log("🔍 [CATEGORIES] Found category:", category);

    if (!category) {
      console.error("❌ [CATEGORIES] Category not found");
      throw new Error("Category not found");
    }

    const payload = {
      isActive: !category.isActive,
    };
    console.log("📦 [CATEGORIES] Payload:", payload);

    // UPDATE: PUT /api/categories/:categoryId
    console.log('🌐 [CATEGORIES] Calling API.put("/categories/:categoryId")');
    await API.put("/categories/:categoryId", payload, {
      categoryId: categoryId,
    });
    console.log("✅ [CATEGORIES] Status toggled successfully");
    window.adminPanel.showNotification(
      `Category ${payload.isActive ? "activated" : "deactivated"} successfully`,
      "success"
    );
    await loadCategories();
    updateStats();
  } catch (err) {
    console.error("❌ [CATEGORIES] Toggle status error:", err);
    window.adminPanel.showNotification(
      "Failed to update category status",
      "error"
    );
  } finally {
    showLoading(false);
  }
}

async function toggleCategoryFeatured(categoryId) {
  console.log(
    "⭐ [CATEGORIES] toggleCategoryFeatured() - categoryId:",
    categoryId
  );
  try {
    showLoading(true);
    const category = categories.find((c) => c._id === categoryId);
    console.log("🔍 [CATEGORIES] Found category:", category);

    if (!category) {
      console.error("❌ [CATEGORIES] Category not found");
      throw new Error("Category not found");
    }

    // Use the toggle-featured endpoint: PUT /api/categories/:categoryId/toggle-featured
    console.log(
      '🌐 [CATEGORIES] Calling API.put("/categories/:categoryId/toggle-featured")'
    );
    await API.put(
      "/categories/:categoryId/toggle-featured",
      {},
      { categoryId: categoryId }
    );
    console.log("✅ [CATEGORIES] Featured status toggled successfully");
    window.adminPanel.showNotification(
      "Category featured status toggled successfully",
      "success"
    );
    await loadCategories();
    updateStats();
  } catch (err) {
    console.error("❌ [CATEGORIES] Toggle featured error:", err);
    window.adminPanel.showNotification(
      "Failed to update category featured status",
      "error"
    );
  } finally {
    showLoading(false);
  }
}

async function deleteCategory(categoryId) {
  console.log("🗑️ [CATEGORIES] deleteCategory() - categoryId:", categoryId);
  const cat = categories.find((c) => c._id === categoryId);
  console.log("🔍 [CATEGORIES] Found category:", cat);

  if (!cat) {
    console.error("❌ [CATEGORIES] Category not found");
    window.adminPanel.showNotification("Category not found", "error");
    return;
  }

  const hasChildren = categories.some((c) => c.parentCategoryId === categoryId);
  console.log("👶 [CATEGORIES] Has children:", hasChildren);

  let message = `Are you sure you want to delete "${cat.name}"?`;
  if (hasChildren)
    message +=
      "\n\nThis category has subcategories. Use force=true to delete with subcategories.";
  if (cat.productCount > 0)
    message += `\n\nThis category has ${cat.productCount} products. You may need to reassign them.`;

  console.log("❓ [CATEGORIES] Showing confirmation dialog...");
  const confirmed = await window.adminPanel.confirmAction(message);
  console.log("✅ [CATEGORIES] User confirmed:", confirmed);

  if (!confirmed) {
    console.log("❌ [CATEGORIES] User cancelled deletion");
    return;
  }

  try {
    showLoading(true);
    // DELETE: DELETE /api/categories/:categoryId
    // If has children, use force=true query param
    const queryParams = hasChildren ? { force: true } : {};
    console.log("📦 [CATEGORIES] Query params:", queryParams);
    console.log(
      '🌐 [CATEGORIES] Calling API.delete("/categories/:categoryId")'
    );
    await API.delete(
      "/categories/:categoryId",
      { categoryId: categoryId },
      queryParams
    );
    console.log("✅ [CATEGORIES] Category deleted successfully");
    window.adminPanel.showNotification(
      "Category deleted successfully",
      "success"
    );
    await loadCategories();
    updateStats();
  } catch (err) {
    console.error("❌ [CATEGORIES] Delete category error:", err);
    window.adminPanel.showNotification(
      err.message || "Failed to delete category",
      "error"
    );
  } finally {
    showLoading(false);
  }
}

/* ---------- Loading overlay ---------- */

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;

  if (show) {
    overlay.classList.remove("d-none");
  } else {
    overlay.classList.add("d-none");
  }
}

/* ---------- Helpers ---------- */

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
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
  const li = el.closest("li");
  if (!li) return;
  const sub = li.querySelector("subcategories");
  if (!sub) return;
  const isHidden = sub.style.display === "none";
  sub.style.display = isHidden ? "block" : "none";
  const icon = el.querySelector("i");
  if (icon)
    icon.className = isHidden ? "bi bi-chevron-down" : "bi bi-chevron-right";
};
window.resetFilters = function () {
  if (searchInput) searchInput.value = "";
  if (statusFilter) statusFilter.value = "";
  if (levelFilter) levelFilter.value = "";
  filterCategories();
};
window.addImage = addImage;
window.removeImage = removeImage;
window.setPrimaryImage = setPrimaryImage;
window.saveCategory = saveCategory;
window.getFeaturedCategories = getFeaturedCategories;
window.fetchFeaturedCategoriesFromAPI = fetchFeaturedCategoriesFromAPI;
