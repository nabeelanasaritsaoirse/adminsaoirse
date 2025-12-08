/**
 * DASHBOARD FETCH + RENDER LOGIC + SEARCH + FILTER + SORT + PAGINATION
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
// FETCH DASHBOARD DATA
// ==========================
async function loadDashboard() {
    try {
        const token = localStorage.getItem("epi_admin_token");
        if (!token) return;

        const res = await fetch(`${BASE_URL}/admin/dashboard-stats`, {
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

        document.getElementById("totalUsers").innerText = stats.users.total;
        document.getElementById("totalRevenue").innerText = "₹" + stats.orders.revenue;
        document.getElementById("totalOrders").innerText = stats.orders.total;
        document.getElementById("pendingOrders").innerText = stats.orders.pending;

        allOrders = stats.recentActivity.orders || [];
        filteredOrders = [...allOrders];

        renderRecentActivity();
        renderPagination();

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

// ==========================
// RENDER ORDERS TABLE
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
// PAGINATION
// ==========================
// ==========================
// PAGINATION (FIXED)
// ==========================
function renderPagination() {
    const container = document.getElementById("recentPagination");
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

    let html = `
        <nav aria-label="Orders Pagination">
            <ul class="pagination justify-content-center">
    `;

    // Previous Button
    html += `
        <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
            <button class="page-link" onclick="goToPage(${Math.max(1, currentPage - 1)})">
                Previous
            </button>
        </li>
    `;

    // Page Numbers (show up to 7 pages, with ellipsis if needed)
    const maxPagesToShow = 7;
    let startPage = 1;
    let endPage = totalPages;

    if (totalPages > maxPagesToShow) {
        const half = Math.floor(maxPagesToShow / 2);
        startPage = Math.max(1, currentPage - half);
        endPage = startPage + maxPagesToShow - 1;
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = endPage - maxPagesToShow + 1;
        }
    }

    if (startPage > 1) {
        html += `
            <li class="page-item">
                <button class="page-link" onclick="goToPage(1)">1</button>
            </li>
            <li class="page-item disabled"><span class="page-link">…</span></li>
        `;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link" onclick="goToPage(${i})">${i}</button>
            </li>
        `;
    }

    if (endPage < totalPages) {
        html += `
            <li class="page-item disabled"><span class="page-link">…</span></li>
            <li class="page-item">
                <button class="page-link" onclick="goToPage(${totalPages})">${totalPages}</button>
            </li>
        `;
    }

    // Next Button
    html += `
        <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
            <button class="page-link" onclick="goToPage(${Math.min(totalPages, currentPage + 1)})">
                Next
            </button>
        </li>
    `;

    html += `
            </ul>
        </nav>
    `;

    container.innerHTML = html;
}


function goToPage(page) {
    currentPage = page;
    renderRecentActivity();
    renderPagination();
}

// ==========================
// STATUS COLOR
// ==========================
function getStatusColor(status) {
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

// ==========================
// SEARCH FUNCTIONALITY
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
// FILTER FUNCTIONALITY
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
// SORT FUNCTIONALITY
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

// Re-apply search + filter + render
function applyFiltersThenRender() {
    handleSort(); // Sorting happens last
    renderRecentActivity();
    renderPagination();
}
