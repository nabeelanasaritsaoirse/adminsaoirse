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
    } catch {
      return "";
    }
  };

window.adminPanel = window.adminPanel || {
  showNotification(msg, type = "info") {
    if (type === "error") console.error(msg);
    alert(msg);
  },
  confirmAction(message) {
    return confirm(message);
  },
};

/* =========================
   GLOBAL CATEGORY STORE
   ========================= */

window.CategoryStore = {
  categories: [],
  currentCategoryId: null,

  /* MARKETPLACE */
  attributeSchema: [],

  selectedRegions: [],
  isGlobalCategory: true,
  regionalMetaMap: {},

  pagination: { page: 1, limit: 50, total: 0 },
};

/* =========================
   Helpers
   ========================= */

window.resetRegionalState = function () {
  CategoryStore.isGlobalCategory = true;
  CategoryStore.selectedRegions = [];
  CategoryStore.regionalMetaMap = {};
};

window.showLoading = function (show) {
  const el = document.getElementById("loadingOverlay");
  if (!el) return;
  el.classList.toggle("d-none", !show);
};

window.escapeHtml = function (text) {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
};

function buildCategoryTree(categories) {
  const map = {};
  const roots = [];

  categories.forEach((cat) => {
    map[cat._id] = { ...cat, children: [] };
  });

  categories.forEach((cat) => {
    if (cat.parentCategoryId && map[cat.parentCategoryId]) {
      map[cat.parentCategoryId].children.push(map[cat._id]);
    } else {
      roots.push(map[cat._id]);
    }
  });

  return roots;
}

window.populateParentCategoryDropdown = function (excludeId = null) {
  const select = document.getElementById("parentCategory");
  if (!select) return;

  select.innerHTML = `<option value="">None (Root Category)</option>`;

  const tree = buildCategoryTree(CategoryStore.categories);

  function render(nodes, depth = 0) {
    nodes.forEach((node) => {
      if (!node.isActive || node._id === excludeId) return;

      const option = document.createElement("option");

      option.value = node._id;
      option.textContent = `${"— ".repeat(depth)}${node.name}`;

      select.appendChild(option);

      if (node.children.length) {
        render(node.children, depth + 1);
      }
    });
  }

  render(tree);
};

window.updateStats = function () {
  const cats = CategoryStore.categories;

  const map = {
    totalCategoriesCount: cats.length,
    activeCategoriesCount: cats.filter((c) => c.isActive).length,
    featuredCategoriesCount: cats.filter((c) => c.isFeatured).length,
    rootCategoriesCount: cats.filter((c) => !c.parentCategoryId).length,
  };

  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
};

/* =========================
   🌍 REGIONAL AVAILABILITY
   ========================= */

window.initializeRegionalCheckboxes = function () {
  const list = document.getElementById("regionalCheckboxesList");
  if (!list || !Array.isArray(window.SUPPORTED_REGIONS)) return;

  list.innerHTML = "";

  window.SUPPORTED_REGIONS.forEach((region) => {
    const code = region.code;
    const checked = CategoryStore.selectedRegions.includes(code);
    const meta = CategoryStore.regionalMetaMap[code] || {
      metaTitle: "",
      metaDescription: "",
      keywords: [],
    };

    const col = document.createElement("div");
    col.className = "col-md-6 mb-3";

    col.innerHTML = `
      <div class="d-flex align-items-start gap-2">
        <div class="form-check form-switch">
          <input
            class="form-check-input regional-checkbox"
            type="checkbox"
            data-region="${escapeHtml(code)}"
            ${checked ? "checked" : ""}
          />
        </div>

        <div class="flex-grow-1">
          <strong>${region.flag || ""} ${escapeHtml(region.name)}</strong>
          <div class="small text-muted">${escapeHtml(code)}</div>
        </div>

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary regional-meta-edit"
          data-region="${escapeHtml(code)}"
          ${checked ? "" : "disabled"}
        >
          Edit meta
        </button>
      </div>

      <div
        class="regional-meta-editor mt-2 p-2 border rounded d-none"
        id="regional-meta-${escapeHtml(code)}"
        style="background:#fafafa;"
      >
        <div class="mb-2">
          <label class="form-label small">Meta Title</label>
          <input
            class="form-control form-control-sm regional-meta-title"
            value="${escapeHtml(meta.metaTitle)}"
          />
        </div>

        <div class="mb-2">
          <label class="form-label small">Meta Description</label>
          <textarea
            class="form-control form-control-sm regional-meta-description"
            rows="2"
          >${escapeHtml(meta.metaDescription)}</textarea>
        </div>

        <div>
          <label class="form-label small">Meta Keywords</label>
          <input
            class="form-control form-control-sm regional-meta-keywords"
            value="${escapeHtml(meta.keywords.join(", "))}"
          />
        </div>
      </div>
    `;

    list.appendChild(col);
  });

  /* Checkbox toggle */
  list.querySelectorAll(".regional-checkbox").forEach((cb) => {
    cb.addEventListener("change", function () {
      const code = this.dataset.region;
      const checked = this.checked;

      handleRegionalCheckboxChange(code, checked);

      const parent = this.closest(".col-md-6");
      parent.querySelector(".regional-meta-edit").disabled = !checked;

      if (!checked) {
        parent.querySelector(".regional-meta-editor").classList.add("d-none");
      }
    });
  });

  /* Edit meta toggle */
  list.querySelectorAll(".regional-meta-edit").forEach((btn) => {
    btn.addEventListener("click", function () {
      const parent = this.closest(".col-md-6");
      const editor = parent.querySelector(".regional-meta-editor");
      const code = this.dataset.region;
      if (!editor || !code) return;

      const isOpen = !editor.classList.contains("d-none");
      if (isOpen) {
        editor.classList.add("d-none");
        saveRegionalEditorValues(code, parent);
      } else {
        editor.classList.remove("d-none");
      }
    });
  });

  /* Save on change */
  list.querySelectorAll(".regional-meta-editor").forEach((editor) => {
    editor.addEventListener("change", () => {
      const parent = editor.closest(".col-md-6");
      const code = parent.querySelector(".regional-checkbox")?.dataset.region;
      saveRegionalEditorValues(code, parent);
    });
  });
};

