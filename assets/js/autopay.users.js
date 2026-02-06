// assets/js/autopay.users.js

// ✅ GLOBAL CACHE (single source of truth)
window.__AUTOPAY_USERS_MAP__ = {};

async function loadAutopayUsers() {
  try {
    console.log("[AUTOPAY] Loading users...");

    const res = await API.get("/installments/admin/autopay/users");

    const tbody = document.getElementById("autopayUsersTable");
    tbody.innerHTML = "";

    const users = res.data.users || [];

    // 🔥 RESET CACHE
    window.__AUTOPAY_USERS_MAP__ = {};

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            No users have enabled autopay
          </td>
        </tr>
      `;
      return;
    }

    users.forEach((user) => {
      const {
        _id,
        name,
        email,
        autopaySettings,
        walletBalance,
        autopayOrderCount,
      } = user;

      // ✅ CACHE USER BY ID
      window.__AUTOPAY_USERS_MAP__[_id] = user;

      const lowBalance =
        walletBalance < (autopaySettings?.lowBalanceThreshold || 0);

      const balanceClass = lowBalance ? "text-danger fw-bold" : "text-success";

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${name}</td>
        <td>${email}</td>
        <td>${formatTimeSlot(autopaySettings?.timePreference)}</td>
        <td class="${balanceClass}">
          ₹${walletBalance}
        </td>
        <td>
          <span class="badge bg-info">${autopayOrderCount}</span>
        </td>
        <td>
          <button
            class="btn btn-sm btn-primary"
            onclick="handleViewUser('${_id}')"
          >
            View
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("[AUTOPAY][USERS] Error:", err);
    alert("Failed to load autopay users");
  }
}

/**
 * Helpers
 */
function formatTimeSlot(slot) {
  switch (slot) {
    case "MORNING_6AM":
      return "Morning (6 AM)";
    case "AFTERNOON_12PM":
      return "Afternoon (12 PM)";
    case "EVENING_6PM":
      return "Evening (6 PM)";
    default:
      return "-";
  }
}

function handleViewUser(userId) {
  openAutopayUserModal(userId);
}
