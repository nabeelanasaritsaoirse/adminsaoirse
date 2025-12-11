// categories.js - Paste-ready (with regionalMeta support)

/* =========================
   Safe Utils Fallbacks
   ========================= */

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

/* =========================
   State
   ========================= */

let categories = [];
let currentCategoryId = null;
let categoryImages = []; // {url, altText, isPrimary}

let selectedRegions = []; // ['india','usa']
let isGlobalCategory = true; // checkbox state

// regionalMetaMap: { [regionCode]: { metaTitle, metaDescription, keywords: [] } }
let regionalMetaMap = {};

function resetRegionalState() {
  isGlobalCategory = true;
  selectedRegions = [];
  regionalMetaMap = {};
}
let pagination = { page: 1, limit: 50, total: 0 };

/* DOM elements */
let searchInput, statusFilter, levelFilter, viewModeSelect;
let categoriesContainer, categoryForm;
let totalCategoriesCount,
  activeCategoriesCount,
  featuredCategoriesCount,
  rootCategoriesCount;

/* Regional DOM elements */
let isGlobalCategoryCheckbox, regionalCheckboxesSection, regionalCheckboxesList;

/* =========================
   Initialization
   ========================= */

document.addEventListener("DOMContentLoaded", function () {
  initializeDOMElements();
  setupEventListeners();
  loadCategories();

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      AUTH.removeToken && AUTH.removeToken();
      localStorage.removeItem("epi_admin_token");
      localStorage.removeItem("epi_admin_user");
      window.location.href = "login.html";
    });
  }
});

/* =========================
   DOM Init
   ========================= */

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

  isGlobalCategoryCheckbox = document.getElementById("isGlobalCategory");
  regionalCheckboxesSection = document.getElementById(
    "regionalCheckboxesSection"
  );
  regionalCheckboxesList = document.getElementById("regionalCheckboxesList");

  if (isGlobalCategoryCheckbox) {
    isGlobalCategoryCheckbox.addEventListener("change", function () {
      isGlobalCategory = !!this.checked;
      if (isGlobalCategory) {
        if (regionalCheckboxesSection)
          regionalCheckboxesSection.classList.add("d-none");
        selectedRegions = [];
        regionalMetaMap = {};
      } else {
        if (regionalCheckboxesSection)
          regionalCheckboxesSection.classList.remove("d-none");
        initializeRegionalCheckboxes();
      }
    });
  }
}

/* =========================
   Events
   ========================= */

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

  if (categoryForm) {
    categoryForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveCategory();
    });
  }
}

/* =========================
   Regional Functions (with regionalMeta)
   ========================= */

/**
 * initializeRegionalCheckboxes
 * - Renders checkbox list for all supported regions
 * - Adds small "Edit meta" button next to each checkbox to open the inline meta editor
 */
