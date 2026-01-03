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

  CategoryStore.categoryImages = cat.images || [];
  renderImagePreview();

  /* 🔥 RESTORE REGIONAL STATE */
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
   IMAGES
   ========================= */

function addImage() {
  const url = imageUrl.value.trim();
  if (!url) return adminPanel.showNotification("Image URL required", "error");

  CategoryStore.categoryImages.push({
    url,
    altText: imageAltText.value.trim(),
    isPrimary: CategoryStore.categoryImages.length === 0,
  });

  imageUrl.value = "";
  imageAltText.value = "";
  renderImagePreview();
}

function renderImagePreview() {
  imagesPreview.innerHTML = CategoryStore.categoryImages
    .map(
      (img, i) => `
      <div class="me-2 d-inline-block">
        <img src="${escapeHtml(img.url)}" width="80">
        <button onclick="removeImage(${i})">×</button>
      </div>`
    )
    .join("");
}

function removeImage(i) {
  CategoryStore.categoryImages.splice(i, 1);
  renderImagePreview();
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
    images: CategoryStore.categoryImages,
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

    // 🔥 THIS IS THE MISSING PIECE
    if (categoryId) {
      await API.get("/categories/:categoryId", {
        categoryId,
      });
    }

    // Redirect AFTER all APIs
    window.location.href = "categories.html";
  } catch (err) {
    console.error(err);
    adminPanel.showNotification("Failed to save category", "error");
  } finally {
    showLoading(false);
  }
}

window.saveCategory = saveCategory;
window.addImage = addImage;
window.removeImage = removeImage;