window.handleRegionalCheckboxChange = function (code, checked) {
  if (checked) {
    if (!CategoryStore.selectedRegions.includes(code)) {
      CategoryStore.selectedRegions.push(code);
    }
    CategoryStore.regionalMetaMap[code] ||= {
      metaTitle: "",
      metaDescription: "",
      keywords: [],
    };
  } else {
    CategoryStore.selectedRegions = CategoryStore.selectedRegions.filter(
      (r) => r !== code,
    );
  }
};

window.saveRegionalEditorValues = function (code, parent) {
  if (!code || !parent) return;

  CategoryStore.regionalMetaMap[code] = {
    metaTitle: parent.querySelector(".regional-meta-title")?.value.trim() || "",
    metaDescription:
      parent.querySelector(".regional-meta-description")?.value.trim() || "",
    keywords:
      parent
        .querySelector(".regional-meta-keywords")
        ?.value.split(",")
        .map((k) => k.trim())
        .filter(Boolean) || [],
  };
};

/* =========================
   Load Categories (Shared)
   ========================= */

async function loadCategories() {
  try {
    showLoading(true);

    const response = await API.get(
      "/categories/admin/all?page=1&limit=1000&isActive=all",
    );

    let data = [];

    if (Array.isArray(response?.data?.data)) {
      data = response.data.data;
    } else if (Array.isArray(response?.data)) {
      data = response.data;
    }

    CategoryStore.categories = data.map((c) => ({
      _id: c._id || c.id,
      name: c.name || "",
      slug: c.slug || "",
      description: c.description || "",
      level: Number(c.level || 0),
      parentCategoryId: c.parentCategoryId || null,
      isActive: c.isActive !== false,
      isFeatured: !!c.isFeatured,
      showInMenu: c.showInMenu !== false,
      productCount: c.productCount || 0,
      displayOrder: Number(c.displayOrder || 0),

      commissionRate: c.commissionRate ?? 0,
      isRestricted: !!c.isRestricted,
      attributeSchema: Array.isArray(c.attributeSchema)
        ? c.attributeSchema
        : [],

      categoryImages: Array.isArray(c.categoryImages) ? c.categoryImages : [],

      meta: c.meta || {},
      metaTitle: c.metaTitle || c.meta?.title || "",
      metaDescription: c.metaDescription || c.meta?.description || "",
      keywords: c.keywords || c.meta?.keywords || [],

      availableInRegions: c.availableInRegions || [],
      regionalMeta: c.regionalMeta || [],
    }));

    CategoryStore.pagination.total = CategoryStore.categories.length;
  } catch (err) {
    console.error(err);
    adminPanel.showNotification("Failed to load categories", "error");
  } finally {
    showLoading(false);
  }
}

window.loadCategories = loadCategories;
