/* ============================================================
   product.shared.js
   Shared helpers, state, and utilities
   (Single source of truth for shared state)
============================================================ */

/* ---------- Helper Functions ---------- */

function escapeHtml(text) {
  if (text === undefined || text === null) return "";
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
  const colors = {
    error: "bg-danger",
    success: "bg-success",
    info: "bg-primary",
    warning: "bg-warning",
  };

  const toastContainerId = "globalToastContainer";

  let container = document.getElementById(toastContainerId);

  if (!container) {
    container = document.createElement("div");
    container.id = toastContainerId;
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white ${colors[type] || "bg-primary"} border-0 show`;
  toast.style.minWidth = "260px";
  toast.style.marginBottom = "10px";

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
    </div>
  `;

  toast.querySelector(".btn-close").onclick = () => toast.remove();

  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

/* ---------- Mapping helpers ---------- */

function mapBackendStockStatusToUI(stockStatus) {
  switch (stockStatus) {
    case "in_stock":
      return "in-stock";
    case "out_of_stock":
      return "out-of-stock";
    case "pre_order":
      return "pre-order";
    case "low_stock":
      return "in-stock";
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

/* ---------- Shared State (GLOBAL) ---------- */

window.products = [];
window.currentProductId = null;
window.variantCount = 0;
window.planCount = 0;
window.selectedImageFiles = [];
window.existingImages = [];
window.tempUploadedImages = [];
window.isUploadingImages = false;

/* ---------- Pagination ---------- */

window.pagination = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
};

/* ---------- Debounce ---------- */

function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ---------- Loading Overlay ---------- */

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;
  overlay.classList.toggle("show", show);
}

/* ============================================================
   🔹 PER-DAY PLAN SHARED LOGIC
============================================================ */

function renderPlanField(plan = {}, idx = 0) {
  const domIdx = idx + 1;

  const days = plan.days || "";
  const perDay = plan.perDayAmount || "";
  const total =
    plan.totalAmount ||
    (plan.days && plan.perDayAmount ? plan.days * plan.perDayAmount : "");

  const isRecommended = plan.isRecommended ? "checked" : "";
  const autoAttr = plan.isAuto ? 'data-auto="true"' : "";

  return `
    <div class="card mb-2" id="plan-${domIdx}" ${autoAttr}>
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>Plan ${domIdx}</strong>
          <button type="button"
            class="btn btn-sm btn-outline-danger"
            onclick="removePlanField(${domIdx})">
            <i class="bi bi-trash"></i>
          </button>
        </div>

        <div class="text-danger small mb-2" data-plan-error style="display:none;"></div>

        <div class="row mb-2">
          <div class="col-md-6">
            <label class="form-label">Plan Name *</label>
            <input type="text" class="form-control"
  data-plan-name
  value="${plan.name}"
  ${plan.isAuto ? "readonly" : ""}>
          </div>

          <div class="col-md-6">
            <label class="form-label">Days *</label>
            <input type="number"
              class="form-control form-control-sm"
              data-plan-days
              min="5"
              value="${days}" />
          </div>
        </div>

        <div class="row mb-2">
          <div class="col-md-6">
            <label class="form-label">Per Day Amount (₹) *</label>
            <input type="number"
              class="form-control form-control-sm"
              data-plan-amount
              min="50"
              value="${perDay}" />
          </div>

          <div class="col-md-6">
            <label class="form-label">Total Amount (₹)</label>
            <input type="number"
              class="form-control form-control-sm"
              data-plan-total
              value="${total}"
              readonly />
          </div>
        </div>

        <div class="form-check">
          <input class="form-check-input plan-recommended-checkbox"
            type="checkbox"
            data-plan-recommended
            ${isRecommended} />
          <label class="form-check-label">Recommended Plan</label>
        </div>
      </div>
    </div>
  `;
}

function wirePlanLogic(card) {
  const daysInput = card.querySelector("[data-plan-days]");
  const nameInput = card.querySelector("[data-plan-name]");
  const perDayInput = card.querySelector("[data-plan-amount]");
  const totalInput = card.querySelector("[data-plan-total]");
  const recommendedCheckbox = card.querySelector("[data-plan-recommended]");

  // 🔒 per-day is always auto-calculated
  perDayInput.readOnly = true;

  const isAuto = card.hasAttribute("data-auto");

  // 🔒 Auto plans locked
  if (isAuto) {
    daysInput.readOnly = true;
    nameInput.readOnly = true;
  }

  // 🔁 Name sync for custom plans
  if (!isAuto) {
    daysInput.addEventListener("input", () => {
      const days = Number(daysInput.value || 0);
      if (days > 0) {
        nameInput.value = `${days}-Day Plan`;
      }
    });
  }

  // 🔁 recalc when days change
  daysInput.addEventListener("input", recalcAllPlansFromPrice);

  // run once on load
  recalcAllPlansFromPrice();

  // 🔒 Only one recommended plan
  recommendedCheckbox.addEventListener("change", () => {
    if (!recommendedCheckbox.checked) return;

    document.querySelectorAll("[data-plan-recommended]").forEach((cb) => {
      if (cb !== recommendedCheckbox) cb.checked = false;
    });
  });
}

function recalcAllPlansFromPrice() {
  const salePrice = Number(
    document.getElementById("productSalePrice")?.value || 0,
  );
  const regularPrice = Number(
    document.getElementById("productPrice")?.value || 0,
  );

  const effectivePrice = salePrice > 0 ? salePrice : regularPrice;
  if (!effectivePrice) return;

  document.querySelectorAll("[data-plan-days]").forEach((daysInput) => {
    const card = daysInput.closest(".card");
    const perDayInput = card.querySelector("[data-plan-amount]");
    const totalInput = card.querySelector("[data-plan-total]");

    let days = Number(daysInput.value || 0);
    if (!days) return;

    let perDay = effectivePrice / days;

    // 🔹 ensure perDay >= 50
    if (perDay < 50) {
      const newDays = Math.floor(effectivePrice / 50);

      if (newDays >= 5) {
        days = newDays;
        daysInput.value = newDays;
        const nameInput = card.querySelector("[data-plan-name]");
        if (nameInput) {
          nameInput.value = `${newDays}-Day Plan`;
        }
        perDay = effectivePrice / newDays;
      }
    }

    perDayInput.value = perDay.toFixed(2);
    totalInput.value = effectivePrice.toFixed(2);
  });
}

document
  .getElementById("productPrice")
  ?.addEventListener("input", recalcAllPlansFromPrice);

document
  .getElementById("productSalePrice")
  ?.addEventListener("input", recalcAllPlansFromPrice);
/* ============================================================
   EXISTING IMAGE LOADER
============================================================ */

function loadExistingImages(images = []) {
  const container = document.getElementById("imagePreviewContainer");
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(images) || images.length === 0) {
    container.innerHTML =
      "<div class='text-muted small'>No images available</div>";
    return;
  }

  images.forEach((img, index) => {
    const url = img.url || img.location || img;

    container.insertAdjacentHTML(
      "beforeend",
      `
      <div class="image-preview-card">

        <button
          type="button"
          class="image-remove-btn"
          data-index="${index}">
          ×
        </button>

        <img src="${url}" alt="product image"/>

      </div>
      `,
    );
  });

  // remove image
  document.querySelectorAll(".image-remove-btn").forEach((btn) => {
    btn.onclick = function () {
      const index = Number(this.dataset.index);

      window.tempUploadedImages.splice(index, 1);

      loadExistingImages(window.tempUploadedImages);
    };
  });
}
document.addEventListener("click", function (e) {
  const btn = e.target.closest(".remove-image-btn");
  if (!btn) return;

  const index = Number(btn.dataset.index);

  if (!Array.isArray(window.tempUploadedImages)) return;

  window.tempUploadedImages.splice(index, 1);

  loadExistingImages(window.tempUploadedImages);

  showNotification("Image removed", "warning");
});
// ===============================
// REGIONAL AVAILABILITY — SHARED
// ===============================

function collectRegionalPayloadFromUI() {
  const tbody = document.getElementById("regionalSettingsTableBody");
  if (!tbody) {
    return { regionalPricing: [], regionalAvailability: [], regionalSeo: [] };
  }

  const pricing = [];
  const availability = [];
  const seo = [];

  tbody.querySelectorAll("tr").forEach((row) => {
    const region = row.querySelector(".regional-region").value;
    const isAvailable = row.querySelector(".regional-available").checked;

    const stock = isAvailable
      ? parseInt(row.querySelector(".regional-stock").value) || 0
      : 0;

    const regularPrice =
      parseFloat(row.querySelector(".regional-price").value) || 0;

    const saleRaw = row.querySelector(".regional-sale-price").value;
    const salePrice = saleRaw ? parseFloat(saleRaw) : null;

    pricing.push({
      region,
      currency:
        window.RegionUtils?.getRegionByCode?.(region)?.currency || "USD",
      regularPrice,
      salePrice: salePrice ?? regularPrice,
      finalPrice: salePrice ?? regularPrice,
    });

    availability.push({
      region,
      isAvailable,
      stockQuantity: stock,
      stockStatus: !isAvailable || stock <= 0 ? "out_of_stock" : "in_stock",
      lowStockLevel: 10,
    });

    seo.push({
      region,
      metaTitle: row.querySelector(".regional-meta-title")?.value || "",
      metaDescription: row.querySelector(".regional-meta-desc")?.value || "",
    });
  });

  return {
    regionalPricing: pricing,
    regionalAvailability: availability,
    regionalSeo: seo,
  };
}

function setRegionalUIState(isGlobal) {
  const rows = document.querySelectorAll("#regionalSettingsTableBody tr");

  rows.forEach((row) => {
    const availableCheckbox = row.querySelector(".regional-available");
    const stockInput = row.querySelector(".regional-stock");
    const priceInput = row.querySelector(".regional-price");
    const salePriceInput = row.querySelector(".regional-sale-price");

    if (!availableCheckbox) return;

    if (isGlobal) {
      // GLOBAL → everything locked, derived from base product
      availableCheckbox.checked = true;
      availableCheckbox.disabled = true;

      stockInput && (stockInput.disabled = true);
      priceInput && (priceInput.disabled = true);
      salePriceInput && (salePriceInput.disabled = true);
    } else {
      // REGIONAL → DO NOT TOUCH checked state (backend decides)
      availableCheckbox.disabled = false;

      const enabled = availableCheckbox.checked === true;
      stockInput && (stockInput.disabled = !enabled);
      priceInput && (priceInput.disabled = !enabled);
      salePriceInput && (salePriceInput.disabled = !enabled);
    }
  });
}

/* ---------- EXPORTS ---------- */

window.escapeHtml = escapeHtml;
window.showNotification = showNotification;
window.mapBackendStockStatusToUI = mapBackendStockStatusToUI;
window.mapUIAvailabilityToBackend = mapUIAvailabilityToBackend;
window.debounce = debounce;
window.showLoading = showLoading;
window.renderPlanField = renderPlanField;
window.wirePlanLogic = wirePlanLogic;
window.loadExistingImages = loadExistingImages;
window.setRegionalUIState = setRegionalUIState;
