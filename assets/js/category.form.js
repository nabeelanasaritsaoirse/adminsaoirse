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
        adminPanel.showNotification("Category not found", "error");
        return;
      }

      CategoryStore.currentCategoryId = categoryId;

      // 🔥 DIRECTLY FILL USING FULL DATA
      fillFormForEditFromApi(cat);
    } catch (err) {
      console.error(err);
      adminPanel.showNotification("Failed to load category", "error");
    }
  }
});

function fillFormForEditFromApi(cat) {
  categoryName.value = cat.name || "";
  categoryDescription.value = cat.description || "";
  displayOrder.value = cat.displayOrder || 0;

  isActive.checked = !!cat.isActive;
  isFeatured.checked = !!cat.isFeatured;
  showInMenu.checked = !!cat.showInMenu;

  metaTitle.value = cat.meta?.title || "";
  metaDescription.value = cat.meta?.description || "";
  metaKeywords.value = cat.meta?.keywords?.join(", ") || "";

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

  renderTypedImagePreview(images);

  // ✅ BANNERS
  if (Array.isArray(cat.bannerImages) && cat.bannerImages.length) {
    renderBannerPreview(cat.bannerImages);
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
          <div class="col-md-2 text-center">
            <div class="border rounded p-2 h-100">
              <img
                src="${escapeHtml(img.url)}"
                class="img-fluid rounded mb-2"
                style="max-height:90px; object-fit:contain;"
              />
              <div class="badge bg-secondary text-capitalize">${img.type}</div>
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
  if (!preview || !banners.length) return;

  // ✅ Clear old banners (important on re-edit)
  preview.innerHTML = "";

  preview.innerHTML = `
    <div class="row g-3">
      ${banners
        .map(
          (b) => `
          <div class="col-md-4 text-center">
            <div class="border rounded p-2 h-100">
              <img
                src="${escapeHtml(b.url)}"
                class="img-fluid rounded mb-2"
                style="max-height:140px; object-fit:cover;"
              />
              <div class="badge bg-dark">Banner</div>
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
    adminPanel.showNotification("Category saved successfully", "success");

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
    adminPanel.showNotification(
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
  console.log("🔥 uploadCategoryImages called", categoryId);

  const fd = new FormData();

  const mappings = [
    ["mainImage", "mainImageAlt"],
    ["illustrationImage", "illustrationImageAlt"],
    ["subcategoryImage", "subcategoryImageAlt"],
    ["mobileImage", "mobileImageAlt"],
    ["iconImage", "iconImageAlt"],
  ];

  let hasFiles = false;

  mappings.forEach(([fileId, altId]) => {
    const fileInput = document.getElementById(fileId);
    const altInput = document.getElementById(altId);

    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      fd.append(fileId, fileInput.files[0]);
      fd.append(altId, altInput?.value || "");
      hasFiles = true;
    }
  });

  if (!hasFiles) {
    console.warn("⚠️ No images selected, skipping upload");
    return;
  }

  const token = AUTH.getToken();

  if (!token) {
    throw new Error("Auth token missing");
  }

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

  console.log("✅ Category images uploaded successfully");
}

async function uploadCategoryBanners(categoryId) {
  const input = document.getElementById("bannerImages");
  if (!input || !input.files.length) return;

  const fd = new FormData();
  Array.from(input.files).forEach((file) => {
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

window.saveCategory = saveCategory;
