/* =========================
   INIT
   ========================= */

document.addEventListener("DOMContentLoaded", async () => {
  await loadCategories();
  const successType = sessionStorage.getItem("categorySuccess");

  if (successType) {
    adminPanel.showNotification(
      successType === "created"
        ? "Category created successfully"
        : "Category updated successfully",
      "success",
    );

    sessionStorage.removeItem("categorySuccess");
  }
  updateStats();
  renderCategories();

  const search = document.getElementById("searchInput");
  const status = document.getElementById("statusFilter");
  const level = document.getElementById("levelFilter");
  const view = document.getElementById("viewMode");

  if (search) search.addEventListener("input", filterCategories);
  if (status) status.addEventListener("change", filterCategories);
  if (level) level.addEventListener("change", filterCategories);
  if (view) view.addEventListener("change", renderCategories);
});

/* =========================
   LOAD
   ========================= */

async function loadCategories() {
  try {
    showLoading(true);

    const response = await API.get(
      "/categories/admin/all",
      {},
      { isActive: "all" },
    );

    let data = [];
    if (Array.isArray(response?.data)) data = response.data;
    else if (Array.isArray(response)) data = response;

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
      icon: c.icon || "",
    }));

    CategoryStore.pagination.total = CategoryStore.categories.length;
  } catch (err) {
    console.error(err);
    adminPanel.showNotification("Failed to load categories", "error");
  } finally {
    showLoading(false);
  }
}

/* =========================
   STATS
   ========================= */

function updateStats() {
  const list = CategoryStore.categories;

  document.getElementById("totalCategoriesCount").textContent = list.length;
  document.getElementById("activeCategoriesCount").textContent = list.filter(
    (c) => c.isActive,
  ).length;
  document.getElementById("featuredCategoriesCount").textContent = list.filter(
    (c) => c.isFeatured && c.isActive,
  ).length;
  document.getElementById("rootCategoriesCount").textContent = list.filter(
    (c) => !c.parentCategoryId,
  ).length;
}

/* =========================
   FILTERS
   ========================= */

function getFilteredCategories() {
  let list = [...CategoryStore.categories];

  const q = searchInput?.value?.toLowerCase() || "";
  const status = statusFilter?.value || "";
  const level = levelFilter?.value || "";

  if (q) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }

  if (status === "active") list = list.filter((c) => c.isActive);
  if (status === "inactive") list = list.filter((c) => !c.isActive);

  if (level !== "") list = list.filter((c) => c.level === Number(level));

  list.sort((a, b) => a.displayOrder - b.displayOrder);
  return list;
}

function filterCategories() {
  renderCategories();
}

/* =========================
   RENDER
   ========================= */

function renderCategories() {
  const container = document.getElementById("categoriesContainer");
  if (!container) return;

  const view = document.getElementById("viewMode")?.value || "tree";
  const data = getFilteredCategories();

  if (!data.length) {
    container.innerHTML =
      '<div class="text-center text-muted py-5">No categories found</div>';
    return;
  }

  view === "list"
    ? renderListView(container, data)
    : renderTreeView(container, data);
}

/* =========================
   TREE VIEW
   ========================= */

function renderTreeView(container, data) {
  const ul = document.createElement("ul");
  ul.className = "list-unstyled";

  const selectedLevel = document.getElementById("levelFilter")?.value;

  let roots;

  if (!selectedLevel) {
    // Normal behavior → build real tree
    roots = data.filter((c) => !c.parentCategoryId);
  } else {
    // When filtering by level → render flat list
    roots = data;
  }

  roots.forEach((r) => {
    ul.appendChild(renderTreeNode(r, data));
  });

  container.innerHTML = "";
  container.appendChild(ul);
}

