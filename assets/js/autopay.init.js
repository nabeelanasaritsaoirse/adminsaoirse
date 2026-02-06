// assets/js/autopay.init.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("[AUTOPAY] Initializing Autopay Admin Page");

  // ===== AUTH GUARD =====
  if (!window.AUTH || !AUTH.isAuthenticated()) {
    alert("Session expired. Please login again.");
    AUTH.unauthorizedRedirect();
    return;
  }

  const user = AUTH.getCurrentUser();

  // Allow only Super Admin OR module access
  if (!user.isSuperAdmin && !AUTH.hasModule("autopay")) {
    alert("Access Denied");
    window.location.href = "welcome.html";
    return;
  }

  // ===== INIT SEQUENCE =====
  try {
    loadAutopayStats();
    loadAutopayUsers();
  } catch (err) {
    console.error("[AUTOPAY][INIT] Initialization failed:", err);
  }
});
