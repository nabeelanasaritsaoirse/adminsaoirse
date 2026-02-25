/*********************************
 * ORDERS ADMIN — FINAL VERSION
 * Uses ONLY: /api/installments/admin
 *********************************/

/* ===============================
   AUTH + PERMISSION GUARD
================================ */
(function () {
  const REQUIRED_PERMISSION = "orders";

  if (!window.AUTH || !AUTH.getToken() || !AUTH.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  if (!AUTH.hasModule(REQUIRED_PERMISSION)) {
    alert("Access denied");
    window.location.href = "dashboard.html";
  }
})();

// /* ===============================
//    CONFIG
// ================================ */
// const API_BASE = window.BASE_URL || "https://api.epielio.com/api";
// const INSTALLMENTS_BASE = `${API_BASE}/installments`;

/* ===============================
   FETCH HELPER
================================ */
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${INSTALLMENTS_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${AUTH.getToken()}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  } catch (err) {
    console.error("API ERROR:", err);
    alert(err.message);
    return null;
  }
}
/* ===============================
   PAGINATION STATE
================================ */
let completedCurrentPage = 1;
let completedTotalPages = 1;
let soonCurrentPage = 1;
let soonTotalPages = 1;

let activeCurrentPage = 1;
let activeTotalPages = 1;
/* ===============================
   LOAD COMPLETED ORDERS
================================ */
async function loadCompletedOrders(page = 1) {
  completedCurrentPage = page;

  const tbody = document.getElementById("completedOrdersBody");
  const paginationContainer = document.getElementById("completedPagination");

  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">Loading...</td></tr>`;

  const response = await apiGet(
    `/admin/orders/completed?page=${page}&limit=10`,
  );

  if (!response || !response.data?.orders) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Failed to load orders</td></tr>`;
    return;
  }

  const orders = response.orders || [];
  const pagination = response.pagination || {
    totalPages: 1,
    currentPage: 1,
  };

  completedTotalPages = pagination.totalPages;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No completed orders</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  orders.forEach((order) => {
    const user = order.user || {};

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.orderId}</td>
      <td>
        ${user.name || "Deleted User"}
        <br>
        <small class="text-muted">${user.phoneNumber || "-"}</small>
      </td>
      <td>${order.productName || order.product?.name || "-"}</td>
      <td>₹${order.totalPaidAmount || 0}</td>
      <td>
        ${
          order.completedAt
            ? new Date(order.completedAt).toLocaleDateString()
            : "-"
        }
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary"
          onclick="viewOrder('${order.orderId}')">
          <i class="bi bi-eye"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  renderCompletedPagination();
}

/* ===============================
   LOAD COMPLETING SOON ORDERS
   (USES ANALYTICS API — CORRECT)
================================ */
async function loadCompletingSoonOrders(page = 1) {
  soonCurrentPage = page;

  const tbody = document.getElementById("completingSoonBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-3">Loading...</td></tr>`;

  const response = await apiGet(
    `/admin/analytics/orders?status=ACTIVE&completionBucket=1-7-days&page=${page}&limit=10`,
  );

  if (!response || !response.data?.orders) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center">Failed to load</td></tr>`;
    return;
  }

  const { orders, pagination } = response.data;

  soonTotalPages = pagination?.totalPages || 1;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted text-center">No orders completing soon</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  orders.forEach((order) => {
    const user = order.user || {};
    const meta = order.metadata || {};

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.orderId}</td>
      <td>
        ${user.name || "Deleted User"}<br>
        <small class="text-muted">${user.phoneNumber || "-"}</small>
      </td>
      <td>${order.productName || "-"}</td>
      <td>${meta.remainingInstallments ?? "-"}</td>
      <td>${meta.lastDueDate ? new Date(meta.lastDueDate).toLocaleDateString() : "-"}</td>
      <td>₹${meta.remainingAmount ?? 0}</td>
      <td>
        <span class="badge bg-warning">
          ${meta.daysToComplete ?? "-"} days
        </span>
      </td>
    `;

    tbody.appendChild(tr);
  });

  renderSoonPagination();
}

async function loadActiveOrders(page = 1) {
  activeCurrentPage = page;

  const tbody = document.getElementById("activeOrdersBody");
  const countBox = document.getElementById("activeOrdersCount");

  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">Loading...</td></tr>`;

  const response = await apiGet(
    `/admin/analytics/orders?status=ACTIVE&page=${page}&limit=10`,
  );

  if (!response || !response.data?.orders) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Failed to load</td></tr>`;
    return;
  }

  const { orders, pagination } = response.data;

  activeTotalPages = pagination?.totalPages || 1;

  if (countBox) countBox.innerText = pagination?.totalRecords || 0;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No active orders</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  orders.forEach((order) => {
    const user = order.user || {};
    const meta = order.metadata || {};

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.orderId}</td>
      <td>${user.name || "Deleted User"}</td>
      <td>${order.productName || "-"}</td>
      <td>${meta.paidInstallments}/${meta.totalInstallments}</td>
      <td>₹${meta.remainingAmount ?? 0}</td>
      <td>${meta.lastDueDate ? new Date(meta.lastDueDate).toLocaleDateString() : "-"}</td>
    `;

    tbody.appendChild(tr);
  });

  renderActivePagination();
}

