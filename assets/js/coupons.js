// coupons.js — CREATE + EDIT ONLY (FINAL FIXED)

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("couponForm");
  const alertContainer = document.getElementById("couponAlert");

  if (!form) {
    console.warn("Coupon form not found");
    return;
  }
  // ===============================
  // CANCEL BUTTON HANDLER (RESET TO CREATE MODE)
  // ===============================
  const cancelBtn = document.getElementById("cancelCouponBtn");

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      // Remove ?id= from URL (exit edit mode)
      const url = new URL(window.location.href);
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());

      // Reset form to create mode
      form.reset();
      milestoneFields.style.display = "none";

      showMessage("info", "Switched to Create New Coupon mode");
    });
  }

  // ===============================
  // EDIT MODE DETECTION
  // ===============================
  const urlParams = new URLSearchParams(window.location.search);
  let editingCouponId = urlParams.get("id"); // ?id=COUPON_ID

  // ===============================
  // SHOW/HIDE Milestone Fields
  // ===============================
  const couponTypeInput = document.getElementById("couponType");
  const milestoneFields = document.getElementById("milestoneFields");
  const submitBtn = document.getElementById("submitCouponBtn");

  couponTypeInput.addEventListener("change", () => {
    milestoneFields.style.display =
      couponTypeInput.value === "MILESTONE_REWARD" ? "block" : "none";
  });

  // ===============================
  // LOAD COUPON FOR EDIT
  // ===============================
  if (editingCouponId) {
    loadCouponForEdit(editingCouponId);
    if (submitBtn) submitBtn.textContent = "Update Coupon";
  }

  async function loadCouponForEdit(id) {
    try {
      const token = localStorage.getItem("epi_admin_token");

      const res = await fetch(`${BASE_URL}/coupons/admin/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(await res.text());

      const result = await res.json();
      const coupon =
        result.coupon || result.data?.coupon || result.data || result;

      // Prefill form
      document.getElementById("couponCode").value = coupon.couponCode || "";
      document.getElementById("couponType").value = coupon.couponType || "";
      document.getElementById("discountType").value = coupon.discountType || "";
      document.getElementById("discountValue").value =
        coupon.discountValue || "";
      document.getElementById("minOrderValue").value =
        coupon.minOrderValue || "";
      document.getElementById("expiryDate").value =
        coupon.expiryDate?.split("T")[0] || "";

      // Milestone
      if (coupon.couponType === "MILESTONE_REWARD") {
        milestoneFields.style.display = "block";
        document.getElementById("rewardCondition").value =
          coupon.rewardCondition || "";
        document.getElementById("rewardValue").value = coupon.rewardValue || "";
      }

      showMessage("info", "Editing coupon: " + coupon.couponCode);
    } catch (err) {
      console.error("Load coupon error:", err);
      showMessage("danger", "Failed to load coupon for edit");
    }
  }

  // ===============================
  // CREATE / UPDATE COUPON
  // ===============================
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const couponCode = document.getElementById("couponCode").value.trim();
    const discountType = document.getElementById("discountType").value;
    const discountValue =
      parseFloat(document.getElementById("discountValue").value) || 0;
    const minOrderValue =
      parseFloat(document.getElementById("minOrderValue").value) || 0;
    const expiryDate = document.getElementById("expiryDate").value;

    const couponType = document.getElementById("couponType").value;
    const rewardCondition =
      parseInt(document.getElementById("rewardCondition").value) || null;
    const rewardValue =
      parseInt(document.getElementById("rewardValue").value) || null;

    const payload = {
      couponCode,
      couponType,
      discountType,
      discountValue,
      minOrderValue,
      expiryDate,
    };

    if (couponType === "MILESTONE_REWARD") {
      payload.rewardCondition = rewardCondition;
      payload.rewardValue = rewardValue;
    }

    try {
      const token = localStorage.getItem("epi_admin_token");

      const url = editingCouponId
        ? `${BASE_URL}/coupons/admin/update/${editingCouponId}`
        : `${BASE_URL}/coupons/admin/create`;

      const method = editingCouponId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      showMessage(
        "success",
        editingCouponId
          ? "Coupon updated successfully"
          : "Coupon created successfully",
      );

      // ===============================
      // RESET TO CREATE MODE AFTER SAVE
      // ===============================
      editingCouponId = null;
      form.reset();
      milestoneFields.style.display = "none";
      if (submitBtn) submitBtn.textContent = "Create Coupon";

      // Remove ?id= from URL
      const urlObj = new URL(window.location);
      urlObj.searchParams.delete("id");
      window.history.replaceState({}, "", urlObj);

      // Reload recent list
      loadRecentCoupons();
    } catch (err) {
      console.error("Save coupon error:", err);
      showMessage("danger", "Error saving coupon: " + err.message);
    }
  });

  // ===============================
  // HELPERS
  // ===============================
  window.showMessage = function (type, message, timeout = 3000) {
    const alertContainer = document.getElementById("couponAlert");
    if (!alertContainer) return alert(message);

    alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

    const alertEl = alertContainer.querySelector(".alert");

    // Auto dismiss after timeout (default 3s)
    if (timeout && alertEl) {
      setTimeout(() => {
        // Bootstrap fade out
        alertEl.classList.remove("show");
        alertEl.classList.add("hide");

        // Remove from DOM after animation
        setTimeout(() => {
          if (alertEl.parentNode) {
            alertEl.parentNode.removeChild(alertEl);
          }
        }, 300);
      }, timeout);
    }
  };
});

// ===============================
// LOAD RECENT COUPONS (LAST 10)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadRecentCoupons();
});

async function loadRecentCoupons() {
  const tableBody = document.getElementById("recentCouponsTableBody");
  if (!tableBody) return;

  try {
    const token = localStorage.getItem("epi_admin_token");

    const res = await fetch(`${BASE_URL}/coupons/admin/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to load coupons");

    const result = await res.json();
    const coupons = result.coupons || result.data?.coupons || [];

    // Latest 10 (newest first)
    const recent = coupons.slice(-10).reverse();

    if (recent.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            No coupons found.
          </td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = recent.map(renderRecentCouponRow).join("");

    document
      .querySelectorAll(".btn-edit-coupon")
      .forEach((btn) => btn.addEventListener("click", handleEditCoupon));

    document
      .querySelectorAll(".btn-delete-coupon")
      .forEach((btn) => btn.addEventListener("click", handleDeleteCoupon));
  } catch (err) {
    console.error("Recent coupons error:", err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">
          Failed to load recent coupons
        </td>
      </tr>`;
  }
}

function renderRecentCouponRow(c) {
  return `
    <tr>
      <td><strong>${c.couponCode}</strong></td>
      <td>${c.couponType}</td>
      <td>${c.discountType} ${c.discountValue}</td>
      <td>${c.currentUsageCount || 0} / ${c.maxUsageCount || "∞"}</td>
      <td>${c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : "-"}</td>
      <td>
        <button
          class="btn btn-sm btn-outline-primary btn-edit-coupon"
          data-id="${c._id}"
        >
          Edit
        </button>
        <button
          class="btn btn-sm btn-outline-danger btn-delete-coupon"
          data-id="${c._id}"
        >
          Delete
        </button>
      </td>
    </tr>
  `;
}

// ===============================
// EDIT FROM RECENT LIST
// ===============================
function handleEditCoupon(e) {
  const id = e.currentTarget.dataset.id;
  window.location.href = `coupons.html?id=${id}`;
}

// ===============================
// DELETE FROM RECENT LIST
// ===============================
async function handleDeleteCoupon(e) {
  const id = e.currentTarget.dataset.id;

  if (!confirm("Are you sure you want to delete this coupon?")) return;

  try {
    const token = localStorage.getItem("epi_admin_token");

    const res = await fetch(`${BASE_URL}/coupons/admin/delete/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Delete failed");

    showMessage("success", "Coupon deleted successfully");
    loadRecentCoupons();
  } catch (err) {
    console.error("Delete coupon error:", err);
    showMessage("danger", "Failed to delete coupon");
  }
}
