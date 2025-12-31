/* ============================================================
   product.form.js
   Product Add / Edit (PAGE ONLY — NO MODALS)
============================================================ */
function showProductSuccess(message) {
  const modalEl = document.getElementById("productSuccessModal");
  const msgEl = document.getElementById("productSuccessMessage");
  const okBtn = document.getElementById("productSuccessOkBtn");

  if (!modalEl || !msgEl || !okBtn) {
    alert(message); // fallback
    window.location.href = "./products.html";
    return;
  }

  msgEl.textContent = message;

  const modal = new bootstrap.Modal(modalEl, {
    backdrop: "static",
    keyboard: false,
  });

  okBtn.onclick = () => {
    modal.hide();
    window.location.href = "./products.html";
  };

  modal.show();
}

/* ================= DOM REFERENCES ================= */

let productForm,
  variantsList,
  plansList,
  imagePreviewContainer,
  productImagesInput,
  variantsSection,
  hasVariantsCheckbox,
  addVariantBtn,
  isGlobalProductCheckbox,
  regionalSettingsSection,
  referralEnabled,
  referralType,
  referralValue,
  referralMinPurchase,
  paymentPlanEnabled,
  paymentPlanMinDown,
  paymentPlanMaxDown,
  paymentPlanInterest;

let variantEventsBound = false;

/* ================= INIT DOM ================= */
/* ================= REFERRAL HELPERS ================= */

function toggleReferral(enabled) {
  [referralType, referralValue, referralMinPurchase].forEach((el) => {
    if (!el) return;
    el.disabled = !enabled;
    if (!enabled) el.value = "";
  });
}

/* ================= PAYMENT PLAN HELPERS ================= */

function togglePaymentPlan(enabled) {
  [paymentPlanMinDown, paymentPlanMaxDown, paymentPlanInterest].forEach(
    (el) => {
      if (!el) return;
      el.disabled = !enabled;
      if (!enabled) el.value = "";
    }
  );
}

function initProductFormDOM() {
  productForm = document.getElementById("productForm");
  variantsList = document.getElementById("variantsList");
  plansList = document.getElementById("plansList");
  imagePreviewContainer = document.getElementById("imagePreviewContainer");
  productImagesInput = document.getElementById("productImages");

  variantsSection = document.getElementById("variantsSection");
  hasVariantsCheckbox = document.getElementById("hasVariants");
  addVariantBtn = document.getElementById("addVariantBtn");

  if (productImagesInput) {
    productImagesInput.addEventListener("change", handleImageSelect);
  }

  /* ================= VARIANTS ================= */

  if (!variantEventsBound) {
    if (hasVariantsCheckbox && variantsSection) {
      hasVariantsCheckbox.addEventListener("change", () => {
        if (hasVariantsCheckbox.checked) {
          variantsSection.classList.remove("d-none");
          variantsSection.style.display = "block";

          if (variantsList.children.length === 0) {
            window.variantCount = 0;
            addVariantField();
          }
        } else {
          variantsSection.classList.add("d-none");
          variantsSection.style.display = "none";
          variantsList.innerHTML = "";
          window.variantCount = 0;
        }
      });
    }

    if (addVariantBtn) {
      addVariantBtn.addEventListener("click", addVariantField);
    }

    variantEventsBound = true;
  }

  /* ================= REFERRAL BONUS ================= */

  referralEnabled = document.getElementById("referralEnabled");
  referralType = document.getElementById("referralType");
  referralValue = document.getElementById("referralValue");
  referralMinPurchase = document.getElementById("referralMinPurchase");

  if (referralEnabled) {
    referralEnabled.addEventListener("change", () => {
      toggleReferral(referralEnabled.checked);
    });
  }

  /* ================= PAYMENT PLAN ================= */

  paymentPlanEnabled = document.getElementById("paymentPlanEnabled");
  paymentPlanMinDown = document.getElementById("paymentPlanMinDown");
  paymentPlanMaxDown = document.getElementById("paymentPlanMaxDown");
  paymentPlanInterest = document.getElementById("paymentPlanInterest");

  if (paymentPlanEnabled) {
    paymentPlanEnabled.addEventListener("change", () => {
      togglePaymentPlan(paymentPlanEnabled.checked);
    });
  }

  /* ================= REGIONAL AVAILABILITY ================= */

  isGlobalProductCheckbox = document.getElementById("isGlobalProduct");
  regionalSettingsSection = document.getElementById("regionalSettingsSection");

  if (isGlobalProductCheckbox && regionalSettingsSection) {
    isGlobalProductCheckbox.addEventListener("change", () => {
      if (isGlobalProductCheckbox.checked) {
        regionalSettingsSection.classList.add("d-none");
        // ❌ DO NOT WIPE TABLE ON EDIT
        if (!window.currentProductId) {
          document.getElementById("regionalSettingsTableBody").innerHTML = "";
        }
      } else {
        regionalSettingsSection.classList.remove("d-none");
        buildRegionalRowsFromConfig(
          { regionalPricing: [], regionalAvailability: [], regionalSeo: [] },
          true
        );
      }
    });
  }
  // 🔒 Initial safe state for CREATE flow
  if (referralEnabled) toggleReferral(referralEnabled.checked);
  if (paymentPlanEnabled) togglePaymentPlan(paymentPlanEnabled.checked);
}

