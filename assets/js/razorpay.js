/*************************************************
 * RAZORPAY PAYMENT INTELLIGENCE
 *************************************************/

const PAYMENT_API = {
  ANALYTICS: "/admin/payments/analytics",
  LIST: "/admin/payments/list",
  DETAIL: "/admin/payments",
  REFUND: "/admin/payments",
  SETTLEMENTS: "/admin/payments/settlements",
};

/*************************************************
 * STATE
 *************************************************/
let currentPage = 1;
let currentFilters = {};
let paymentModal;
let refundModal;
let selectedPayment = null;

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  paymentModal = new bootstrap.Modal(
    document.getElementById("paymentDetailModal"),
  );
  refundModal = new bootstrap.Modal(document.getElementById("refundModal"));

  loadAnalytics();
  loadPayments();
  setupFilters();
  loadSettlements();
});

/*************************************************
 * UTILS
 *************************************************/
function formatDate(date) {
  return new Date(date).toLocaleString();
}

function paiseToRupees(value = 0) {
  return `₹${(value / 100).toFixed(2)}`;
}

function statusBadge(status) {
  const map = {
    COMPLETED: "success",
    FAILED: "danger",
    REFUNDED: "warning",
    PENDING: "secondary",
    CANCELLED: "dark",
  };

  return `<span class="badge bg-${map[status] || "secondary"}">${status}</span>`;
}

/*************************************************
 * ANALYTICS
 *************************************************/
async function loadAnalytics() {
  try {
    const res = await API.get(PAYMENT_API.ANALYTICS);

    const d = res.data;

    document.getElementById("analyticsCards").innerHTML = `
      ${card("Total Collected", `₹${d.totalCollected.toLocaleString()}`, "cash")}
      ${card("Razorpay Fees", paiseToRupees(d.totalFees), "credit-card")}
      ${card("GST on Fees", paiseToRupees(d.totalTax), "receipt")}
      ${card("Refunded", paiseToRupees(d.totalRefunded), "arrow-counterclockwise")}
      ${card("Successful Payments", d.completedCount, "check-circle")}
    `;
  } catch (err) {
    console.error(err);
  }
}

function card(title, value, icon) {
  return `
  <div class="col-xl-3 col-md-6 mb-4">
    <div class="card shadow-sm">
      <div class="card-body d-flex justify-content-between">
        <div>
          <div class="text-xs fw-bold text-primary">${title}</div>
          <div class="h5 fw-bold">${value}</div>
        </div>
        <i class="bi bi-${icon} fs-2 text-muted"></i>
      </div>
    </div>
  </div>`;
}

/*************************************************
 * PAYMENTS LIST
 *************************************************/
async function loadPayments(page = 1) {
  try {
    currentPage = page;

    const query = {
      page,
      limit: 20,
      ...currentFilters,
    };

    const res = await API.get(PAYMENT_API.LIST, {}, query);

    renderPayments(res.data);
    renderPagination(res.data);
  } catch (err) {
    console.error(err);
  }
}

function renderPayments(data) {
  const tbody = document.getElementById("paymentsTableBody");

  if (!data.payments.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">No Payments Found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.payments
    .map((p) => {
      return `
      <tr>
        <td>${p.paymentId}</td>
        <td>${formatDate(p.createdAt)}</td>
        <td>${p.user?.name || "-"}</td>
        <td>${p.order?.orderId || "-"}</td>
        <td>₹${p.amount}</td>
        <td>${p.razorpayMethod || p.paymentMethod}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${paiseToRupees(p.razorpayFee)}</td>

        <td>
          <button class="btn btn-sm btn-primary"
            onclick="openPaymentDetail('${p.paymentId}')">
            View
          </button>
        </td>
      </tr>`;
    })
    .join("");
}

/*************************************************
 * PAGINATION
 *************************************************/
function renderPagination(data) {
  const containerId = "paginationContainer";

  let container = document.getElementById(containerId);
  if (!container) return;

  /* Store Global Pagination */
  window.paymentPagination = {
    page: data.page,
    pages: data.totalPages,
    total: data.totalCount,
  };

  const totalPages = window.paymentPagination.pages;
  const currentPage = window.paymentPagination.page;

  container.innerHTML = "";

  if (totalPages <= 1) return;

  const PAGE_WINDOW = 10;

  const windowStart =
    Math.floor((currentPage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;

  const windowEnd = Math.min(windowStart + PAGE_WINDOW - 1, totalPages);

  let html = `<ul class="pagination justify-content-center mb-0">`;

  /* << Jump Back */
  html += `
    <li class="page-item ${windowStart === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${windowStart - PAGE_WINDOW}">
        &laquo;
      </a>
    </li>
  `;

  /* < Previous */
  html += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage - 1}">
        &lsaquo;
      </a>
    </li>
  `;

  /* Page Numbers */
  for (let p = windowStart; p <= windowEnd; p++) {
    html += `
      <li class="page-item ${p === currentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${p}">
          ${p}
        </a>
      </li>
    `;
  }

  /* > Next */
  html += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">
        &rsaquo;
      </a>
    </li>
  `;

  /* >> Jump Forward */
  html += `
    <li class="page-item ${windowEnd === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${windowEnd + 1}">
        &raquo;
      </a>
    </li>
  `;

  html += `</ul>

  <div class="small text-muted text-center mt-2">
    ${window.paymentPagination.total} total payments
  </div>`;

  container.innerHTML = html;

  /******** CLICK EVENTS ********/
  container.querySelectorAll("a.page-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();

      const targetPage = parseInt(a.getAttribute("data-page"), 10);

      if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages)
        return;

      loadPayments(targetPage);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });
}

