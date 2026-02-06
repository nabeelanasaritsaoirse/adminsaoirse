// assets/js/autopay.user.modal.js

let autopayUserModalInstance = null;
let currentAutopayUserId = null;

/**
 * ENTRY POINT
 */
async function openAutopayUserModal(userId) {
  currentAutopayUserId = userId;

  const modalEl = document.getElementById("autopayUserModal");
  const bodyEl = document.getElementById("autopayUserModalBody");

  if (!modalEl || !bodyEl) {
    alert("Autopay user modal not found in HTML");
    return;
  }

  if (!autopayUserModalInstance) {
    autopayUserModalInstance = new bootstrap.Modal(modalEl);
  }

  bodyEl.innerHTML = "Loading user details...";
  autopayUserModalInstance.show();

  try {
    // ✅ READ FROM FRONTEND CACHE (BACKEND HAS NO USER UPDATE APIs)
    const user =
      window.__AUTOPAY_USERS_MAP__ && window.__AUTOPAY_USERS_MAP__[userId];

    if (!user) {
      throw new Error("User not found in cache");
    }

    renderAutopayUserModal(user);
  } catch (err) {
    console.error("[AUTOPAY][USER MODAL]", err);
    bodyEl.innerHTML = `
      <div class="alert alert-danger">
        Failed to load user details
      </div>
    `;
  }
}

/**
 * RENDER USER DETAILS (READ-ONLY)
 */
function renderAutopayUserModal(user) {
  const bodyEl = document.getElementById("autopayUserModalBody");

  const {
    name,
    email,
    walletBalance,
    autopaySettings = {},
    autopayOrderCount,
  } = user;

  bodyEl.innerHTML = `
    <div class="mb-3">
      <strong>${name}</strong><br />
      <span class="text-muted">${email}</span>
    </div>

    <ul class="list-group mb-3">
      <li class="list-group-item d-flex justify-content-between">
        <span>Wallet Balance</span>
        <strong>₹${walletBalance}</strong>
      </li>
      <li class="list-group-item d-flex justify-content-between">
        <span>Autopay Orders</span>
        <strong>${autopayOrderCount}</strong>
      </li>
    </ul>

    <h6>Autopay Settings</h6>

    <div class="mb-3">
      <label class="form-label">Time Slot</label>
      <select class="form-select" disabled>
        <option selected>
          ${formatTimeSlot(autopaySettings.timePreference)}
        </option>
      </select>
    </div>

    <div class="mb-3">
      <label class="form-label">Low Balance Threshold</label>
      <input
        type="number"
        class="form-control"
        value="${autopaySettings.lowBalanceThreshold || 0}"
        disabled
      />
    </div>

    <div class="mb-3">
      <label class="form-label">Minimum Balance Lock</label>
      <input
        type="number"
        class="form-control"
        value="${autopaySettings.minimumBalanceLock || 0}"
        disabled
      />
    </div>

    <div class="alert alert-info mt-3">
      Autopay settings are managed by the user from the app.
      Admin access is read-only.
    </div>
  `;
}

/**
 * TIME SLOT FORMATTER (REUSED)
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
