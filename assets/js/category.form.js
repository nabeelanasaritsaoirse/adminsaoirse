/* =========================
   MARKETPLACE STATE
========================= */

CategoryStore.attributeSchema = CategoryStore.attributeSchema || [];
document.addEventListener("DOMContentLoaded", async () => {
  resetRegionalState();

  const categoryId = new URLSearchParams(location.search).get("id");

  await loadCategories();
  populateParentCategoryDropdown(categoryId);

  const globalCheckbox = document.getElementById("isGlobalCategory");
  const regionalSection = document.getElementById("regionalCheckboxesSection");
  const regionalList = document.getElementById("regionalCheckboxesList");

  /* =========================
     GLOBAL / REGIONAL TOGGLE
     ========================= */
  if (globalCheckbox && regionalSection && regionalList) {
    globalCheckbox.addEventListener("change", () => {
      CategoryStore.isGlobalCategory = globalCheckbox.checked;

      if (!globalCheckbox.checked) {
        regionalSection.classList.remove("d-none");

        if (
          typeof initializeRegionalCheckboxes === "function" &&
          regionalList.children.length === 0
        ) {
          initializeRegionalCheckboxes();
        }
      } else {
        regionalSection.classList.add("d-none");
        CategoryStore.selectedRegions = [];
        CategoryStore.regionalMetaMap = {};
      }
    });
  }
  /* =========================
     EDIT MODE
     ========================= */
  if (categoryId) {
    try {
      const res = await API.get(`/categories/${categoryId}`);
      const cat = res?.data;

      if (!cat) {
        showNotification("Category not found", "error");
        return;
      }

      CategoryStore.currentCategoryId = categoryId;

      // 🔥 DIRECTLY FILL USING FULL DATA
      fillFormForEditFromApi(cat);
    } catch (err) {
      console.error(err);
      showNotification("Failed to load category", "error");
    }
  }
});
const categoryImagePreviewState = {};
let bannerPreviewState = [];
let bannerFileState = [];
let existingBannerState = [];
let existingCategoryImages = {};
let deletedCategoryImages = [];

function fillFormForEditFromApi(cat) {
  existingCategoryImages = {};
  Object.keys(categoryImagePreviewState).forEach(
    (k) => delete categoryImagePreviewState[k],
  );
  categoryName.value = cat.name || "";
  categoryDescription.value = cat.description || "";
  displayOrder.value = cat.displayOrder || 0;

  isActive.checked = !!cat.isActive;
  isFeatured.checked = !!cat.isFeatured;
  showInMenu.checked = !!cat.showInMenu;

  metaTitle.value = cat.metaTitle || cat.meta?.title || "";

  metaDescription.value = cat.metaDescription || cat.meta?.description || "";

  metaKeywords.value = (cat.keywords || cat.meta?.keywords || []).join(", ");
  /* =========================
     ✅ FIX: RESTORE PARENT CATEGORY
     ========================= */
  const parentCategory = document.getElementById("parentCategory");
  if (parentCategory) {
    if (cat.parentCategoryId) {
      parentCategory.value =
        typeof cat.parentCategoryId === "object"
          ? cat.parentCategoryId._id
          : cat.parentCategoryId;
    } else {
      parentCategory.value = "";
    }
  }

  // ✅ CATEGORY IMAGES
  const images = [
    cat.mainImage,
    cat.illustrationImage,
    cat.subcategoryImage,
    cat.mobileImage,
    cat.iconImage,
  ].filter(Boolean);
  // Restore ALT TEXT into inputs
  document.getElementById("mainImageAlt").value = cat.mainImage?.altText || "";

  document.getElementById("illustrationImageAlt").value =
    cat.illustrationImage?.altText || "";

  document.getElementById("subcategoryImageAlt").value =
    cat.subcategoryImage?.altText || "";

  document.getElementById("mobileImageAlt").value =
    cat.mobileImage?.altText || "";

  document.getElementById("iconImageAlt").value = cat.iconImage?.altText || "";
  images.forEach((img) => {
    existingCategoryImages[`${img.type}Image`] = img;
  });

  renderTypedImagePreview(images);

  // ✅ BANNERS
  if (Array.isArray(cat.bannerImages) && cat.bannerImages.length) {
    existingBannerState = [...cat.bannerImages];
    renderBannerPreview([...existingBannerState, ...bannerPreviewState]);
  }

  // 🌍 REGIONAL
  const globalCheckbox = document.getElementById("isGlobalCategory");
  const regionalSection = document.getElementById("regionalCheckboxesSection");

  if (Array.isArray(cat.availableInRegions) && cat.availableInRegions.length) {
    CategoryStore.isGlobalCategory = false;
    CategoryStore.selectedRegions = [...cat.availableInRegions];
    CategoryStore.regionalMetaMap = {};

    cat.regionalMeta?.forEach((rm) => {
      if (rm.region) {
        CategoryStore.regionalMetaMap[rm.region] = {
          metaTitle: rm.metaTitle || "",
          metaDescription: rm.metaDescription || "",
          keywords: rm.keywords || [],
        };
      }
    });

    globalCheckbox.checked = false;
    regionalSection.classList.remove("d-none");
    initializeRegionalCheckboxes();
  } else {
    globalCheckbox.checked = true;
    regionalSection.classList.add("d-none");
  }
  /* =========================
   MARKETPLACE DATA
========================= */

  document.getElementById("commissionRate").value = cat.commissionRate ?? "";

  document.getElementById("isRestricted").checked = !!cat.isRestricted;

  CategoryStore.attributeSchema = cat.attributeSchema || [];

  renderAttributeSchemaUI();
}

