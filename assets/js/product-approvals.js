/* =========================
   SAFE UTILS FALLBACK
========================= */

window.utils = window.utils || {};

window.utils.formatDate =
  window.utils.formatDate ||
  function (date) {
    try {
      return new Date(date).toLocaleString();
    } catch {
      return "";
    }
  };

const PRODUCT_API = {
  LIST: "/products/admin/all",
  STATUS: "/products",
};

let productsCache = [];
let selectedProducts = [];
let rejectProductId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();

  document
    .getElementById("statusFilter")
    .addEventListener("change", loadProducts);

  document.getElementById("selectAll").addEventListener("change", function () {
    const checkboxes = document.querySelectorAll(".rowCheckbox");

    checkboxes.forEach((cb) => {
      cb.checked = this.checked;
    });
  });
});

async function loadProducts() {
  try {
    const res = await API.get(PRODUCT_API.LIST);

    let products = res?.data || [];

    products = products.filter((p) => p.sellerId);

    const status = document.getElementById("statusFilter").value;

    products = products.filter((p) => p.listingStatus === status);

    productsCache = products;

    renderProducts(products);
  } catch (err) {
    console.error(err);
    adminPanel.showNotification("Failed loading products", "error");
  }
}

function renderProducts(products) {
  const table = document.getElementById("productsTable");

  if (!products.length) {
    table.innerHTML = `
<tr>
<td colspan="8" class="text-center text-muted">
No products
</td>
</tr>`;
    return;
  }

  table.innerHTML = products
    .map((p) => {
      const productId = p._id || p.productId;

      const img = p.images?.[0]?.url || "https://via.placeholder.com/50";

      const seller = p.sellerInfo?.storeName || "-";

      const verified = p.sellerInfo?.isVerified
        ? `<span class="badge bg-success ms-1">Verified</span>`
        : "";

      /* STATUS LABEL */
      const statusLabel =
        {
          pending_approval: "Pending",
          published: "Approved",
          rejected: "Rejected",
        }[p.listingStatus] || p.listingStatus;

      /* STATUS COLOR */
      let statusClass = "bg-warning";

      if (p.listingStatus === "published") statusClass = "bg-success";
      if (p.listingStatus === "rejected") statusClass = "bg-danger";

      /* ACTIONS */
      let actions = "";

      if (p.listingStatus === "pending_approval") {
        actions = `
<button class="btn btn-sm btn-success"
onclick="approveProduct('${productId}')">
<i class="bi bi-check"></i>
</button>

<button class="btn btn-sm btn-danger"
onclick="openReject('${productId}')">
<i class="bi bi-x"></i>
</button>`;
      } else if (p.listingStatus === "published") {
        actions = `<span class="text-success fw-bold">Approved</span>`;
      } else if (p.listingStatus === "rejected") {
        actions = `<span class="text-danger fw-bold">Rejected</span>`;
      }

      return `

<tr>

<td>
<input type="checkbox"
class="rowCheckbox"
value="${productId}">
</td>

<td>
<img src="${img}"
style="width:50px;height:50px;object-fit:cover;border-radius:6px;">
</td>

<td>
<a href="#"
onclick="viewProduct('${productId}')">
${escapeHtml(p.name)}
</a>
</td>

<td>
${escapeHtml(seller)} ${verified}
</td>

<td>
₹${p.pricing?.finalPrice || "-"}
</td>

<td>
<span class="badge ${statusClass}">
${statusLabel}
</span>
</td>

<td>
${utils.formatDate(p.createdAt)}
</td>

<td>
${actions}
</td>

</tr>

`;
    })
    .join("");
}

function previewProduct(productId) {
  const product = productsCache.find(
    (p) => p.productId === productId || p._id === productId,
  );

  const modal = new bootstrap.Modal(
    document.getElementById("productPreviewModal"),
  );

  document.getElementById("previewBody").innerHTML = `

<h4>${product.name}</h4>

<p>${product.description?.short || ""}</p>

<img src="${product.images?.[0]?.url}"
style="width:100%;max-height:300px;object-fit:contain">

`;

  modal.show();
}

async function approveProduct(productId) {
  if (!confirm("Approve this product?")) return;

  await API.patch(`${PRODUCT_API.STATUS}/${productId}/listing-status`, {
    action: "approve",
  });

  adminPanel.showNotification("Product approved", "success");

  loadProducts();
}

function openReject(productId) {
  rejectProductId = productId;

  const modal = new bootstrap.Modal(document.getElementById("rejectModal"));

  modal.show();
}

async function confirmReject() {
  const reason = document.getElementById("rejectReason").value.trim();

  if (!reason) {
    alert("Enter rejection reason");
    return;
  }

  await API.patch(`${PRODUCT_API.STATUS}/${rejectProductId}/listing-status`, {
    action: "reject",
    reason,
  });

  adminPanel.showNotification("Product rejected", "success");

  loadProducts();
}

function escapeHtml(text) {
  if (!text) return "";

  const div = document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}
