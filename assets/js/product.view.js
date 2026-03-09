/* ============================================================
   product.view.js
   View-only product modal logic
============================================================ */

let viewFormInitialized = false;

async function viewProductDetails(productId) {
  try {
    showLoading(true);

    const res = await API.get("/products/:productId", { productId });

    const product = res?.data;

    renderProductViewer(product);

    // hide form
    document.getElementById("productForm").classList.add("d-none");

    // show viewer
    document.getElementById("productViewContainer").classList.remove("d-none");

    new bootstrap.Modal(document.getElementById("productModal")).show();
  } catch (err) {
    console.error(err);
    alert("Failed to load product");
  } finally {
    showLoading(false);
  }
}
function renderProductViewer(product) {
  const container = document.getElementById("productViewContent");

  const variants = product.variants || [];
  const plans = product.plans || [];
  const images = product.images || [];
  const features = product.description?.features || [];
  const specs = product.description?.specifications || [];
  const tags = product.tags || [];

  const mainImage = images[0]?.url || "";

  container.innerHTML = `
  <div class="container-fluid">

    <!-- TOP SECTION -->
    <div class="row g-4">

      <!-- IMAGE COLUMN -->
      <div class="col-md-5">

        <div class="border rounded p-3 text-center bg-light">

          <img 
            id="mainProductImage"
            src="${mainImage}"
            style="width:100%;max-height:320px;object-fit:contain;"
          >

        </div>

        <div class="d-flex gap-2 mt-3 flex-wrap">

          ${images
            .map(
              (img) => `
            <img 
              src="${img.url}"
              style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer"
              onclick="document.getElementById('mainProductImage').src='${img.url}'"
            >
          `,
            )
            .join("")}

        </div>

      </div>

      <!-- PRODUCT INFO COLUMN -->
      <div class="col-md-7">

        <h3 class="fw-bold">${product.name}</h3>

        <p class="text-muted mb-4">
          ${product.description?.short || ""}
        </p>

        ${
          tags.length
            ? `
        <div class="mb-3">
          ${tags
            .map(
              (tag) =>
                `<span class="badge bg-light text-dark border me-1">${tag}</span>`,
            )
            .join("")}
        </div>`
            : ""
        }

        <div class="row mb-3">

          <div class="col-md-6">
            <small class="text-muted">Brand</small>
            <div class="fw-semibold">${product.brand}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Category</small>
            <div class="fw-semibold">
              ${product.category?.mainCategoryName || "-"}
            </div>
          </div>

        </div>

        <div class="row">

          <div class="col-md-4">
            <small class="text-muted">Regular Price</small>
            <div class="fs-5 fw-semibold">₹${product.pricing?.regularPrice}</div>
          </div>

          <div class="col-md-4">
            <small class="text-muted">Sale Price</small>
            <div class="fs-5 fw-semibold text-success">
              ₹${product.pricing?.salePrice || "-"}
            </div>
          </div>

          <div class="col-md-4">
            <small class="text-muted">Stock</small>
            <div class="fs-5 fw-semibold">
              ${product.availability?.stockQuantity}
            </div>
          </div>

        </div>

      </div>

    </div>


    <!-- LONG DESCRIPTION -->
    ${
      product.description?.long
        ? `
    <hr class="my-4">

    <h5 class="fw-semibold mb-3">Description</h5>

    <p style="white-space:pre-line">
      ${product.description.long}
    </p>
    `
        : ""
    }


    <!-- FEATURES -->
    ${
      features.length
        ? `
    <hr class="my-4">

    <h5 class="fw-semibold mb-3">Features</h5>

    <ul class="list-group list-group-flush">

      ${features.map((f) => `<li class="list-group-item">${f}</li>`).join("")}

    </ul>
    `
        : ""
    }


    <!-- SPECIFICATIONS -->
    ${
      specs.length
        ? `
    <hr class="my-4">

    <h5 class="fw-semibold mb-3">Specifications</h5>

    <table class="table table-sm table-bordered">

      <tbody>

        ${specs
          .map(
            (s) => `
        <tr>
          <td style="width:40%"><strong>${s.key}</strong></td>
          <td>${s.value} ${s.unit || ""}</td>
        </tr>`,
          )
          .join("")}

      </tbody>

    </table>
    `
        : ""
    }


    <!-- PRODUCT DETAILS -->
    <hr class="my-4">

    <h5 class="fw-semibold mb-3">Product Details</h5>

    <div class="row g-3">

      <div class="col-md-3">
        <small class="text-muted">Origin</small>
        <div>${product.origin?.country || "-"}</div>
      </div>

      <div class="col-md-3">
        <small class="text-muted">Manufacturer</small>
        <div>${product.origin?.manufacturer || "-"}</div>
      </div>

      <div class="col-md-3">
        <small class="text-muted">HSN Code</small>
        <div>${product.taxInfo?.hsnCode || "-"}</div>
      </div>

      <div class="col-md-3">
        <small class="text-muted">GST</small>
        <div>${product.taxInfo?.gstRate || 0}%</div>
      </div>

    </div>


    <!-- DIMENSIONS -->
    <hr class="my-4">

    <h5 class="fw-semibold mb-3">Dimensions</h5>

    <div class="row">

      <div class="col-md-3">
        <small class="text-muted">Weight</small>
        <div>${product.dimensions?.weight || "-"} ${
          product.dimensions?.weightUnit || ""
        }</div>
      </div>

      <div class="col-md-3">
        <small class="text-muted">Length</small>
        <div>${product.dimensions?.length || "-"} ${
          product.dimensions?.dimensionUnit || ""
        }</div>
      </div>

      <div class="col-md-3">
        <small class="text-muted">Width</small>
        <div>${product.dimensions?.width || "-"} ${
          product.dimensions?.dimensionUnit || ""
        }</div>
      </div>

      <div class="col-md-3">
        <small class="text-muted">Height</small>
        <div>${product.dimensions?.height || "-"} ${
          product.dimensions?.dimensionUnit || ""
        }</div>
      </div>

    </div>


    <!-- WARRANTY -->
    <hr class="my-4">

    <h5 class="fw-semibold mb-3">Warranty / Returns</h5>

    <div class="row">

      <div class="col-md-4">
        <small class="text-muted">Warranty Period</small>
        <div>${product.warranty?.period || 0} ${
          product.warranty?.warrantyUnit || ""
        }</div>
      </div>

      <div class="col-md-4">
        <small class="text-muted">Return Policy</small>
        <div>${product.warranty?.returnPolicy || 0} days</div>
      </div>

    </div>


    <!-- SELLER -->
    ${
      product.sellerInfo
        ? `
    <hr class="my-4">

    <h5 class="fw-semibold mb-3">Seller</h5>

    <div class="row">

      <div class="col-md-4">
        <small class="text-muted">Store</small>
        <div>${product.sellerInfo.storeName || "-"}</div>
      </div>

      <div class="col-md-4">
        <small class="text-muted">Rating</small>
        <div>${product.sellerInfo.rating || "-"}</div>
      </div>

      <div class="col-md-4">
        <small class="text-muted">Verified</small>
        <div>${product.sellerInfo.isVerified ? "✔ Yes" : "No"}</div>
      </div>

    </div>
    `
        : ""
    }


    <!-- PAYMENT PLANS -->
    ${
      plans.length
        ? `
    <hr class="my-4">

    <h5 class="mb-3 fw-semibold">Payment Plans</h5>

    <div class="row g-3">

      ${plans
        .map(
          (p) => `
        <div class="col-md-4">

          <div class="card shadow-sm border-0 h-100">

            <div class="card-body">

              <h6 class="fw-bold">${p.name}</h6>

              <div class="text-muted small">Days: ${p.days}</div>

              <div class="mt-2">
                <strong>₹${p.perDayAmount}</strong> / day
              </div>

              <div class="text-muted small">
                Total: ₹${p.totalAmount}
              </div>

              ${
                p.isRecommended
                  ? `<span class="badge bg-success mt-2">Recommended</span>`
                  : ""
              }

            </div>

          </div>

        </div>
      `,
        )
        .join("")}

    </div>
    `
        : ""
    }


    <!-- VARIANTS -->
${
  variants.length
    ? `
<hr class="my-4">

<h5 class="mb-3 fw-semibold">Variants</h5>

<div class="table-responsive">

<table class="table table-bordered align-middle">

<thead class="table-light">

<tr>
<th>Attributes</th>
<th>Price</th>
<th>Sale Price</th>
<th>Stock</th>
<th style="width:80px">View</th>
</tr>

</thead>

<tbody>

${variants
  .map(
    (v, i) => `

<tr>

<td>
${v.attributes.map((a) => a.value).join(" / ")}
</td>

<td>₹${v.price}</td>

<td>${v.salePrice ? "₹" + v.salePrice : "-"}</td>

<td>
<span class="badge ${v.stock > 10 ? "bg-success" : "bg-warning"}">
${v.stock}
</span>
</td>

<td>

<button 
class="btn btn-sm btn-outline-primary"
onclick="toggleVariantDetail(${i})"
>

<i class="bi bi-eye"></i>

</button>

</td>

</tr>


<tr id="variantDetail${i}" style="display:none">

<td colspan="5">

<div class="p-3 bg-light rounded">

<strong>Description</strong>

<div class="mb-3 text-muted">
${v.description?.short || ""}
</div>

<div class="d-flex gap-2 flex-wrap">

${(v.images || [])
  .map(
    (img) => `

<img
src="${img.url}"
style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #ddd"
>

`,
  )
  .join("")}

</div>

</div>

</td>

</tr>

`,
  )
  .join("")}

</tbody>

</table>

</div>

`
    : ""
}


    <!-- SEO -->
    ${
      product.seo
        ? `
    <hr class="my-4">

    <h5 class="fw-semibold mb-3">SEO</h5>

    <div>
      <small class="text-muted">Meta Title</small>
      <div>${product.seo.metaTitle || "-"}</div>
    </div>

    <div class="mt-2">
      <small class="text-muted">Meta Description</small>
      <div>${product.seo.metaDescription || "-"}</div>
    </div>

    <div class="mt-2">
      <small class="text-muted">Keywords</small>
      <div>${(product.seo.keywords || []).join(", ")}</div>
    </div>
    `
        : ""
    }

  </div>
  `;
}

