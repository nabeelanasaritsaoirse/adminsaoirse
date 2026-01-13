/**
 * Sales Dashboard JS
 * Read-only dashboard for Sales Team
 */

document.addEventListener("DOMContentLoaded", () => {
  if (!window.AUTH) {
    console.error("AUTH not initialized");
    return;
  }

  const user = AUTH.getCurrentUser();

  if (
    !AUTH.isAuthenticated() ||
    !user ||
    !["sales_team", "admin", "super_admin"].includes(user.role)
  ) {
    AUTH.unauthorizedRedirect();
    return;
  }

  loadSalesDashboardStats();
  loadRecentUsers(); // 👈 ADD THIS
});

/**
 * Fetch sales dashboard statistics
 */
async function loadSalesDashboardStats() {
  try {
    const url = API.buildURL("/sales/my-stats");

    const response = await API.request(url, { method: "GET" });

    if (!response || !response.success) {
      throw new Error("Failed to load dashboard stats");
    }

    const {
      teamStats = {},
      orderStats = {},
      revenueStats = {},
    } = response.data || {};

    setText("totalUsers", teamStats.totalTeamSize || 0);
    setText("activeOrders", orderStats.activeOrders || 0);
    setText("pendingKYC", teamStats.activeMembers || 0);
    setText(
      "totalRevenue",
      "₹" + formatCurrency(revenueStats.totalPaidAmount || 0)
    );
  } catch (err) {
    console.error("Sales dashboard error:", err);
    alert("Failed to load sales dashboard data");
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IN");
}
/**
 * Load top 10 recent users (read-only preview)
 */
async function loadRecentUsers() {
  const tableBody = document.getElementById("recentUsersTable");
  if (!tableBody) return;

  try {
    const response = await API.get(
      "/sales/my-team/users",
      {},
      { page: 1, limit: 10 }
    );

    if (!response?.success || !Array.isArray(response.data?.users)) {
      throw new Error("Invalid users response");
    }

    const users = response.data.users;

    if (users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">
            No users found
          </td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = users
      .map((user) => {
        const name = user.name || "—";
        const emailOrPhone = user.email || user.phoneNumber || "—";
        const wallet = user.wallet?.balance || 0;
        const level = user.level === 1 ? "L1" : "L2";

        return `
          <tr>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(emailOrPhone)}</td>
            <td>₹${formatCurrency(wallet)}</td>
            <td>${level}</td>
            <td class="text-end">
              <a
                href="sales-user-detail.html?id=${user._id}"
                class="btn btn-sm btn-outline-secondary"
                title="View User"
              >
                <i class="bi bi-eye"></i>
              </a>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Failed to load recent users:", err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger py-4">
          Failed to load users
        </td>
      </tr>`;
  }
}

/**
 * Basic XSS safety
 */
function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m])
  );
}
