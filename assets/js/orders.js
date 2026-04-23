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

// 🔥 Store orders for instant access (no extra API call)
let ordersMap = {};
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
let currentPage = 1;
let totalPagesGlobal = 1;
let currentFilter = "ACTIVE";
let searchQuery = "";

function renderPagination({
  containerId,
  currentPage,
  totalPages,
  onPageChange,
}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (totalPages <= 1) return;

  const PAGE_WINDOW = 10;

  const windowStart =
    Math.floor((currentPage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;

  const windowEnd = Math.min(windowStart + PAGE_WINDOW - 1, totalPages);

  let html = `<ul class="pagination justify-content-center mb-0">`;

  // <<
  html += `
    <li class="page-item ${windowStart === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${Math.max(
        windowStart - PAGE_WINDOW,
        1,
      )}">&laquo;</a>
    </li>
  `;

  // <
  html += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage - 1}">
        &lsaquo;
      </a>
    </li>
  `;

  // numbers
  for (let p = windowStart; p <= windowEnd; p++) {
    html += `
      <li class="page-item ${p === currentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${p}">${p}</a>
      </li>
    `;
  }

  // >
  html += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">
        &rsaquo;
      </a>
    </li>
  `;

  // >>
  html += `
    <li class="page-item ${windowEnd === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${Math.min(
        windowEnd + 1,
        totalPages,
      )}">&raquo;</a>
    </li>
  `;

  html += `</ul>`;
  container.innerHTML = html;

  // click events
  container.querySelectorAll("a.page-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();

      const page = parseInt(a.dataset.page);
      if (!page || page < 1 || page > totalPages) return;

      onPageChange(page);
    });
  });
}

/* ===============================
   LOAD ORDER STATS (DASHBOARD API)
   Uses API #19
================================ */
async function loadOrderStats() {
  try {
    const res = await fetch(
      `${INSTALLMENTS_BASE}/admin/orders/dashboard/stats`,
      {
        headers: {
          Authorization: `Bearer ${AUTH.getToken()}`,
          "Content-Type": "application/json",
        },
      },
    );

    const result = await res.json();

    if (!result?.success) {
      console.error("Stats API failed:", result);
      return;
    }

    const orders = result?.data?.orders;

    if (!orders) {
      console.error("Orders data missing:", result);
      return;
    }

    // ✅ Direct assignment (cleaner & safer)
    document.getElementById("totalOrdersCount").innerText = orders.total ?? 0;

    document.getElementById("activeOrdersCount").innerText = orders.active ?? 0;

    document.getElementById("completedOrdersCount").innerText =
      orders.completed ?? 0;

    document.getElementById("cancelledOrdersCount").innerText =
      orders.cancelled ?? 0;

    document.getElementById("pendingDeliveryOrdersCount").innerText =
      orders.pendingDelivery ?? 0;
  } catch (err) {
    console.error("Order stats error:", err);
  }
}
async function loadOrders(page = 1) {
  currentPage = page;

  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center">Loading...</td></tr>`;

  let endpoint = "";

  const baseParams = `page=${page}&limit=10&search=${searchQuery}&fromDate=${window.fromDate || ""}&toDate=${window.toDate || ""}`;

  if (currentFilter === "ACTIVE") {
    endpoint = `/admin/analytics/orders?status=ACTIVE&${baseParams}`;
  }

  if (currentFilter === "COMPLETED") {
    endpoint = `/admin/orders/completed?${baseParams}`;
  }

  if (currentFilter === "SOON") {
    endpoint = `/admin/analytics/orders?status=ACTIVE&completionBucket=1-7-days&${baseParams}`;
  }

  const response = await apiGet(endpoint);

  const payload = response?.data || response;

  if (!payload || !payload.orders) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Failed to load</td></tr>`;
    return;
  }

  const { orders, totalPages } = payload;

  totalPagesGlobal = totalPages || 1;

  tbody.innerHTML = "";

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No orders</td></tr>`;
    return;
  }
  orders.forEach((order) => {
    ordersMap[order.orderId] = order;
  });
  orders.forEach((order) => {
    const user = order.user || {};
    const meta = order.metadata || {};

    let date = "-";

    if (currentFilter === "COMPLETED") {
      date = order.completedAt
        ? new Date(order.completedAt).toLocaleDateString()
        : "-";
    }

    if (currentFilter === "ACTIVE" || currentFilter === "SOON") {
      date = meta.lastDueDate
        ? new Date(meta.lastDueDate).toLocaleDateString()
        : "-";
    }

    const tr = document.createElement("tr");

    tr.innerHTML = `
  <td>${order.orderId}</td>
  <td>
    ${order.user?.name || "Deleted User"}<br>
    <small>${order.user?.phoneNumber || "-"}</small>
  </td>
  <td>${order.productName || order.product?.name || "-"}</td>
  <td>${order.status}</td>
  <td>₹${order.totalPaidAmount || 0}</td>
  <td>${order.lastPaymentDate ? new Date(order.lastPaymentDate).toLocaleDateString() : "-"}</td>
  <td>
    <button class="btn btn-sm btn-outline-primary"
      onclick="viewOrder('${order.orderId}')">
      <i class="bi bi-eye"></i>
    </button>
  </td>
`;

    tbody.appendChild(tr);
  });

  renderPagination({
    containerId: "ordersPagination",
    currentPage: currentPage,
    totalPages: totalPagesGlobal,
    onPageChange: (p) => loadOrders(p),
  });
}
/* ===============================
   VIEW ORDER
================================ */
function viewOrder(orderId) {
  const modalBody = document.getElementById("orderModalBody");

  const order = ordersMap[orderId];

  if (!order) {
    modalBody.innerHTML = `<p class="text-danger">Order not found</p>`;
    return;
  }

  if (!orderModal) {
    console.error("Modal not initialized");
    return;
  }

  orderModal.show();

  modalBody.innerHTML = `
    <div class="row mb-3">
      <div class="col-md-6">
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Total Paid:</strong> ₹${order.totalPaidAmount || 0}</p>
        <p><strong>Remaining:</strong> ₹${order.remainingAmount || 0}</p>
      </div>

      <div class="col-md-6">
        <p><strong>User:</strong> ${order.user?.name || "-"}</p>
        <p><strong>Phone:</strong> ${order.user?.phoneNumber || "-"}</p>
        <p><strong>Product:</strong> ${order.product?.name || "-"}</p>
      </div>
    </div>

    <hr>

    <h6>Installments</h6>
    <ul class="list-group">
      ${
        order.paymentSchedule?.length
          ? order.paymentSchedule
              .map(
                (i) => `
        <li class="list-group-item d-flex justify-content-between">
          <span>Day ${i.installmentNumber}</span>
          <span>₹${i.amount}</span>
          <span class="${i.status === "PAID" ? "text-success" : "text-warning"}">
            ${i.status}
          </span>
        </li>
      `,
              )
              .join("")
          : "<li class='list-group-item'>No installments</li>"
      }
    </ul>
  `;
}

