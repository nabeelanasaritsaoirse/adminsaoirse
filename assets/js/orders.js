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

/* ===============================
   CONFIG
================================ */
const API_BASE = window.BASE_URL || "https://api.epielio.com/api";
const ADMIN_BASE = `${API_BASE}/installments/admin`;

/* ===============================
   FETCH HELPER
================================ */
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${ADMIN_BASE}${endpoint}`, {
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
   LOAD COMPLETED ORDERS
================================ */
async function loadCompletedOrders() {
  const tbody = document.getElementById("completedOrdersBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">Loading...</td></tr>`;

  const response = await apiGet("/orders/completed");
  if (!response || !response.data?.orders) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Failed to load orders</td></tr>`;
    return;
  }

  const orders = response.data.orders;

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
        <small class="text-muted">${user.phone || "-"}</small>
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
          View
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ===============================
   LOAD COMPLETING SOON ORDERS
================================ */
async function loadCompletingSoonOrders() {
  const tbody = document.getElementById("completingSoonBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-3">Loading...</td></tr>`;

  const response = await apiGet("/orders/all?status=ACTIVE");
  if (!response || !response.data?.orders) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger text-center">Failed to load orders</td></tr>`;
    return;
  }

  const orders = response.data.orders.filter((order) => {
    if (order.status !== "ACTIVE") return false;

    const total = order.totalInstallments || 0;
    const paid = order.paidInstallments || 0;
    const remaining = total - paid;

    return remaining > 0 && remaining <= 3;
  });

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted text-center">No orders completing soon</td></tr>`;
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
        <small class="text-muted">${user.phone || "-"}</small>
      </td>

      <td>${order.productName || order.product?.name || "-"}</td>

      <td>${(order.totalInstallments || 0) - (order.paidInstallments || 0)}</td>
      <td>
  ${
    order.lastPaymentDate
      ? new Date(order.lastPaymentDate).toLocaleDateString()
      : "-"
  }
</td>

      <td>₹${order.remainingAmount || 0}</td>

      <td>
        <button class="btn btn-sm btn-success"
          onclick="viewOrder('${order.orderId}')">
          Prepare
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}
async function loadActiveOrders() {
  const tbody = document.getElementById("activeOrdersBody");
  const countBox = document.getElementById("activeOrdersCount");

  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">Loading...</td></tr>`;

  const response = await apiGet("/orders/all?status=ACTIVE");
  if (!response || !response.data?.orders) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Failed to load</td></tr>`;
    return;
  }

  const activeOrders = response.data.orders || [];

  // Update card count
  if (countBox) countBox.innerText = activeOrders.length;

  if (activeOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No active orders</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  activeOrders.forEach((order) => {
    const user = order.user || {};
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${order.orderId}</td>
      <td>${user.name || "Deleted User"}</td>
      <td>${order.productName || "-"}</td>
      <td>
  ${order.paidInstallments}/${
      order.totalInstallments || order.totalDays || "-"
    }</td>
      <td>₹${order.remainingAmount}</td>
      <td>
        ${
          order.lastPaymentDate
            ? new Date(order.lastPaymentDate).toLocaleDateString()
            : "-"
        }
      </td>
    `;

    tbody.appendChild(tr);
  });
}
/* ===============================
   LOAD ORDER STATS (DASHBOARD API)
   Uses API #19
================================ */
async function loadOrderStats() {
  try {
    const res = await fetch(`${ADMIN_BASE}/orders/dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${AUTH.getToken()}`,
        "Content-Type": "application/json",
      },
    });

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
