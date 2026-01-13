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
    const orders = data.orders || [];

    /* USER INFO */
    setText("uName", user.name || "-");
    setText("uEmail", user.email || "-");
    setText("uPhone", user.phoneNumber || "-");
    setText("uRef", user.referralCode || "-");
    setText(
      "uJoined",
      user.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-IN")
        : "-"
    );
    setText("uStatus", user.isActive === true ? "Active" : "Inactive");

    /* WALLET */
    setText("wBalance", user.wallet?.balance || 0);
    setText("wHold", user.wallet?.holdBalance || 0);
    setText("wReferral", user.wallet?.referralBonus || 0);
    setText("wCommission", user.wallet?.commissionEarned || 0);

    /* REFERRALS */
    setText("l1Count", user.level1Count || 0);
    setText("l2Count", user.level2Count || 0);
    renderReferrals(level1Referrals);

    /* ORDERS */
    renderOrders(orders);

    /* WISHLIST & CART */
    renderList("wishlist", wishlist, "name");
    renderList(
      "cart",
      cart,
      (c) => `${c.productDetails?.name || "-"} x${c.quantity || 1}`
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
        </div>`
    )
    .join("");
}

/* =========================
   ORDERS
========================= */
function renderOrders(orders = []) {
  const tbody = document.getElementById("ordersTable");
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-muted text-center">
          No orders found
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = orders
    .map(
      (o) => `
      <tr>
        <td>${o.orderId || o._id || "-"}</td>
        <td>${o.productName || "-"}</td>
        <td>${o.status || "-"}</td>
        <td>₹${o.totalPaidAmount || 0}</td>
        <td>₹${o.remainingAmount || 0}</td>
        <td>-</td>
      </tr>`
    )
    .join("");
}

/* =========================
   GENERIC HELPERS
========================= */
function renderList(id, items = [], field) {
  const el = document.getElementById(id);
  if (!el) return;

  el.innerHTML = items.length
    ? items
        .map(
          (i) =>
            `<li>${
              typeof field === "function" ? field(i) : i[field] || "-"
            }</li>`
        )
        .join("")
    : "<li class='text-muted'>Empty</li>";
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
