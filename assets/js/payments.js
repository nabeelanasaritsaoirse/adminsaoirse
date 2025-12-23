/*********************************
 * PAYMENTS ADMIN — FINAL VERSION
 * Uses ONLY: /api/installments/admin
 *********************************/

/* ===============================
   AUTH + PERMISSION GUARD
================================ */
(function () {
  const REQUIRED_PERMISSION = "payments";

  if (!window.AUTH || !AUTH.getToken() || !AUTH.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  // If you don't yet have "payments" module,
  // temporarily allow via orders permission
  if (!AUTH.hasModule(REQUIRED_PERMISSION) && !AUTH.hasModule("orders")) {
    alert("Access denied");
    window.location.href = "dashboard.html";
  }
})();

/*********************************
 * PAYMENTS ADMIN — ADVANCED
 *********************************/

const API_BASE = window.BASE_URL || "https://api.epielio.com/api";
const ADMIN_BASE = `${API_BASE}/installments/admin`;

let ALL_PAYMENTS = [];

/* ===============================
   FETCH
================================ */
async function apiGet(endpoint) {
  const res = await fetch(`${ADMIN_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${AUTH.getToken()}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "API Error");
  return data;
}

/* ===============================
   LOAD PAYMENTS
================================ */
async function loadPayments() {
  const res = await apiGet("/payments/all");
  ALL_PAYMENTS = res.data.payments || [];
  applyFilters();
}

/* ===============================
   FILTER LOGIC
================================ */
function applyFilters() {
  const filter = document.getElementById("dateFilter").value;
  const now = new Date();

  let filtered = ALL_PAYMENTS.filter((p) => {
    const date = new Date(p.createdAt);

    if (filter === "today") {
      return date.toDateString() === now.toDateString();
    }

    if (filter === "month") {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }

    return true;
  });

  renderTable(filtered);
  renderTotals(filtered);
}

/* ===============================
   RENDER TABLE
================================ */
function renderTable(payments) {
  const tbody = document.getElementById("paymentsBody");
  tbody.innerHTML = "";

  if (!payments.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No payments</td></tr>`;
    return;
  }

  payments.forEach((p) => {
    const badge =
      p.status === "COMPLETED"
        ? "success"
        : p.status === "PENDING"
        ? "warning"
        : "danger";

    tbody.innerHTML += `
      <tr>
        <td>${p._id}</td>
        <td>${p.user?.name || "Deleted User"}</td>
        <td>${p.order?.orderId || "-"}</td>
        <td>${p.order?.productName || "-"}</td>
        <td>₹${p.amount}</td>
        <td>${p.paymentMethod}</td>
        <td>#${p.installmentNumber}</td>
        <td><span class="badge bg-${badge}">${p.status}</span></td>
        <td>${new Date(p.createdAt).toLocaleDateString()}</td>
      </tr>
    `;
  });
}

/* ===============================
   TOTALS
================================ */
function renderTotals(payments) {
  let total = 0;
  let wallet = 0;
  let razorpay = 0;

  payments.forEach((p) => {
    if (p.status !== "COMPLETED") return;

    total += p.amount;
    if (p.paymentMethod === "WALLET") wallet += p.amount;
    if (p.paymentMethod === "RAZORPAY") razorpay += p.amount;
  });

  document.getElementById("totalAmount").innerText = `₹${total}`;
  document.getElementById("walletTotal").innerText = `₹${wallet}`;
  document.getElementById("razorpayTotal").innerText = `₹${razorpay}`;
}

/* ===============================
   CSV EXPORT
================================ */
function exportCSV() {
  const rows = [
    [
      "Payment ID",
      "User",
      "Order ID",
      "Product",
      "Amount",
      "Method",
      "Installment",
      "Status",
      "Date",
    ],
  ];

  ALL_PAYMENTS.forEach((p) => {
    rows.push([
      p._id,
      p.user?.name || "Deleted User",
      p.order?.orderId || "",
      p.order?.productName || "",
      p.amount,
      p.paymentMethod,
      p.installmentNumber,
      p.status,
      new Date(p.createdAt).toLocaleDateString(),
    ]);
  });

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "payments.csv";
  a.click();
}

/* ===============================
   INIT
================================ */
document.getElementById("dateFilter").addEventListener("change", applyFilters);
document.addEventListener("DOMContentLoaded", loadPayments);
