const REF_API = API_CONFIG.endpoints.referrals;

let currentPage = 1;
let currentSearch = "";
let currentSort = "referrals";
let chartInstance = null;
let globalUsers = [];
// ======================
// USER DETAILS
// ======================
async function loadUser(userId) {
  try {
    const res = await API.get(REF_API.userDetails, { userId });

    console.log("User detail API:", res);

    const data = res?.data || {};

    const user = data.userInfo || {};
    const stats = data.referralStats || {};
    const earnings = data.earnings || {};
    const referrals = data.referredUsers || [];

    document.getElementById("userDetail").innerHTML = `
    
    <!-- USER HEADER -->
    <div class="card shadow-sm mb-3 p-3">
      <div class="d-flex align-items-center">
        <img src="${user.profilePicture || "https://via.placeholder.com/50"}"
          style="width:50px;height:50px;border-radius:50%;margin-right:12px;" />
        <div>
          <h5 class="mb-0">${user.name || "-"}</h5>
          <small class="text-muted">${user.email || "-"}</small>
        </div>
      </div>
    </div>

    <!-- STATS -->
    <div class="row g-3 mb-3">
      <div class="col-md-3">
        <div class="card p-3 text-center shadow-sm">
          <h6>Total Referrals</h6>
          <h4>${stats.totalReferrals || 0}</h4>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card p-3 text-center shadow-sm">
          <h6>Active</h6>
          <h4 class="text-success">${stats.activeReferrals || 0}</h4>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card p-3 text-center shadow-sm">
          <h6>Pending</h6>
          <h4 class="text-warning">${stats.pendingReferrals || 0}</h4>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card p-3 text-center shadow-sm">
          <h6>Completed</h6>
          <h4>${stats.completedReferrals || 0}</h4>
        </div>
      </div>
    </div>

    <!-- EARNINGS -->
    <div class="row g-3 mb-3">

      <div class="col-md-3">
        <div class="card p-3 shadow-sm text-center">
          <h6>Total Earnings</h6>
          <h4>₹${earnings.totalEarnings || 0}</h4>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card p-3 shadow-sm text-center">
          <h6>Total Commission</h6>
          <h4 class="text-primary">₹${earnings.totalCommission || 0}</h4>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card p-3 shadow-sm text-center">
          <h6>Available</h6>
          <h4 class="text-success">₹${earnings.availableBalance || 0}</h4>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card p-3 shadow-sm text-center">
          <h6>Withdrawn</h6>
          <h4 class="text-danger">₹${earnings.totalWithdrawn || 0}</h4>
        </div>
      </div>

    </div>

    <!-- REFERRED USERS -->
    <div class="card shadow-sm p-3 mb-3">
      <h6 class="mb-3">Referred Users</h6>

      <div style="max-height:300px; overflow-y:auto;">
        ${
          referrals.length
            ? referrals
                .map(
                  (r) => `
        <div class="border-bottom py-3">

          <div class="d-flex justify-content-between align-items-center">
            
            <div>
              <strong>${r.name || "Unknown User"}</strong><br/>
              <small class="text-muted">${r.email || "-"}</small><br/>
              <small class="text-muted">
                Joined: ${new Date(r.joinedAt).toLocaleDateString()}
              </small>
            </div>

            <div class="text-end">
              <span class="badge ${
                r.status === "ACTIVE"
                  ? "bg-success"
                  : r.status === "PENDING"
                    ? "bg-warning"
                    : "bg-secondary"
              }">
                ${r.status}
              </span><br/>

              <div class="fw-bold text-primary">
                ₹${r.totalCommission || 0}
              </div>
            </div>

          </div>

          ${
            r.products?.length
              ? `
              <div class="mt-2 ms-2">
                ${r.products
                  .map(
                    (p) => `
                    <div class="small text-muted border rounded p-2 mb-1">
                      <strong>₹${p.totalAmount}</strong> • ${p.status}<br/>
                      ${p.days} days • ₹${p.commissionPerDay}/day
                    </div>
                  `,
                  )
                  .join("")}
              </div>
            `
              : ""
          }

        </div>
        `,
                )
                .join("")
            : "<p class='text-muted'>No referrals</p>"
        }
      </div>
    </div>

    <!-- ACTION -->
    <div class="text-end">
      <button class="btn btn-danger"
        onclick="reassignPrompt('${user.userId}')">
        Reassign Referrer
      </button>
    </div>
    `;
  } catch (err) {
    console.error("User Detail Error:", err);
    alert("Failed to load user details");
  }
}
// ======================
// REASSIGN
// ======================
async function reassignPrompt(userId) {
  const newRef = prompt("Enter new referrer ID:");
  const reason = prompt("Reason:");

  if (!newRef) return;

  try {
    await API.put(
      REF_API.reassignReferrer,
      {
        newReferrerId: newRef,
        reason,
      },
      { userId },
    );

    alert("Updated successfully");
    loadUser(userId);
  } catch (err) {
    alert(err.message);
  }
}

