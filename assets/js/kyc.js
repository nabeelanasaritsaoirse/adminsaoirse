// ================================
// GLOBALS
// ================================
let fullKycList = [];
let filteredList = [];
let currentPage = 1;
const PAGE_SIZE = 10;

let rejectKycId = null;

// ================================
// LOAD KYC LIST
// ================================
async function loadKyc() {
  try {
    const res = await API.get("/kyc/admin/all");

    if (!res.success) {
      console.error("KYC fetch failed:", res);
      return;
    }

    fullKycList = res.data || [];
    filteredList = [...fullKycList];

    currentPage = 1;
    renderTable();
  } catch (err) {
    console.error("KYC Load Error:", err);
  }
}

// ================================
// RENDER TABLE
// ================================
function renderTable() {
  const tbody = document.getElementById("kycTableBody");
  tbody.innerHTML = "";

  if (!filteredList.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">No KYC records found</td></tr>`;
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredList.slice(start, start + PAGE_SIZE);

  pageItems.forEach(item => {
    const user = item.userId || {};
    const submittedAt = item.submittedAt  
      ? new Date(item.submittedAt).toLocaleString() 
      : "-";

    const docHtml = item.documents.map(d => `
      <div class="mb-2">
        <strong>${d.type.toUpperCase()}</strong><br>
        <a href="${d.frontUrl}" target="_blank">Front</a> |
        <a href="${d.backUrl}" target="_blank">Back</a>
      </div>
    `).join("");

    const autoTimer = item.status === "pending"
      ? `<span class="text-danger fw-bold" id="timer-${item._id}"></span>`
      : "-";

    const rowHTML = `
      <tr>
        <td>${user.name || "-"}<br><small>${user.email || "-"}</small></td>
        <td>${docHtml}</td>
        <td><span class="badge bg-${getStatusColor(item.status)}">${item.status}</span></td>
        <td>${submittedAt}</td>
        <td>${autoTimer}</td>
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

    tbody.insertAdjacentHTML("beforeend", rowHTML);
  });

  renderPagination();
  startTimers();
}

// ================================
// PAGINATION
// ================================
function renderPagination() {
  const container = document.getElementById("paginationContainer");
  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);

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

  html += "</ul></nav>";
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
    (k.userId?.name || "").toLowerCase().includes(q) ||
    (k.userId?.email || "").toLowerCase().includes(q)
  );

  currentPage = 1;
  renderTable();
});

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
// AUTO-APPROVE TIMER
// ================================
function startTimers() {
  fullKycList.forEach(item => {
    if (item.status !== "pending") return;

    const timerEl = document.getElementById(`timer-${item._id}`);
    if (!timerEl) return;

    const created = new Date(item.submittedAt).getTime();
    const expireTime = created + 10 * 60 * 1000;

    const interval = setInterval(() => {
      const diff = expireTime - Date.now();

      if (diff <= 0) {
        timerEl.innerHTML = "Auto approving…";
        clearInterval(interval);
        return;
      }

      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timerEl.innerHTML = `${m}m ${s}s`;
    }, 1000);
  });
}

// ================================
// APPROVE
// ================================
async function approveKyc(id) {
  if (!confirm("Approve this KYC?")) return;

  try {
    const res = await API.patch(`/kyc/admin/approve/${id}`, {});
    if (res.success) loadKyc();
  } catch (e) {
    console.error(e);
  }
}

// ================================
// REJECT
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
    const res = await API.patch(`/kyc/admin/reject/${rejectKycId}`, { note });
    if (res.success) {
      bootstrap.Modal.getInstance(document.getElementById("rejectModal")).hide();
      loadKyc();
    }
  } catch (e) {
    console.error(e);
  }
});

// ================================
// INITIAL LOAD
// ================================
loadKyc();
