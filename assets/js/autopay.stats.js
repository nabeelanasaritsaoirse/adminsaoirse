// assets/js/autopay.stats.js

async function loadAutopayStats() {
  try {
    console.log("[AUTOPAY] Loading stats...");

    // ✅ Use existing global API wrapper
    const res = await API.get("/installments/admin/autopay/stats");

    const data = res.data;

    // Core numbers
    document.getElementById("autopayUsersCount").textContent =
      data.usersWithAutopay ?? 0;

    document.getElementById("autopayOrdersCount").textContent =
      data.ordersWithAutopay ?? 0;

    // Failed payments (derived from recentActivity)
    const failedCount = (data.recentActivity || []).reduce(
      (sum, item) => sum + (item.failedCount || 0),
      0,
    );

    document.getElementById("autopayFailedCount").textContent = failedCount;

    // Active status (simple logic)
    document.getElementById("autopayActiveStatus").textContent =
      data.usersWithAutopay > 0 ? "Yes" : "No";
  } catch (err) {
    console.error("[AUTOPAY][STATS] Error:", err);
    alert("Failed to load autopay statistics");
  }
}