// ======================
// MANUAL REWARD
// ======================
async function giveManualReward() {
  const userId = document.getElementById("rewardUserId").value;
  const amount = document.getElementById("rewardAmount").value;
  const title = document.getElementById("rewardTitle").value;

  const btn = document.getElementById("rewardBtn");

  // 🔴 VALIDATION
  if (!userId) return alert("Please select a user");
  if (!amount || amount <= 0) return alert("Enter valid amount");

  try {
    btn.innerText = "Processing...";
    btn.disabled = true;

    await API.post(REF_API.manualReward, {
      userId,
      amount,
      title,
      notes: "Admin reward",
    });

    alert("Reward given successfully");

    // 🔥 RESET FORM
    document.getElementById("rewardAmount").value = "";
    document.getElementById("rewardTitle").value = "";
  } catch (err) {
    alert(err.message);
  } finally {
    btn.innerText = "Give Reward";
    btn.disabled = false;
  }
}

async function searchUsers(query = "") {
  try {
    const res = await API.get(
      REF_API.allUsers,
      {},
      { page: 1, limit: 10, search: query },
    );

    const users = res?.data?.users || [];

    const dropdown = document.getElementById("rewardUserId");

    dropdown.innerHTML = `
      <option value="">Select user</option>
      ${users
        .map(
          (u) => `
          <option value="${u.userId}">
            ${u.name} (${u.email})
          </option>
        `,
        )
        .join("")}
    `;
  } catch (err) {
    console.error("User search error:", err);
  }
}

function sortUsers(users, type) {
  if (type === "earnings") {
    return [...users].sort((a, b) => b.totalEarnings - a.totalEarnings);
  }
  return [...users].sort((a, b) => b.totalReferrals - a.totalReferrals);
}

function renderTopReferrers(users) {
  const container = document.getElementById("topReferrers");
  if (!container) return;

  if (!users || users.length < 3) {
    container.innerHTML = "";
    return;
  }

  const top = sortUsers(users, currentSort).slice(0, 3);

  const first = top[0] || {};
  const second = top[1] || {};
  const third = top[2] || {};

  container.innerHTML = `
    <div class="podium-wrapper">

      <div class="podium second">
        <div class="user-card">
          <div class="medal">🥈</div>
          <div class="top-name" title="${second.name || ""}">
  ${second.name || "-"}
</div>
          <p>${second.totalReferrals || 0} referrals</p>
          <small>₹${second.totalEarnings || 0}</small>
        </div>
      </div>

      <div class="podium first">
        <div class="user-card">
          <div class="medal">🥇</div>
          <div class="top-name" title="${first.name || ""}">
  ${first.name || "-"}
</div>
          <p>${first.totalReferrals || 0} referrals</p>
          <small>₹${first.totalEarnings || 0}</small>
        </div>
      </div>

      <div class="podium third">
        <div class="user-card">
          <div class="medal">🥉</div>
          <div class="top-name" title="${third.name || ""}">
  ${third.name || "-"}
</div>
          <p>${third.totalReferrals || 0} referrals</p>
          <small>₹${third.totalEarnings || 0}</small>
        </div>
      </div>

    </div>
  `;
}

