/**
 * Sales Team Management JS
 */

let salesMembers = [];

document.addEventListener("DOMContentLoaded", () => {
  loadSalesTeam();
});

/**
 * Load sales team members
 */
async function loadSalesTeam() {
  try {
    showLoading();

    const response = await API.get("/admin-mgmt/sales-team");

    if (!response.success) {
      throw new Error("Failed to load sales team");
    }

    salesMembers = response.data || [];
    renderSalesTeam(salesMembers);
  } catch (err) {
    console.error(err);
    alert("Failed to load sales team");
  }
}

/**
 * Render table
 */
function renderSalesTeam(list) {
  hideLoading();

  if (!list.length) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  list.forEach((member, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${member.name}</td>
        <td>${member.email}</td>
        <td>
          <span class="badge ${
            member.isActive ? "bg-success" : "bg-secondary"
          }">
            ${member.isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td>${
          member.lastLogin
            ? new Date(member.lastLogin).toLocaleString()
            : "Never"
        }</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="resetPassword('${
            member._id
          }')">
            <i class="bi bi-key"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="toggleStatus('${
            member._id
          }')">
            <i class="bi bi-power"></i>
          </button>
        </td>
      </tr>
    `;
  });

  document.getElementById("tableContainer").style.display = "block";
}

/**
 * Create sales member
 */
async function createSalesMember() {
  const name = document.getElementById("salesName").value.trim();
  const email = document.getElementById("salesEmail").value.trim();
  const password = document.getElementById("salesPassword").value.trim();

  if (!name || !email || !password) {
    alert("All fields are required");
    return;
  }

  try {
    const res = await API.post("/admin-mgmt/sales-team", {
      name,
      email,
      password,
    });

    if (!res.success) throw new Error(res.message);

    alert("Sales member created");
    bootstrap.Modal.getInstance(document.getElementById("salesModal")).hide();
    loadSalesTeam();
  } catch (err) {
    alert(err.message || "Failed to create");
  }
}

/**
 * Reset password
 */
async function resetPassword(id) {
  const newPassword = prompt("Enter new password (min 6 chars)");
  if (!newPassword || newPassword.length < 6) return;

  await API.post(`/admin-mgmt/sales-team/${id}/reset-password`, {
    newPassword,
  });

  alert("Password reset successfully");
}

/**
 * Activate / deactivate
 */
async function toggleStatus(id) {
  if (!confirm("Are you sure?")) return;

  await API.delete(`/admin-mgmt/sales-team/${id}`);
  loadSalesTeam();
}

/**
 * Modal
 */
function openCreateModal() {
  new bootstrap.Modal(document.getElementById("salesModal")).show();
}

/**
 * UI helpers
 */
function showLoading() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("tableContainer").style.display = "none";
  document.getElementById("emptyState").style.display = "none";
}

function hideLoading() {
  document.getElementById("loading").style.display = "none";
}