function initializeRegionalCheckboxes() {
  if (!regionalCheckboxesList) return;
  regionalCheckboxesList.innerHTML = "";

  if (
    !Array.isArray(window.SUPPORTED_REGIONS) ||
    window.SUPPORTED_REGIONS.length === 0
  ) {
    regionalCheckboxesList.innerHTML =
      '<div class="text-muted small">No regions configured.</div>';
    return;
  }

  window.SUPPORTED_REGIONS.forEach((region) => {
    const code = region.code;
    const safeCode = escapeHtml(code);
    const isChecked = selectedRegions.includes(code);
    const meta = regionalMetaMap[code] || {
      metaTitle: "",
      metaDescription: "",
      keywords: [],
    };

    const col = document.createElement("div");
    col.className = "col-md-6 mb-2";
    col.innerHTML = `
      <div class="d-flex align-items-start gap-2">
        <div class="form-check form-switch me-2" style="flex:0 0 auto;">
          <input class="form-check-input regional-checkbox" type="checkbox" id="region-cat-${safeCode}" data-region="${safeCode}" ${
      isChecked ? "checked" : ""
    }>
        </div>
        <div style="flex:1 1 auto;">
          <label class="form-label mb-0" for="region-cat-${safeCode}">
            <span style="font-size:1.2em; margin-right:.4rem;">${
              region.flag || ""
            }</span>
            <strong>${escapeHtml(region.name)}</strong>
            <div class="small text-muted">${safeCode}</div>
          </label>
        </div>
        <div style="flex:0 0 auto;">
          <button type="button" class="btn btn-sm btn-outline-secondary regional-meta-edit" data-region="${safeCode}" ${
      isChecked ? "" : "disabled"
    }>Edit meta</button>
        </div>
      </div>

      <div class="regional-meta-editor mt-2 p-2 border rounded ${
        isChecked ? "" : "d-none"
      }" id="regional-meta-${safeCode}" style="background:#fafafa;">
        <div class="mb-2"><strong>Regional SEO / Meta for ${escapeHtml(
          region.name
        )}</strong></div>
        <div class="mb-2">
          <label class="form-label small mb-1">Meta Title</label>
          <input
            id="regionalMetaTitle_${safeCode}"
            type="text"
            class="form-control form-control-sm regional-meta-title"
            value="${escapeHtml(meta.metaTitle || "")}"
            maxlength="60"
          />
        </div>
        <div class="mb-2">
          <label class="form-label small mb-1">Meta Description</label>
          <textarea
            id="regionalMetaDescription_${safeCode}"
            class="form-control form-control-sm regional-meta-description"
            rows="2"
            maxlength="160"
          >${escapeHtml(meta.metaDescription || "")}</textarea>
        </div>
        <div>
          <label class="form-label small mb-1">Meta Keywords (comma separated)</label>
          <input
            id="regionalMetaKeywords_${safeCode}"
            type="text"
            class="form-control form-control-sm regional-meta-keywords"
            value="${escapeHtml((meta.keywords || []).join(", "))}"
            placeholder="k1, k2, k3"
          />
        </div>
      </div>
    `;

    regionalCheckboxesList.appendChild(col);
  });

  // Attach listeners (delegated-per-node)
  regionalCheckboxesList
    .querySelectorAll(".regional-checkbox")
    .forEach((cb) => {
      cb.addEventListener("change", function () {
        const code = this.dataset.region;
        const checked = !!this.checked;
        handleRegionalCheckboxChange(code, checked);

        const parent = this.closest(".col-md-6");
        if (parent) {
          const editBtn = parent.querySelector(".regional-meta-edit");
          const editor = parent.querySelector(".regional-meta-editor");
          if (editBtn) editBtn.disabled = !checked;
          if (!checked && editor) {
            // hide editor but keep meta in map (we preserve values)
            editor.classList.add("d-none");
          } else if (checked && editor) {
            // show editor (if user wants immediate editing)
            // keep it collapsed by default — comment out if you want auto-open
            // editor.classList.remove("d-none");
          }
        }
      });
    });

  regionalCheckboxesList
    .querySelectorAll(".regional-meta-edit")
    .forEach((btn) => {
      btn.addEventListener("click", function () {
        const code = this.dataset.region;
        const parent = this.closest(".col-md-6");
        if (!parent) return;
        const editor = parent.querySelector(`#regional-meta-${code}`);
        if (!editor) return;

        const wasHidden = editor.classList.contains("d-none");
        // toggle
        if (wasHidden) editor.classList.remove("d-none");
        else editor.classList.add("d-none");

        // if we just hid it (i.e. was visible before toggle), save
        if (!wasHidden) {
          saveRegionalEditorValues(code, parent);
        }
      });
    });

  // Save on input blur/change inside editors
  regionalCheckboxesList
    .querySelectorAll(".regional-meta-editor")
    .forEach((editor) => {
      editor.addEventListener("change", function () {
        const container = editor.closest(".col-md-6");
        if (!container) return;
        const code =
          container.querySelector(".regional-checkbox")?.dataset.region;
        if (!code) return;
        saveRegionalEditorValues(code, container);
      });
      editor.querySelectorAll("input,textarea").forEach((el) => {
        el.addEventListener("blur", function () {
          const container = editor.closest(".col-md-6");
          if (!container) return;
          const code =
            container.querySelector(".regional-checkbox")?.dataset.region;
          if (!code) return;
          saveRegionalEditorValues(code, container);
        });
      });
    });
}

