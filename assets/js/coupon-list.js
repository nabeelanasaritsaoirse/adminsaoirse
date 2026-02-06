let ALL_COUPONS = [];

document.addEventListener("DOMContentLoaded", () => {
  loadAllCoupons();
});

// ===============================
// LOAD ALL COUPONS (API #4)
// ===============================
async function loadAllCoupons() {
  const tableBody = document.getElementById("couponListTableBody");

  try {
    const token = localStorage.getItem("epi_admin_token");

    const res = await fetch(`${BASE_URL}/coupons/admin/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to load coupons");

    const result = await res.json();
    const coupons = result.data?.coupons || result.coupons || [];

    if (!coupons.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted">
            No coupons found.
          </td>
        </tr>`;
      return;
    }

    ALL_COUPONS = coupons;
    renderCoupons(ALL_COUPONS);

    // Bind buttons
    document.querySelectorAll(".btn-view-usage").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        viewUsage(id);
      }),
    );

    document
      .querySelectorAll(".btn-edit-coupon")
      .forEach((btn) => btn.addEventListener("click", handleEditCoupon));

    document
      .querySelectorAll(".btn-delete-coupon")
      .forEach((btn) => btn.addEventListener("click", handleDeleteCoupon));
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">
          Failed to load coupons
        </td>
      </tr>`;
  }
}
function renderCoupons(list) {
  const tableBody = document.getElementById("couponListTableBody");

  if (!list.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          No coupons found.
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = list.map(renderCouponRow).join("");

  // Re-bind buttons
  document.querySelectorAll(".btn-view-usage").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      viewUsage(id);
    }),
  );

  document
    .querySelectorAll(".btn-edit-coupon")
    .forEach((btn) => btn.addEventListener("click", handleEditCoupon));

  document
    .querySelectorAll(".btn-delete-coupon")
    .forEach((btn) => btn.addEventListener("click", handleDeleteCoupon));

  document
    .querySelectorAll(".btn-view-details")
    .forEach((btn) => btn.addEventListener("click", handleViewDetails));
}

// ===============================
// RENDER ROW
// ===============================
function renderCouponRow(c) {
  const flags = [
    c.firstTimeUserOnly ? "First-Time" : "",
    c.isReferralCoupon ? "Referral" : "",
    c.isPersonalCode ? "Personal" : "",
    c.isWinBackCoupon ? "Win-Back" : "",
    c.isStackable ? "Stackable" : "",
  ]
    .filter(Boolean)
    .join(", ");

  return `
    <tr>
      <td><strong>${c.couponCode}</strong></td>
      <td>${c.couponType}</td>
      <td>${c.discountType} ${c.discountValue}</td>
      <td>${c.currentUsageCount || 0} / ${c.maxUsageCount || "∞"}</td>
      <td>${c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : "-"}</td>
      <td>
        <span class="badge ${c.isActive ? "bg-success" : "bg-secondary"}">
          ${c.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td class="small">${flags || "-"}</td>
      <td>
      <button class="btn btn-sm btn-outline-secondary btn-view-details" data-id="${c._id}">
  View
</button>
        <button class="btn btn-sm btn-outline-info btn-view-usage" data-id="${c._id}">
          Usage
        </button>
        <button class="btn btn-sm btn-outline-primary btn-edit-coupon" data-id="${c._id}">
          Edit
        </button>
        <button class="btn btn-sm btn-outline-danger btn-delete-coupon" data-id="${c._id}">
          Delete
        </button>
      </td>
    </tr>
  `;
}
async function handleViewDetails(e) {
  const id = e.currentTarget.dataset.id;

  const modal = new bootstrap.Modal(
    document.getElementById("couponDetailsModal"),
  );

  try {
    const token = localStorage.getItem("epi_admin_token");

    const res = await fetch(`${BASE_URL}/coupons/admin/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to load coupon details");

    const result = await res.json();
    const coupon = result.data?.coupon || result.coupon;

    // Fill modal fields
    document.getElementById("detailCouponCode").innerText =
      coupon.couponCode || "-";

    document.getElementById("detailCouponType").innerText =
      coupon.couponType || "-";

    document.getElementById("detailDiscount").innerText =
      `${coupon.discountType || "-"} ${coupon.discountValue || ""}`;

    document.getElementById("detailMinOrder").innerText =
      coupon.minOrderValue || "-";

    document.getElementById("detailMaxUsage").innerText =
      coupon.maxUsageCount || "∞";

    document.getElementById("detailUsagePerUser").innerText =
      coupon.maxUsagePerUser || "∞";

    document.getElementById("detailPaymentMethods").innerText =
      (coupon.applicablePaymentMethods || []).join(", ") || "ALL";

    document.getElementById("detailStackable").innerText = coupon.isStackable
      ? "Yes"
      : "No";

    document.getElementById("detailWinBack").innerText = coupon.isWinBackCoupon
      ? "Yes"
      : "No";

    document.getElementById("detailFirstTime").innerText =
      coupon.firstTimeUserOnly ? "Yes" : "No";

    document.getElementById("detailExpiry").innerText = coupon.expiryDate
      ? new Date(coupon.expiryDate).toLocaleDateString()
      : "-";

    document.getElementById("detailStatus").innerText = coupon.isActive
      ? "Active"
      : "Inactive";

    modal.show();
  } catch (err) {
    console.error(err);
    alert("Failed to load coupon details");
  }
}

