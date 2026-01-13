/**
 * Sales User Orders – Read Only
 * Scoped to MY TEAM users
 */

let page = 1;
const limit = 10;
let userId = null;
let fromDate = null;
let toDate = null;
let cachedOrders = [];

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

  const params = new URLSearchParams(window.location.search);

  userId = params.get("id") || params.get("userId");

  if (!userId) {
    alert("User ID missing");
    window.location.href = "sales-users.html";
    return;
  }

  // Expose globally (used in modal)
  window.userId = userId;

  // Top-right username
  const topUserEl = document.getElementById("topUserName");
  if (topUserEl) {
    topUserEl.textContent = currentUser?.name || "User";
  }

  // Filters
  const applyBtn = document.getElementById("applyFilters");
  if (applyBtn) {
    applyBtn.addEventListener("click", applyDateFilter);
  }

  // Pagination
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (page > 1) {
        page--;
        fetchOrders();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      page++;
      fetchOrders();
    });
  }

  fetchOrders();
});

/**
 * Fetch orders (MY TEAM)
 */
async function fetchOrders() {
  try {
    const query = { page, limit };
    if (fromDate) query.fromDate = fromDate;
    if (toDate) query.toDate = toDate;

    const res = await API.get(
      "/sales/my-team/:userId/orders",
      { userId },
      query
    );

    if (!res?.success) {
      throw new Error("API failed");
    }

    cachedOrders = res.data.orders || [];

    renderOrders(cachedOrders);
    renderPagination(res.data.pagination);
  } catch (e) {
    console.error(e);
    alert("Failed to fetch user orders");
  }
}

/**
 * Apply date filter
 */
function applyDateFilter() {
  fromDate = document.getElementById("fromDate")?.value || null;
  toDate = document.getElementById("toDate")?.value || null;

  if (fromDate && toDate && fromDate > toDate) {
    alert("From date cannot be after To date");
    return;
  }

  page = 1;
  fetchOrders();
}

/**
 * Order detail modal (MY TEAM)
 */
async function openOrderDetail(orderId) {
  try {
    const res = await API.get("/sales/my-team/:userId/orders/:orderId", {
      userId,
      orderId,
    });

    if (!res?.success) {
      throw new Error("Failed to fetch order detail");
    }

    fillOrderModal(res.data);

    const modal = new bootstrap.Modal(
      document.getElementById("orderDetailModal")
    );
    modal.show();
  } catch (e) {
    console.error(e);
    alert("Failed to load order detail");
  }
}