/**
 * saveRegionalEditorValues(regionCode, parentNode)
 * - Reads inputs in that region editor and stores in regionalMetaMap
 */
function saveRegionalEditorValues(regionCode, parentNode) {
  if (!parentNode || !regionCode) return;

  const title =
    parentNode.querySelector(".regional-meta-title")?.value.trim() || "";
  const desc =
    parentNode.querySelector(".regional-meta-description")?.value.trim() || "";
  const keywordsRaw =
    parentNode.querySelector(".regional-meta-keywords")?.value || "";

  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  regionalMetaMap[regionCode] = {
    metaTitle: title,
    metaDescription: desc,
    keywords,
  };

  console.log(
    `🔖 [REGIONAL META SAVED] ${regionCode}:`,
    regionalMetaMap[regionCode]
  );
}

/**
 * handleRegionalCheckboxChange(regionCode, isChecked)
 */
function handleRegionalCheckboxChange(regionCode, isChecked) {
  if (isChecked) {
    if (!selectedRegions.includes(regionCode)) selectedRegions.push(regionCode);

    // ensure regionalMetaMap has an entry (non-destructive)
    if (!regionalMetaMap[regionCode]) {
      regionalMetaMap[regionCode] = {
        metaTitle: "",
        metaDescription: "",
        keywords: [],
      };
    }
    console.log(`✅ [REGIONAL] Added: ${regionCode}`);
  } else {
    selectedRegions = selectedRegions.filter((r) => r !== regionCode);
    // keep regionalMetaMap entry if you want to preserve it; we keep it but hidden
    console.log(`❌ [REGIONAL] Removed: ${regionCode}`);
  }

  console.log("🔄 [REGIONAL] selectedRegions:", selectedRegions);
}

/* =========================
   Load Categories
   ========================= */

async function loadCategories() {
  console.log("📂 [CATEGORIES] loadCategories() - Starting to load categories");
  try {
    showLoading(true);
    const response = await API.get("/categories", {}, { isActive: "all" });

    let categoriesData = [];
    if (response && response.success !== false) {
      if (response.data && Array.isArray(response.data))
        categoriesData = response.data;
      else if (Array.isArray(response)) categoriesData = response;
    }

    categories = categoriesData.map((c) => ({
      _id: c._id || c.id || "",
      categoryId: c.categoryId || "",
      name: c.name || "",
      slug: c.slug || "",
      description: c.description || "",
      level: typeof c.level === "number" ? c.level : 0,
      path: Array.isArray(c.path) ? c.path : [],
      parentCategoryId: c.parentCategoryId || null,
      isActive: c.isActive !== undefined ? c.isActive : true,
      isFeatured:
        c.isFeatured === true || c.isFeatured === "true" || c.isFeatured === 1,
      showInMenu: c.showInMenu !== undefined ? c.showInMenu : true,
      productCount: c.productCount || 0,
      displayOrder: Number(c.displayOrder || 0),
      icon: c.icon || "",
      image: c.image || {},
      banner: c.banner || {},
      images: Array.isArray(c.images) ? c.images : [],
      meta: c.meta || {},
      subCategories: Array.isArray(c.subCategories) ? c.subCategories : [],
      availableInRegions: Array.isArray(c.availableInRegions)
        ? c.availableInRegions
        : [],
      regionalMeta: Array.isArray(c.regionalMeta) ? c.regionalMeta : [],
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString(),
    }));

    pagination.total = categories.length;
    updateStats();
    renderCategories();
    populateParentCategoryDropdown();
  } catch (error) {
    console.error("❌ [CATEGORIES] Error loading categories:", error);
    window.adminPanel.showNotification(
      "Failed to load categories: " + (error.message || error),
      "error"
    );
  } finally {
    showLoading(false);
  }
}