/* =========================
   EDIT
   ========================= */

function fillFormForEdit(id) {
  const cat = CategoryStore.categories.find((c) => c._id === id);
  if (!cat) return;

  categoryName.value = cat.name || "";
  categoryDescription.value = cat.description || "";
  displayOrder.value = cat.displayOrder || 0;

  isActive.checked = !!cat.isActive;
  isFeatured.checked = !!cat.isFeatured;
  showInMenu.checked = !!cat.showInMenu;

  metaTitle.value = cat.meta?.title || "";
  metaDescription.value = cat.meta?.description || "";
  metaKeywords.value = cat.meta?.keywords?.join(", ") || "";

  const images = [
    cat.mainImage,
    cat.illustrationImage,
    cat.subcategoryImage,
    cat.mobileImage,
    cat.iconImage,
  ].filter(Boolean);

  renderTypedImagePreview(images);
  if (Array.isArray(cat.bannerImages) && cat.bannerImages.length) {
    renderBannerPreview(cat.bannerImages);
  }

  /* 🌍 REGIONAL STATE */
  const globalCheckbox = document.getElementById("isGlobalCategory");
  const regionalSection = document.getElementById("regionalCheckboxesSection");

  if (Array.isArray(cat.availableInRegions) && cat.availableInRegions.length) {
    CategoryStore.isGlobalCategory = false;
    CategoryStore.selectedRegions = [...cat.availableInRegions];
    CategoryStore.regionalMetaMap = {};

    cat.regionalMeta?.forEach((rm) => {
      if (rm.region) {
        CategoryStore.regionalMetaMap[rm.region] = {
          metaTitle: rm.metaTitle || "",
          metaDescription: rm.metaDescription || "",
          keywords: rm.keywords || [],
        };
      }
    });

    globalCheckbox.checked = false;
    regionalSection.classList.remove("d-none");
    initializeRegionalCheckboxes();
  } else {
    globalCheckbox.checked = true;
    regionalSection.classList.add("d-none");
  }
}
function renderTypedImagePreview(categoryImages = []) {
  const preview = document.getElementById("categoryImagesPreview");
  if (!preview) return;

  if (!categoryImages.length) {
    preview.innerHTML =
      '<div class="text-muted small">No category images uploaded yet</div>';
    updateImageLabels({});
    return;
  }

  const imageMap = {};
  categoryImages.forEach((img) => {
    imageMap[img.type] = img;
  });

  preview.innerHTML = `
    <div class="row g-3">
      ${categoryImages
        .map(
          (img) => `
         <div class="col-lg-2 col-md-3 col-sm-4">
  <div class="border rounded p-2 bg-light text-center position-relative shadow-sm w-100">

    <button 
      class="btn btn-sm btn-danger remove-category-image"
      data-type="${img.type}"
      style="
position:absolute;
top:-6px;
right:-6px;
width:22px;
height:22px;
padding:0;
font-size:14px;
"
    >
      ×
    </button>

    <img
      src="${escapeHtml(img.url)}"
      style="width:100%; height:90px; object-fit:contain;"
      class="mb-1"
    />

    <div>
      <span class="badge bg-secondary text-capitalize">${img.type}</span>
    </div>

  </div>
</div>
        `,
        )
        .join("")}
    </div>
  `;

  // ✅ MARK INPUT CARDS AS HAVING IMAGE (NO CSS BACKGROUND PREVIEW)
  document.querySelectorAll(".category-image-card").forEach((card) => {
    const type = card.dataset.imageType;

    if (imageMap[type]?.url) {
      // Keep class ONLY for label/state logic
      card.classList.add("has-image");

      // 🔥 IMPORTANT: remove any leftover inline preview vars
      card.style.removeProperty("--preview-image");
    } else {
      card.classList.remove("has-image");
      card.style.removeProperty("--preview-image");
    }
  });

  updateImageLabels(imageMap);
}