async function viewProduct(productId) {
  try {
    const res = await API.get(`/products/${productId}`);
    const product = res?.data || res;
    const resolvedProductId = product._id || product.productId;

    const modal = new bootstrap.Modal(
      document.getElementById("productViewModal"),
    );

    const images =
      product.images
        ?.map(
          (img) => `
<img src="${img.url}" 
style="width:120px;height:120px;object-fit:cover;border-radius:8px;margin:6px;">
`,
        )
        .join("") || "";

    const features =
      product.description?.features
        ?.map(
          (f) => `
<li>${f}</li>
`,
        )
        .join("") || "";

    const specs =
      product.description?.specifications
        ?.map(
          (s) => `
<tr>
<td>${s.key}</td>
<td>${s.value}</td>
</tr>
`,
        )
        .join("") || "";

    const tags =
      product.tags
        ?.map(
          (t) => `
<span class="badge bg-secondary me-1">${t}</span>
`,
        )
        .join("") || "";

    const variants =
      product.variants
        ?.map(
          (v) => `
<tr>
<td>${v.sku}</td>
<td>${v.attributes?.map((a) => `${a.name}:${a.value}`).join(", ")}</td>
<td>₹${v.salePrice || v.price}</td>
<td>${v.stock}</td>
</tr>
`,
        )
        .join("") || "";

    const plans =
      product.plans
        ?.map(
          (p) => `
<tr>
<td>${p.name}</td>
<td>${p.days}</td>
<td>₹${p.perDayAmount}</td>
<td>₹${p.totalAmount}</td>
</tr>
`,
        )
        .join("") || "";

    document.getElementById("productViewBody").innerHTML = `

<h3>${product.name}</h3>

<p class="text-muted">${product.description?.short || ""}</p>

<hr>


<h5>Images</h5>

<div class="mb-4">${images}</div>


<h5>Basic Information</h5>

<table class="table table-sm">

<tr>
<td><b>Brand</b></td>
<td>${product.brand}</td>
</tr>

<tr>
<td><b>Category</b></td>
<td>${product.category?.mainCategoryName || "-"}</td>
</tr>

<tr>
<td><b>Sub Category</b></td>
<td>${product.category?.subCategoryName || "-"}</td>
</tr>

<tr>
<td><b>Seller</b></td>
<td>${product.sellerInfo?.storeName || "-"}</td>
</tr>

<tr>
<td><b>Country</b></td>
<td>${product.origin?.country || "-"}</td>
</tr>

<tr>
<td><b>Manufacturer</b></td>
<td>${product.origin?.manufacturer || "-"}</td>
</tr>

<tr>
<td><b>Weight</b></td>
<td>${product.dimensions?.weight} ${product.dimensions?.weightUnit}</td>
</tr>

<tr>
<td><b>Stock</b></td>
<td>${product.availability?.stockQuantity}</td>
</tr>

<tr>
<td><b>Price</b></td>
<td>₹${product.pricing?.finalPrice}</td>
</tr>

</table>


<hr>


<h5>Description</h5>

<p>${product.description?.long || ""}</p>


<h5>Features</h5>

<ul>
${features}
</ul>


<h5>Specifications</h5>

<table class="table table-bordered">

<thead>
<tr>
<th>Key</th>
<th>Value</th>
</tr>
</thead>

<tbody>
${specs}
</tbody>

</table>


<hr>


<h5>Tags</h5>

<div class="mb-3">
${tags}
</div>


<h5>Variants</h5>

<table class="table table-bordered">

<thead>
<tr>
<th>SKU</th>
<th>Attributes</th>
<th>Price</th>
<th>Stock</th>
</tr>
</thead>

<tbody>
${variants}
</tbody>

</table>


<hr>


<h5>Payment Plans</h5>

<table class="table table-bordered">

<thead>
<tr>
<th>Name</th>
<th>Days</th>
<th>Per Day</th>
<th>Total</th>
</tr>
</thead>

<tbody>
${plans}
</tbody>

</table>


<hr>


<h5>SEO</h5>

<table class="table table-sm">

<tr>
<td><b>Meta Title</b></td>
<td>${product.seo?.metaTitle}</td>
</tr>

<tr>
<td><b>Description</b></td>
<td>${product.seo?.metaDescription}</td>
</tr>

<tr>
<td><b>Keywords</b></td>
<td>${product.seo?.keywords?.join(", ")}</td>
</tr>

</table>


<hr>


<h5>Product Flags</h5>

<span class="badge bg-info">Trending: ${product.isTrending}</span>
<span class="badge bg-success">Featured: ${product.isFeatured}</span>
<span class="badge bg-warning">Best Seller: ${product.isBestSeller}</span>


<hr>


<div class="d-flex justify-content-end gap-2 mt-4">

<button class="btn btn-danger"
onclick="openReject('${resolvedProductId}')">
<i class="bi bi-x-circle"></i>
Reject
</button>

<button class="btn btn-success"
onclick="approveProduct('${resolvedProductId}')">
<i class="bi bi-check"></i>
Approve
</button>

</div>

`;

    modal.show();
  } catch (err) {
    console.error(err);
    adminPanel.showNotification("Failed loading product", "error");
  }
}
