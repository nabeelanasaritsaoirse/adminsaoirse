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

let CURRENT_FILTER = "today";
let CUSTOM_RANGE = null;

const dateFilterEl = document.getElementById("dateFilter");
const startDateEl = document.getElementById("startDate");
const endDateEl = document.getElementById("endDate");
const applyBtn = document.getElementById("applyCustomFilter");

// ✅ Use globals from config.js
const ADMIN_BASE = `${window.BASE_URL}/installments/admin`;

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
async function loadPayments(filter = "today", customRange = null) {
  const range = getDateRange(filter, customRange);
  const startDate = range.startDate;
  const endDate = range.endDate;

  const res = await apiGet(
    `/payments/all?status=COMPLETED&startDate=${startDate}&endDate=${endDate}`
  );

  ALL_PAYMENTS = (res.data.payments || []).filter(
    (p) =>
      p.completedAt &&
      new Date(p.completedAt) >= new Date(startDate) &&
      new Date(p.completedAt) <= new Date(endDate)
  );

  renderTable(ALL_PAYMENTS);
  renderTotals(ALL_PAYMENTS);
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
        <td>${p.paymentId || "-"}</td>
        <td>${p.user?.name || "Deleted User"}</td>
        <td>${p.order?.orderId || "-"}</td>
        <td>${p.order?.productName || "-"}</td>
        <td>₹${p.amount}</td>
        <td>${p.paymentMethod}</td>
        <td>#${p.installmentNumber}</td>
        <td><span class="badge bg-${badge}">${p.status}</span></td>
        <td>
  ${p.completedAt ? new Date(p.completedAt).toLocaleDateString() : "-"}
</td>
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

  const totalEl = document.getElementById("totalAmount");
  if (totalEl) totalEl.innerText = `₹${total}`;

  const walletEl = document.getElementById("walletTotal");
  if (walletEl) walletEl.innerText = `₹${wallet}`;

  const razorpayEl = document.getElementById("razorpayTotal");
  if (razorpayEl) razorpayEl.innerText = `₹${razorpay}`;
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
      p.paymentId || "",
      p.user?.name || "Deleted User",
      p.order?.orderId || "",
      p.order?.productName || "",
      p.amount,
      p.paymentMethod,
      p.installmentNumber,
      p.status,
      p.completedAt ? new Date(p.completedAt).toLocaleDateString() : "",
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
function getDateRange(filter, custom = null) {
  let start, end;

  if (filter === "custom" && custom) {
    return {
      startDate: custom.startDate,
      endDate: custom.endDate,
    };
  }

  end = new Date();
  start = new Date();

  // 🔥 VERY IMPORTANT
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today":
      break;

    case "7d":
      start.setDate(end.getDate() - 6);
      break;

    case "1m":
      start.setMonth(end.getMonth() - 1);
      break;

    case "3m":
      start.setMonth(end.getMonth() - 3);
      break;

    case "6m":
      start.setMonth(end.getMonth() - 6);
      break;
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

async function loadPaymentStats(filter = "today", customRange = null) {
  try {
    const range = getDateRange(filter, customRange);
    const startDate = range.startDate;
    const endDate = range.endDate;

    const res = await fetch(
      `${ADMIN_BASE}/analytics/revenue?startDate=${startDate}&endDate=${endDate}&groupBy=day`,
      {
        headers: {
          Authorization: `Bearer ${AUTH.getToken()}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = await res.json();
    if (!result?.success || !result.data) return;

    const data = result.data;

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    };

    set("totalPaymentsCount", data.totalPayments ?? 0);
    set("totalPaymentAmount", `₹${data.totalRevenue ?? 0}`);
    set("paymentsTodayAmount", `₹${data.totalRevenue ?? 0}`);
    set("totalRevenueAmount", `₹${data.totalRevenue ?? 0}`);
    set("revenueThisMonthAmount", `₹${data.totalRevenue ?? 0}`);
    set("revenueThisWeekAmount", `₹${data.totalRevenue ?? 0}`);
  } catch (err) {
    console.error("Payment stats error:", err);
  }
}

dateFilterEl.addEventListener("change", () => {
  CURRENT_FILTER = dateFilterEl.value;
  CUSTOM_RANGE = null;

  if (CURRENT_FILTER === "custom") {
    startDateEl.classList.remove("d-none");
    endDateEl.classList.remove("d-none");
    applyBtn.classList.remove("d-none");
    return;
  }

  startDateEl.classList.add("d-none");
  endDateEl.classList.add("d-none");
  applyBtn.classList.add("d-none");

  refreshPaymentsUI();
});

applyBtn.addEventListener("click", () => {
  if (!startDateEl.value || !endDateEl.value) {
    alert("Select both start and end dates");
    return;
  }

  CURRENT_FILTER = "custom";
  CUSTOM_RANGE = {
    startDate: startDateEl.value,
    endDate: endDateEl.value,
  };

  refreshPaymentsUI();
});
async function refreshPaymentsUI() {
  await loadPaymentStats(CURRENT_FILTER, CUSTOM_RANGE);
  await loadPayments(CURRENT_FILTER, CUSTOM_RANGE);
}

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  CURRENT_FILTER = dateFilterEl.value || "today";
  refreshPaymentsUI();
});
