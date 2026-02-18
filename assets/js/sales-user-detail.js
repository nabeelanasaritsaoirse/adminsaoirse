/**
 * Sales User Detail – READ ONLY
 * Scoped to MY TEAM users only
 */

let userId;

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = AUTH.getCurrentUser();

  /* =========================
     RBAC GUARD (UX + SAFETY)
  ========================= */
  const isSales = currentUser?.role === "sales_team";
  const isSuperAdmin = currentUser?.isSuperAdmin === true;
  const hasSalesModule =
    currentUser?.role === "admin" &&
    Array.isArray(currentUser?.modules) &&
    (currentUser.modules.includes("sales-dashboard") ||
      currentUser.modules.includes("users"));

  if (!(isSales || isSuperAdmin || hasSalesModule)) {
    console.warn("Unauthorized access to sales user detail");
    AUTH.unauthorizedRedirect();
    return;
  }

  // ✅ GET userId from URL
  const params = new URLSearchParams(window.location.search);
  userId = params.get("userId") || params.get("id");

  if (!userId) {
    console.error("User ID missing in URL");
    window.location.href = "sales-users.html";
    return;
  }

  const topUser = document.getElementById("topUserName");
  if (topUser) {
    topUser.textContent = currentUser?.name || "User";
  }

  loadUserDetail(userId);
});

/* =========================
   LOAD USER DETAIL (MY TEAM)
========================= */
async function loadUserDetail(uid) {
  try {
    const res = await API.get("/sales/my-team/:userId", { userId: uid });

    if (!res?.success) throw new Error("API failure");

    const data = res.data || {};
    const user = data.user || {};

    const level1Referrals = data.level1Referrals || [];
    const wishlist = data.wishlist || [];
    const cart = data.cart || [];
    const orders = data.recentOrders || [];

    /* USER HEADER */
    setText("uName", user.name || "-");
    setText("uEmail", user.email || "-");
    setText("uRef", user.referralCode || "-");
    setText(
      "uJoined",
      user.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-IN")
        : "-",
    );
    /* LAST LOGIN / LAST ACTIVE */
    const lastActiveEl = document.getElementById("lastActive");
    const lastActiveWrapper = document.getElementById("lastActiveWrapper");

    if (user.lastLogin && lastActiveEl && lastActiveWrapper) {
      const last = new Date(user.lastLogin);
      const now = new Date();

      const diffMs = now - last;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      let text = "just now";

      if (diffDays > 0) {
        text = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      } else if (diffHours > 0) {
        text = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      } else if (diffMinutes > 1) {
        text = `${diffMinutes} minutes ago`;
      }

      lastActiveEl.textContent = text;
      lastActiveWrapper.classList.remove("d-none");
    }

    const statusEl = document.getElementById("uStatus");
    if (statusEl) {
      statusEl.textContent = user.isActive ? "Active" : "Inactive";
      statusEl.className = `badge ${
        user.isActive ? "bg-success" : "bg-danger"
      }`;
    }

    const avatar = document.getElementById("uAvatar");
    if (avatar) {
      avatar.src = user.profilePicture || "https://via.placeholder.com/60";
    }

    const roleBadge = document.getElementById("uRole");
    if (roleBadge) {
      roleBadge.textContent = user.role?.toUpperCase() || "USER";
      roleBadge.className = `badge ms-2 ${
        user.role === "admin"
          ? "bg-primary"
          : user.role === "sales_team"
            ? "bg-warning text-dark"
            : "bg-secondary"
      }`;
    }
    /* USER META */
    setText("metaRole", user.role || "-");
    setText("metaAuth", user.authMethod || "-");

    const emailBadge = document.getElementById("metaEmailVerify");
    if (emailBadge) {
      emailBadge.textContent = user.emailVerified ? "Verified" : "Unverified";
      emailBadge.className = `badge ${
        user.emailVerified ? "bg-success" : "bg-danger"
      }`;
    }

    const phoneBadge = document.getElementById("metaPhoneVerify");
    if (phoneBadge) {
      phoneBadge.textContent = user.phoneVerified ? "Verified" : "Unverified";
      phoneBadge.className = `badge ${
        user.phoneVerified ? "bg-success" : "bg-warning text-dark"
      }`;
    }

    const aadhar = document.getElementById("kycAadhar");
    if (aadhar) {
      aadhar.className = `badge ${
        user.kycDetails?.aadharVerified ? "bg-success" : "bg-secondary"
      }`;
    }

    const pan = document.getElementById("kycPan");
    if (pan) {
      pan.className = `badge ${
        user.kycDetails?.panVerified ? "bg-success" : "bg-secondary"
      }`;
    }
    /* DELETION REQUEST */
    const delBox = document.getElementById("deletionRequestBox");
    const delStatus = document.getElementById("deletionRequestStatus");

    if (user.deletionRequest?.status && delBox && delStatus) {
      delStatus.textContent = user.deletionRequest.status;
      delBox.classList.remove("d-none");
    }
    /* ACCOUNT HEALTH */
    const healthEl = document.getElementById("accountHealth");
    const healthReason = document.getElementById("accountHealthReason");

    if (healthEl && healthReason) {
      let risk = 0;
      const reasons = [];

      if (!user.emailVerified) {
        risk++;
        reasons.push("Email not verified");
      }

      if (!user.kycDetails?.aadharVerified || !user.kycDetails?.panVerified) {
        risk++;
        reasons.push("KYC incomplete");
      }

      if (user.deletionRequest?.status === "pending") {
        risk++;
        reasons.push("Deletion requested");
      }

      let label = "Healthy";
      let color = "bg-success";

      if (risk === 1) {
        label = "Medium Risk";
        color = "bg-warning text-dark";
      } else if (risk >= 2) {
        label = "High Risk";
        color = "bg-danger";
      }

      healthEl.textContent = label;
      healthEl.className = `badge ${color}`;
      healthReason.textContent = reasons.join(" • ");
    }
    /* LAST PAYMENT */
    const lastPaymentEl = document.getElementById("lastPayment");
    if (lastPaymentEl && user.paymentStreak?.lastPaymentDate) {
      lastPaymentEl.textContent = new Date(
        user.paymentStreak.lastPaymentDate,
      ).toLocaleDateString("en-IN");
    }

    /* WALLET */
    setText("wBalance", user.availableBalance || user.wallet?.balance || 0);
    setText("wTotal", user.totalEarnings || 0);
    setText("wCommission", user.wallet?.commissionEarned || 0);
    setText("wHold", user.wallet?.holdBalance || 0);
    setText("paymentStreak", user.paymentStreak?.current || 0);

    /* REFERRALS */
    setText("l1Count", data.referralStats?.level1Count || 0);
    setText("l2Count", data.referralStats?.level2Count || 0);

    /* ORDERS */
    renderOrders(orders);

    /* WISHLIST & CART */
    renderSimpleList("wishlist", wishlist, "name");
    renderSimpleList(
      "cart",
      cart,
      (c) => `${c.productDetails?.name || "-"} ×${c.quantity || 1}`,
    );
  } catch (e) {
    console.error("Failed to load user detail:", e);
    window.location.href = "sales-users.html";
  }
}

