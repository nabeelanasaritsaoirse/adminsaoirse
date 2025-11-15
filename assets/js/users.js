/********************************************
 * USERS MANAGEMENT PAGE – FINAL CLEAN CODE
 ********************************************/

document.addEventListener("DOMContentLoaded", () => {
    initUserManagement();
});


function initUserManagement() {
    loadUsers();
    setupAddUserForm();
    setupSearchFilter();
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
        renderUsersTable(users);

    } catch (err) {
        console.error("Error loading users:", err);
        alert("Failed to load users from the server");
    }
}



function renderUsersTable(users) {
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
                <td>#${idx + 1}</td>

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

                <td>${new Date(u.createdAt).toLocaleDateString()}</td>

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
 * ADD USER
 ********************************************/
function setupAddUserForm() {
    const addForm = document.getElementById("addUserForm");
    if (!addForm) return;

    addForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newUser = {
            name: document.getElementById("userName").value,
            email: document.getElementById("userEmail").value,
            password: document.getElementById("userPassword").value,
            role: document.getElementById("userRole").value,
            referralLimit: 50,
        };

        try {
            await API.post(API_CONFIG.endpoints.users.create, newUser);

            alert("User created successfully");

            const modal = bootstrap.Modal.getInstance(document.getElementById("addUserModal"));
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
 * EDIT USER (FETCH + MODAL)
 ********************************************/
async function openEditUserModal(userId) {
    try {
        const response = await API.get(API_CONFIG.endpoints.users.getById, { userId });

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
                    <h5 class="modal-title">Edit User - ${escapeHtml(user.name)}</h5>
                    <button class="btn-close" data-bs-dismiss="modal"></button>
                </div>

                <div class="modal-body">
                    <form id="editUserForm">

                        <div class="mb-3">
                            <label class="form-label">Name</label>
                            <input id="editName" class="form-control" value="${escapeHtml(user.name)}">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Email</label>
                            <input id="editEmail" class="form-control" value="${escapeHtml(user.email)}">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Phone</label>
                            <input id="editPhone" class="form-control" value="${escapeHtml(user.phoneNumber || '')}">
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Role</label>
                            <select id="editRole" class="form-select">
                                <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                                <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Status</label>
                            <select id="editStatus" class="form-select">
                                <option value="true" ${user.isActive ? "selected" : ""}>Active</option>
                                <option value="false" ${!user.isActive ? "selected" : ""}>Inactive</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Referral Limit</label>
                            <input id="editReferralLimit" type="number" class="form-control" value="${user.referralLimit || 50}">
                        </div>

                    </form>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button class="btn btn-primary" onclick="updateUser('${user._id}')">Save Changes</button>
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
    const body = {
        name: document.getElementById("editName").value,
        email: document.getElementById("editEmail").value,
        phoneNumber: document.getElementById("editPhone").value,
        role: document.getElementById("editRole").value,
        isActive: document.getElementById("editStatus").value === "true",
        referralLimit: Number(document.getElementById("editReferralLimit").value)
    };

    try {
        await API.put(API_CONFIG.endpoints.users.update, body, { userId });

        alert("User updated successfully");

        const modal = bootstrap.Modal.getInstance(document.getElementById("editUserModal"));
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
 * SEARCH FILTER
 ********************************************/
function setupSearchFilter() {
    const input = document.getElementById("searchUser");
    if (!input) return;

    input.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll("#usersTableBody tr");

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? "" : "none";
        });
    });
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