function renderPagination(totalPages) {
  const container = document.getElementById("pagination");
  if (!container) return;

  if (!totalPages || totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div style="display:flex;justify-content:center;gap:8px;margin-top:15px;">
      ${Array.from({ length: totalPages }, (_, i) => {
        const page = i + 1;
        return `
          <button class="btn btn-sm ${
            page === currentPage ? "btn-primary" : "btn-outline-primary"
          }"
          onclick="changePage(${page})">
            ${page}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function changePage(page) {
  currentPage = page;
  renderTableFromGlobal();
}

async function loadGlobalLeaderboard() {
  try {
    const res = await API.get(
      REF_API.allUsers,
      {},
      {
        page: 1,
        limit: 1000,
        search: currentSearch,
      },
    );

    globalUsers = res?.data?.users || [];

    renderTopReferrers(globalUsers);
    renderChart(globalUsers);

    // 🔥 ALSO UPDATE TABLE FROM GLOBAL DATA
    renderTableFromGlobal();
  } catch (err) {
    console.error("Global leaderboard error:", err);
  }
}

function renderTableFromGlobal() {
  const table = document.getElementById("leaderboardTable");
  const sorted = sortUsers(globalUsers, currentSort);

  const start = (currentPage - 1) * 10;
  const end = start + 10;

  const pageUsers = sorted.slice(start, end);

  if (!pageUsers.length) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">No Data</td>
      </tr>
    `;
    return;
  }

  table.innerHTML = pageUsers
    .map(
      (u) => `
      <tr>
        <td>
          <strong>${u.name}</strong><br/>
          <small>${u.email}</small>
        </td>
        <td>${u.totalReferrals}</td>
        <td>${u.activeReferrals}</td>
        <td>₹${u.totalEarnings}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary"
            onclick="loadUser('${u.userId}')">
            select
          </button>
        </td>
      </tr>
    `,
    )
    .join("");

  // pagination based on global
  const totalPages = Math.ceil(globalUsers.length / 10);
  renderPagination(totalPages);
}

function renderChart(users) {
  const canvas = document.getElementById("referralChart");
  if (!canvas) return;

  // 🔥 DESTROY OLD CHART (THIS FIXES YOUR ERROR)
  if (chartInstance) {
    chartInstance.destroy();
  }

  const top10 = sortUsers(users, currentSort).slice(0, 10);

  chartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: top10.map((u) =>
        u.name?.length > 10 ? u.name.substring(0, 10) + "..." : u.name,
      ),
      datasets: [
        {
          label: "Referrals",
          data: top10.map((u) => u.totalReferrals),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

async function loadRewardHistory() {
  try {
    const res = await API.get(REF_API.rewardHistory);

    console.log("Reward history:", res);

    const rewards = res?.data || [];

    const table = document.getElementById("rewardHistoryTable");

    if (!rewards.length) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            No rewards found
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = rewards
      .map((r) => {
        const user = r.user || {};

        return `
        <tr>
          <td>
            <strong>${user.name || "Unknown"}</strong><br/>
            <small class="text-muted">${user.email || "-"}</small>
          </td>

          <td>₹${r.amount || 0}</td>

          <td>
            <span class="badge ${
              r.rewardType === "MILESTONE"
                ? "bg-success"
                : r.rewardType === "CHAIN"
                  ? "bg-info"
                  : "bg-warning"
            }">
              ${r.rewardType || "-"}
            </span>
          </td>

          <td>${r.badgeName || "-"}</td>

          <td>${new Date(r.createdAt).toLocaleDateString()}</td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Reward History Error:", err);
  }
}

async function loadRewardConfig() {
  try {
    const res = await API.get(REF_API.getConfig);

    console.log("Reward Config:", res);

    const config = res?.data || {};

    // fill inputs
    document.getElementById("target").value = config.target || "";
    document.getElementById("rewardType").value = config.rewardType || "CASH";
    document.getElementById("amount").value = config.amount || "";
  } catch (err) {
    console.error("Config load error:", err);
  }
}
async function updateRewardConfig() {
  const btn = document.getElementById("saveConfigBtn");

  try {
    btn.innerText = "Saving...";
    btn.disabled = true;

    await API.put(REF_API.updateConfig, {
      target: document.getElementById("target").value,
      rewardType: document.getElementById("rewardType").value,
      amount: document.getElementById("amount").value,
    });

    alert("Config updated");
  } catch (err) {
    alert(err.message);
  } finally {
    btn.innerText = "Save";
    btn.disabled = false;
  }
}
// ======================
// SEARCH
// ======================
document.getElementById("searchUser").addEventListener("input", (e) => {
  currentSearch = e.target.value;
  currentPage = 1; // 🔥 IMPORTANT
  loadGlobalLeaderboard();
});

document.getElementById("sortSelect")?.addEventListener("change", (e) => {
  currentSort = e.target.value;
  currentPage = 1; // 🔥 ADD THIS
  renderTableFromGlobal();
  renderTopReferrers(globalUsers);
  renderChart(globalUsers);
});

document.getElementById("rewardUserSearch").addEventListener("input", (e) => {
  searchUsers(e.target.value);
});

// INIT
loadGlobalLeaderboard();
loadRewardHistory();
loadRewardConfig(); // 🔥 ADD THIS