/* =========================
   REFERRALS
========================= */
function renderReferrals(level1 = []) {
  const box = document.getElementById("referralTree");
  if (!box) return;

  if (!level1.length) {
    box.innerHTML = "<em>No referrals</em>";
    return;
  }

  box.innerHTML = level1
    .map(
      (l1) => `
        <div>
          <strong>${l1.name || "-"}</strong>
          (${l1.email || "-"}) – L2: ${l1.level2Count || 0}
        </div>`,
    )
    .join("");
}
/* ADDRESS */
const addrBox = document.getElementById("userAddress");
const addr = user.addresses?.find((a) => a.isDefault);

if (addrBox) {
  addrBox.innerHTML = addr
    ? `${addr.addressLine1}, ${addr.city}, ${addr.state} - ${addr.pincode}<br/>
       <small>📞 ${addr.phoneNumber || "-"}</small>`
    : "No address available";
}

/* =========================
   ORDERS
========================= */
function renderOrders(orders = []) {
  const tbody = document.getElementById("ordersTable");
  const summaryEl = document.getElementById("ordersSummary");
  if (!tbody) return;

  /* ===== ORDERS SUMMARY ===== */
  if (summaryEl) {
    if (!orders.length) {
      summaryEl.textContent = "No orders yet";
    } else {
      const totalPaid = orders.reduce(
        (sum, o) => sum + (o.totalPaidAmount || 0),
        0,
      );
      summaryEl.textContent = `${orders.length} order(s) • ₹${totalPaid} paid`;
    }
  }

  /* ===== EMPTY STATE ===== */
  if (!orders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-muted text-center">
          No orders found
        </td>
      </tr>`;
    return;
  }

  /* ===== ORDERS TABLE ===== */
  tbody.innerHTML = orders
    .map((o) => {
      const remaining = (o.totalProductPrice || 0) - (o.totalPaidAmount || 0);

      return `
        <tr>
          <td>${o.orderId || o._id || "-"}</td>
          <td>${o.productName || "-"}</td>
          <td>
            <span class="badge ${
              o.status === "COMPLETED"
                ? "bg-success"
                : o.status === "ACTIVE"
                  ? "bg-warning text-dark"
                  : "bg-secondary"
            }">
              ${o.status || "-"}
            </span>
          </td>
          <td>₹${o.totalPaidAmount || 0}</td>
          <td>₹${remaining > 0 ? remaining : 0}</td>
          <td>-</td>
        </tr>
      `;
    })
    .join("");
}

/* =========================
   GENERIC HELPERS
========================= */
function renderSimpleList(id, items = [], labelFn) {
  const el = document.getElementById(id);
  if (!el) return;

  if (!items.length) {
    el.innerHTML = "<div class='text-muted'>Empty</div>";
    return;
  }

  el.innerHTML = items
    .map(
      (i) => `
      <div class="list-group-item">
        ${typeof labelFn === "function" ? labelFn(i) : i[labelFn] || "-"}
      </div>
    `,
    )
    .join("");
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
