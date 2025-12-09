// =========================
// CONFIG
// =========================
const API_BASE = window.API_BASE_URL || "https://api.epielio.com"; // from config.js

const token = localStorage.getItem("epi_admin_token");

if (!token) {
  window.location.href = "login.html";
}

// =========================
// FETCH HELPERS
// =========================
async function apiGet(url) {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");

    return data;
  } catch (err) {
    console.error("API ERROR:", err);
    alert("Error: " + err.message);
    return null;
  }
}

// =========================
// RENDER COMPLETED ORDERS
// =========================
async function loadCompletedOrders() {
  const tbody = document.getElementById("completedOrdersBody");
  tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">Loading...</td></tr>`;

  const response = await apiGet(`${API_BASE}/api/admin/orders/completed`);
  if (!response || !response.orders) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load orders</td></tr>`;
    return;
  }

  const orders = response.orders;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No completed orders</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  orders.forEach(order => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${order.orderId}</td>
      <td>${order.user?.name || "N/A"}<br><small>${order.user?.phoneNumber || "-"}</small></td>
      <td>${order.productName}</td>
      <td>₹${order.totalPaidAmount}</td>
      <td>${new Date(order.completedAt).toLocaleDateString()}</td>

      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="downloadShippingLabel('${order.orderId}')">
          <i class="bi bi-printer"></i> Label
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// =========================
// RENDER COMPLETING SOON ORDERS
// =========================
async function loadCompletingSoonOrders() {
  const tbody = document.getElementById("completingSoonBody");
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-3">Loading...</td></tr>`;

  const response = await apiGet(`${API_BASE}/api/admin/orders/completing-soon`);
  if (!response || !response.orders) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load orders</td></tr>`;
    return;
  }

  const orders = response.orders;

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No orders completing soon</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  orders.forEach(order => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${order.orderId}</td>
      <td>${order.user?.name || "N/A"}<br><small>${order.user?.phoneNumber || "-"}</small></td>
      <td>${order.productName}</td>
      <td>${order.remainingInstallments}</td>
      <td>${new Date(order.lastDueDate).toLocaleDateString()}</td>
      <td>₹${order.remainingAmount}</td>

      <td>
        <button class="btn btn-sm btn-success" onclick="prepareShipping('${order.orderId}')">
          <i class="bi bi-box-arrow-up"></i> Prepare
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// =========================
// DOWNLOAD SHIPPING LABEL
// =========================
async function downloadShippingLabel(orderId) {
  const response = await apiGet(`${API_BASE}/api/admin/orders/${orderId}/shipping-label`);

  if (!response || !response.label) {
    alert("Failed to get label");
    return;
  }

  const label = response.label;

  let text =
    `Order ID: ${label.orderId}\n` +
    `Name: ${label.name}\n` +
    `Phone: ${label.phone}\n` +
    `Product: ${label.productName}\n` +
    `Address:\n${label.address}\n\n` +
    `Total Paid: ₹${label.amountPaid}`;

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `ShippingLabel_${label.orderId}.txt`;
  a.click();

  URL.revokeObjectURL(url);
}

// =========================
// PREPARE SHIPPING (placeholder)
// =========================
function prepareShipping(orderId) {
  alert(`Shipping preparation for Order: ${orderId} (Feature to implement later)`);
}

// =========================
// INITIAL LOAD
// =========================
document.addEventListener("DOMContentLoaded", () => {
  loadCompletedOrders();
  loadCompletingSoonOrders();
});
