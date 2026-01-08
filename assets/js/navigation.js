/**
 * Navigation Component (FINAL FIXED VERSION)
 * Fully compatible with your config.js RBAC + file structure
 */

// ===============================
// NAVIGATION CONFIG
// ===============================
const NAV_CONFIG = {
  items: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "bi-speedometer2",
      href: "dashboard.html",
      hrefFromRoot: "pages/dashboard.html",
      superAdminOnly: true,
    },
    {
      id: "sales_dashboard",
      label: "Sales Dashboard",
      icon: "bi-graph-up-arrow",
      href: "sales-dashboard.html",
      hrefFromRoot: "pages/sales-dashboard.html",
      permission: "sales-dashboard",
    },
    {
      id: "users",
      label: "Users",
      icon: "bi-people",
      href: "users.html",
      hrefFromRoot: "pages/users.html",
      permission: "users",
    },
    {
      id: "users_analytics",
      label: "Users Analytics",
      icon: "bi-graph-up",
      href: "user_analytics.html",
      hrefFromRoot: "pages/user_analytics.html",
      permission: "users_analytics",
    },
    {
      id: "wallet",
      label: "User Wallets",
      icon: "bi-wallet2",
      href: "admin_wallet.html",
      hrefFromRoot: "pages/admin_wallet.html",
      permission: "wallet",
    },
    {
      id: "kyc",
      label: "KYC Verification",
      icon: "bi-shield-check",
      href: "kyc.html",
      hrefFromRoot: "pages/kyc.html",
      permission: "kyc",
    },
    {
      id: "categories",
      label: "Categories",
      icon: "bi-folder-fill",
      href: "categories.html",
      hrefFromRoot: "pages/categories.html",
      permission: "categories",
    },
    {
      id: "products",
      label: "Products",
      icon: "bi-box-seam",
      href: "products.html",
      hrefFromRoot: "pages/products.html",
      permission: "products",
    },
    {
      id: "uploader",
      label: "Image Uploader",
      icon: "bi-image",
      href: "uploader.html",
      hrefFromRoot: "pages/uploader.html",
      permission: "uploader",
    },
    {
      id: "coupons",
      label: "Coupons",
      icon: "bi-ticket-perforated",
      href: "coupons.html",
      hrefFromRoot: "pages/coupons.html",
      permission: "coupons",
    },
    {
      id: "featured_lists",
      label: "Featured Lists",
      icon: "bi-star-fill",
      href: "featured-lists.html",
      hrefFromRoot: "pages/featured-lists.html",
      permission: "featured_lists",
    },
    {
      id: "hard-delete",
      label: "Hard Delete",
      icon: "bi-trash3-fill",
      href: "hard-delete.html",
      permission: "super_admin_only",
      danger: true,
    },
    {
      id: "orders",
      label: "Orders",
      icon: "bi-cart3",
      href: "orders.html",
      hrefFromRoot: "pages/orders.html",
      permission: "orders",
    },
    {
      id: "payments",
      label: "Payments",
      icon: "bi-cash-stack",
      href: "payments.html",
      hrefFromRoot: "pages/payments.html",
      permission: "payments",
    },
    {
      id: "faq_management",
      label: "FAQ Management",
      icon: "bi-question-circle",
      href: "global-faqs.html",
      hrefFromRoot: "pages/global-faqs.html",
      permission: "faq_management",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bi-bell",
      href: "notifications.html",
      hrefFromRoot: "pages/notifications.html",
      permission: "notifications",
    },
    {
      id: "chat",
      label: "Chat Management",
      icon: "bi-chat-dots",
      href: "chat.html",
      hrefFromRoot: "pages/chat.html",
      permission: "chat",
    },
    {
      id: "chat-reports",
      label: "Chat Reports",
      icon: "bi-flag",
      href: "chat-reports.html",
      hrefFromRoot: "pages/chat-reports.html",
      permission: "chat-reports",
    },
    {
      id: "chat-analytics",
      label: "Chat Analytics",
      icon: "bi-bar-chart",
      href: "chat-analytics.html",
      hrefFromRoot: "pages/chat-analytics.html",
      permission: "chat-analytics",
    },
    {
      id: "settings",
      label: "Settings",
      icon: "bi-gear",
      href: "settings.html",
      hrefFromRoot: "pages/settings.html",
      permission: "settings",
    },

    // ⭐ Super Admin Only
    {
      id: "admin_management",
      label: "Admin Management",
      icon: "bi-person-gear",
      href: "admin-management.html",
      hrefFromRoot: "pages/admin-management.html",
      permission: "admin_management",
      superAdminOnly: true,
    },
    {
      id: "sales_team_management",
      label: "Sales Team",
      icon: "bi-people-fill",
      href: "sales-team-management.html",
      hrefFromRoot: "pages/sales-team-management.html",
      superAdminOnly: true,
    },
  ],
};

