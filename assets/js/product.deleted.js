/* ============================================================
   product.deleted.js
   Professional Deleted Products UX (FINAL)
============================================================ */

let productsContainer;
let deletedPaginationEl;
let deletedSearchInput;
let restoreAllBtn;

const deletedState = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
  search: "",
  selected: new Set(),
};

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  productsContainer = document.getElementById("productsContainer");
  deletedPaginationEl = document.getElementById("deletedPagination");
  deletedSearchInput = document.getElementById("deletedSearchInput");
  restoreAllBtn = document.getElementById("restoreAllBtn");

  deletedSearchInput?.addEventListener(
    "input",
    debounce((e) => {
      deletedState.search = e.target.value.trim();
      deletedState.page = 1;
      loadDeletedProducts();
    }, 400),
  );

  restoreAllBtn?.addEventListener("click", restoreSelectedProducts);

  loadDeletedProducts();
});

/* ---------- LOAD DELETED (BACKEND PAGINATION) ---------- */
async function loadDeletedProducts() {
  try {
    showLoading(true);

    const res = await API.get(
      "/products/admin/all",
      {},
      {
        page: deletedState.page,
        limit: deletedState.limit,
        showDeleted: true,
        search: deletedState.search,
      },
    );

    // 🔒 HARD GUARANTEE — deleted page shows ONLY deleted
    const list = Array.isArray(res?.data) ? res.data : [];

    deletedState.total = res?.pagination?.total || 0;
    deletedState.pages = res?.pagination?.pages || 0;
    deletedState.page = res?.pagination?.current || 1;

    if (!list.length) {
      productsContainer.innerHTML =
        "<div class='text-center text-muted py-5'>No deleted products</div>";
      renderDeletedPagination();
      return;
    }

    productsContainer.innerHTML = list.map(renderDeletedCard).join("");
    renderDeletedPagination();
  } catch (err) {
    console.error("Load deleted products failed:", err);
    showNotification("Failed to load deleted products", "error");
  } finally {
    showLoading(false);
  }
}

/* ---------- CARD ---------- */
function renderDeletedCard(product) {
  const price =
    product.pricing?.salePrice || product.pricing?.regularPrice || 0;

  return `
    <div class="card mb-3 border-danger">
      <div class="card-body">
        <div class="row align-items-start">
          <div class="col-md-1 text-center">
            <input
              type="checkbox"
              class="form-check-input"
              onchange="toggleDeletedSelection('${
                product.productId
              }', this.checked)"
            />
          </div>

          <div class="col-md-7">
            <h5 class="text-danger mb-1">${escapeHtml(product.name)}</h5>
            <div class="small text-muted">
              SKU: ${escapeHtml(product.sku || product.productId)}
            </div>
            <div class="small">
              ${escapeHtml(product.category?.mainCategoryName || "N/A")}
            </div>
          </div>

          <div class="col-md-2 text-end fw-bold text-danger">
            ₹${Number(price).toFixed(2)}
          </div>

          <div class="col-md-2 text-end">
            <button
              class="btn btn-sm btn-success"
              onclick="restoreProduct('${product.productId}')"
            >
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- SELECTION ---------- */
function toggleDeletedSelection(productId, checked) {
  checked
    ? deletedState.selected.add(productId)
    : deletedState.selected.delete(productId);

  updateRestoreButton();
}

function updateRestoreButton() {
  if (!restoreAllBtn) return;
  restoreAllBtn.disabled = deletedState.selected.size === 0;
  restoreAllBtn.innerText =
    deletedState.selected.size > 0
      ? `Restore (${deletedState.selected.size})`
      : "Restore Selected";
}

/* ---------- PAGINATION ---------- */
function renderDeletedPagination() {
  const containerId = "deletedPagination";

  let container = document.getElementById(containerId);

  if (!container) return;

  const totalPages = deletedState.pages;
  const currentPage = deletedState.page;

  container.innerHTML = "";
  if (totalPages <= 1) return;

  const PAGE_WINDOW = 10;

  const windowStart =
    Math.floor((currentPage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;

  const windowEnd = Math.min(windowStart + PAGE_WINDOW - 1, totalPages);

  let html = `<ul class="pagination justify-content-center mb-0">`;

  /* << Jump Back */
  html += `
    <li class="page-item ${windowStart === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${windowStart - PAGE_WINDOW}">
        &laquo;
      </a>
    </li>
  `;

  /* < Previous */
  html += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage - 1}">
        &lsaquo;
      </a>
    </li>
  `;

  /* Page Numbers */
  for (let p = windowStart; p <= windowEnd; p++) {
    html += `
      <li class="page-item ${p === currentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${p}">
          ${p}
        </a>
      </li>
    `;
  }

  /* > Next */
  html += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">
        &rsaquo;
      </a>
    </li>
  `;

  /* >> Jump Forward */
  html += `
    <li class="page-item ${windowEnd === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${windowEnd + 1}">
        &raquo;
      </a>
    </li>
  `;

  html += `</ul>
  <div class="small text-muted text-center mt-2">
    ${deletedState.total} deleted products
  </div>`;

  container.innerHTML = html;

  /* Click events */
  container.querySelectorAll("a.page-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();

      const targetPage = parseInt(a.getAttribute("data-page"), 10);

      if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages)
        return;

      deletedState.page = targetPage;

      loadDeletedProducts();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });
}

function changeDeletedPage(p) {
  if (p < 1 || p > deletedState.pages) return;
  deletedState.page = p;
  loadDeletedProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.changeDeletedPage = changeDeletedPage;

window.changeDeletedPage = changeDeletedPage;

/* ---------- RESTORE SINGLE ---------- */
async function restoreProduct(productId) {
  if (!confirm("Restore this product?")) return;

  try {
    showLoading(true);

    await API.put(`/products/${productId}/restore`);

    showNotification("Product restored successfully", "success");

    // 🔥 IMMEDIATE UI CLEANUP (no waiting for reload)
    const card = document
      .querySelector(`[onclick="restoreProduct('${productId}')"]`)
      ?.closest(".card");

    if (card) card.remove();

    // 🔄 Sync state
    loadDeletedProducts();
  } catch (err) {
    console.error("Restore failed:", err);
    showNotification(err?.message || "Restore failed", "error");
  } finally {
    showLoading(false);
  }
}

/* ---------- RESTORE BULK ---------- */
async function restoreSelectedProducts() {
  if (deletedState.selected.size === 0) return;

  if (!confirm(`Restore ${deletedState.selected.size} products?`)) return;

  try {
    showLoading(true);

    for (const id of deletedState.selected) {
      await API.put(`/products/${id}/restore`);
    }

    showNotification("Selected products restored", "success");
    deletedState.selected.clear();
    loadDeletedProducts();
  } catch (err) {
    showNotification("Bulk restore failed", "error");
  } finally {
    showLoading(false);
  }
}

/* ---------- UTILS ---------- */
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

window.restoreProduct = restoreProduct;