/* =========================
   IMAGE PREVIEW (FIXED)
   ========================= */

function renderBannerPreview(banners = []) {
  const preview = document.getElementById("bannerImagesPreview");
  if (!preview) return;

  if (!banners.length) {
    preview.innerHTML = "";
    return;
  }

  preview.innerHTML = `
    <div class="row g-3">
      ${banners
        .map(
          (b, i) => `
          <div class="col-lg-2 col-md-3 col-sm-4 col-6">
            <div class="border rounded p-2 text-center bg-light shadow-sm position-relative">

              <button
              type="button"
                class="btn btn-sm btn-danger position-absolute remove-banner"
                data-index="${i}"
                style="top:-6px; right:-6px; width:22px; height:22px; padding:0; font-size:14px;"
              >
                ×
              </button>

              <img
                src="${typeof b === "string" ? b : b.url}"
                style="width:100%; height:120px; object-fit:contain;"
              />

              <div class="mt-1">
                <span class="badge bg-dark">Banner</span>
              </div>

            </div>
          </div>
        `,
        )
        .join("")}
    </div>
  `;
}
function updateImageLabels(imageMap) {
  document.querySelectorAll(".category-image-card").forEach((card) => {
    const type = card.dataset.imageType;
    const titleEl = card.querySelector(".image-title");
    if (!titleEl) return;

    const base = titleEl.textContent.replace(/^(Upload|Change)\s+/i, "");
    titleEl.textContent = imageMap[type] ? `Change ${base}` : `Upload ${base}`;
  });
}

/* =========================
   SAVE
   ========================= */

