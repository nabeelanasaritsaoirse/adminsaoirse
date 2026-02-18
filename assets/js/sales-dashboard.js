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
      user = {},
      teamStats = {},
      orderStats = {},
      revenueStats = {},
      commissionStats = {},
      conversionRate = 0,
    } = response.data || {};

    // Team health
    setText(
      "totalUsers",
      `${teamStats.activeMembers || 0} / ${teamStats.totalTeamSize || 0}`,
    );
    const teamHealthCard = document
      .getElementById("totalUsers")
      ?.closest(".card");

    if (teamHealthCard) {
      teamHealthCard.classList.remove(
        "border-danger",
        "border-warning",
        "border-success",
      );

      const healthRatio =
        (teamStats.activeMembers || 0) / (teamStats.totalTeamSize || 1);

      if (healthRatio >= 0.8) {
        teamHealthCard.classList.add("border-success");
      } else if (healthRatio >= 0.5) {
        teamHealthCard.classList.add("border-warning");
      } else {
        teamHealthCard.classList.add("border-danger");
      }
    }

    // Orders health
    setText(
      "activeOrders",
      `${orderStats.completedOrders || 0} / ${orderStats.totalOrders || 0}`,
    );

    // Revenue reality
    setText(
      "totalRevenue",
      `₹${formatCurrency(revenueStats.totalPaidAmount || 0)}`,
    );
    const adjustmentEl = document.getElementById("revenueAdjustment");
    if (adjustmentEl && revenueStats.pendingAmount) {
      adjustmentEl.textContent = `Adjustment: ₹${formatCurrency(
        revenueStats.pendingAmount,
      )}`;

      adjustmentEl.classList.remove("d-none");

      // Visual severity
      if (Math.abs(revenueStats.pendingAmount) <= 10) {
        adjustmentEl.classList.add("text-muted");
      } else {
        adjustmentEl.classList.add("text-danger");
      }
    }

    setText("conversionRate", `${conversionRate || 0}%`);

    const conversionEl = document.getElementById("conversionRate");
    if (conversionEl) {
      conversionEl.classList.add("fw-bold");

      if (conversionRate >= 80) {
        conversionEl.classList.add("text-success");
      } else if (conversionRate >= 50) {
        conversionEl.classList.add("text-warning");
      } else {
        conversionEl.classList.add("text-danger");
      }
    }

    setText(
      "totalCommission",
      `₹${formatCurrency(commissionStats.totalEarned || 0)}`,
    );

    setText(
      "pendingCommission",
      `Pending: ₹${formatCurrency(commissionStats.pendingCommission || 0)}`,
    );
    const usedReferrals =
      (user.referralLimit || 0) - (user.remainingReferrals || 0);

    setText("referralUsage", `${usedReferrals} / ${user.referralLimit || 0}`);

    // Inactive team members
    const inactiveCount =
      (teamStats.totalTeamSize || 0) - (teamStats.activeMembers || 0);

    setText("pendingKYC", inactiveCount);

    // Color logic: 0 inactive = GOOD, >0 = RISK
    const inactiveCard = document
      .getElementById("pendingKYC")
      ?.closest(".card");

    if (inactiveCard) {
      inactiveCard.classList.remove(
        "border-danger",
        "border-secondary",
        "border-success",
      );

      if (inactiveCount === 0) {
        inactiveCard.classList.add("border-success");
      } else {
        inactiveCard.classList.add("border-danger");
      }
    }

    setText(
      "teamBreakdown",
      `L1: ${teamStats.totalL1Members || 0} | L2: ${
        teamStats.totalL2Users || 0
      }`,
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
      { page: 1, limit: 10 },
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
        const joinedDate = new Date(user.createdAt);
        const isNew = Date.now() - joinedDate.getTime() < 24 * 60 * 60 * 1000;

        const totalOrders = user.orderStats?.totalOrders || 0;
        const totalPaid = user.orderStats?.totalPaid || 0;

        let statusBadge = "secondary";
        let statusText = "Dormant";

        if (totalOrders > 0) {
          statusBadge = "success";
          statusText = "Active";
        } else if (isNew) {
          statusBadge = "primary";
          statusText = "New";
        }

        return `
<tr>
  <td>
    <strong>${escapeHtml(name)}</strong><br/>
    <small class="text-muted">${escapeHtml(emailOrPhone)}</small>
  </td>

  <td>
    <small class="text-muted">
      ${joinedDate.toLocaleDateString()}
    </small>
  </td>

  <td>
    <span class="fw-semibold">${totalOrders} orders</span><br/>
    <small class="text-success">₹${formatCurrency(totalPaid)}</small>
  </td>

  <td>
    <span class="badge bg-${statusBadge}">
      ${statusText}
    </span>
  </td>

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
      })[m],
  );
}
