/**
 * Common Navigation Component
 * Manages sidebar navigation across all pages
 */

// Navigation configuration
// Navigation configuration
const NAV_CONFIG = {
  items: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "bi-speedometer2",
      href: "dashboard.html",
      hrefFromRoot: "pages/dashboard.html",
      permission: "dashboard",
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
      id: "wallet",
      label: "User Wallets",
      icon: "bi-wallet2",
      href: "admin_wallet.html",
      hrefFromRoot: "pages/admin_wallet.html",
      permission: "wallet",
    },

    /* ⭐ ADDED — KYC VERIFICATION */
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
      id: "orders",
      label: "Orders",
      icon: "bi-cart3",
      href: "#orders",
      hrefFromRoot: "#orders",
      permission: "orders",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "bi-graph-up",
      href: "#analytics",
      hrefFromRoot: "#analytics",
      permission: "analytics",
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

    /* ⭐ ADMIN MANAGEMENT - Super Admin Only */
    {
      id: "admin_management",
      label: "Admin Management",
      icon: "bi-person-gear",
      href: "admin-management.html",
      hrefFromRoot: "pages/admin-management.html",
      permission: "admin_management",
      superAdminOnly: true, // Only visible to super admins
    },
  ],
};

/**
 * Determine if current page is in root or pages folder
 */
function isRootPage() {
  const path = window.location.pathname;
  return !path.includes("/pages/");
}

/**
 * Get the correct href for navigation item
 */
function getNavHref(item) {
  return isRootPage() ? item.hrefFromRoot : item.href;
}

/**
 * Get active navigation item based on current page
 */
function getActiveNavItem() {
  const currentPath = window.location.pathname.toLowerCase();
  const currentPage = currentPath.split("/").pop() || "index.html";

  const cleanPage = currentPage.split("?")[0];

  // Try to find a matching navigation item by filename, href, or id.
  const activeItem = NAV_CONFIG.items.find((item) => {
    // Normalize potential values for comparison
    const hrefFromRootFile = (item.hrefFromRoot || "")
      .split("/")
      .pop()
      .split("?")[0]
      .toLowerCase();
    const hrefFile = (item.href || "")
      .split("/")
      .pop()
      .split("?")[0]
      .toLowerCase();
    const itemId = (item.id || "").toLowerCase();

    // Direct filename match (e.g., 'coupon.html')
    if (cleanPage === hrefFromRootFile || cleanPage === hrefFile) return true;

    // If the nav item uses an anchor (e.g. '#orders'), match when the URL contains the id
    if (hrefFile.startsWith("#") || hrefFromRootFile.startsWith("#")) {
      if (
        currentPath.includes("/" + itemId) ||
        window.location.hash.replace("#", "") === itemId
      )
        return true;
    }

    // Fallback: match by id if page name contains the id (useful for unconventional filenames)
    if (cleanPage.includes(itemId) && itemId.length > 0) return true;

    return false;
  });

  return activeItem ? activeItem.id : "dashboard";
}

/**
 * Render navigation sidebar
 */
function renderNavigation(containerId = "sidebar") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn("Navigation container not found:", containerId);
    return;
  }

  const activeId = getActiveNavItem();

  const navHTML = `
        <div class="position-sticky pt-3">
            <ul class="nav flex-column">
                ${NAV_CONFIG.items
                  .map((item) => {
                    const href = getNavHref(item);
                    const isActive = item.id === activeId;

                    return `
                        <li class="nav-item">
                            <a class="nav-link ${isActive ? "active" : ""}" 
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

            <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                <span>Quick Actions</span>
            </h6>
            <ul class="nav flex-column mb-2">
                <li class="nav-item">
                    <a class="nav-link" href="#">
                        <i class="bi bi-file-earmark-plus me-2"></i>Add New
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">
                        <i class="bi bi-download me-2"></i>Reports
                    </a>
                </li>
            </ul>
        </div>
    `;

  container.innerHTML = navHTML;
}

/**
 * Initialize navigation on page load
 */
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("sidebar")) {
    renderNavigation("sidebar");
  }
});

/**
 * Update active navigation item
 */
function updateActiveNav(itemId) {
  const navLinks = document.querySelectorAll("#sidebar .nav-link");
  navLinks.forEach((link) => {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(
    `#sidebar .nav-link[data-nav-id="${itemId}"]`
  );
  if (activeLink) {
    activeLink.classList.add("active");
  }
}

/* ⭐ SIDEBAR TOGGLE RE-ADDED */
document.addEventListener("DOMContentLoaded", function () {
  const toggleBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const main = document.querySelector(".main-content");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      if (main) {
        main.classList.toggle("expanded");
      }
    });
  }
});

// Export functions
if (typeof window !== "undefined") {
  window.Navigation = {
    render: renderNavigation,
    updateActive: updateActiveNav,
    getActive: getActiveNavItem,
    config: NAV_CONFIG,
  };
}