async function saveCategory() {
  if (!categoryName.value.trim()) {
    showFieldError(categoryName, "Category name is required");
    return;
  }
  const hasExistingMain = !!existingCategoryImages.mainImage;
  const hasNewMain = !!categoryImagePreviewState.mainImage;

  if (!hasExistingMain && !hasNewMain) {
    showFieldError(
      document.getElementById("mainImage"),
      "Main image is required",
    );
    return;
  }
  const payload = {
    name: categoryName.value.trim(),
    description: categoryDescription.value.trim(),
    parentCategoryId: parentCategory.value || null,
    displayOrder: Number(displayOrder.value || 0),

    isActive: isActive.checked,
    isFeatured: isFeatured.checked,
    showInMenu: showInMenu.checked,

    meta: {
      title: metaTitle.value.trim(),
      description: metaDescription.value.trim(),
      keywords: metaKeywords.value
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    },

    commissionRate:
      Number(document.getElementById("commissionRate").value) || 0,

    isRestricted: document.getElementById("isRestricted").checked,

    attributeSchema: (CategoryStore.attributeSchema || []).filter(
      (a) => a.name && a.name.trim(),
    ),
  };

  /* 🌍 REGIONAL PAYLOAD */
  if (!CategoryStore.isGlobalCategory) {
    payload.availableInRegions = [...CategoryStore.selectedRegions];
    payload.regionalMeta = CategoryStore.selectedRegions.map((r) => ({
      region: r,
      ...(CategoryStore.regionalMetaMap[r] || {}),
    }));
  } else {
    payload.availableInRegions = [];
    payload.regionalMeta = [];
  }

  showLoading(true);

  try {
    let categoryId;

    if (CategoryStore.currentCategoryId) {
      // UPDATE
      await API.put(`/categories/${CategoryStore.currentCategoryId}`, payload);
      // DELETE REMOVED IMAGES
      for (const type of deletedCategoryImages) {
        const apiType = `${type}Image`;

        await API.delete(
          `/categories/${CategoryStore.currentCategoryId}/category-images/${apiType}`,
        );
      }

      deletedCategoryImages = [];

      categoryId = CategoryStore.currentCategoryId;
      sessionStorage.setItem("categorySuccess", "updated");
    } else {
      // CREATE
      const res = await API.post("/categories", payload);
      categoryId = res?.data?._id;
      sessionStorage.setItem("categorySuccess", "created");
    }

    // 🔥 UPLOAD TYPED IMAGES (SEPARATE API)
    if (categoryId) {
      await uploadCategoryImages(categoryId);
      await uploadCategoryBanners(categoryId);
    }
    showNotification("Category saved successfully", "success");

    const btn = document.querySelector('button[onclick="saveCategory()"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }

    setTimeout(() => {
      window.location.href = "categories.html";
    }, 1200);
  } catch (err) {
    console.error(err);
    showNotification(
      err?.response?.data?.message || "Image upload failed",
      "error",
    );
  } finally {
    showLoading(false);
  }
}

/* =========================
   TYPED IMAGE UPLOAD
   ========================= */

async function uploadCategoryImages(categoryId) {
  const fd = new FormData();

  const mappings = [
    ["mainImage", "mainImageAlt"],
    ["illustrationImage", "illustrationImageAlt"],
    ["subcategoryImage", "subcategoryImageAlt"],
    ["mobileImage", "mobileImageAlt"],
    ["iconImage", "iconImageAlt"],
  ];

  let hasData = false;

  mappings.forEach(([fileId, altId]) => {
    const fileInput = document.getElementById(fileId);
    const altInput = document.getElementById(altId);

    const hasExisting = existingCategoryImages[fileId];
    const hasNewFile = fileInput?.files?.length > 0;

    // new upload
    if (hasNewFile) {
      fd.append(fileId, fileInput.files[0]);

      if (altInput?.value) {
        fd.append(altId, altInput.value);
      }

      hasData = true;
    }

    // alt text update only if image truly exists
    else if (
      hasExisting &&
      !deletedCategoryImages.includes(fileId.replace("Image", ""))
    ) {
      if (altInput?.value) {
        fd.append(altId, altInput.value);
        hasData = true;
      }
    }
  });

  if (!hasData) return;

  const token = AUTH.getToken();

  const res = await fetch(
    `${BASE_URL}/categories/${categoryId}/category-images`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: fd,
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("UPLOAD ERROR:", err);
    throw new Error("Image upload failed");
  }
}

async function uploadCategoryBanners(categoryId) {
  if (!bannerFileState.length) return;

  const fd = new FormData();

  bannerFileState.forEach((file) => {
    fd.append("bannerImages", file);
  });

  const token = AUTH.getToken();

  const res = await fetch(
    `${BASE_URL}/categories/${categoryId}/banner-images`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: fd,
    },
  );

  if (!res.ok) {
    throw new Error("Banner image upload failed");
  }
}
function renderAttributeSchemaUI() {
  const container = document.getElementById("attributeSchemaContainer");
  if (!container) return;

  container.innerHTML = "";

  CategoryStore.attributeSchema.forEach((attr, index) => {
    container.innerHTML += `
<div class="border rounded p-2 mb-2">
  <div class="row align-items-center g-2">

    <!-- ATTRIBUTE NAME -->
    <div class="col-md-3">
      <input class="form-control form-control-sm"
        placeholder="Attribute Name"
        value="${attr.name || ""}"
        onchange="updateAttributeName(${index}, this.value)"
      />
    </div>

    <!-- TYPE -->
    <div class="col-md-2">
      <select class="form-select form-select-sm"
        onchange="updateAttributeType(${index}, this.value)">
        <option value="text" ${
          attr.type === "text" ? "selected" : ""
        }>Text</option>
        <option value="color_swatch" ${
          attr.type === "color_swatch" ? "selected" : ""
        }>Color</option>
        <option value="number" ${
          attr.type === "number" ? "selected" : ""
        }>Number</option>
      </select>
    </div>

    <!-- OPTIONS -->
    <div class="col-md-4">
      <input class="form-control form-control-sm"
        placeholder="Options (comma separated)"
        value="${(attr.options || []).join(",")}"
        onchange="updateAttributeOptions(${index}, this.value)"
      />
    </div>

    <!-- REQUIRED -->
    <div class="col-md-1 text-center">
      <input type="checkbox"
        ${attr.isRequired ? "checked" : ""}
        onchange="updateAttributeRequired(${index}, this.checked)">
      <div style="font-size:12px;">Req</div>
    </div>

    <!-- FILTER -->
    <div class="col-md-1 text-center">
      <input type="checkbox"
        ${attr.isFilterable !== false ? "checked" : ""}
        onchange="updateAttributeFilterable(${index}, this.checked)">
      <div style="font-size:12px;">Filter</div>
    </div>

    <!-- REMOVE -->
    <div class="col-md-1 text-end">
     <button
  type="button"
  class="btn btn-sm btn-danger remove-attribute"
  data-index="${index}">
  Remove
</button>
    </div>

  </div>
</div>
`;
  });
}
function addAttributeRow() {
  CategoryStore.attributeSchema.push({
    name: "",
    type: "text",
    options: [],
    isFilterable: true,
    isRequired: false,
  });

  renderAttributeSchemaUI();
}

