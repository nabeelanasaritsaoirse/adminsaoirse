/**
 * Sales Users – READ ONLY
 */

let currentPage = 1;
let currentSearch = "";
const LIMIT = 20;

document.addEventListener("DOMContentLoaded", () => {
  const user = AUTH.getCurrentUser();

  // Top right name
  document.getElementById("topUserName").textContent = user?.name || "Sales";

  loadUsers();

  document
    .getElementById("searchInput")
    .addEventListener("input", debounce(handleSearch, 400));
});

/**
 * Load users
 */
async function loadUsers(page = 1) {
  try {
    const response = await API.get(
      API_CONFIG.endpoints.sales.users,
      {},
      {
        page,
        limit: LIMIT,
        search: currentSearch,
      }
    );

    if (!response.success) {
      throw new Error("Failed to fetch users");
    }

    renderUsers(response.data.users);
    renderPagination(response.data.pagination);

    currentPage = page;
  } catch (err) {
    console.error(err);
    document.getElementById("usersTable").innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">
          Failed to load users
        </td>
      </tr>
    `;
  }
}

/**
 * Render users table
 */
function renderUsers(users = []) {
  const tbody = document.getElementById("usersTable");

  if (!users.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          No users found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td>
        <strong>${u.name || "-"}</strong>
      </td>
      <td>${u.email || "-"}</td>
      <td>${u.phoneNumber || "-"}</td>
      <td>${u.referralCode || "-"}</td>
      <td>${u.level1Count || 0}</td>
      <td>₹${(u.wallet?.balance || 0).toLocaleString("en-IN")}</td>
      <td>${new Date(u.createdAt).toLocaleString("en-IN")}</td>
      <td>
        <button
          class="btn btn-sm btn-outline-primary"
          onclick="viewUser('${u._id}')"
        >
          <i class="bi bi-eye"></i>
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

/**
 * Pagination
 */
function renderPagination(pagination) {
  const info = document.getElementById("paginationInfo");
  const controls = document.getElementById("paginationControls");

  info.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;

  controls.innerHTML = `
    <button
      class="btn btn-sm btn-outline-secondary me-2"
      ${pagination.page === 1 ? "disabled" : ""}
      onclick="loadUsers(${pagination.page - 1})"
    >
      Prev
    </button>
    <button
      class="btn btn-sm btn-outline-secondary"
      ${pagination.page === pagination.totalPages ? "disabled" : ""}
      onclick="loadUsers(${pagination.page + 1})"
    >
      Next
    </button>
  `;
}

/**
 * View user detail (Step-2)
 */
function viewUser(userId) {
  if (!userId) {
    alert("User ID missing");
    return;
  }

  window.location.href = `sales-user-detail.html?userId=${userId}`;
}

/**
 * Search handler
 */
function handleSearch(e) {
  currentSearch = e.target.value.trim();
  loadUsers(1);
}

/**
 * Debounce util
 */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
