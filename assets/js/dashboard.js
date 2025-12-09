/**
 * DASHBOARD FETCH + RENDER LOGIC + SEARCH + FILTER + SORT + PAGINATION + NEW WIDGETS
 */

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});

// Global State
let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
const PAGE_SIZE = 10;

// ==========================
// MAIN DASHBOARD FETCH
// ==========================
async function loadDashboard(timeFilter = "default") {
    try {
        const token = localStorage.getItem("epi_admin_token");
        if (!token) return;

        const url =
            timeFilter === "default"
                ? `${BASE_URL}/admin/dashboard-stats`
                : `${BASE_URL}/admin/dashboard-stats?range=${timeFilter}`;

        const res = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await res.json();
        if (!result.success) {
            console.error("Dashboard fetch failed:", result);
            return;
        }

        const stats = result.data;

        /* ------------------------------
           UPDATE MAIN STAT CARDS
        ------------------------------ */
        document.getElementById("totalUsers").innerText = stats.users.total;
        document.getElementById("totalRevenue").innerText = "₹" + stats.orders.revenue;
        document.getElementById("totalOrders").innerText = stats.orders.total;
        document.getElementById("pendingOrders").innerText = stats.orders.pending;

        /* ------------------------------
           TODAY SUMMARY BOX
        ------------------------------ */
        if (stats.orders.today !== undefined)
            document.getElementById("ordersToday").innerText = stats.orders.today;

        if (stats.orders.revenueToday !== undefined)
            document.getElementById("revenueToday").innerText = "₹" + stats.orders.revenueToday;

        if (stats.kyc?.today !== undefined)
            document.getElementById("kycToday").innerText = stats.kyc.today;

        /* ------------------------------
           RECENT USERS
        ------------------------------ */
        renderRecentUsers(stats.recentActivity.users || []);

        /* ------------------------------
           TOP SELLING PRODUCTS
        ------------------------------ */
        renderTopProducts(stats.topProducts || []);

        /* ------------------------------
           RECENT ORDERS TABLE (Existing)
        ------------------------------ */
        allOrders = stats.recentActivity.orders || [];
        filteredOrders = [...allOrders];

        renderRecentActivity();
        renderPagination();

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

// ==========================
// RENDER RECENT USERS
// ==========================
function renderRecentUsers(users) {
    const tbody = document.getElementById("recentUsersTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!users.length) {
        tbody.innerHTML = `
            <tr><td colspan="3" class="text-center py-3">No recent users</td></tr>
        `;
        return;
    }

    users.forEach(user => {
        const date = new Date(user.createdAt).toLocaleString();

        tbody.insertAdjacentHTML(
            "beforeend",
            `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${date}</td>
            </tr>
        `
        );
    });
}

// ==========================
// RENDER TOP PRODUCTS
// ==========================
function renderTopProducts(products) {
    const tbody = document.getElementById("topProductsTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!products.length) {
        tbody.innerHTML = `
            <tr><td colspan="3" class="text-center py-3">No product data available</td></tr>
        `;
        return;
    }

    products.forEach(p => {
        tbody.insertAdjacentHTML(
            "beforeend",
            `
            <tr>
                <td>${p.name}</td>
                <td>${p.totalOrders}</td>
                <td>₹${p.totalRevenue}</td>
            </tr>
        `
        );
    });
}

// ==========================
// TIME FILTER HANDLER
// ==========================
function applyTimeFilter(range) {
    currentPage = 1;
    loadDashboard(range);
}

// ==========================
// EXISTING ORDERS TABLE
// ==========================
function renderRecentActivity() {
    const tbody = document.getElementById("recentActivityTable");
    tbody.innerHTML = "";

    if (!filteredOrders.length) {
        tbody.innerHTML = `
            <tr><td colspan="4" class="text-center py-3">No matching orders found</td></tr>
        `;
        return;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageOrders = filteredOrders.slice(start, start + PAGE_SIZE);

    pageOrders.forEach(order => {
        const user = order.user || {};
        const amount = order.orderAmount || 0;
        const status = order.orderStatus || "N/A";
        const date = new Date(order.createdAt).toLocaleString();

        tbody.insertAdjacentHTML(
            "beforeend",
            `
            <tr>
                <td>
                    ${user.name || "-"}
                    <br><small class="text-muted">${user.email || ""}</small>
                </td>
                <td>₹${amount}</td>
                <td><span class="badge bg-${getStatusColor(status)}">${status}</span></td>
                <td>${date}</td>
            </tr>`
        );
    });
}

// ==========================
// PAGINATION (Existing)
// ==========================
function renderPagination() {
    const container = document.getElementById("recentPagination");
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

    let html = `
        <nav aria-label="Orders Pagination">
            <ul class="pagination justify-content-center">
    `;

    html += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="goToPage(${currentPage - 1})">Previous</button>
        </li>
    `;

    const maxPages = 7;
    let start = Math.max(1, currentPage - 3);
    let end = Math.min(totalPages, start + maxPages - 1);

    if (start > 1) {
        html += `<li class="page-item"><button class="page-link" onclick="goToPage(1)">1</button></li>`;
        html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    }

    for (let i = start; i <= end; i++) {
        html += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link" onclick="goToPage(${i})">${i}</button>
            </li>
        `;
    }

    if (end < totalPages) {
        html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        html += `<li class="page-item"><button class="page-link" onclick="goToPage(${totalPages})">${totalPages}</button></li>`;
    }

    html += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button class="page-link" onclick="goToPage(${currentPage + 1})">Next</button>
        </li>
    `;

    html += `</ul></nav>`;
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderRecentActivity();
    renderPagination();
}

// ==========================
// SEARCH (Existing)
// ==========================
function handleSearch() {
    const search = document.getElementById("searchOrders").value.toLowerCase();

    filteredOrders = allOrders.filter(order => {
        const user = order.user || {};
        return (
            (user.name || "").toLowerCase().includes(search) ||
            (user.email || "").toLowerCase().includes(search) ||
            (order.orderStatus || "").toLowerCase().includes(search) ||
            String(order.orderAmount).includes(search)
        );
    });

    currentPage = 1;
    applyFiltersThenRender();
}

// ==========================
// FILTER (Existing)
// ==========================
function handleStatusFilter() {
    const status = document.getElementById("orderStatusFilter").value;

    filteredOrders = allOrders.filter(order => {
        if (!status) return true;
        return (order.orderStatus || "").toLowerCase() === status.toLowerCase();
    });

    currentPage = 1;
    applyFiltersThenRender();
}

// ==========================
// SORT (Existing)
// ==========================
function handleSort() {
    const sortBy = document.getElementById("orderSort").value;

    if (sortBy === "newest") {
        filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sortBy === "oldest") {
        filteredOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    currentPage = 1;
    renderRecentActivity();
    renderPagination();
}

// ==========================
function applyFiltersThenRender() {
    handleSort();
    renderRecentActivity();
    renderPagination();
}
// ==========================
// STATUS COLOR (Required Function)
// ==========================
function getStatusColor(status) {
    if (!status) return "secondary";

    switch (status.toLowerCase()) {
        case "completed":
        case "paid":
        case "confirmed":
            return "success";

        case "pending":
            return "warning";

        case "processing":
            return "info";

        case "cancelled":
            return "danger";

        default:
            return "secondary";
    }
}

/* ---------------------------------------------------
   LOAD ALL WITHDRAWAL REQUESTS (GLOBAL)
----------------------------------------------------*/
async function loadAllWithdrawals() {
  try {
    const res = await API.get("/admin/wallet/withdrawals", {}, { status: "all", limit: 100, page: 1 });

    if (!res?.success) {
      console.error("Failed to load all withdrawals");
      return;
    }

    const tbody = document.getElementById("withdrawTable");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    const withdrawals = res.withdrawals || [];

    if (!withdrawals.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No withdrawal requests found</td></tr>`;
      return;
    }

    withdrawals.forEach(w => {
      const user = w.user || {};
      const createdAt = new Date(w.createdAt).toLocaleString();
      const amount = `₹ ${w.amount}`;
      const method = (w.paymentMethod || "").toUpperCase();

      const pd = w.paymentDetails || {};
      let details = "-";

      if (w.paymentMethod === "upi" && pd.upiId) {
        details = `UPI: ${pd.upiId}`;
      } else if (w.paymentMethod === "bank_transfer") {
        const bankName = pd.bankName || "";
        const ifsc = pd.ifscCode || "";
        details = `${bankName}${ifsc ? ` • IFSC: ${ifsc}` : ""}`;
      }

      let statusClass = "secondary";
      if (w.status === "pending") statusClass = "warning";
      else if (w.status === "completed") statusClass = "success";
      else if (w.status === "failed") statusClass = "danger";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${createdAt}</td>
        <td>${user.name || "-"}<br><small class="text-muted">${user.email || ""}</small></td>
        <td>${amount}</td>
        <td>${method}</td>
        <td>${details}</td>
        <td><span class="badge bg-${statusClass} text-uppercase">${w.status}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="openWithdrawModal('${w._id}')">View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("WITHDRAWAL LOAD ERROR:", err);
  }
}

/* ---------------------------------------------------
   OPEN WITHDRAWAL DETAILS MODAL
----------------------------------------------------*/
async function openWithdrawModal(id) {
  const modal = new bootstrap.Modal(document.getElementById("withdrawModal"));

  try {
    const res = await API.get("/admin/wallet/withdrawals", {}, { status: "all", limit: 100, page: 1 });

    const w = (res.withdrawals || []).find(x => x._id === id);

    if (!w) {
      alert("Withdrawal not found");
      return;
    }

    const pd = w.paymentDetails || {};
    let detailsHtml = "";

    if (w.paymentMethod === "upi") {
      detailsHtml = `<p><strong>UPI ID:</strong> ${pd.upiId}</p>`;
    } else {
      detailsHtml = `
        <p><strong>Bank:</strong> ${pd.bankName}</p>
        <p><strong>Account Number:</strong> ${pd.accountNumber}</p>
        <p><strong>IFSC:</strong> ${pd.ifscCode}</p>
        <p><strong>Holder Name:</strong> ${pd.accountHolderName}</p>
      `;
    }

    document.getElementById("withdrawModalContent").innerHTML = `
      <h5>${w.user?.name || "User"}</h5>
      <p><strong>Email:</strong> ${w.user?.email || "-"}</p>
      <p><strong>Phone:</strong> ${w.user?.phoneNumber || "-"}</p>

      <hr>

      <p><strong>Amount:</strong> ₹ ${w.amount}</p>
      <p><strong>Method:</strong> ${(w.paymentMethod || "").toUpperCase()}</p>
      <p><strong>Status:</strong> <span class="badge bg-${w.status === "pending" ? "warning" : w.status === "completed" ? "success" : "danger"}">${w.status.toUpperCase()}</span></p>

      <p><strong>Details:</strong></p>
      ${detailsHtml}
    `;

    document.getElementById("modalApproveBtn").onclick = () => approveWithdrawalGlobal(id);
    document.getElementById("modalRejectBtn").onclick = () => rejectWithdrawalGlobal(id);

    modal.show();
  } catch (err) {
    console.error("Error opening modal:", err);
  }
}

/* ---------------------------------------------------
   APPROVE WITHDRAWAL (GLOBAL)
----------------------------------------------------*/
async function approveWithdrawalGlobal(id) {
  const ok = confirm("Are you sure you want to APPROVE this withdrawal?\n\nOnly approve after sending money manually.");
  if (!ok) return;

  try {
    const res = await API.post("/admin/wallet/withdrawals/approve", { transactionId: id });

    if (!res?.success) {
      alert(res?.message || "Failed to approve");
      return;
    }

    alert("Withdrawal approved successfully!");
    
    // Close modal and reload
    const modal = bootstrap.Modal.getInstance(document.getElementById("withdrawModal"));
    modal?.hide();
    
    await loadAllWithdrawals();
  } catch (err) {
    console.error("Approve error:", err);
    alert("Server error");
  }
}

/* ---------------------------------------------------
   REJECT WITHDRAWAL (GLOBAL)
----------------------------------------------------*/
async function rejectWithdrawalGlobal(id) {
  const reason = prompt("Enter rejection reason:");
  if (!reason || !reason.trim()) return;

  try {
    const res = await API.post("/admin/wallet/withdrawals/reject", {
      transactionId: id,
      reason: reason.trim(),
    });

    if (!res?.success) {
      alert(res?.message || "Failed to reject");
      return;
    }

    alert("Withdrawal rejected!");
    
    const modal = bootstrap.Modal.getInstance(document.getElementById("withdrawModal"));
    modal?.hide();
    
    await loadAllWithdrawals();
  } catch (err) {
    console.error("Reject error:", err);
    alert("Server error");
  }
}

// Load all withdrawals when Withdrawal tab is clicked
document.getElementById("withdrawTabBtn")?.addEventListener("click", loadAllWithdrawals);

// Expose functions to global scope
window.openWithdrawModal = openWithdrawModal;
window.loadAllWithdrawals = loadAllWithdrawals;