/* ================= VARIANT RENDERER ================= */

function renderVariantField(variant = {}, idx = 0) {
  const color = variant.attributes?.color || "";
  const storage = variant.attributes?.storage || "";
  const price = variant.price || "";
  const salePrice = variant.salePrice || "";
  const stock = variant.stock ?? 0;
  const variantId = variant.variantId || "";

  const images = Array.isArray(variant.images) ? variant.images : [];

  const domIdx = idx + 1;

  return `
    <div class="border rounded p-3 mb-3 variant-card"
         id="variant-${domIdx}"
         data-variant-index="${idx}"
         data-variant-id="${variantId}">
         
      <div class="d-flex justify-content-between align-items-center mb-2">
        <strong>Variant ${domIdx}</strong>
        <button type="button"
          class="btn btn-sm btn-outline-danger"
          onclick="removeVariantField(${domIdx})">
          <i class="bi bi-trash"></i>
        </button>
      </div>

      <div class="row mb-2">
        <div class="col-md-6">
          <label class="form-label">Color</label>
          <input type="text"
                 class="form-control"
                 data-variant-color
                 value="${escapeHtml(color)}">
        </div>

        <div class="col-md-6">
          <label class="form-label">Storage / Size</label>
          <input type="text"
                 class="form-control"
                 data-variant-storage
                 value="${escapeHtml(storage)}">
        </div>
      </div>

      <div class="row mb-2">
        <div class="col-md-3">
          <label class="form-label">Price *</label>
          <input type="number"
                 class="form-control"
                 data-variant-price
                 min="0"
                 value="${price}">
        </div>

        <div class="col-md-3">
          <label class="form-label">Sale Price</label>
          <input type="number"
                 class="form-control"
                 data-variant-sale-price
                 min="0"
                 value="${salePrice}">
        </div>

        <div class="col-md-3">
          <label class="form-label">Stock</label>
          <input type="number"
                 class="form-control"
                 data-variant-stock
                 min="0"
                 value="${stock}">
        </div>

        <div class="col-md-3">
          <label class="form-label">Variant Images (max 3)</label>
          <input type="file"
                 class="form-control"
                 data-variant-image
                 accept="image/*"
                 multiple>
        </div>
      </div>

      ${
        images.length
          ? `
        <div class="d-flex gap-2 mt-2 flex-wrap">
          ${images
            .map(
              (img) => `
            <div class="border rounded p-1">
              <img src="${img.url}"
                   alt="variant image"
                   style="width:70px;height:70px;object-fit:cover">
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  `;
}

/* ================= VARIANTS ================= */

function addVariantField(prefill = {}) {
  if (!hasVariantsCheckbox?.checked) return;
  if (!variantsList) return;

  window.variantCount++;

  const html = renderVariantField(prefill, window.variantCount - 1);
  variantsList.insertAdjacentHTML("beforeend", html);
}

function removeVariantField(idx) {
  const el = document.getElementById(`variant-${idx}`);
  if (el) el.remove();

  // 🔥 Recalculate based on DOM (single source of truth)
  const cards = document.querySelectorAll(".variant-card");
  window.variantCount = cards.length;

  // 🔥 If no variants left → auto disable
  if (window.variantCount === 0) {
    hasVariantsCheckbox.checked = false;
    variantsSection.classList.add("d-none");
    variantsSection.style.display = "none";
  }
}

window.removeVariantField = removeVariantField;
function collectVariantsFromDOM() {
  if (!hasVariantsCheckbox?.checked) return [];

  const variants = [];

  const cards = document.querySelectorAll(".variant-card");

  cards.forEach((card) => {
    const color = card.querySelector("[data-variant-color]")?.value.trim();
    const storage = card.querySelector("[data-variant-storage]")?.value.trim();
    const price = Number(
      card.querySelector("[data-variant-price]")?.value || 0
    );
    const salePrice = Number(
      card.querySelector("[data-variant-sale-price]")?.value || 0
    );
    const stock = Number(
      card.querySelector("[data-variant-stock]")?.value || 0
    );

    // ⚠️ HARD VALIDATION (no bullshit)
    if (!price || price <= 0) {
      throw new Error("Each variant must have a valid price");
    }

    variants.push({
      attributes: {
        color,
        storage,
      },
      price,
      salePrice,
      stock,
    });
  });

  return variants;
}

/* ================= IMAGE UPLOAD ================= */

async function handleImageSelect(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  if (files.length > 10) {
    showNotification("Maximum 10 images allowed", "error");
    return;
  }

  window.selectedImageFiles = files;
  await uploadTempImages();
}

async function uploadTempImages() {
  const saveBtn = document.getElementById("saveProductBtn");
  window.isUploadingImages = true;
  saveBtn && (saveBtn.disabled = true);

  try {
    const formData = new FormData();
    window.selectedImageFiles.forEach((f) => formData.append("images", f));

    const res = await fetch(`${window.BASE_URL}/uploads/temp-images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AUTH.getToken()}` },
      body: formData,
    });

    const json = await res.json();
    if (!json.success) throw new Error();

    window.tempUploadedImages = [
      ...(window.existingImages || []),
      ...(json.data || []),
    ];

    loadExistingImages(window.tempUploadedImages);
    showNotification("Images uploaded", "success");
  } catch {
    showNotification("Image upload failed", "error");
  } finally {
    window.isUploadingImages = false;
    saveBtn && (saveBtn.disabled = false);
  }
}