/* ===============================
   LOAD ORDER STATS (DASHBOARD API)
   Uses API #19
================================ */
async function loadOrderStats() {
  try {
    const res = await fetch(
      `${INSTALLMENTS_ADMIN_BASE}/orders/dashboard/stats`,
      {
        headers: {
          Authorization: `Bearer ${AUTH.getToken()}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await res.json();
    if (!result?.success) return;

    // ✅ CORRECT RESPONSE PATH
    const orders = result.data?.orders || {};

    document.getElementById("totalOrdersCount") &&
      (document.getElementById("totalOrdersCount").innerText =
        orders.total ?? 0);

    document.getElementById("activeOrdersCount") &&
      (document.getElementById("activeOrdersCount").innerText =
        orders.active ?? 0);

    document.getElementById("completedOrdersCount") &&
      (document.getElementById("completedOrdersCount").innerText =
        orders.completed ?? 0);

    document.getElementById("cancelledOrdersCount") &&
      (document.getElementById("cancelledOrdersCount").innerText =
        orders.cancelled ?? 0);

    document.getElementById("pendingDeliveryOrdersCount") &&
      (document.getElementById("pendingDeliveryOrdersCount").innerText =
        orders.pendingDelivery ?? 0);
  } catch (err) {
    console.error("Order stats error:", err);
  }
}
function renderCompletedPagination() {
  const container = document.getElementById("completedPagination");
  if (!container) return;

  container.innerHTML = "";

  if (completedTotalPages <= 1) return;

  let html = `<ul class="pagination justify-content-center mt-3">`;

  html += `
    <li class="page-item ${completedCurrentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${completedCurrentPage - 1}">&lsaquo;</a>
    </li>
  `;

  for (let i = 1; i <= completedTotalPages; i++) {
    html += `
      <li class="page-item ${i === completedCurrentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }

  html += `
    <li class="page-item ${
      completedCurrentPage === completedTotalPages ? "disabled" : ""
    }">
      <a class="page-link" href="#" data-page="${completedCurrentPage + 1}">&rsaquo;</a>
    </li>
  `;

  html += `</ul>`;

  container.innerHTML = html;

  container.querySelectorAll("a.page-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const page = parseInt(a.dataset.page);
      if (!page || page < 1 || page > completedTotalPages) return;
      loadCompletedOrders(page);
    });
  });
}
function renderSoonPagination() {
  const container = document.getElementById("completingSoonPagination");
  if (!container) return;

  container.innerHTML = "";

  if (soonTotalPages <= 1) return;

  let html = `<ul class="pagination justify-content-center mt-3">`;

  html += `
    <li class="page-item ${soonCurrentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${soonCurrentPage - 1}">&lsaquo;</a>
    </li>
  `;

  for (let i = 1; i <= soonTotalPages; i++) {
    html += `
      <li class="page-item ${i === soonCurrentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }

  html += `
    <li class="page-item ${
      soonCurrentPage === soonTotalPages ? "disabled" : ""
    }">
      <a class="page-link" href="#" data-page="${soonCurrentPage + 1}">&rsaquo;</a>
    </li>
  `;

  html += `</ul>`;

  container.innerHTML = html;

  container.querySelectorAll("a.page-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const page = parseInt(a.dataset.page);
      if (!page || page < 1 || page > soonTotalPages) return;
      loadCompletingSoonOrders(page);
    });
  });
}
function renderActivePagination() {
  const container = document.getElementById("activePagination");
  if (!container) return;

  container.innerHTML = "";

  if (activeTotalPages <= 1) return;

  let html = `<ul class="pagination justify-content-center mt-3">`;

  html += `
    <li class="page-item ${activeCurrentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${activeCurrentPage - 1}">&lsaquo;</a>
    </li>
  `;

  for (let i = 1; i <= activeTotalPages; i++) {
    html += `
      <li class="page-item ${i === activeCurrentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }

  html += `
    <li class="page-item ${
      activeCurrentPage === activeTotalPages ? "disabled" : ""
    }">
      <a class="page-link" href="#" data-page="${activeCurrentPage + 1}">&rsaquo;</a>
    </li>
  `;

  html += `</ul>`;

  container.innerHTML = html;

  container.querySelectorAll("a.page-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const page = parseInt(a.dataset.page);
      if (!page || page < 1 || page > activeTotalPages) return;
      loadActiveOrders(page);
    });
  });
}
/* ===============================
   VIEW ORDER
================================ */
function viewOrder(orderId) {
  window.location.href = `order-details.html?orderId=${orderId}`;
}

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadOrderStats();
  loadCompletedOrders();
  loadCompletingSoonOrders();
  loadActiveOrders();
});