/*************************************************
 * FILTERS
 *************************************************/
function setupFilters() {
  const debouncedSearch = debounce(applyFilters, 500);

  /* Search typing */
  document
    .getElementById("searchInput")
    .addEventListener("input", debouncedSearch);

  /* Dropdown filters */
  document
    .getElementById("methodFilter")
    .addEventListener("change", applyFilters);

  document
    .getElementById("statusFilter")
    .addEventListener("change", applyFilters);

  document.getElementById("startDate").addEventListener("change", applyFilters);

  document.getElementById("endDate").addEventListener("change", applyFilters);

  /* Search button still works */
  document
    .getElementById("applyFiltersBtn")
    .addEventListener("click", applyFilters);
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.trim();

  const method = document.getElementById("methodFilter").value;

  const status = document.getElementById("statusFilter").value;

  const startDate = document.getElementById("startDate").value;

  const endDate = document.getElementById("endDate").value;

  const filters = {};

  /* ✅ Search (name / email / phone) */
  if (search) filters.search = search;

  /* ✅ Method */
  if (method) filters.method = method;

  /* ✅ Status */
  if (status) filters.status = status;

  /* ✅ Date Conversion → ISO */
  if (startDate) filters.startDate = new Date(startDate).toISOString();

  if (endDate) filters.endDate = new Date(endDate).toISOString();

  currentFilters = filters;

  console.log("Applied Filters:", currentFilters);

  loadPayments(1);
}

/*************************************************
 * PAYMENT DETAIL
 *************************************************/
async function openPaymentDetail(paymentId) {
  try {
    const res = await API.get(`${PAYMENT_API.DETAIL}/${paymentId}`);

    const p = res.data.payment;

    selectedPayment = p;

    const remainingRefund = (p.razorpayAmount - p.razorpayAmountRefunded) / 100;

    const canRefund =
      p.status === "COMPLETED" &&
      p.paymentMethod === "RAZORPAY" &&
      remainingRefund > 0;

    document.getElementById("paymentDetailContent").innerHTML = `
<h6>Payment Info</h6>
<p><b>ID:</b> ${p.paymentId}</p>
<p><b>Status:</b> ${p.status}</p>
<p><b>Amount:</b> ₹${p.amount}</p>

<hr/>

<h6>Customer</h6>
<p>${p.user?.name}</p>
<p>${p.user?.email}</p>
<p>${p.user?.phoneNumber || "-"}</p>

<hr/>

<h6>Razorpay</h6>
<p><b>Payment:</b> ${p.razorpayPaymentId}</p>
<p><b>Method:</b> ${p.razorpayMethod}</p>
<p><b>Fee:</b> ${paiseToRupees(p.razorpayFee)}</p>

${
  canRefund
    ? `
<hr/>
<button class="btn btn-danger"
onclick="openRefundModal(${remainingRefund})">
<i class="bi bi-arrow-counterclockwise"></i>
Initiate Refund
</button>
`
    : ""
}
`;

    paymentModal.show();
  } catch (err) {
    console.error(err);
  }
}

/*************************************************
 * SETTLEMENTS
 *************************************************/
async function loadSettlements() {
  try {
    const res = await API.get(PAYMENT_API.SETTLEMENTS);

    const tbody = document.getElementById("settlementTableBody");

    tbody.innerHTML = res.data.settlements
      .map(
        (s) => `
      <tr>
        <td>${s.id}</td>
        <td>${s.amountInRs}</td>
        <td>${paiseToRupees(s.fees)}</td>
        <td>${paiseToRupees(s.tax)}</td>
        <td>${s.status}</td>
        <td>${s.utr}</td>
        <td>${formatDate(s.createdAt)}</td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}
/*************************************************
 * DEBOUNCE (AUTO SEARCH)
 *************************************************/
function debounce(fn, delay = 500) {
  let timer;

  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
/*************************************************
 * REFUND SYSTEM
 *************************************************/

function openRefundModal(maxAmount) {
  document.getElementById("maxRefundInfo").innerText =
    `Up to ₹${maxAmount.toFixed(2)} refundable`;

  document.getElementById("refundAmount").value = "";
  document.getElementById("refundReason").value = "";

  refundModal.show();
}

async function submitRefund() {
  if (!selectedPayment) return;

  try {
    const amountInput = document.getElementById("refundAmount").value;

    const reason = document.getElementById("refundReason").value;

    const speed = document.getElementById("refundSpeed").value;

    const body = {
      reason,
      speed,
    };

    if (amountInput) {
      body.amount = Math.round(Number(amountInput) * 100); // rupees → paise
    }

    await API.post(
      `${PAYMENT_API.REFUND}/${selectedPayment.paymentId}/refund`,
      body,
    );

    alert("Refund initiated successfully");

    refundModal.hide();
    paymentModal.hide();

    loadPayments(currentPage);
    loadAnalytics();
  } catch (err) {
    alert(err.message || "Refund failed");
    console.error(err);
  }
}
