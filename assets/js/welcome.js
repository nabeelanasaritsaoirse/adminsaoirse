/**
 * Welcome Page – Sub Admin Landing
 * --------------------------------
 * - Uses AUTH.getUserModules() as single source of truth
 * - Renders ALL modules (no silent drops)
 * - Known modules → rich cards
 * - Unknown modules → generic cards
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
  if (!user) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          Unable to load user information. Please re-login.
        </div>
      </div>
    `;
    return;
  }

  // ============================
  // SOURCE OF TRUTH
  // ============================
  const modules = AUTH.getUserModules();

  if (!Array.isArray(modules) || modules.length === 0) {
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
  // OPTIONAL RICH META
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
  // RENDER ALL MODULES
  // ============================
  modules
    .filter((key) => key !== "dashboard")
    .forEach((key) => {
      const meta = MODULE_META[key] || {
        icon: "bi-grid",
        title: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        desc: "Manage this module",
        page: "#",
      };

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
        if (meta.page && meta.page !== "#") {
          window.location.href = meta.page;
        }
      };

      container.appendChild(col);
    });
});
