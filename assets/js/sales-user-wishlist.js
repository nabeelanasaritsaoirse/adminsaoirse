/**
 * Sales User Wishlist – Read Only
 * Scoped to MY TEAM users only
 */

let page = 1;
const limit = 10;
let userId = null;

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     RBAC GUARD (MANDATORY)
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

  // Expose globally (consistency with other pages)
  window.userId = userId;

  /* =========================
     TOP USER NAME
  ========================= */
  const topUserEl = document.getElementById("topUserName");
  if (topUserEl) {
    topUserEl.textContent = currentUser?.name || "User";
  }

  /* =========================
     PAGINATION CONTROLS
  ========================= */
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (page > 1) {
      page--;
      fetchWishlist();
    }
  });

  document.getElementById("nextPage")?.addEventListener("click", () => {
    page++;
    fetchWishlist();
  });

  fetchWishlist();
});

/* =========================
   FETCH WISHLIST (MY TEAM)
========================= */
async function fetchWishlist() {
  try {
    const url = API.buildURL("/sales/my-team/:userId/wishlist", { userId });

    const res = await API.get(url, {}, { page, limit });

    if (!res?.success) {
      throw new Error("API failed");
    }

    const items = res.data?.items || res.data || [];
    const pagination = res.data?.pagination;

    renderWishlist(items);
    renderPagination(pagination);

    // Safety: prevent page overflow
    if (pagination && page > pagination.totalPages) {
      page = pagination.totalPages;
    }
  } catch (e) {
    console.error(e);
    alert("Failed to load wishlist");
  }
}

/* =========================
   RENDER WISHLIST TABLE
========================= */
function renderWishlist(items = []) {
  const tbody = document.getElementById("wishlistTable");
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          No wishlist items found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items
    .map(
      (p) => `
      <tr>
        <td>${p.name || "-"}</td>
        <td>${p.brand || "-"}</td>
        <td>₹${(p.price || 0).toLocaleString("en-IN")}</td>
        <td>₹${(p.finalPrice ?? p.price ?? 0).toLocaleString("en-IN")}</td>
        <td>${p.stock ?? "-"}</td>
        <td>
          <span class="badge ${p.isActive ? "bg-success" : "bg-secondary"}">
            ${p.isActive ? "Active" : "Inactive"}
          </span>
        </td>
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

  if (prevBtn) {
    prevBtn.disabled = pagination.page <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = pagination.page >= pagination.totalPages;
  }
}
