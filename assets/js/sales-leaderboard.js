/**
 * Sales Leaderboard – MY TEAM
 */

document.addEventListener("DOMContentLoaded", () => {
  const user = AUTH.getCurrentUser();

  if (
    !AUTH.isAuthenticated() ||
    !["sales_team", "admin", "super_admin"].includes(user?.role)
  ) {
    AUTH.unauthorizedRedirect();
    return;
  }

  document.getElementById("period").onchange = fetchLeaderboard;
  document.getElementById("metric").onchange = fetchLeaderboard;

  fetchLeaderboard();
});

async function fetchLeaderboard() {
  try {
    const period = document.getElementById("period").value;
    const metric = document.getElementById("metric").value;

    const res = await API.get("/sales/my-leaderboard", {}, { period, metric });

    if (!res?.success) throw new Error();

    renderLeaderboard(res.data.leaderboard || []);
  } catch {
    alert("Failed to load leaderboard");
  }
}

function renderLeaderboard(rows) {
  const tbody = document.getElementById("leaderboardTable");

  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td>${r.rank}</td>
        <td>${r.user.name}</td>
        <td>${r.metrics.totalOrders}</td>
        <td>₹${r.metrics.totalRevenue.toLocaleString("en-IN")}</td>
        <td>${r.metrics.totalReferrals}</td>
        <td>₹${r.metrics.commissionGenerated.toLocaleString("en-IN")}</td>
      </tr>
    `
    )
    .join("");
}
