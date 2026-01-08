/**
 * Sales User Orders – Read Only
 * Pagination + Date Filter + CSV Export + Order Detail Modal
 */

let page = 1;
const limit = 10;
let userId = null;
let fromDate = null;
let toDate = null;
let cachedOrders = [];

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  // ✅ SINGLE SOURCE OF TRUTH
  const userId = params.get("id") || params.get("userId");

  if (!userId) {
    alert("User ID missing");
    window.location.href = "sales-users.html";
    return;
  }

  // ✅ Make userId available to other functions (fetchOrders etc.)
  window.userId = userId;

  // Top-right username
  const topUserEl = document.getElementById("topUserName");
  if (topUserEl) {
    topUserEl.textContent = AUTH.getCurrentUser()?.name || "User";
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

  // Initial load
  fetchOrders();
});

/**
 * Fetch orders
 */
async function fetchOrders() {
  try {
    const query = {
      page,
      limit,
    };

    if (fromDate) query.fromDate = fromDate;
    if (toDate) query.toDate = toDate;

    const res = await API.get(`/sales/users/${userId}/orders`, {}, query);

    if (!res.success) {
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
 * Export CSV
 */
function exportOrdersCSV() {
  if (!cachedOrders.length) {
    alert("No orders to export");
    return;
  }

  const headers = [
    "Order ID",
    "Product",
    "Status",
    "Delivery Status",
    "Total Price",
    "Paid Amount",
    "Remaining Amount",
    "Created At",
  ];

  const rows = cachedOrders.map((o) => [
    o.orderId,
    o.productName,
    o.status,
    o.deliveryStatus,
    o.totalProductPrice,
    o.totalPaidAmount,
    o.remainingAmount,
    new Date(o.createdAt).toLocaleString(),
  ]);

  const csvContent = [headers, ...rows]
    .map((r) => r.map(escapeCSV).join(","))
    .join("\n");

  downloadCSV(csvContent, "sales-user-orders.csv");
}

function escapeCSV(value) {
  if (value == null) return "";
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Render orders table
 */
function renderOrders(orders) {
  const tbody = document.getElementById("ordersTable");

  if (!orders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          No orders found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders
    .map(
      (o) => `
      <tr style="cursor:pointer"
          onclick="openOrderDetail('${o._id}')">
        <td>${o.orderId}</td>
        <td>${o.productName}</td>
        <td>${o.status}</td>
        <td>${o.deliveryStatus}</td>
        <td>₹${o.totalProductPrice}</td>
        <td>₹${o.totalPaidAmount}</td>
        <td>₹${o.remainingAmount}</td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
      </tr>
    `
    )
    .join("");
}

/**
 * Pagination UI
 */
function renderPagination(pagination) {
  if (!pagination) return;

  document.getElementById(
    "pageInfo"
  ).textContent = `Page ${pagination.page} of ${pagination.totalPages}`;

  document.getElementById("prevPage").disabled = pagination.page <= 1;

  document.getElementById("nextPage").disabled =
    pagination.page >= pagination.totalPages;
}

/**
 * Order detail modal
 */
async function openOrderDetail(orderId) {
  try {
    const res = await API.get(`/sales/users/${userId}/orders/${orderId}`);

    if (!res.success) {
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

/**
 * Fill modal
 */
function fillOrderModal(data) {
  setText("od_orderId", data.orderId);
  setText("od_status", data.status);
  setText("od_delivery", data.deliveryStatus);

  setText("od_product", `${data.productName} (Qty: ${data.quantity})`);

  setText("od_total", `₹${data.totalProductPrice}`);
  setText("od_paid", `₹${data.totalPaidAmount}`);
  setText("od_remaining", `₹${data.remainingAmount}`);
  setText("od_daily", `₹${data.dailyPaymentAmount}`);

  const tbody = document.getElementById("od_installments");
  const today = new Date().toDateString();

  tbody.innerHTML = (data.installments || [])
    .map((ins, i) => {
      const insDate = new Date(ins.date).toDateString();

      let badge = "bg-secondary";
      if (ins.status === "PAID") badge = "bg-success";
      else if (insDate === today) badge = "bg-warning text-dark";

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${new Date(ins.date).toLocaleDateString()}</td>
          <td>₹${ins.amount}</td>
          <td>
            <span class="badge ${badge}">
              ${ins.status}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "–";
}
