/**
 * Navigation Component (FINAL FIXED VERSION)
 * Fully compatible with your config.js RBAC + file structure
 */

// ===============================
// NAVIGATION CONFIG
// ===============================
const NAV_CONFIG = {
  items: [
    { id: "dashboard", label: "Dashboard", icon: "bi-speedometer2", href: "dashboard.html", hrefFromRoot: "pages/dashboard.html", permission: "dashboard" },
    { id: "users", label: "Users", icon: "bi-people", href: "users.html", hrefFromRoot: "pages/users.html", permission: "users" },
    { id: "wallet", label: "User Wallets", icon: "bi-wallet2", href: "admin_wallet.html", hrefFromRoot: "pages/admin_wallet.html", permission: "wallet" },
    { id: "kyc", label: "KYC Verification", icon: "bi-shield-check", href: "kyc.html", hrefFromRoot: "pages/kyc.html", permission: "kyc" },
    { id: "categories", label: "Categories", icon: "bi-folder-fill", href: "categories.html", hrefFromRoot: "pages/categories.html", permission: "categories" },
    { id: "products", label: "Products", icon: "bi-box-seam", href: "products.html", hrefFromRoot: "pages/products.html", permission: "products" },
    { id: "uploader", label: "Image Uploader", icon: "bi-image", href: "uploader.html", hrefFromRoot: "pages/uploader.html", permission: "uploader" },
    { id: "coupons", label: "Coupons", icon: "bi-ticket-perforated", href: "coupons.html", hrefFromRoot: "pages/coupons.html", permission: "coupons" },
    { id: "orders", label: "Orders", icon: "bi-cart3", href: "#orders", hrefFromRoot: "#orders", permission: "orders" },
    { id: "analytics", label: "Analytics", icon: "bi-graph-up", href: "#analytics", hrefFromRoot: "#analytics", permission: "analytics" },
    { id: "notifications", label: "Notifications", icon: "bi-bell", href: "notifications.html", hrefFromRoot: "pages/notifications.html", permission: "notifications" },
    { id: "chat", label: "Chat Management", icon: "bi-chat-dots", href: "chat.html", hrefFromRoot: "pages/chat.html", permission: "chat" },
    { id: "chat-reports", label: "Chat Reports", icon: "bi-flag", href: "chat-reports.html", hrefFromRoot: "pages/chat-reports.html", permission: "chat-reports" },
    { id: "chat-analytics", label: "Chat Analytics", icon: "bi-bar-chart", href: "chat-analytics.html", hrefFromRoot: "pages/chat-analytics.html", permission: "chat-analytics" },
    { id: "settings", label: "Settings", icon: "bi-gear", href: "settings.html", hrefFromRoot: "pages/settings.html", permission: "settings" },

    // ⭐ Super Admin Only
    { id: "admin_management", label: "Admin Management", icon: "bi-person-gear", href: "admin-management.html", hrefFromRoot: "pages/admin-management.html", permission: "admin_management", superAdminOnly: true }
  ]
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

  // Super admin sees all (except if superAdminOnly is explicitly false)
  if (user.isSuperAdmin === true) return true;

  // SuperAdminOnly → hide from sub-admins
  if (item.superAdminOnly === true && !user.isSuperAdmin) return false;

  // Sub-admin must have permission
  return AUTH.hasModule(item.permission);
}

// ===============================
// FIND ACTIVE ITEM
// ===============================
function getActiveNavItem() {
  const current = window.location.pathname.toLowerCase().split("/").pop();

  return (
    NAV_CONFIG.items.find((item) => {
      const file1 = (item.href || "").toLowerCase();
      const file2 = (item.hrefFromRoot || "").split("/").pop().toLowerCase();
      return current === file1 || current === file2;
    })?.id || "dashboard"
  );
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
                            <a class="nav-link ${item.id === active ? "active" : ""}"
                               data-nav-id="${item.id}"
                               href="${href}">
                                <i class="bi ${item.icon} me-2"></i>${item.label}
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
  if (document.getElementById("sidebar")) {
    renderNavigation();
  }

  // Sidebar toggle
  const toggleBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
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
  getActive: getActiveNavItem
};
