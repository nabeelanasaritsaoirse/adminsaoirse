// assets/js/autopay.streak.js

document.addEventListener("DOMContentLoaded", () => {
  loadStreakConfig();
  loadStreakStats();
});

async function loadStreakConfig() {
  try {
    const res = await API.get("/installments/admin/streak/config");
    renderStreakConfig(res.data);
  } catch (err) {
    console.error("[STREAK] Config load failed:", err);
    showStreakError?.(err.message);
  }
}

function renderStreakConfig(data) {
  const banner = document.getElementById("streakStatusBanner");
  if (!banner) return;

  const statusClass = data.enabled ? "success" : "warning";
  const statusText = data.isConfigured
    ? data.enabled
      ? "Enabled"
      : "Disabled"
    : "Not Configured";

  banner.innerHTML = `
    <div class="alert alert-${statusClass}">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>Streak System:</strong> ${statusText}
          ${
            data.updatedAt
              ? `<div class="small text-muted">
                  Last updated by ${data.updatedBy || "Admin"} on
                  ${new Date(data.updatedAt).toLocaleString()}
                </div>`
              : ""
          }
        </div>
        <div class="form-check form-switch">
          <input
            class="form-check-input"
            type="checkbox"
            id="streakEnabledToggle"
            ${data.enabled ? "checked" : ""}
            ${!data.isConfigured ? "disabled" : ""}
          />
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("streakEnabledToggle")
    ?.addEventListener("change", handleToggleStreak);

  renderMilestonesTable(data.milestones || []);
}

async function handleToggleStreak(e) {
  const enabled = e.target.checked;

  if (
    !confirm(
      `Are you sure you want to ${enabled ? "enable" : "disable"} the streak system?`,
    )
  ) {
    e.target.checked = !enabled;
    return;
  }

  try {
    await API.put("/installments/admin/streak/enable", { enabled });

    loadStreakConfig();
  } catch (err) {
    alert(err.message);
    e.target.checked = !enabled;
  }
}

function renderMilestonesTable(milestones) {
  const tbody = document.getElementById("milestonesTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!milestones.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No milestones configured
        </td>
      </tr>
    `;
    return;
  }

  milestones
    .sort((a, b) => a.days - b.days)
    .forEach((m) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${m.days}</td>
        <td>₹${m.reward}</td>
        <td>${m.badge}</td>
        <td>
          <span class="badge ${m.isActive ? "bg-success" : "bg-secondary"}">
            ${m.isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editMilestone(${m.days})">
            Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMilestone(${m.days})">
            Delete
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
}

async function editMilestone(days) {
  const reward = prompt("Enter reward amount:");
  if (reward === null) return;

  try {
    await API.put(
      "/installments/admin/streak/milestone/:days",
      { reward: Number(reward) },
      { days },
    );

    loadStreakConfig();
  } catch (err) {
    alert(err.message);
  }
}

document
  .getElementById("addMilestoneBtn")
  ?.addEventListener("click", async () => {
    const days = prompt("Days:");
    const reward = prompt("Reward:");
    const badge = prompt("Badge:");

    if (!days || !reward || !badge) {
      alert("All fields required");
      return;
    }

    try {
      await API.post("/installments/admin/streak/milestone", {
        days: Number(days),
        reward: Number(reward),
        badge,
      });

      loadStreakConfig();
    } catch (err) {
      alert(err.message);
    }
  });

async function deleteMilestone(days) {
  if (!confirm(`Delete milestone for ${days} days?`)) return;

  try {
    await API.delete("/installments/admin/streak/milestone/:days", { days });

    loadStreakConfig();
  } catch (err) {
    alert(err.message);
  }
}

document
  .getElementById("resetStreakConfigBtn")
  ?.addEventListener("click", async () => {
    if (!confirm("This will DELETE ALL streak configuration. Continue?"))
      return;
    if (!confirm("This action is irreversible. Are you absolutely sure?"))
      return;

    try {
      await API.delete("/installments/admin/streak/config");

      loadStreakConfig();
      loadStreakStats();
    } catch (err) {
      alert(err.message);
    }
  });

async function loadStreakStats() {
  try {
    const res = await API.get("/installments/admin/streak/stats");
    const data = res.data;

    document.getElementById("streakUsersCount").textContent =
      data.stats.totalUsersWithStreak;

    document.getElementById("streakRewardsTotal").textContent =
      `₹${data.stats.totalRewardsGiven}`;

    document.getElementById("streakAvg").textContent =
      data.stats.avgCurrentStreak;

    document.getElementById("streakMaxCurrent").textContent =
      data.stats.maxCurrentStreak;

    renderLeaderboard(data.topUsers || []);
  } catch (err) {
    console.error("[STREAK][STATS]", err);
  }
}

function renderLeaderboard(users) {
  const tbody = document.getElementById("streakLeaderboardTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  users.forEach((u) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.currentStreak}</td>
      <td>₹${u.totalRewardsEarned}</td>
    `;

    tbody.appendChild(tr);
  });
}
