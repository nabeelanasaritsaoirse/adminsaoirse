/**
 * Sales User Cart – Read Only
 * Scoped to MY TEAM users only
 */

let page = 1;
const limit = 10;
let userId = null;

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     RBAC GUARD
  ========================= */
  const currentUser = AUTH.getCurrentUser();

  if (
    !AUTH.isAuthenticated() ||
    !["sales_team", "admin", "super_admin"].includes(currentUser?.role)
  ) {
    AUTH.unauthorizedRedirect();
    return;
  }

  /* =========================
     GET USER ID
  ========================= */
  const params = new URLSearchParams(window.location.search);
  userId = params.get("id") || params.get("userId");

  if (!userId) {
    alert("User ID missing");
    window.location.href = "sales-users.html";
    return;
  }

  window.userId = userId;

  /* =========================
     TOP USER NAME
  ========================= */
  const topUserEl = document.getElementById("topUserName");
  if (topUserEl) {
    topUserEl.textContent = currentUser?.name || "User";
  }

  /* =========================
     PAGINATION
  ========================= */
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (page > 1) {
      page--;
      fetchCart();
    }
  });

  document.getElementById("nextPage")?.addEventListener("click", () => {
    page++;
    fetchCart();
  });

  fetchCart();
});

/* =========================
   FETCH CART (MY TEAM)
========================= */
async function fetchCart() {
  try {
    const url = API.buildURL("/sales/my-team/:userId/cart", { userId });

    const res = await API.get(url, {}, { page, limit });

    if (!res?.success) {
      throw new Error("API failed");
    }

    const items = res.data?.items || res.data || [];
    const pagination = res.data?.pagination;

    renderCart(items);
    renderPagination(pagination);

    if (pagination && page > pagination.totalPages) {
      page = pagination.totalPages;
    }
  } catch (e) {
    console.error(e);
    alert("Failed to load cart");
  }
}

/* =========================
   RENDER CART TABLE
========================= */
function renderCart(items = []) {
  const tbody = document.getElementById("cartTable");
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          No cart items found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items
    .map(
      (c) => `
      <tr>
        <td>${c.product?.name || "-"}</td>
        <td>${c.product?.brand || "-"}</td>
        <td>${c.quantity || 1}</td>
        <td>₹${(c.product?.finalPrice ?? c.product?.price ?? 0).toLocaleString(
          "en-IN"
        )}</td>
        <td>
          ${
            c.installmentPlan
              ? `${c.installmentPlan.totalDays} days @ ₹${c.installmentPlan.dailyAmount}`
              : "-"
          }
        </td>
        <td>${
          c.addedAt ? new Date(c.addedAt).toLocaleDateString("en-IN") : "-"
        }</td>
      </tr>
    `
    )
    .join("");
}

/* =========================
   PAGINATION UI
========================= */
function renderPagination(pagination) {
  if (!pagination) return;

  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");

  if (pageInfo) {
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
  }

  if (prevBtn) prevBtn.disabled = pagination.page <= 1;
  if (nextBtn) nextBtn.disabled = pagination.page >= pagination.totalPages;
}