document.getElementById("orderStatusFilter").addEventListener("change", (e) => {
  currentFilter = e.target.value;
  loadOrders(1);
});

let debounceTimer;

const searchInput = document.getElementById("orderSearchInput");

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      loadOrders(1);
    }, 400);
  });
}

const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");

[fromDateInput, toDateInput].forEach((input) => {
  if (!input) return;

  input.addEventListener("change", () => {
    window.fromDate = fromDateInput.value;
    window.toDate = toDateInput.value;

    loadOrders(1);
  });
});

// ===============================
// QUICK DATE PRESETS
// ===============================
const todayBtn = document.getElementById("todayBtn");
const last7DaysBtn = document.getElementById("last7DaysBtn");
const clearDateBtn = document.getElementById("clearDateBtn");

function formatDate(date) {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

// TODAY
todayBtn?.addEventListener("click", () => {
  const today = formatDate(new Date());

  document.getElementById("fromDate").value = today;
  document.getElementById("toDate").value = today;

  window.fromDate = today;
  window.toDate = today;

  loadOrders(1);
});

// LAST 7 DAYS
last7DaysBtn?.addEventListener("click", () => {
  const today = new Date();
  const last7 = new Date();
  last7.setDate(today.getDate() - 6);

  const from = formatDate(last7);
  const to = formatDate(today);

  document.getElementById("fromDate").value = from;
  document.getElementById("toDate").value = to;

  window.fromDate = from;
  window.toDate = to;

  loadOrders(1);
});

// CLEAR
clearDateBtn?.addEventListener("click", () => {
  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";

  window.fromDate = "";
  window.toDate = "";

  loadOrders(1);
});

/* ===============================
   INIT
================================ */
let orderModal; // 🔥 global

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("orderModal");

  if (!modalEl) {
    console.error("Modal not found in DOM");
    return;
  }

  orderModal = new bootstrap.Modal(modalEl);

  loadOrderStats();
  loadOrders(1);
});
