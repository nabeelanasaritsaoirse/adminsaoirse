/**
 * Welcome Page – Sub Admin Landing (HARDENED)
 * ------------------------------------------
 * - Sanitizes backend modules
 * - Blocks sales + super admin modules
 * - Prevents redirect loops
 * - Never sends sub-admin to dashboard.html
 */

document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("accessCards");
  if (!container) return;

  // ============================
  // AUTH VALIDATION
  // ============================
  if (!window.AUTH || !AUTH.isAuthenticated()) {
    window.location.href = "login.html";
    return;
  }

  const user = AUTH.getCurrentUser();

  // 🚫 Super Admin should NEVER be here
  if (user.isSuperAdmin === true) {
    window.location.href = "dashboard.html";
    return;
  }

  // 🚫 Sales Team should NEVER be here
  if (user.role === "sales_team") {
    window.location.href = "sales-dashboard.html";
    return;
  }

  // ============================
  // SOURCE OF TRUTH (SANITIZED)
  // ============================
  let modules = AUTH.getUserModules();

  if (!Array.isArray(modules)) modules = [];

  // ⛔ HARD BLOCKED MODULES FOR SUB ADMINS
  const BLOCKED_MODULES = [
    "dashboard",
    "sales-dashboard",
    "admin_management",
    "featured_lists", // 🔒 super admin only in your system
  ];

  modules = modules.filter((m) => !BLOCKED_MODULES.includes(m));

  if (modules.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning">
          No modules assigned to your account.
        </div>
      </div>
    `;
    return;
  }

  // ============================
  // MODULE META
  // ============================
  const MODULE_META = {
    users: {
      icon: "bi-people",
      title: "User Management",
      desc: "View and manage users",
      page: "users.html",
    },
    wallet: {
      icon: "bi-wallet2",
      title: "User Wallets",
      desc: "Manage user wallet balances",
      page: "admin_wallet.html",
    },
    categories: {
      icon: "bi-folder-fill",
      title: "Category Management",
      desc: "Organize product categories",
      page: "categories.html",
    },
    products: {
      icon: "bi-box-seam",
      title: "Product Management",
      desc: "Create and manage products",
      page: "products.html",
    },
    uploader: {
      icon: "bi-image",
      title: "Image Uploader",
      desc: "Upload and manage images",
      page: "uploader.html",
    },
    chat: {
      icon: "bi-chat-dots",
      title: "Chat Management",
      desc: "Manage chat conversations",
      page: "chat.html",
    },
    coupons: {
      icon: "bi-ticket-perforated",
      title: "Coupon Management",
      desc: "Create and manage coupons",
      page: "coupons.html",
    },
  };

  // ============================
  // RENDER SAFE MODULES
  // ============================
  modules.forEach((key) => {
    const meta = MODULE_META[key];

    // 🚫 Unknown modules → do NOT render clickable cards
    if (!meta) {
      console.warn("[WELCOME] Skipping unknown module:", key);
      return;
    }

    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";

    col.innerHTML = `
      <div class="access-card" role="button">
        <div class="access-icon">
          <i class="bi ${meta.icon}"></i>
        </div>
        <div class="access-title">${meta.title}</div>
        <div class="access-desc">${meta.desc}</div>
      </div>
    `;

    col.querySelector(".access-card").onclick = () => {
      window.location.href = meta.page;
    };

    container.appendChild(col);
  });

  console.log("[WELCOME] ✅ Modules rendered safely:", modules);
});
