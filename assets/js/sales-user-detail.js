let userId;

document.addEventListener("DOMContentLoaded", () => {
  // ✅ SET GLOBAL userId (NO const)
  userId = getUserIdFromURL();

  if (!userId) {
    alert("User ID missing");
    window.location.href = "sales-users.html";
    return;
  }

  const topUser = document.getElementById("topUserName");
  if (topUser) {
    topUser.textContent = AUTH.getCurrentUser()?.name || "User";
  }

  loadUserDetail(userId);
});

async function loadUserDetail(uid) {
  try {
    const res = await API.get(API_CONFIG.endpoints.sales.users + `/${uid}`);

    if (!res.success) throw new Error("Failed");

    const { user, level1Referrals, wishlist, cart, orders } = res.data;

    // User info
    setText("uName", user.name);
    setText("uEmail", user.email);
    setText("uPhone", user.phoneNumber || "-");
    setText("uRef", user.referralCode);
    setText("uJoined", new Date(user.createdAt).toLocaleDateString());
    setText("uStatus", user.isActive ? "Active" : "Inactive");

    // Wallet
    setText("wBalance", user.wallet?.balance || 0);
    setText("wHold", user.wallet?.holdBalance || 0);
    setText("wReferral", user.wallet?.referralBonus || 0);
    setText("wCommission", user.wallet?.commissionEarned || 0);

    // Referrals
    setText("l1Count", user.level1Count || 0);
    setText("l2Count", user.level2Count || 0);
    renderReferrals(level1Referrals || []);

    // Orders
    renderOrders(orders || []);

    // Wishlist & Cart
    renderList("wishlist", wishlist || [], "name");
    renderList("cart", cart || [], (c) => `${c.product?.name} x${c.quantity}`);
  } catch (e) {
    console.error(e);
    alert("Failed to load user detail");
  }
}

function renderReferrals(level1) {
  const box = document.getElementById("referralTree");
  box.innerHTML = level1
    .map(
      (l1) =>
        `<div>
          <strong>${l1.name}</strong> (${l1.email}) – L2: ${l1.level2Count}
        </div>`
    )
    .join("");
}

function renderOrders(orders) {
  const tbody = document.getElementById("ordersTable");

  if (!orders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-muted text-center">No orders found</td>
      </tr>`;
    return;
  }

  // ✅ USE GLOBAL userId — DO NOT RE-READ PARAMS
  tbody.innerHTML = orders
    .map(
      (o) => `
      <tr>
        <td>${o.orderId}</td>
        <td>${o.productName}</td>
        <td>${o.status}</td>
        <td>₹${o.totalPaidAmount}</td>
        <td>₹${o.remainingAmount}</td>
        <td>
          <button
            class="btn btn-sm btn-outline-primary"
            onclick="openUserOrders()"
          >
            <i class="bi bi-list"></i>
          </button>
        </td>
      </tr>`
    )
    .join("");
}

function openUserOrders() {
  if (!userId) {
    alert("User ID missing");
    return;
  }
  window.location.href = `sales-user-orders.html?id=${userId}`;
}

function renderList(id, items, field) {
  const el = document.getElementById(id);
  if (!el) return;

  el.innerHTML = items
    .map((i) => `<li>${typeof field === "function" ? field(i) : i[field]}</li>`)
    .join("");
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