function updateAttributeName(index, value) {
  CategoryStore.attributeSchema[index].name = value;
}

function updateAttributeType(index, value) {
  CategoryStore.attributeSchema[index].type = value;
}

function updateAttributeOptions(index, value) {
  CategoryStore.attributeSchema[index].options = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
function updateAttributeRequired(index, value) {
  CategoryStore.attributeSchema[index].isRequired = value;
}

function updateAttributeFilterable(index, value) {
  CategoryStore.attributeSchema[index].isFilterable = value;
}
function showFieldError(el, message) {
  if (!el) return;

  el.classList.add("form-error");

  const section = el.closest(".category-image-card") || el;

  section.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  // highlight instead of focusing file input
  section.classList.add("form-error");

  setTimeout(() => {
    section.classList.remove("form-error");
  }, 2500);

  showNotification(message, "error");
}
document.addEventListener("input", function (e) {
  if (e.target.classList.contains("form-error")) {
    e.target.classList.remove("form-error");
  }
});
document.addEventListener("change", function (e) {
  if (!e.target.classList.contains("image-file")) return;

  const input = e.target;
  const file = input.files?.[0];

  if (!file) return;

  const card = input.closest(".category-image-card");
  const type = card?.dataset?.imageType + "Image";

  if (!card || !type) return;

  const reader = new FileReader();

  reader.onload = function (ev) {
    // remove existing image of same type
    delete existingCategoryImages[type];

    categoryImagePreviewState[type] = {
      type: type,
      url: ev.target.result,
    };

    const images = [
      ...Object.values(existingCategoryImages),
      ...Object.values(categoryImagePreviewState),
    ];

    renderTypedImagePreview(images.filter(Boolean));
  };

  reader.readAsDataURL(file);
});
document
  .getElementById("bannerImages")
  ?.addEventListener("change", function (e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const MAX_BANNERS = 10;

    const currentCount = existingBannerState.length + bannerFileState.length;
    const allowedSlots = MAX_BANNERS - currentCount;

    if (allowedSlots <= 0) {
      showNotification("You can only upload 10 banner images", "error");
      e.target.value = "";
      return;
    }

    if (files.length > allowedSlots) {
      showNotification(
        `Only ${allowedSlots} more banner images allowed`,
        "error",
      );
      files.length = allowedSlots; // ✅ trim safely
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        showNotification("Only image files allowed", "error");
        return;
      }

      bannerFileState.push(file);

      const reader = new FileReader();

      reader.onload = function (ev) {
        bannerPreviewState.push(ev.target.result);
        renderBannerPreview([...existingBannerState, ...bannerPreviewState]);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = ""; // ✅ important fix
  });
document.addEventListener("click", function (e) {
  if (!e.target.classList.contains("remove-attribute")) return;

  const index = Number(e.target.dataset.index);

  CategoryStore.attributeSchema.splice(index, 1);

  renderAttributeSchemaUI();
});
document.addEventListener("click", function (e) {
  if (!e.target.classList.contains("remove-category-image")) return;

  const baseType = e.target.dataset.type;
  const type = baseType + "Image";

  // mark for backend deletion
  if (existingCategoryImages[type]) {
    deletedCategoryImages.push(baseType);
  }

  delete existingCategoryImages[type];
  delete categoryImagePreviewState[type];

  const input = document.querySelector(
    `.category-image-card[data-image-type="${baseType}"] input[type="file"]`,
  );

  if (input) input.value = "";

  const images = [
    ...Object.values(existingCategoryImages),
    ...Object.values(categoryImagePreviewState),
  ].filter(Boolean);

  renderTypedImagePreview(images);
});
document.addEventListener("click", async function (e) {
  if (!e.target.classList.contains("remove-banner")) return;

  const index = Number(e.target.dataset.index);

  /* EXISTING BANNER */
  if (index < existingBannerState.length) {
    const removed = existingBannerState[index];

    try {
      await API.delete(
        `/categories/${CategoryStore.currentCategoryId}/banner-images/${removed._id}`,
      );

      existingBannerState.splice(index, 1);

      showNotification("Banner removed", "success");
    } catch (err) {
      console.error(err);
      showNotification("Failed to delete banner", "error");
      return;
    }
  } else {
    /* NEW BANNER (NOT SAVED YET) */
    const newIndex = index - existingBannerState.length;

    bannerPreviewState.splice(newIndex, 1);
    bannerFileState.splice(newIndex, 1);
  }

  renderBannerPreview([...existingBannerState, ...bannerPreviewState]);
});
window.saveCategory = saveCategory;