// ===============================
// PATH HELPERS
// ===============================
function isRootPage() {
  return !window.location.pathname.includes("/pages/");
}

function getNavHref(item) {
  return isRootPage() ? item.hrefFromRoot : item.href;
}

// ===============================
// PERMISSION + SUPER ADMIN CHECK
// ===============================
function canShowItem(item) {
  const user = AUTH.getCurrentUser();
  if (!user) return false;

  // Super admin sees everything
  if (user.isSuperAdmin === true) return true;

  // Special case: Sales Dashboard
  if (item.id === "sales_dashboard") {
    return user.role === "sales_team" || user.isSuperAdmin === true;
  }

  // Block super-admin-only items
  if (item.superAdminOnly === true) return false;

  // Items without permission → hide
  if (!item.permission) return false;

  // Normal RBAC
  return AUTH.hasModule(item.permission);
}

// ===============================
// FIND ACTIVE ITEM
// ===============================
function getActiveNavItem() {
  const currentPath = window.location.pathname.toLowerCase();
  const currentFile = currentPath.split("/").pop();

  // ✅ Welcome page → no active sidebar item
  if (currentFile === "welcome.html") {
    return null;
  }

  // 🔥 Product child pages → keep Products active
  if (
    currentFile === "product-add.html" ||
    currentFile === "product-edit.html"
  ) {
    return "products";
  }

  // 🔎 Normal matching against nav config
  const match = NAV_CONFIG.items.find((item) => {
    const file1 = (item.href || "").toLowerCase();
    const file2 = (item.hrefFromRoot || "").split("/").pop().toLowerCase();

    return currentFile === file1 || currentFile === file2;
  });

  // ✅ Do NOT default to dashboard
  return match ? match.id : null;
}

// ===============================
// RENDER SIDEBAR
// ===============================
function renderNavigation(containerId = "sidebar") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const active = getActiveNavItem();

  const html = `
      <div class="position-sticky pt-3">
          <ul class="nav flex-column">
              ${NAV_CONFIG.items
                .filter(canShowItem)
                .map((item) => {
                  const href = getNavHref(item);
                  return `
                        <li class="nav-item">
                            <a class="nav-link ${
                              active && item.id === active ? "active" : ""
                            }"
                               data-nav-id="${item.id}"
                               href="${href}">
                                <i class="bi ${item.icon} me-2"></i>${
                    item.label
                  }
                            </a>
                        </li>
                    `;
                })
                .join("")}
          </ul>
      </div>
  `;

  container.innerHTML = html;
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");

  // Render sidebar ONLY if sidebar container exists
  // Permission filtering already happens inside renderNavigation()
  if (sidebar && typeof renderNavigation === "function") {
    renderNavigation();
  }

  // Sidebar toggle (unchanged behavior)
  const toggleBtn = document.getElementById("sidebarToggle");
  const main = document.querySelector(".main-content");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      if (main) main.classList.toggle("expanded");
    });
  }
});

// ===============================
// EXPORT
// ===============================
window.Navigation = {
  render: renderNavigation,
  getActive: getActiveNavItem,
};
window.NAV_CONFIG = NAV_CONFIG;