/* =========================
   Stats & Filters
   ========================= */

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
  if (searchInput && searchInput.value.trim()) {
    const q = searchInput.value.trim().toLowerCase();
    filtered = filtered.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.slug && c.slug.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }
  if (statusFilter && statusFilter.value) {
    if (statusFilter.value === "active")
      filtered = filtered.filter((c) => c.isActive);
    else if (statusFilter.value === "inactive")
      filtered = filtered.filter((c) => !c.isActive);
  }
  if (levelFilter && levelFilter.value !== "") {
    const lv = parseInt(levelFilter.value, 10);
    if (!isNaN(lv)) filtered = filtered.filter((c) => Number(c.level) === lv);
  }

  filtered.sort((a, b) => {
    const da = a.displayOrder || 0;
    const db = b.displayOrder || 0;
    if (da !== db) return da - db;
    return (a.name || "").localeCompare(b.name || "");
  });

  return filtered;
}

function filterCategories() {
  renderCategories();
}

/* =========================
   Render
   ========================= */

function renderCategories() {
  if (!categoriesContainer) return;
  try {
    const viewMode = viewModeSelect ? viewModeSelect.value : "tree";
    if (viewMode === "list") renderListView(categoriesContainer);
    else renderTreeView(categoriesContainer);
  } catch (error) {
    console.error("Error rendering categories:", error);
    categoriesContainer.innerHTML = `<div class="alert alert-danger">Error rendering categories. Please refresh the page.<br><small>${escapeHtml(
      error.message
    )}</small></div>`;
  }
}

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
  roots.forEach((root) =>
    ul.appendChild(renderCategoryTreeItem(root, filtered))
  );
  container.innerHTML = "";
  container.appendChild(ul);
}

function renderCategoryTreeItem(
  category,
  allCategories,
  visitedIds = new Set(),
  depth = 0
) {
  if (visitedIds.has(category._id)) {
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="text-muted small">Circular reference detected...</div>';
    return li;
  }
  const MAX_DEPTH = 10;
  if (depth >= MAX_DEPTH) {
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
  itemDiv.className =
    "category-item d-flex justify-content-between align-items-start py-2 px-2";

  const left = document.createElement("div");
  left.className = "d-flex align-items-start flex-grow-1";

  if (hasChildren) {
    const toggle = document.createElement("button");
    toggle.className = "btn btn-sm btn-link p-0 me-2 toggle-children";
    toggle.setAttribute("type", "button");
    toggle.innerHTML = '<i class="bi bi-chevron-down"></i>';
    toggle.onclick = function () {
      const sub = li.querySelector(".subcategories");
      if (!sub) return;
      const isHidden = sub.style.display === "none";
      sub.style.display = isHidden ? "block" : "none";
      toggle.innerHTML = isHidden
        ? '<i class="bi bi-chevron-down"></i>'
        : '<i class="bi bi-chevron-right"></i>';
    };
    left.appendChild(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "me-3";
    spacer.style.width = "1.4rem";
    left.appendChild(spacer);
  }

  const iconSpan = document.createElement("span");
  iconSpan.className = "me-2";
  iconSpan.innerHTML = category.icon
    ? escapeHtml(category.icon)
    : '<i class="bi bi-folder"></i>';
  left.appendChild(iconSpan);

  const titleWrap = document.createElement("div");
  titleWrap.innerHTML = `<strong>${escapeHtml(
    category.name
  )}</strong><div class="small text-muted">${escapeHtml(
    category.description || ""
  )}</div><div class="small"><code>${escapeHtml(
    category.categoryId
  )}</code></div>`;
  left.appendChild(titleWrap);

  const badges = document.createElement("div");
  badges.className = "ms-3";
  badges.innerHTML = `<span class="badge bg-secondary me-1">Level ${
    category.level
  }</span>${
    category.isActive
      ? '<span class="badge bg-success me-1">Active</span>'
      : '<span class="badge bg-warning me-1">Inactive</span>'
  }${
    category.isFeatured
      ? '<span class="badge bg-info me-1">Featured</span>'
      : ""
  }${
    category.productCount
      ? `<span class="badge bg-primary">${category.productCount} products</span>`
      : ""
  }`;
  left.appendChild(badges);

  itemDiv.appendChild(left);

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
      const childVisited = new Set(visitedIds);
      subUl.appendChild(
        renderCategoryTreeItem(child, allCategories, childVisited, depth + 1)
      );
    });
    li.appendChild(subUl);
  }

  return li;
}

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
      <td>${
        category.icon ? escapeHtml(category.icon) + " " : ""
      }<strong>${escapeHtml(category.name)}</strong> ${
        category.isFeatured
          ? '<i class="bi bi-star-fill text-warning ms-1"></i>'
          : ""
      }</td>
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
          }" onclick="toggleCategoryFeatured('${
        category._id
      }')"><i class="bi bi-${
        category.isFeatured ? "star-fill" : "star"
      }"></i></button>
          <button class="btn btn-outline-${
            category.isActive ? "warning" : "success"
          }" onclick="toggleCategoryStatus('${
        category._id
      }')"><i class="bi bi-${
        category.isActive ? "pause" : "play"
      }-circle"></i></button>
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
            <th>Name</th>
            <th>Slug</th>
            <th>Level</th>
            <th>Status</th>
            <th>Products</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* =========================
   Parent Dropdown
   ========================= */

