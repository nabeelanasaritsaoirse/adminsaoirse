/**
 * Welcome Page – Sub Admin Landing (NAV_CONFIG DRIVEN)
 * ---------------------------------------------------
 * - NAV_CONFIG = single source of truth
 * - No hardcoded module metadata
 * - RBAC via AUTH.hasModule()
 * - Dashboard never shown to sub-admin
 * - Featured Lists shown if assigned
 */

document.addEventListener("DOMContentLoaded", () => {
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

  // 🚫 Super Admin should NEVER be on welcome
  if (user.isSuperAdmin === true) {
    window.location.href = "dashboard.html";
    return;
  }

  // 🚫 Sales team should NEVER be on welcome
  if (user.role === "sales_team") {
    window.location.href = "sales-dashboard.html";
    return;
  }

  // ============================
  // BUILD MODULE LIST FROM NAV_CONFIG
  // ============================
  const navItems = window.NAV_CONFIG?.items || [];

  const allowedItems = navItems.filter((item) => {
    // ❌ Never show dashboard on welcome
    if (item.id === "dashboard") return false;

    // ❌ Never show sales dashboard to admin
    if (item.id === "sales_dashboard") return false;

    // ❌ Block super-admin-only modules
    if (item.superAdminOnly === true) return false;

    // ❌ Must have permission defined
    if (!item.permission) return false;

    // ✅ Must be allowed by RBAC
    return AUTH.hasModule(item.permission);
  });

  // ============================
  // EMPTY STATE
  // ============================
  if (allowedItems.length === 0) {
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
  // RENDER MODULE CARDS
  // ============================
  allowedItems.forEach((item) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";

    col.innerHTML = `
      <div class="access-card" role="button">
        <div class="access-icon">
          <i class="bi ${item.icon || "bi-grid"}"></i>
        </div>
        <div class="access-title">${item.label}</div>
        <div class="access-desc">
          Manage ${item.label.toLowerCase()}
        </div>
      </div>
    `;

    col.querySelector(".access-card").onclick = () => {
      const href = item.hrefFromRoot || item.href;
      if (href) window.location.href = href;
    };

    container.appendChild(col);
  });

  console.log(
    "[WELCOME] ✅ Modules rendered from NAV_CONFIG:",
    allowedItems.map((i) => i.id)
  );
});
