/********************************************
 * USERS MANAGEMENT PAGE – FINAL CLEAN CODE
 ********************************************/

document.addEventListener("DOMContentLoaded", () => {
  initUserManagement();
});

/********************************************
 * GLOBAL STATE FOR FILTER + PAGINATION
 ********************************************/
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const PAGE_SIZE = 10;

/********************************************
 * INIT
 ********************************************/
function initUserManagement() {
  loadUsers();
  setupAddUserForm();
  setupSearchFilter();
  setupRoleStatusFilter();
  setupAddUserModalReset();
}

/********************************************
 * LOAD USERS FROM BACKEND
 ********************************************/
async function loadUsers() {
  try {
    const url = API.buildURL(API_CONFIG.endpoints.users.getAll);

    const response = await API.request(url, {
      method: "GET",
      headers: AUTH.getAuthHeaders(),
    });

    const users = response.data || response;
    allUsers = Array.isArray(users) ? users : [];
    currentPage = 1;

    applyFiltersAndRender();
  } catch (err) {
    console.error("Error loading users:", err);
    alert("Failed to load users from the server");
  }
}

/********************************************
 * FILTER + PAGINATION PIPELINE
 ********************************************/
function applyFiltersAndRender() {
  const searchTerm =
    (document.getElementById("searchUser")?.value || "")
      .toLowerCase()
      .trim();

  const roleFilter = (
    document.getElementById("filterRole")?.value || ""
  ).toLowerCase();

  const statusFilter = (
    document.getElementById("filterStatus")?.value || ""
  ).toLowerCase();

  let result = allUsers.slice();

  result = result.filter((u) => {
    const name = (u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const role = (u.role || "").toLowerCase();
    const statusValue = u.isActive ? "active" : "inactive";

    const matchesSearch =
      !searchTerm || `${name} ${email} ${role}`.includes(searchTerm);

    const matchesRole = !roleFilter || role === roleFilter;

    const matchesStatus = !statusFilter || statusValue === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  filteredUsers = result;

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageUsers = filteredUsers.slice(startIdx, startIdx + PAGE_SIZE);

  renderUsersTable(pageUsers, startIdx);
  renderPagination(totalPages);
}

/********************************************
 * RENDER TABLE (WITH OFFSET FOR ID)
 ********************************************/
function renderUsersTable(users, offset = 0) {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No users found</td></tr>`;
    return;
  }

  users.forEach((u, idx) => {
    tbody.innerHTML += `
      <tr>
          <td>#${offset + idx + 1}</td>

          <td>
              <div class="d-flex align-items-center">
                  <i class="bi bi-person-circle fs-4 me-2"></i>
                  <span>${escapeHtml(u.name)}</span>
              </div>
          </td>

          <td>${escapeHtml(u.email)}</td>

          <td>
              <span class="badge ${u.role === "admin" ? "bg-danger" : "bg-primary"}">
                  ${escapeHtml(u.role)}
              </span>
          </td>

          <td>
              <span class="badge ${u.isActive ? "bg-success" : "bg-warning"}">
                  ${u.isActive ? "Active" : "Inactive"}
              </span>
          </td>

          <td>${
            u.createdAt
              ? new Date(u.createdAt).toLocaleDateString()
              : "-"
          }</td>

          <td>
              <button class="btn btn-sm btn-outline-primary" onclick="openEditUserModal('${u._id}')">
                  <i class="bi bi-pencil"></i>
              </button>

              <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u._id}')">
                  <i class="bi bi-trash"></i>
              </button>
          </td>
      </tr>
    `;
  });
}

/********************************************
 * RENDER PAGINATION
 ********************************************/
function renderPagination(totalPages) {
  const container = document.getElementById("paginationContainer");
  if (!container) return;

  container.innerHTML = "";

  if (totalPages <= 1) return;

  let html = `<ul class="pagination justify-content-end mb-0">`;

  const prevDisabled = currentPage === 1 ? " disabled" : "";
  html += `
    <li class="page-item${prevDisabled}">
      <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
    </li>
  `;

  for (let p = 1; p <= totalPages; p++) {
    const activeClass = p === currentPage ? " active" : "";
    html += `
      <li class="page-item${activeClass}">
        <a class="page-link" href="#" data-page="${p}">${p}</a>
      </li>
    `;
  }

  const nextDisabled = currentPage === totalPages ? " disabled" : "";
  html += `
    <li class="page-item${nextDisabled}">
      <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
    </li>
  `;

  html += `</ul>`;
  container.innerHTML = html;

  container.querySelectorAll("a.page-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const targetPage = parseInt(a.getAttribute("data-page"), 10);
      if (targetPage < 1 || targetPage > totalPages) return;

      currentPage = targetPage;
      applyFiltersAndRender();
    });
  });
}

/********************************************
 * ADD USER FORM SUBMIT + RESET
 ********************************************/
function setupAddUserForm() {
  const addForm = document.getElementById("addUserForm");
  if (!addForm) return;

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const phone = document.getElementById("userPhone")?.value.trim() || "";

    if (!/^[0-9]{10}$/.test(phone)) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    const newUser = {
      name: document.getElementById("userName").value,
      email: document.getElementById("userEmail").value,
      password: document.getElementById("userPassword").value,
      phoneNumber: phone,
      role: document.getElementById("userRole").value,
      referralLimit: 50,
    };

    try {
      await API.post(API_CONFIG.endpoints.users.create, newUser);

      alert("User created successfully");

      const modalElement = document.getElementById("addUserModal");
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();

      addForm.reset();
      loadUsers();
    } catch (err) {
      console.error("Create user failed:", err);
      alert(err.message || "Failed to create user");
    }
  });
}

/********************************************
 * RESET ADD USER FORM ON MODAL CLOSE
 * (Fixes: old data still showing after Cancel)
 ********************************************/
function setupAddUserModalReset() {
  const modalElement = document.getElementById("addUserModal");
  if (!modalElement) return;

  modalElement.addEventListener("hidden.bs.modal", () => {
    const addForm = document.getElementById("addUserForm");
    if (addForm) addForm.reset();
  });
}

/********************************************
 * SEARCH FILTER (NOW DRIVES PIPELINE)
 ********************************************/
function setupSearchFilter() {
  const input = document.getElementById("searchUser");
  if (!input) return;

  input.addEventListener("input", () => {
    currentPage = 1;
    applyFiltersAndRender();
  });
}

/********************************************
 * ROLE + STATUS DROPDOWN FILTERS
 ********************************************/
function setupRoleStatusFilter() {
  const roleSelect = document.getElementById("filterRole");
  const statusSelect = document.getElementById("filterStatus");

  if (roleSelect) {
    roleSelect.addEventListener("change", () => {
      currentPage = 1;
      applyFiltersAndRender();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener("change", () => {
      currentPage = 1;
      applyFiltersAndRender();
    });
  }
}

/********************************************
 * EDIT USER (FETCH + MODAL)
 ********************************************/
async function openEditUserModal(userId) {
  try {
    const response = await API.get(API_CONFIG.endpoints.users.getById, {
      userId,
    });

    const user = response.data || response;

    injectEditUserModal(user);
  } catch (err) {
    console.error("Failed to fetch user:", err);
    alert("Failed to load user details");
  }
}

function injectEditUserModal(user) {
  const existing = document.getElementById("editUserModal");
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="editUserModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">

                <div class="modal-header">
                    <h5 class="modal-title">Edit User - ${escapeHtml(
                      user.name
                    )}</h5>
                    <button class="btn-close" data-bs-dismiss="modal"></button>
                </div>

                <div class="modal-body">
                    <form id="editUserForm">

                        <div class="mb-3">
                            <label class="form-label">Name</label>
                            <input id="editName" class="form-control" value="${escapeHtml(
                              user.name
                            )}">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Email</label>
                            <input id="editEmail" class="form-control" value="${escapeHtml(
                              user.email
                            )}">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Phone</label>
                            <input id="editPhone" class="form-control" maxlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0,10)" value="${escapeHtml(
                              user.phoneNumber || ""
                            )}">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Role</label>
                            <select id="editRole" class="form-select">
                                <option value="admin" ${
                                  user.role === "admin" ? "selected" : ""
                                }>Admin</option>
                                <option value="user" ${
                                  user.role === "user" ? "selected" : ""
                                }>User</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Status</label>
                            <select id="editStatus" class="form-select">
                                <option value="true" ${
                                  user.isActive ? "selected" : ""
                                }>Active</option>
                                <option value="false" ${
                                  !user.isActive ? "selected" : ""
                                }>Inactive</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Referral Limit</label>
                            <input id="editReferralLimit" type="number" class="form-control" value="${
                              user.referralLimit || 50
                            }">
                        </div>

                    </form>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button class="btn btn-primary" onclick="updateUser('${
                      user._id
                    }')">Save Changes</button>
                </div>

            </div>
        </div>
    </div>
    `;

  document.body.insertAdjacentHTML("beforeend", html);
  new bootstrap.Modal(document.getElementById("editUserModal")).show();
}

/********************************************
 * UPDATE USER
 ********************************************/
async function updateUser(userId) {
  const phone = document.getElementById("editPhone").value.trim();

  if (phone && !/^[0-9]{10}$/.test(phone)) {
    alert("Phone number must be exactly 10 digits");
    return;
  }

  const body = {
    name: document.getElementById("editName").value,
    email: document.getElementById("editEmail").value,
    phoneNumber: document.getElementById("editPhone").value,
    role: document.getElementById("editRole").value,
    isActive: document.getElementById("editStatus").value === "true",
    referralLimit: Number(document.getElementById("editReferralLimit").value),
  };

  try {
    await API.put(API_CONFIG.endpoints.users.update, body, { userId });

    alert("User updated successfully");

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("editUserModal")
    );
    if (modal) modal.hide();

    loadUsers();
  } catch (err) {
    console.error("Update failed:", err);
    alert("Failed to update user");
  }
}

/********************************************
 * DELETE USER
 ********************************************/
async function deleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    await API.delete(API_CONFIG.endpoints.users.delete, { userId });
    alert("User deleted");
    loadUsers();
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Failed to delete user");
  }
}

/********************************************
 * SAFE TEXT ESCAPER
 ********************************************/
function escapeHtml(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
