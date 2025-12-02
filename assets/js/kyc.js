// ================================
// GLOBALS
// ================================
let fullKycList = [];
let filteredList = [];
let currentPage = 1;
const PAGE_SIZE = 10;

let rejectKycId = null;

// ================================
// LOAD KYC
// ================================
async function loadKyc(status = "") {
  try {
    const query = status ? { status } : {};
    const res = await API.get("/kyc/admin/all", {}, query);

    if (!res.success) return alert("Failed to load KYC");

    fullKycList = res.data || [];
    filteredList = [...fullKycList];

    renderTable();
  } catch (err) {
    console.error("KYC Load Error:", err);
  }
}

// ================================
// RENDER TABLE WITH PAGINATION
// ================================
function renderTable() {
  const tbody = document.getElementById("kycTableBody");
  tbody.innerHTML = "";

  if (!filteredList.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No KYC records found</td></tr>`;
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filteredList.slice(start, end);

  pageItems.forEach(item => {
    const docHtml = item.documents.map(d => `
      <div class="mb-2">
        <strong>${d.type.toUpperCase()}</strong><br>
        <a href="${d.frontUrl}" target="_blank">Front</a> |
        <a href="${d.backUrl}" target="_blank">Back</a>
      </div>
    `).join("");

    const autoApproveHTML = item.status === "pending"
      ? `<span class="text-danger fw-bold" id="timer-${item._id}"></span>`
      : "-";

    const row = `
      <tr>
        <td>${item.user?.name || "-"}<br>${item.user?.email || "-"}</td>
        <td>${docHtml}</td>
        <td><span class="badge bg-${getStatusColor(item.status)}">${item.status}</span></td>
        <td>${new Date(item.createdAt).toLocaleString()}</td>
        <td>${autoApproveHTML}</td>
        <td>
          ${item.status === "pending" ? `
            <button class="btn btn-success btn-sm" onclick="approveKyc('${item._id}')">
              <i class="bi bi-check-circle"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="openRejectModal('${item._id}')">
              <i class="bi bi-x-circle"></i>
            </button>
          ` : "-"}
        </td>
      </tr>
    `;

    tbody.innerHTML += row;
  });

  renderPagination();
  startTimers();
}

// ================================
// PAGINATION UI
// ================================
function renderPagination() {
  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
  const container = document.getElementById("paginationContainer");

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `<nav><ul class="pagination justify-content-center">`;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <li class="page-item ${i === currentPage ? "active" : ""}">
        <button class="page-link" onclick="goToPage(${i})">${i}</button>
      </li>
    `;
  }

  html += `</ul></nav>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderTable();
}

// ================================
// SEARCH
// ================================
document.getElementById("searchInput").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();

  filteredList = fullKycList.filter(k =>
    (k.user?.name || "").toLowerCase().includes(q) ||
    (k.user?.email || "").toLowerCase().includes(q)
  );

  currentPage = 1;
  renderTable();
});

// ================================
// AUTO-APPROVE TIMER
// ================================
function startTimers() {
  fullKycList.forEach(item => {
    if (item.status !== "pending") return;

    const timerEl = document.getElementById(`timer-${item._id}`);
    if (!timerEl) return;

    const created = new Date(item.createdAt);
    const expireTime = created.getTime() + (10 * 60 * 1000); // 10 mins for now

    const interval = setInterval(() => {
      const diff = expireTime - Date.now();

      if (diff <= 0) {
        timerEl.innerHTML = "Auto-approving...";
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      timerEl.innerHTML = `${minutes}m ${seconds}s`;

    }, 1000);
  });
}

// ================================
// STATUS COLOR
// ================================
function getStatusColor(status) {
  switch (status) {
    case "approved": return "success";
    case "auto_approved": return "primary";
    case "rejected": return "danger";
    default: return "warning";
  }
}

// ================================
// APPROVE
// ================================
async function approveKyc(id) {
  if (!confirm("Approve this KYC?")) return;

  try {
    const res = await API.post(`/kyc/admin/approve/${id}`, {});
    if (res.success) loadKyc();
  } catch (e) {
    console.error(e);
  }
}

// ================================
// REJECT MODAL
// ================================
function openRejectModal(id) {
  rejectKycId = id;
  document.getElementById("rejectNote").value = "";
  new bootstrap.Modal(document.getElementById("rejectModal")).show();
}

document.getElementById("rejectSubmitBtn").addEventListener("click", async () => {
  const note = document.getElementById("rejectNote").value.trim();
  if (!note) return alert("Please enter a rejection reason.");

  try {
    const res = await API.post(`/kyc/admin/reject/${rejectKycId}`, { note });
    if (res.success) {
      bootstrap.Modal.getInstance(document.getElementById("rejectModal")).hide();
      loadKyc();
    }
  } catch (e) {
    console.error(e);
  }
});

// ================================
// STATUS FILTER
// ================================
document.getElementById("filterStatus").addEventListener("change", e => {
  loadKyc(e.target.value);
});

// INITIAL LOAD
loadKyc();