function populateParentCategoryDropdown(excludeId = null) {
  const select = document.getElementById("parentCategory");
  if (!select) return;

  const maxLevels = (window.APP_CONFIG?.categories?.maxLevels || 2) - 1;
  const availableParents = categories.filter((c) => {
    const canBeParent = (c.level || 0) <= maxLevels;
    const notSelf = c._id !== excludeId;
    return canBeParent && notSelf && c.isActive;
  });

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

/* =========================
   Modal / CRUD
   ========================= */

function openAddCategoryModal() {
  currentCategoryId = null;
  categoryImages = [];
  resetRegionalState(); // FIX #3 — Clears global/regional state properly

  if (isGlobalCategoryCheckbox) isGlobalCategoryCheckbox.checked = true;
  if (regionalCheckboxesSection)
    regionalCheckboxesSection.classList.add("d-none");
  if (regionalCheckboxesList) regionalCheckboxesList.innerHTML = "";

  const titleEl = document.getElementById("categoryModalTitle");
  if (titleEl) titleEl.textContent = "Add Category";

  if (categoryForm) categoryForm.reset();

  const imagesPreview = document.getElementById("imagesPreview");
  if (imagesPreview) imagesPreview.innerHTML = "";

  populateParentCategoryDropdown();
}

async function editCategory(categoryId) {
  currentCategoryId = categoryId;

  const category = categories.find((c) => c._id === categoryId);
  if (!category) {
    window.adminPanel.showNotification("Category not found", "error");
    return;
  }

  // ---- BASIC FIELDS ----
  const titleEl = document.getElementById("categoryModalTitle");
  if (titleEl) titleEl.textContent = "Edit Category";

  document.getElementById("categoryName").value = category.name || "";
  document.getElementById("categoryDescription").value =
    category.description || "";
  document.getElementById("categoryIcon").value = category.icon || "";
  document.getElementById("displayOrder").value = category.displayOrder || 0;

  document.getElementById("isActive").checked = !!category.isActive;
  document.getElementById("isFeatured").checked = !!category.isFeatured;
  document.getElementById("showInMenu").checked = !!category.showInMenu;

  // ---- GLOBAL META ----
  document.getElementById("metaTitle").value = category.meta?.title || "";
  document.getElementById("metaDescription").value =
    category.meta?.description || "";
  document.getElementById("metaKeywords").value = Array.isArray(
    category.meta?.keywords
  )
    ? category.meta.keywords.join(", ")
    : "";

  // ---- IMAGES ----
  categoryImages = [];
  if (category.image?.url) {
    categoryImages.push({
      url: category.image.url,
      altText: category.image.altText || category.name,
      isPrimary: true,
    });
  } else if (Array.isArray(category.images) && category.images.length > 0) {
    categoryImages = category.images.map((img, idx) => ({
      url: img.url,
      altText: img.altText || category.name,
      isPrimary: idx === 0,
    }));
  }
  renderImagePreview();

  // ---- PARENT CATEGORY ----
  populateParentCategoryDropdown(categoryId);
  const parentSelect = document.getElementById("parentCategory");
  if (parentSelect) parentSelect.value = category.parentCategoryId || "";

  // =====================================================
  // 🌍 REGIONAL SETTINGS — LOAD SAVED DATA
  // =====================================================

  const hasRegionalData =
    Array.isArray(category.availableInRegions) &&
    category.availableInRegions.length > 0;

  if (hasRegionalData) {
    isGlobalCategory = false;

    // Reset
    selectedRegions = [];
    regionalMetaMap = {};

    // Apply saved regions
    selectedRegions = [...category.availableInRegions];

    // Load regional meta map
    if (Array.isArray(category.regionalMeta)) {
      category.regionalMeta.forEach((rm) => {
        if (rm && rm.region && selectedRegions.includes(rm.region)) {
          regionalMetaMap[rm.region] = {
            metaTitle: rm.metaTitle || "",
            metaDescription: rm.metaDescription || "",
            keywords: Array.isArray(rm.keywords)
              ? rm.keywords
              : typeof rm.keywords === "string"
              ? rm.keywords
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean)
              : [],
          };
        }
      });
    }

    // Show UI
    if (isGlobalCategoryCheckbox) isGlobalCategoryCheckbox.checked = false;
    regionalCheckboxesSection.classList.remove("d-none");

    // Build checkbox list + editors
    initializeRegionalCheckboxes();

    // 🔥 IMPORTANT FIX — populate UI inputs with saved values
    selectedRegions.forEach((code) => {
      const rm = regionalMetaMap[code] || {};

      const titleEl = document.getElementById(`regionalMetaTitle_${code}`);
      const descEl = document.getElementById(`regionalMetaDescription_${code}`);
      const keywordsEl = document.getElementById(
        `regionalMetaKeywords_${code}`
      );

      if (titleEl) titleEl.value = rm.metaTitle || "";
      if (descEl) descEl.value = rm.metaDescription || "";
      if (keywordsEl)
        keywordsEl.value = Array.isArray(rm.keywords)
          ? rm.keywords.join(", ")
          : "";
    });

    console.log(
      "✅ Loaded regional settings:",
      selectedRegions,
      regionalMetaMap
    );
  } else {
    // ---- GLOBAL CATEGORY ----
    isGlobalCategory = true;
    selectedRegions = [];
    regionalMetaMap = {};

    if (isGlobalCategoryCheckbox) isGlobalCategoryCheckbox.checked = true;
    regionalCheckboxesSection.classList.add("d-none");
  }

  // ---- OPEN MODAL ----
  const modalEl = document.getElementById("categoryModal");
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

/* =========================
   Image Handling (URL-only)
   ========================= */

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

/* =========================
   Save Category
   ========================= */

async function saveCategory() {
  console.log("💾 [CATEGORIES] saveCategory() - Starting save process");

  const name = (document.getElementById("categoryName")?.value || "").trim();
  if (!name) {
    window.adminPanel.showNotification("Category name is required", "error");
    return;
  }

  const keywords = (document.getElementById("metaKeywords")?.value || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

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
      keywords,
    },
  };

  const icon = (document.getElementById("categoryIcon")?.value || "").trim();
  if (icon) payload.icon = icon;

  if (categoryImages.length > 0) {
    payload.image = categoryImages[0];
    payload.images = categoryImages;
  }

  /* ----------------------------------------------------
     🌍 REGIONAL META — FINAL FIX
     ---------------------------------------------------- */

  if (isGlobalCategoryCheckbox) {
    isGlobalCategory = !!isGlobalCategoryCheckbox.checked;
  }

  if (!isGlobalCategory) {
    // 1️⃣ Save ALL editors into regionalMetaMap (even hidden ones)
    if (regionalCheckboxesList) {
      regionalCheckboxesList.querySelectorAll(".col-md-6").forEach((col) => {
        const code = col.querySelector(".regional-checkbox")?.dataset.region;
        if (code) saveRegionalEditorValues(code, col);
      });
    }

    // 2️⃣ Build final regionalMeta array ONLY from regionalMetaMap
    const regionalMetaArray = selectedRegions.map((code) => {
      const rm = regionalMetaMap[code] || {
        metaTitle: "",
        metaDescription: "",
        keywords: [],
      };

      return {
        region: code,
        metaTitle: rm.metaTitle || "",
        metaDescription: rm.metaDescription || "",
        keywords: Array.isArray(rm.keywords)
          ? rm.keywords
          : typeof rm.keywords === "string"
          ? rm.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : [],
      };
    });

    payload.availableInRegions = [...selectedRegions];
    payload.regionalMeta = regionalMetaArray;
  } else {
    payload.availableInRegions = [];
    payload.regionalMeta = [];
  }

  console.log("📦 [CATEGORIES] FINAL PAYLOAD:", payload);

  /* ----------------------------------------------------
     🧾 API CALL
     ---------------------------------------------------- */
  try {
    showLoading(true);

    if (currentCategoryId) {
      await API.put("/categories/:categoryId", payload, {
        categoryId: currentCategoryId,
      });
      window.adminPanel.showNotification(
        "Category updated successfully",
        "success"
      );
    } else {
      await API.post("/categories", payload);
      window.adminPanel.showNotification(
        "Category created successfully",
        "success"
      );
    }

    const modalEl = document.getElementById("categoryModal");
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    await loadCategories();
  } catch (err) {
    console.error("❌ [CATEGORIES] Save category error:", err);
    window.adminPanel.showNotification(
      err.message || "Failed to save category",
      "error"
    );
  } finally {
    showLoading(false);
  }
}

