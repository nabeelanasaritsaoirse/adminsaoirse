/* ============================================================
   product.view.js
   View-only product modal logic
============================================================ */

let viewFormInitialized = false;

async function viewProductDetails(productId) {
  try {
    showLoading(true);

    /* ========================================================
       🔧 CRITICAL FIX
       editProduct() REQUIRES form DOM initialization
       which normally happens only on edit/add pages
    ======================================================== */
    if (!viewFormInitialized) {
      if (typeof initProductFormDOM === "function") {
        initProductFormDOM();
        viewFormInitialized = true;
      } else {
        throw new Error("initProductFormDOM is not available");
      }
    }

    /* ========================================================
       🔥 REUSE EDIT LOGIC (SAFE NOW)
    ======================================================== */
    await editProduct(productId);

    /* ========================================================
       🔒 LOCK UI FOR VIEW MODE
    ======================================================== */
    lockProductFormForView();

    /* ========================================================
       🪟 SHOW MODAL
    ======================================================== */
    const productModal = document.getElementById("productModal");
    if (productModal) {
      new bootstrap.Modal(productModal).show();
    }
  } catch (err) {
    console.error("View product error:", err);
    alert("Failed to load product");
  } finally {
    showLoading(false);
  }
}

/* ============================================================
   Lock form for view-only mode
============================================================ */
function lockProductFormForView() {
  document
    .querySelectorAll(
      "#productModal input, #productModal textarea, #productModal select"
    )
    .forEach((el) => {
      el.disabled = true;
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
    document
      .querySelectorAll(
        "#productModal input, #productModal textarea, #productModal select"
      )
      .forEach((el) => {
        el.disabled = false;
      });

    const saveBtn = document.getElementById("saveProductBtn");
    if (saveBtn) saveBtn.style.display = "";

    const addPlanBtn = document.getElementById("addPlanBtn");
    if (addPlanBtn) addPlanBtn.style.display = "";

    const addVariantBtn = document.getElementById("addVariantBtn");
    if (addVariantBtn) addVariantBtn.style.display = "";

    const hasVariants = document.getElementById("hasVariants");
    if (hasVariants) hasVariants.style.display = "";

    // restore category dropdown for next edit/add
    if (typeof loadCategories === "function") {
      loadCategories();
    }
  });
}

/* ---------- Expose ---------- */
window.viewProductDetails = viewProductDetails;