// VIEW USAGE (API #3)
// ===============================
async function viewUsage(id) {
  const tableBody = document.getElementById("usageHistoryTableBody");
  const alertBox = document.getElementById("usageModalAlert");

  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-muted">
        Loading usage history...
      </td>
    </tr>
  `;
  alertBox.innerHTML = "";

  const modal = new bootstrap.Modal(document.getElementById("usageModal"));
  modal.show();

  try {
    const token = localStorage.getItem("epi_admin_token");

    const res = await fetch(`${BASE_URL}/coupons/admin/usage/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to load usage history");

    const result = await res.json();
    const history = result.data?.usageHistory || [];

    if (!history.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            No usage history found
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = history.map(renderUsageRow).join("");
  } catch (err) {
    console.error("Usage history error:", err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          Failed to load usage history
        </td>
      </tr>
    `;
  }
}

function renderUsageRow(u) {
  return `
    <tr>
      <td>${u.user?.name || "-"}</td>
      <td>${u.user?.email || "-"}</td>
      <td>${u.user?.phoneNumber || "-"}</td>
      <td>${u.orderId?.orderId || "-"}</td>
      <td>${u.orderId?.productName || "-"}</td>
      <td>₹ ${u.discountApplied || 0}</td>
      <td>${new Date(u.usedAt).toLocaleString()}</td>
    </tr>
  `;
}
function applySearchAndFilters() {
  const search =
    document.getElementById("couponSearch")?.value.toLowerCase() || "";
  const status = document.getElementById("filterStatus")?.value || "ALL";
  const type = document.getElementById("filterType")?.value || "ALL";

  let filtered = [...ALL_COUPONS];

  // Search by code
  if (search) {
    filtered = filtered.filter((c) =>
      c.couponCode.toLowerCase().includes(search),
    );
  }

  // Status filter
  if (status === "ACTIVE") {
    filtered = filtered.filter((c) => c.isActive);
  }
  if (status === "INACTIVE") {
    filtered = filtered.filter((c) => !c.isActive);
  }

  // Type filter
  if (type === "REFERRAL") {
    filtered = filtered.filter((c) => c.isReferralCoupon);
  }
  if (type === "PERSONAL") {
    filtered = filtered.filter((c) => c.isPersonalCode);
  }

  renderCoupons(filtered);
}

// ===============================
// EDIT (API #5 via coupons.html)
// ===============================
function handleEditCoupon(e) {
  const id = e.currentTarget.dataset.id;
  window.location.href = `coupons.html?id=${id}`;
}

// ===============================
// DELETE (API #6)
// ===============================
async function handleDeleteCoupon(e) {
  const id = e.currentTarget.dataset.id;

  if (!confirm("Are you sure you want to permanently delete this coupon?"))
    return;

  try {
    const token = localStorage.getItem("epi_admin_token");

    const res = await fetch(`${BASE_URL}/coupons/admin/delete/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Delete failed");

    showMessage("success", "Coupon deleted successfully");
    loadAllCoupons();
  } catch (err) {
    console.error(err);
    showMessage("danger", "Failed to delete coupon");
  }
}
