/* ============================================================
   product.deleted.js
   Soft-deleted products list + restore
============================================================ */

let productsContainer;

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  productsContainer = document.getElementById("productsContainer");
  loadDeletedProducts();
});

/* ---------- LOAD DELETED ---------- */
async function loadDeletedProducts() {
  try {
    showLoading(true);

    const res = await API.get("/products/admin/all", {}, { isDeleted: true });

    const list = Array.isArray(res?.data) ? res.data : [];

    if (!list.length) {
      productsContainer.innerHTML =
        "<div class='text-center text-muted py-5'>No deleted products</div>";
      return;
    }

    productsContainer.innerHTML = list.map(renderDeletedCard).join("");
  } catch (err) {
    console.error("Load deleted products failed:", err);
    showNotification("Failed to load deleted products", "error");
  } finally {
    showLoading(false);
  }
}

/* ---------- RENDER CARD ---------- */
function renderDeletedCard(product) {
  const price =
    product.pricing?.salePrice || product.pricing?.regularPrice || 0;

  return `
    <div class="card mb-3 border-danger">
      <div class="card-body">
        <div class="row align-items-start">
          <div class="col-md-8">
            <h5 class="text-danger">${escapeHtml(product.name)}</h5>

            <div class="small text-muted mb-1">
              SKU: ${escapeHtml(product.sku || product.productId)}
            </div>

            <div class="small">
              Category:
              ${escapeHtml(product.category?.mainCategoryName || "N/A")}
              ${
                product.category?.subCategoryName
                  ? ` > ${escapeHtml(product.category.subCategoryName)}`
                  : ""
              }
            </div>
          </div>

          <div class="col-md-4 text-end">
            <div class="fw-bold text-danger mb-2">
              ₹${Number(price).toFixed(2)}
            </div>

            <button
              class="btn btn-sm btn-success"
              onclick="restoreProduct('${product.productId}')">
              <i class="bi bi-arrow-counterclockwise"></i> Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------- RESTORE ---------- */
async function restoreProduct(productId) {
  if (!confirm("Restore this product?")) return;

  try {
    showLoading(true);

    await API.put("/products/:productId/restore", {
      productId,
    });

    showNotification("Product restored successfully", "success");

    loadDeletedProducts();
  } catch (err) {
    console.error("Restore failed:", err);
    showNotification("Restore failed", "error");
  } finally {
    showLoading(false);
  }
}

window.restoreProduct = restoreProduct;