async function uploadPrimaryProductImages(productId) {
  // 🔒 No files selected → nothing to upload (safe exit)
  if (
    !window.selectedImageFiles ||
    !Array.isArray(window.selectedImageFiles) ||
    window.selectedImageFiles.length === 0
  ) {
    return;
  }

  const formData = new FormData();

  window.selectedImageFiles.forEach((file) => {
    formData.append("images", file);
  });

  const res = await fetch(`${window.BASE_URL}/products/${productId}/images`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${AUTH.getToken()}`,
      // ❌ DO NOT set Content-Type (browser handles boundary)
    },
    body: formData,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid response from image upload API");
  }

  if (!res.ok || json?.success === false) {
    console.error("❌ Primary image upload failed:", json);
    throw new Error(json?.message || "Primary product image upload failed");
  }

  // ✅ Upload succeeded — clear local selection
  window.selectedImageFiles = [];
}

async function uploadVariantImages(productId, variantsFromBackend) {
  if (!Array.isArray(variantsFromBackend)) return;

  const variantCards = document.querySelectorAll(".variant-card");

  for (const card of variantCards) {
    const fileInput = card.querySelector("[data-variant-image]");
    if (!fileInput || !fileInput.files.length) continue;

    // 🔥 SAFE MAPPING using index stored on card
    const idx = Number(card.dataset.variantIndex);
    const backendVariant = variantsFromBackend[idx];

    if (!backendVariant?.variantId) continue;

    // 🔒 Limit images per variant (max 3)
    const files = Array.from(fileInput.files).slice(0, 3);

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    const res = await fetch(
      `${window.BASE_URL}/products/${productId}/variants/${backendVariant.variantId}/images`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${AUTH.getToken()}`,
        },
        body: formData,
      }
    );

    const json = await res.json();
    if (!json.success) {
      throw new Error("Variant image upload failed");
    }
  }

  // 🔥 CRITICAL FLAG — prevents image wipe on update
  window.hasUploadedVariantImages = true;
}

/* ================= CATEGORY LOADER ================= */

async function loadCategories() {
  try {
    const res = await API.get("/categories/dropdown/all");
    const select = document.getElementById("productCategory");
    if (!select) return;

    select.innerHTML = `<option value="">Select Category</option>`;

    const categories = Array.isArray(res?.data) ? res.data : [];

    categories.forEach((cat) => {
      const mainOpt = document.createElement("option");
      mainOpt.value = cat._id || cat.categoryId;
      mainOpt.textContent = cat.name;
      mainOpt.dataset.type = "main";
      select.appendChild(mainOpt);

      if (Array.isArray(cat.subCategories)) {
        cat.subCategories.forEach((sub) => {
          const subOpt = document.createElement("option");
          subOpt.value = sub._id || sub.categoryId;
          subOpt.textContent = `→ ${sub.name}`;
          subOpt.dataset.type = "sub";
          subOpt.dataset.parentId = cat._id;
          select.appendChild(subOpt);
        });
      }
    });
  } catch (err) {
    console.error("❌ Failed to load categories", err);
    showNotification("Failed to load categories", "error");
  }
}