function renderTreeNode(cat, all) {
  const li = document.createElement("li");
  const children = all.filter((c) => c.parentCategoryId === cat._id);

  const row = document.createElement("div");
  row.className = "d-flex justify-content-between align-items-start py-2 px-2";

  const left = document.createElement("div");
  left.className = "d-flex align-items-start";

  if (children.length) {
    const toggle = document.createElement("button");
    toggle.className = "btn btn-sm btn-link me-2";
    toggle.innerHTML = '<i class="bi bi-chevron-down"></i>';
    toggle.onclick = () => {
      const sub = li.querySelector("ul");
      if (!sub) return;
      sub.style.display = sub.style.display === "none" ? "block" : "none";
    };

    left.appendChild(toggle);
  } else {
    left.appendChild(document.createElement("span")).style.width = "1.5rem";
  }

  const info = document.createElement("div");
  info.innerHTML = `
    <strong>${escapeHtml(cat.name)}</strong>
    <div class="small text-muted">${escapeHtml(cat.description)}</div>
    <div class="mt-1">
      <span class="badge bg-secondary">Level ${cat.level}</span>
      ${
        cat.isActive
          ? '<span class="badge bg-success ms-1">Active</span>'
          : '<span class="badge bg-warning ms-1">Inactive</span>'
      }
      ${
        cat.isFeatured ? '<span class="badge bg-info ms-1">Featured</span>' : ""
      }
    </div>
  `;
  left.appendChild(info);

  const actions = document.createElement("div");
  actions.className = "btn-group btn-group-sm";

  actions.innerHTML = `
    <button class="btn btn-outline-primary" onclick="editCategory('${
      cat._id
    }')">
      <i class="bi bi-pencil"></i>
    </button>
    <button class="btn btn-outline-${cat.isFeatured ? "info" : "secondary"}"
      onclick="toggleCategoryFeatured('${cat._id}')">
      <i class="bi bi-star${cat.isFeatured ? "-fill" : ""}"></i>
    </button>
    <button class="btn btn-outline-${cat.isActive ? "warning" : "success"}"
      onclick="toggleCategoryStatus('${cat._id}')">
      <i class="bi bi-${cat.isActive ? "pause" : "play"}-circle"></i>
    </button>
    <button class="btn btn-outline-danger"
  onclick="this.disabled=true; deleteCategory('${cat._id}')">

      <i class="bi bi-trash"></i>
    </button>
  `;

  row.appendChild(left);
  row.appendChild(actions);
  li.appendChild(row);

  if (children.length) {
    const sub = document.createElement("ul");
    sub.className = "list-unstyled ms-4";
    children.forEach((c) => sub.appendChild(renderTreeNode(c, all)));
    li.appendChild(sub);
  }

  return li;
}

/* =========================
   LIST VIEW
   ========================= */

function renderListView(container, data) {
  container.innerHTML = `
    <table class="table table-hover">
      <thead>
        <tr>
          <th>Name</th>
          <th>Level</th>
          <th>Status</th>
          <th>Featured</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (c) => `
          <tr>
            <td>${escapeHtml(c.name)}</td>
            <td>${c.level}</td>
            <td>${c.isActive ? "Active" : "Inactive"}</td>
            <td>${c.isFeatured ? "Yes" : "No"}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary"
                onclick="editCategory('${c._id}')">
                <i class="bi bi-pencil"></i>
              </button>
            </td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

/* =========================
   ACTIONS
   ========================= */

function editCategory(id) {
  location.href = `category-edit.html?id=${id}`;
}

async function toggleCategoryStatus(id) {
  const cat = CategoryStore.categories.find((c) => c._id === id);
  if (!cat) return;

  await API.put(
    "/categories/:categoryId",
    { isActive: !cat.isActive },
    { categoryId: id },
  );
  await loadCategories();
  updateStats();
  renderCategories();
}

async function toggleCategoryFeatured(id) {
  await API.put(
    "/categories/:categoryId/toggle-featured",
    {},
    { categoryId: id },
  );
  await loadCategories();
  updateStats();
  renderCategories();
}

let deletingCategoryIds = new Set();

async function deleteCategory(id) {
  if (deletingCategoryIds.has(id)) return; // 🔒 prevent double click
  if (!confirm("Delete this category?")) return;

  deletingCategoryIds.add(id);

  try {
    await API.delete(`/categories/${id}`);
    adminPanel.showNotification("Category deleted successfully", "success");

    await loadCategories();
    updateStats();
    renderCategories();
  } catch (err) {
    const message = err?.response?.message || err?.message;

    if (
      message?.includes("subcategories") &&
      confirm("This category has subcategories. Delete all?")
    ) {
      await API.delete(
        "/categories/:categoryId",
        { categoryId: id },
        { force: true },
      );

      adminPanel.showNotification(
        "Category and subcategories deleted",
        "success",
      );

      await loadCategories();
      updateStats();
      renderCategories();
      return; // ⛔ STOP here
    }

    adminPanel.showNotification(
      message || "Failed to delete category",
      "error",
    );
  }
}
function resetFilters() {
  const search = document.getElementById("searchInput");
  const status = document.getElementById("statusFilter");
  const level = document.getElementById("levelFilter");
  const view = document.getElementById("viewMode");

  if (search) search.value = "";
  if (status) status.value = "";
  if (level) level.value = "";
  if (view) view.value = "tree";

  renderCategories();
}
/* =========================
   EXPOSE
   ========================= */

window.editCategory = editCategory;
window.filterCategories = filterCategories;
window.toggleCategoryStatus = toggleCategoryStatus;
window.toggleCategoryFeatured = toggleCategoryFeatured;
window.deleteCategory = deleteCategory;
window.resetFilters = resetFilters;
