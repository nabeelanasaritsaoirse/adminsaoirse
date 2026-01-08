/**
 * Welcome Page – Sub Admin Landing (FINAL)
 * ---------------------------------------
 * - NAV_CONFIG = single source of truth
 * - No role-based hacks (NO sales team logic)
 * - RBAC strictly via AUTH.hasModule()
 * - Super Admin redirected to dashboard
 * - Sub Admin sees ONLY assigned modules
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

  // 🚫 Super Admin → Dashboard ONLY
  if (user.isSuperAdmin === true) {
    window.location.href = "dashboard.html";
    return;
  }

  // ============================
  // BUILD MODULE LIST FROM NAV_CONFIG
  // ============================
  const navItems = window.NAV_CONFIG?.items || [];

  const allowedItems = navItems.filter((item) => {
    // ❌ Never show super-admin-only items
    if (item.superAdminOnly === true) return false;

    // ❌ Must have permission defined
    if (!item.permission) return false;

    // ❌ Dashboard is NOT a sub-admin module
    if (item.permission === "dashboard") return false;

    // ✅ STRICT RBAC (single source of truth)
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
    "[WELCOME] ✅ Modules rendered:",
    allowedItems.map((i) => i.permission)
  );
});