/* ================= REGIONAL SETTINGS ================= */
function buildRegionalRowsFromConfig(
  product = null,
  forceAllOff = false,
  forceAllOn = false
) {
  const tbody = document.getElementById("regionalSettingsTableBody");
  if (!tbody || !Array.isArray(window.SUPPORTED_REGIONS)) return;

  tbody.innerHTML = "";

  window.SUPPORTED_REGIONS.forEach((r) => {
    const pricing =
      product?.regionalPricing?.find((p) => p.region === r.code) || {};

    const availability =
      product?.regionalAvailability?.find((a) => a.region === r.code) || {};

    const seo = product?.regionalSeo?.find((s) => s.region === r.code) || {};

    let isChecked;
    if (forceAllOff) isChecked = false;
    else if (forceAllOn) isChecked = true;
    else isChecked = availability.isAvailable === true;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${r.flag} ${r.name}
        <input type="hidden" class="regional-region" value="${r.code}">
      </td>

      <td>
        <input type="checkbox" class="form-check-input regional-available"
          ${isChecked ? "checked" : ""}>
      </td>

      <td>
        <input type="number" class="form-control form-control-sm regional-stock"
          value="${availability.stockQuantity ?? 0}"
          ${isChecked ? "" : "disabled"}>
      </td>

      <td>
        <input type="number" class="form-control form-control-sm regional-price"
          value="${pricing.regularPrice ?? 0}"
          ${isChecked ? "" : "disabled"}>
      </td>

      <td>
        <input type="number" class="form-control form-control-sm regional-sale-price"
          value="${pricing.salePrice ?? ""}"
          ${isChecked ? "" : "disabled"}>
      </td>

      <td>
        <input type="text" class="form-control form-control-sm regional-meta-title"
          value="${seo.metaTitle ?? ""}">
        <textarea class="form-control form-control-sm regional-meta-desc mt-1"
          rows="2">${seo.metaDescription ?? ""}</textarea>
      </td>
    `;

    const toggle = row.querySelector(".regional-available");
    toggle.addEventListener("change", () => {
      const enabled = toggle.checked;
      row
        .querySelectorAll(
          ".regional-stock, .regional-price, .regional-sale-price"
        )
        .forEach((i) => (i.disabled = !enabled));
    });

    tbody.appendChild(row);
  });
}

function collectRegionalPayloadFromUI() {
  const rows = document.querySelectorAll("#regionalSettingsTableBody tr");

  const regionalPricing = [];
  const regionalAvailability = [];
  const regionalSeo = [];

  rows.forEach((row) => {
    const enabled = row.querySelector(".regional-available")?.checked;
    if (!enabled) return;

    const region = row.querySelector(".regional-region")?.value;

    const price = Number(row.querySelector(".regional-price")?.value || 0);
    const salePrice = Number(
      row.querySelector(".regional-sale-price")?.value || 0
    );
    const stock = Number(row.querySelector(".regional-stock")?.value || 0);

    const metaTitle =
      row.querySelector(".regional-meta-title")?.value.trim() || "";
    const metaDescription =
      row.querySelector(".regional-meta-desc")?.value.trim() || "";

    regionalPricing.push({
      region,
      regularPrice: price,
      salePrice,
      finalPrice: salePrice > 0 ? salePrice : price,
    });

    regionalAvailability.push({
      region,
      stockQuantity: stock,
      isAvailable: true,
    });

    if (metaTitle || metaDescription) {
      regionalSeo.push({
        region,
        metaTitle,
        metaDescription,
      });
    }
  });

  return { regionalPricing, regionalAvailability, regionalSeo };
}

/* ================= EDIT PRODUCT ================= */

async function editProduct(productId) {
  try {
    showLoading(true);

    await loadCategories();

    const res = await API.get("/products/:productId", { productId });
    const product = res?.data;
    if (!product) throw new Error("Product not found");

    window.currentProductId = product._id;

    const set = (id, val = "") => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    /* ================= BASIC ================= */

    set("productName", product.name);
    set("productBrand", product.brand);
    set(
      "productDescription",
      typeof product.description === "object"
        ? product.description.short
        : product.description
    );

    set("productSku", product.sku);
    set("productCategory", product.category?.mainCategoryId);
    set("productPrice", product.pricing?.regularPrice);
    set("productSalePrice", product.pricing?.salePrice);
    set("productStock", product.availability?.stockQuantity);

    set(
      "productAvailability",
      mapBackendStockStatusToUI(product.availability?.stockStatus)
    );

    document
      .querySelector(`input[name="status"][value="${product.status}"]`)
      ?.click();

    /* ================= PRODUCT FLAGS (FIXED) ================= */

    const flagBindings = [
      { id: "isFeatured", value: product.isFeatured },
      { id: "isPopular", value: product.isPopular },
      { id: "isBestSeller", value: product.isBestSeller },
      { id: "isTrending", value: product.isTrending },
    ];

    flagBindings.forEach(({ id, value }) => {
      const checkbox = document.getElementById(id);
      if (!checkbox) return;
      checkbox.checked = Boolean(value);
    });

    /* ================= EXTRA ================= */

    set("warrantyPeriod", product.warranty?.period);
    set("warrantyReturnPolicy", product.warranty?.returnPolicy);

    set("productOrigin", product.origin?.country || "");
    set("productOriginManufacturer", product.origin?.manufacturer || "");

    set("productProject", product.project?.projectName || "");
    set("productProjectId", product.project?.projectId || "");

    set("dimensionLength", product.dimensions?.length);
    set("dimensionWidth", product.dimensions?.width);
    set("dimensionHeight", product.dimensions?.height);
    set("productWeight", product.dimensions?.weight);

    set("productMetaTitle", product.seo?.metaTitle);
    set("productMetaDescription", product.seo?.metaDescription);
    set("productMetaKeywords", product.seo?.keywords?.join(", "));

    /* ================= IMAGES ================= */

    window.existingImages = product.images || [];
    window.tempUploadedImages = product.images || [];
    loadExistingImages(product.images || []);

    /* ================= VARIANTS ================= */

    if (product.hasVariants && Array.isArray(product.variants)) {
      hasVariantsCheckbox.checked = true;
      variantsSection.classList.remove("d-none");
      variantsSection.style.display = "block";

      variantsList.innerHTML = "";
      window.variantCount = 0;

      product.variants.forEach((v) => addVariantField(v));
    }

    /* ================= PLANS ================= */

    loadPlansForProduct(product);
    /* ================= REFERRAL BONUS (RESTORE) ================= */

    if (product.referralBonus?.enabled) {
      referralEnabled.checked = true;
      toggleReferral(true);

      referralType.value = product.referralBonus.type || "percentage";
      referralValue.value = product.referralBonus.value || "";
      referralMinPurchase.value = product.referralBonus.minPurchaseAmount || "";
    } else {
      referralEnabled.checked = false;
      toggleReferral(false);
    }

    /* ================= PAYMENT PLAN (RESTORE) ================= */

    if (product.paymentPlan?.enabled) {
      paymentPlanEnabled.checked = true;
      togglePaymentPlan(true);

      paymentPlanMinDown.value = product.paymentPlan.minDownPayment || "";
      paymentPlanMaxDown.value = product.paymentPlan.maxDownPayment || "";
      paymentPlanInterest.value = product.paymentPlan.interestRate || "";
    } else {
      paymentPlanEnabled.checked = false;
      togglePaymentPlan(false);
    }

    recalcAutoPlans();

    /* ================= REGIONAL (FINAL FIX) ================= */

    if (isGlobalProductCheckbox && regionalSettingsSection) {
      const isGlobal = product.isGlobalProduct === true;

      isGlobalProductCheckbox.checked = isGlobal;

      if (isGlobal) {
        // 🔒 GLOBAL PRODUCT
        regionalSettingsSection.classList.add("d-none");
        document.getElementById("regionalSettingsTableBody").innerHTML = "";
      } else {
        // 🌍 REGIONAL PRODUCT
        regionalSettingsSection.classList.remove("d-none");

        // 1️⃣ Build rows from backend data
        buildRegionalRowsFromConfig(product);
        /* ================= FORCE REGIONAL CHECKBOX SYNC ================= */

        if (Array.isArray(product.regionalAvailability)) {
          product.regionalAvailability.forEach((ra) => {
            const row = [
              ...document.querySelectorAll("#regionalSettingsTableBody tr"),
            ].find((r) => {
              const uiRegion = r
                .querySelector(".regional-region")
                ?.value?.toLowerCase();
              const apiRegion = ra.region?.toLowerCase();
              return uiRegion === apiRegion;
            });

            if (!row) return;

            const checkbox = row.querySelector(".regional-available");
            if (checkbox) {
              checkbox.checked = ra.isAvailable === true;
              checkbox.dispatchEvent(new Event("change"));
            }
          });
        }

        // 2️⃣ Restore regional SEO
        if (Array.isArray(product.regionalSeo)) {
          product.regionalSeo.forEach((seo) => {
            const row = [
              ...document.querySelectorAll("#regionalSettingsTableBody tr"),
            ].find(
              (r) => r.querySelector(".regional-region")?.value === seo.region
            );

            if (!row) return;

            row.querySelector(".regional-meta-title").value =
              seo.metaTitle || "";
            row.querySelector(".regional-meta-desc").value =
              seo.metaDescription || "";
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ editProduct failed:", err);
    alert("Failed to load product");
  } finally {
    showLoading(false);
  }
}

/* ================= PAYLOAD BUILDER ================= */

function buildProductPayload() {
  const availability = mapUIAvailabilityToBackend(
    productForm.productAvailability.value
  );

  const isGlobal = isGlobalProductCheckbox?.checked === true;

  const categorySelect = document.getElementById("productCategory");
  const selectedOption = categorySelect.options[categorySelect.selectedIndex];

  const category = selectedOption
    ? {
        mainCategoryId:
          selectedOption.dataset.type === "main"
            ? selectedOption.value
            : selectedOption.dataset.parentId,
        mainCategoryName:
          selectedOption.dataset.type === "main"
            ? selectedOption.textContent
            : selectedOption.textContent.replace("→ ", ""),
        subCategoryId:
          selectedOption.dataset.type === "sub"
            ? selectedOption.value
            : undefined,
        subCategoryName:
          selectedOption.dataset.type === "sub"
            ? selectedOption.textContent.replace("→ ", "")
            : undefined,
      }
    : null;

  /* ================= BASE PAYLOAD ================= */

  const payload = {
    name: productForm.productName.value.trim(),
    brand: productForm.productBrand.value.trim(),
    description: { short: productForm.productDescription.value.trim() },
    sku: productForm.productSku.value.trim(),

    category,

    status: document.querySelector('input[name="status"]:checked')?.value,

    pricing: {
      regularPrice: Number(productForm.productPrice.value),
      salePrice: Number(productForm.productSalePrice.value || 0),
    },

    availability: {
      stockQuantity: Number(productForm.productStock.value || 0),
      stockStatus: availability.stockStatus,
      isAvailable: availability.isAvailable,
    },

    origin: {
      country: productOrigin.value.trim(),
      manufacturer: productOriginManufacturer.value.trim(),
    },

    project: {
      projectId: productProjectId.value || undefined,
      projectName: productProject.value.trim(),
    },

    dimensions: {
      length: Number(dimensionLength.value || 0),
      width: Number(dimensionWidth.value || 0),
      height: Number(dimensionHeight.value || 0),
      weight: Number(productWeight.value || 0),
    },

    warranty: {
      period: Number(warrantyPeriod.value || 0),
      returnPolicy: Number(warrantyReturnPolicy.value || 0),
    },

    referralBonus: referralEnabled?.checked
      ? {
          enabled: true,
          type: referralType.value,
          value: Number(referralValue.value || 0),
          minPurchaseAmount: Number(referralMinPurchase.value || 0),
        }
      : { enabled: false },

    paymentPlan: paymentPlanEnabled?.checked
      ? {
          enabled: true,
          minDownPayment: Number(paymentPlanMinDown.value || 0),
          maxDownPayment: Number(paymentPlanMaxDown.value || 0),
          interestRate: Number(paymentPlanInterest.value || 0),
        }
      : { enabled: false },

    seo: {
      metaTitle: productMetaTitle.value.trim(),
      metaDescription: productMetaDescription.value.trim(),
      keywords: productMetaKeywords.value
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    },

    // 🔒 always send this
    hasVariants: hasVariantsCheckbox.checked,

    isGlobalProduct: isGlobal,
  };

  /* ================= HARD VALIDATION ================= */

  if (!payload.pricing.regularPrice || payload.pricing.regularPrice <= 0) {
    throw new Error("Regular price is required");
  }

  /* ================= PRODUCT FLAGS ================= */

  ["isFeatured", "isPopular", "isBestSeller", "isTrending"].forEach((flag) => {
    const el = document.getElementById(flag);
    payload[flag] = el ? el.checked === true : false;
  });

  /* ================= VARIANTS ================= */

  if (!window.currentProductId) {
    // CREATE → send variants
    payload.variants = collectVariantsFromDOM();
  }

  /* ================= PLANS ================= */

  if (!window.currentProductId) {
    // CREATE only
    payload.plans = collectPlansFromDOM();
  }

  /* ================= IMAGES ================= */

  // 🔥 Required for UPDATE flow
  /* ================= PRODUCT IMAGES ================= */

  payload.images = (window.tempUploadedImages || []).map((img) => ({
    url: img.url || img.location || img.tempUrl,
    key: img.key || img.filename || "",
  }));

  /* ================= REGIONAL ================= */

  if (!isGlobal && typeof collectRegionalPayloadFromUI === "function") {
    const { regionalPricing, regionalAvailability, regionalSeo } =
      collectRegionalPayloadFromUI();

    payload.regionalPricing = regionalPricing;
    payload.regionalAvailability = regionalAvailability;
    payload.regionalSeo = regionalSeo || [];
  } else {
    payload.regionalPricing = [];
    payload.regionalAvailability = [];
    payload.regionalSeo = [];
  }

  return payload;
}

/* ============================================================
   PER-DAY PLANS — ADD + EDIT (FINAL)
============================================================ */

/* ---------- Helpers ---------- */

function getEffectivePrice() {
  const saleEl = document.getElementById("productSalePrice");
  const priceEl = document.getElementById("productPrice");

  const sale = saleEl ? Number(saleEl.value) : 0;
  const regular = priceEl ? Number(priceEl.value) : 0;

  return sale > 0 ? sale : regular;
}

/* ---------- Auto default plans ---------- */

function createDefaultPlans(isNewProduct = false) {
  if (!plansList) return;

  plansList.innerHTML = "";
  window.planCount = 0;

  [10, 20, 30].forEach((days, idx) => {
    window.planCount++;

    const plan = {
      name: `${days}-Day Plan`,
      days,
      perDayAmount: "", // 👈 ADMIN FILLS
      totalAmount: "",
      description: "",
      isAuto: true,
      isRecommended: idx === 0, // ✅ ONE DEFAULT RECOMMENDED
    };

    plansList.insertAdjacentHTML("beforeend", renderPlanField(plan, idx));

    const card = document.getElementById(`plan-${idx + 1}`);

    // Lock name + days
    card.querySelector("[data-plan-days]").readOnly = true;
    card.querySelector("[data-plan-name]").readOnly = true;

    wirePlanLogic(card);
  });
}

/* ---------- Load plans for EDIT ---------- */

function loadPlansForProduct(product) {
  if (!plansList) return;

  plansList.innerHTML = "";
  window.planCount = 0;

  // CASE 1: Existing plans
  if (Array.isArray(product.plans) && product.plans.length) {
    product.plans.forEach((plan, idx) => {
      window.planCount++;
      plansList.insertAdjacentHTML("beforeend", renderPlanField(plan, idx));
      wirePlanLogic(document.getElementById(`plan-${idx + 1}`));
    });
    return;
  }

  // CASE 2: No plans → auto defaults
  createDefaultPlans();
}

/* ---------- Add custom plan ---------- */

function addCustomPlan() {
  if (!plansList) return;

  window.planCount++;

  const plan = {
    name: "",
    days: "",
    perDayAmount: "",
    description: "",
    isAuto: false,
  };

  plansList.insertAdjacentHTML(
    "beforeend",
    renderPlanField(plan, window.planCount - 1)
  );

  wirePlanLogic(document.getElementById(`plan-${window.planCount}`));
}
function removePlanField(idx) {
  const card = document.getElementById(`plan-${idx}`);
  if (!card) return;

  const wasRecommended = card.querySelector("[data-plan-recommended]")?.checked;

  card.remove();

  // Re-index remaining plans (IMPORTANT)
  const cards = document.querySelectorAll("#plansList .card");
  window.planCount = cards.length;

  cards.forEach((c, i) => {
    c.id = `plan-${i + 1}`;
    c.querySelector("strong").textContent = `Plan ${i + 1}`;

    const btn = c.querySelector("button[onclick]");
    if (btn) btn.setAttribute("onclick", `removePlanField(${i + 1})`);
  });

  // 🔒 Safety: ensure one recommended plan always exists
  if (wasRecommended && cards.length > 0) {
    cards[0].querySelector("[data-plan-recommended]").click();
  }
}

/* ---------- Recalculate AUTO plans on price change ---------- */

function recalcAutoPlans() {
  const price = getEffectivePrice();
  if (!price) return;

  document.querySelectorAll("#plansList .card[data-auto]").forEach((card) => {
    const days = Number(card.querySelector("[data-plan-days]").value || 0);
    const perDayInput = card.querySelector("[data-plan-amount]");
    const totalInput = card.querySelector("[data-plan-total]");

    if (!days || !perDayInput.value) return;

    totalInput.value = (days * Number(perDayInput.value)).toFixed(2);
  });
}

/* ---------- Collect plans for payload ---------- */

function collectPlansFromDOM() {
  const plans = [];
  let recommendedCount = 0;
  const price = getEffectivePrice();

  document.querySelectorAll("#plansList .card").forEach((card) => {
    const days = Number(card.querySelector("[data-plan-days]").value || 0);
    const perDay = Number(card.querySelector("[data-plan-amount]").value || 0);
    const total = Number(card.querySelector("[data-plan-total]").value || 0);
    const name = card.querySelector("[data-plan-name]").value.trim();
    const description = "";
    const isRecommended =
      card.querySelector("[data-plan-recommended]")?.checked || false;

    if (isRecommended) recommendedCount++;

    // HARD VALIDATION
    if (!name || days < 5) throw new Error("Days must be at least 5");

    if (!perDay) {
      throw new Error("Please enter per-day amount for all plans");
    }

    if (perDay < 50) {
      throw new Error("Per-day amount must be at least ₹50");
    }

    if (total !== days * perDay)
      throw new Error("Invalid plan total calculation");

    plans.push({
      name,
      days,
      perDayAmount: perDay,
      totalAmount: total,
      description,
      isRecommended,
    });
  });

  if (recommendedCount !== 1)
    throw new Error("Exactly one recommended plan is required");

  return plans;
}

/* ---------- Event bindings ---------- */

document.getElementById("addPlanBtn")?.addEventListener("click", addCustomPlan);

document
  .getElementById("productPrice")
  ?.addEventListener("input", recalcAutoPlans);

document
  .getElementById("productSalePrice")
  ?.addEventListener("input", recalcAutoPlans);

/* ================= SAVE ================= */

async function saveProduct() {
  if (window.isUploadingImages) {
    showNotification("Please wait for image upload", "warning");
    return;
  }

  try {
    showLoading(true);

    /* ================= FIX GLOBAL vs REGIONAL ================= */

    // If any region is checked, product cannot be global
    const anyRegionChecked = document.querySelector(
      "#regionalSettingsTableBody .regional-available:checked"
    );

    if (anyRegionChecked && isGlobalProductCheckbox?.checked) {
      isGlobalProductCheckbox.checked = false;
    }

    let payload = buildProductPayload();

    /* ================= 🔒 HARD SAFETY: PRODUCT FLAGS ================= */
    // Never allow flags to be dropped or coerced incorrectly
    ["isFeatured", "isPopular", "isBestSeller", "isTrending"].forEach(
      (flag) => {
        payload[flag] = payload[flag] === true;
      }
    );

    /* ================= UPDATE ================= */

    if (window.currentProductId) {
      if (window.hasUploadedVariantImages) {
        delete payload.variants;
      }

      // 1️⃣ Update product data (NO image mutation here)
      await API.put("/products/:productId", payload, {
        productId: window.currentProductId,
      });

      // 2️⃣ Upload PRIMARY product images (🔥 MISSING STEP)
      await uploadPrimaryProductImages(window.currentProductId);

      // 3️⃣ Refetch product to get variantIds
      const fresh = await API.get("/products/:productId", {
        productId: window.currentProductId,
      });

      // 4️⃣ Upload VARIANT images
      if (fresh?.data?.variants?.length) {
        await uploadVariantImages(window.currentProductId, fresh.data.variants);
      }

      showProductSuccess("Product Updated Successfully");
      return;
    }

    /* ================= CREATE ================= */

    const res = await API.post("/products", payload);
    const createdProduct = res?.data;

    if (!createdProduct?.productId) {
      throw new Error("Product created but productId missing");
    }

    const productId = createdProduct.productId;

    // 1️⃣ Upload primary product images
    await uploadPrimaryProductImages(productId);

    // 2️⃣ Refetch product to get backend-generated variantIds
    const fresh = await API.get("/products/:productId", { productId });

    // 3️⃣ Upload variant images
    if (fresh?.data?.variants?.length) {
      await uploadVariantImages(productId, fresh.data.variants);
    }

    showProductSuccess("Product Created Successfully");
  } catch (err) {
    console.error("Save failed:", err);
    showNotification(err.message || "Save failed", "error");
  } finally {
    showLoading(false);
  }
}

/* ================= PAGE INIT ================= */

function initAddProductPage() {
  // ✅ ADD MODE
  window.__IS_EDIT_MODE__ = false;

  // 🔥 FULL RESET — prevents duplicate SKU / ID bugs
  window.currentProductId = null;
  window.existingImages = [];
  window.tempUploadedImages = [];
  window.variantCount = 0;
  window.planCount = 0;

  initProductFormDOM();

  // Clear form explicitly
  document.getElementById("productForm")?.reset();

  loadCategories();
  createDefaultPlans(true);

  const saveBtn = document.getElementById("saveProductBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveProduct);
  }
}

async function initEditProductPage() {
  // ✅ EDIT MODE (CRITICAL)
  window.__IS_EDIT_MODE__ = true;

  initProductFormDOM();

  const saveBtn = document.getElementById("saveProductBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveProduct);
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) return alert("Missing product id");

  await editProduct(id);
}

/* ================= EXPORTS ================= */

window.initAddProductPage = initAddProductPage;
window.initEditProductPage = initEditProductPage;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.handleImageSelect = handleImageSelect;
