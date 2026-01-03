document.addEventListener("DOMContentLoaded", async () => {
  resetRegionalState();
  await loadCategories();

  const categoryId = new URLSearchParams(location.search).get("id");
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
    CategoryStore.currentCategoryId = categoryId;
    fillFormForEdit(categoryId);
  }
});

/* =========================
   EDIT
   ========================= */

function fillFormForEdit(id) {
  const cat = CategoryStore.categories.find((c) => c._id === id);
  if (!cat) return;

  categoryName.value = cat.name || "";
  categoryDescription.value = cat.description || "";
  categoryIcon.value = cat.icon || "";
  displayOrder.value = cat.displayOrder || 0;

  isActive.checked = !!cat.isActive;
  isFeatured.checked = !!cat.isFeatured;
  showInMenu.checked = !!cat.showInMenu;

  metaTitle.value = cat.meta?.title || "";
  metaDescription.value = cat.meta?.description || "";
  metaKeywords.value = cat.meta?.keywords?.join(", ") || "";

  renderTypedImagePreview(cat.categoryImages || []);

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

/* =========================
   TYPED IMAGE PREVIEW
   ========================= */

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
              <img src="${escapeHtml(img.url)}"
                   class="img-fluid rounded mb-2"
                   style="max-height:80px; object-fit:contain;" />
              <div class="badge bg-secondary text-capitalize">${img.type}</div>
            </div>
          </div>
        `
        )
        .join("")}
    </div>
  `;

  updateImageLabels(imageMap);
  document.querySelectorAll(".category-image-card").forEach((card) => {
    const type = card.dataset.imageType;
    const previewImg = imageMap[type]?.url;

    if (previewImg) {
      card.style.setProperty("--preview-image", `url(${previewImg})`);
    }
  });
}

function updateImageLabels(imageMap) {
  document.querySelectorAll(".category-image-card").forEach((card) => {
    const type = card.dataset.imageType;
    const titleEl = card.querySelector(".image-title");

    if (!titleEl) return;

    const baseLabel = titleEl.textContent.replace(/^(Upload|Change)\s+/i, "");

    titleEl.textContent = imageMap[type]
      ? `Change ${baseLabel}`
      : `Upload ${baseLabel}`;

    card.classList.toggle("has-image", !!imageMap[type]);
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
      await API.put("/categories/:categoryId", payload, {
        categoryId: CategoryStore.currentCategoryId,
      });

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
      "error"
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
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("UPLOAD ERROR:", err);
    throw new Error("Image upload failed");
  }

  console.log("✅ Category images uploaded successfully");
}

window.saveCategory = saveCategory;