function toggleVariantDetail(i) {
  const el = document.getElementById("variantDetail" + i);

  if (!el) return;

  el.style.display = el.style.display === "none" ? "table-row" : "none";
}
async function loadVariantsForView(productId) {
  try {
    const res = await API.get(`/products/${productId}/variants`);

    const variants = res?.data?.variants || [];

    renderSavedVariantsTable(variants);
  } catch (err) {
    console.error("Failed to load variants for view", err);
  }
}
/* ============================================================
   Lock form for view-only mode
============================================================ */
function lockProductFormForView() {
  // disable form fields
  document
    .querySelectorAll(
      "#productModal input, #productModal textarea, #productModal select",
    )
    .forEach((el) => {
      el.disabled = true;
    });

  // disable all action buttons
  document.querySelectorAll("#productModal button").forEach((btn) => {
    if (!btn.classList.contains("btn-close") && btn.id !== "closeProductBtn") {
      btn.disabled = true;
    }
  });

  const saveBtn = document.getElementById("saveProductBtn");
  if (saveBtn) saveBtn.style.display = "none";

  const addPlanBtn = document.getElementById("addPlanBtn");
  if (addPlanBtn) addPlanBtn.style.display = "none";

  const addVariantBtn = document.getElementById("addVariantBtn");
  if (addVariantBtn) addVariantBtn.style.display = "none";

  const hasVariants = document.getElementById("hasVariants");
  if (hasVariants) hasVariants.style.display = "none";
}

/* ============================================================
   Reset modal when closed (VERY IMPORTANT)
============================================================ */
const productModalEl = document.getElementById("productModal");

if (productModalEl) {
  productModalEl.addEventListener("hidden.bs.modal", () => {
    document.getElementById("productForm").classList.remove("d-none");

    document.getElementById("productViewContainer").classList.add("d-none");
  });
}

/* ---------- Expose ---------- */
window.viewProductDetails = viewProductDetails;