/* =========================
   Toggle / Delete / Featured
   ========================= */

async function toggleCategoryStatus(categoryId) {
  try {
    showLoading(true);
    const category = categories.find((c) => c._id === categoryId);
    if (!category) throw new Error("Category not found");
    const payload = { isActive: !category.isActive };
    await API.put("/categories/:categoryId", payload, { categoryId });
    window.adminPanel.showNotification(
      `Category ${payload.isActive ? "activated" : "deactivated"} successfully`,
      "success"
    );
    await loadCategories();
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
  try {
    showLoading(true);
    const category = categories.find((c) => c._id === categoryId);
    if (!category) throw new Error("Category not found");
    await API.put(
      "/categories/:categoryId/toggle-featured",
      {},
      { categoryId }
    );
    window.adminPanel.showNotification(
      "Category featured status toggled successfully",
      "success"
    );
    await loadCategories();
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
  const cat = categories.find((c) => c._id === categoryId);
  if (!cat) {
    window.adminPanel.showNotification("Category not found", "error");
    return;
  }

  const hasChildren = categories.some((c) => c.parentCategoryId === categoryId);
  let message = `Are you sure you want to delete "${cat.name}"?`;
  if (hasChildren)
    message +=
      "\n\nThis category has subcategories. They will also be deleted.";
  if (cat.productCount > 0)
    message += `\n\nThis category has ${cat.productCount} products. You may need to reassign them.`;

  const confirmed = window.adminPanel.confirmAction(message);
  if (!confirmed) return;

  try {
    showLoading(true);
    const queryParams = hasChildren ? { force: true } : {};
    await API.delete("/categories/:categoryId", { categoryId }, queryParams);
    window.adminPanel.showNotification(
      "Category deleted successfully",
      "success"
    );
    await loadCategories();
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

/* =========================
   Loading Overlay / Helpers
   ========================= */

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;
  if (show) overlay.classList.remove("d-none");
  else overlay.classList.add("d-none");
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

/* =========================
   Expose to global (for HTML)
   ========================= */

window.openAddCategoryModal = openAddCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.toggleCategoryStatus = toggleCategoryStatus;
window.toggleCategoryFeatured = toggleCategoryFeatured;
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
window.getFeaturedCategories = function () {
  return categories.filter((c) => c.isFeatured && c.isActive);
};
window.fetchFeaturedCategoriesFromAPI = async function () {
  try {
    const response = await API.get("/categories/featured");
    let featured = [];
    if (response && response.data && Array.isArray(response.data))
      featured = response.data;
    else if (Array.isArray(response)) featured = response;
    return featured;
  } catch (error) {
    console.error("Error fetching featured categories:", error);
    return [];
  }
};
