// ================================
// GLOBALS
// ================================
let fullKycList = [];
let filteredList = [];
let currentPage = 1;
const PAGE_SIZE = 10;

let rejectKycId = null;
let expandedRowId = null;

// State for filters
let searchQuery = "";
let statusFilter = "";
// ================================
// ROW EXPAND / COLLAPSE HANDLER
// ================================
function attachRowToggleListeners() {
  const rows = document.querySelectorAll(".kyc-row-expand");

  rows.forEach((row) => {
    row.onclick = () => {
      const kycId = row.dataset.kycId;
      const detailRow = document.querySelector(
        `.kyc-detail-row[data-kyc-detail-id="${kycId}"]`
      );

      if (!detailRow) return;

      const isExpanded = expandedRowId === kycId;

      // Collapse all detail rows
      document.querySelectorAll(".kyc-detail-row").forEach((r) => {
        r.style.display = "none";
      });

      document.querySelectorAll(".kyc-toggle-icon").forEach((icon) => {
        icon.classList.remove("rotate-180");
      });

      if (isExpanded) {
        // Collapse current
        expandedRowId = null;
        detailRow.style.display = "none";
      } else {
        // Expand current
        expandedRowId = kycId;
        detailRow.style.display = "table-row";
        const icon = row.querySelector(".kyc-toggle-icon");
        if (icon) icon.classList.add("rotate-180");
      }
    };
  });
}

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
    currentPage = 1;
    applyFilters();
  } catch (err) {
    console.error("KYC Load Error:", err);
  }
}

// ================================
// APPLY FILTERS
// ================================
function applyFilters() {
  // Start with full list
  filteredList = [...fullKycList];

  // Apply search filter (name or email)
  if (searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    filteredList = filteredList.filter(
      (k) =>
        (k.userId?.name || "").toLowerCase().includes(q) ||
        (k.userId?.email || "").toLowerCase().includes(q)
    );
  }

  // Apply status filter
  if (statusFilter !== "" && statusFilter !== "all") {
    filteredList = filteredList.filter((k) => k.status === statusFilter);
  }

  // Reset to first page when filters change
  currentPage = 1;
  renderTable();
}

// ================================
// RENDER TABLE
// ================================
function renderTable() {
  const tbody = document.getElementById("kycTableBody");
  tbody.innerHTML = "";

  if (!filteredList.length) {
    tbody.insertAdjacentHTML(
      "beforeend",
      `<tr><td colspan="5" class="text-center py-3">No KYC records found</td></tr>`
    );
    renderPagination();
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredList.slice(start, start + PAGE_SIZE);

  pageItems.forEach((item) => {
    // Main row
    tbody.insertAdjacentHTML("beforeend", renderMainRow(item));

    // Detail row (initially hidden)
    tbody.insertAdjacentHTML("beforeend", renderDetailRow(item));
  });

  renderPagination();
  startTimers();
  attachRowToggleListeners();
}

// ================================
// MAIN ROW RENDERING
// ================================
function renderMainRow(item) {
  const user = item.userId || {};
  const submittedAt = item.submittedAt
    ? new Date(item.submittedAt).toLocaleString()
    : "-";

  const autoTimer =
    item.status === "pending"
      ? `<span class="text-danger fw-bold" id="timer-${item._id}"></span>`
      : "-";

  return `
    <tr class="kyc-row-expand" data-kyc-id="${item._id}">
      <td>
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${user.name || "-"}</strong><br>

<small class="text-muted">
  ${user.email || "-"}
  ${
    user.emailVerified
      ? `<span class="badge bg-success ms-1">Email Verified</span>`
      : `<span class="badge bg-secondary ms-1">Email Not Verified</span>`
  }
</small><br>

<small class="text-muted">
  ${user.phoneNumber || "-"}
  ${
    user.phoneVerified
      ? `<span class="badge bg-success ms-1">Phone Verified</span>`
      : `<span class="badge bg-secondary ms-1">Phone Not Verified</span>`
  }
</small>
          </div>
          <i class="bi bi-chevron-down kyc-toggle-icon ms-2"></i>
        </div>
      </td>
      <td><span class="badge bg-${getStatusColor(item.status)}">${
    item.status
  }</span></td>
      <td>${submittedAt}</td>
      <td>${autoTimer}</td>
      <td>
        <div class="kyc-action-buttons">
          ${
            item.status === "pending"
              ? `
            <button class="btn btn-success btn-sm" onclick="approveKyc('${item._id}')" title="Approve">
              <i class="bi bi-check-circle"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="openRejectModal('${item._id}')" title="Reject">
              <i class="bi bi-x-circle"></i>
            </button>
          `
              : "-"
          }
        </div>
      </td>
    </tr>
  `;
}

// ================================
// DETAIL ROW RENDERING
// ================================
function renderDetailRow(item) {
  const documentsHtml = renderDocumentGroups(item.documents || []);

  return `
    <tr class="kyc-detail-row" data-kyc-detail-id="${item._id}">
      <td colspan="5">
        <div class="kyc-detail-content">
          <h6 class="mb-3">KYC Documents</h6>
          ${documentsHtml}
          <div class="mt-3">
            <button class="btn btn-sm btn-primary" onclick="openDocumentModal(${JSON.stringify(
              item
            ).replace(/"/g, "&quot;")})"
">
              <i class="bi bi-eye"></i> View Documents
            </button>
          </div>
        </div>
      </td>
    </tr>
  `;
}

// ================================
// GROUP DOCUMENTS BY TYPE
// ================================
// Group documents into selfie / aadhaar / pan (single object per group)
function groupDocuments(documents) {
  const result = {
    selfie: null, // single object or null
    aadhaar: null, // object with frontUrl/backUrl or null
    pan: null, // object with frontUrl/backUrl or null
  };

  if (!Array.isArray(documents)) return result;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (!doc) continue;
    const type = (doc.type || "").toUpperCase();

    // Helper to safely extract urls (keeps compatibility with common shapes)
    const front = doc.frontUrl || doc.front || doc.url || "";
    const back = doc.backUrl || doc.back || "";

    if (type === "SELFIE") {
      // Only take the first selfie (single image). Ignore any back/front pairing.
      if (!result.selfie && front) {
        result.selfie = { frontUrl: front };
      }
    } else if (type === "AADHAAR") {
      // Prefer front/back keys; if not present, use available urls
      if (!result.aadhaar && (front || back)) {
        result.aadhaar = { frontUrl: front || "", backUrl: back || "" };
      }
    } else if (type === "PAN") {
      if (!result.pan && (front || back)) {
        result.pan = { frontUrl: front || "", backUrl: back || "" };
      }
    }
    // stop early if all groups found
    if (result.selfie && result.aadhaar && result.pan) break;
  }

  return result;
}

// Render grouped document links used inside the expanded detail row
function renderDocumentGroups(documents) {
  const grouped = groupDocuments(documents);
  let html = "";

  // SELFIE (single image)
  if (grouped.selfie && grouped.selfie.frontUrl) {
    html += `
      <div class="kyc-doc-group">
        <div class="kyc-doc-group-title">SELFIE</div>
        <div class="kyc-doc-links">
          <a href="${grouped.selfie.frontUrl}" target="_blank" class="kyc-doc-link" rel="noopener">
            <i class="bi bi-file-image"></i> View Image
          </a>
        </div>
      </div>
    `;
  }

  // AADHAAR (Front + Back)
  if (
    grouped.aadhaar &&
    (grouped.aadhaar.frontUrl || grouped.aadhaar.backUrl)
  ) {
    const f = grouped.aadhaar.frontUrl || "";
    const b = grouped.aadhaar.backUrl || "";
    html += `
      <div class="kyc-doc-group">
        <div class="kyc-doc-group-title">AADHAAR</div>
        <div class="kyc-doc-links">
          ${
            f
              ? `<a href="${f}" target="_blank" class="kyc-doc-link" rel="noopener"><i class="bi bi-file-image"></i> Front</a>`
              : ""
          }
          ${
            b
              ? `<a href="${b}" target="_blank" class="kyc-doc-link" rel="noopener"><i class="bi bi-file-image"></i> Back</a>`
              : ""
          }
        </div>
      </div>
    `;
  }

  // PAN (Front + Back)
  if (grouped.pan && (grouped.pan.frontUrl || grouped.pan.backUrl)) {
    const f = grouped.pan.frontUrl || "";
    const b = grouped.pan.backUrl || "";
    html += `
      <div class="kyc-doc-group">
        <div class="kyc-doc-group-title">PAN</div>
        <div class="kyc-doc-links">
          ${
            f
              ? `<a href="${f}" target="_blank" class="kyc-doc-link" rel="noopener"><i class="bi bi-file-image"></i> Front</a>`
              : ""
          }
          ${
            b
              ? `<a href="${b}" target="_blank" class="kyc-doc-link" rel="noopener"><i class="bi bi-file-image"></i> Back</a>`
              : ""
          }
        </div>
      </div>
    `;
  }

  // If nothing found, show a subtle message (keeps compatibility)
  if (!html) {
    html = '<p class="text-muted">No documents available</p>';
  }

  return html;
}

// Open modal and show grouped documents in a clean grid layout
// Accepts either an array (direct call) or a JSON string (defensive)
function openDocumentModal(kyc) {
  let data = kyc;

  if (typeof kyc === "string") {
    try {
      data = JSON.parse(kyc);
    } catch (err) {
      console.error("openDocumentModal: failed to parse KYC JSON", err);
      return;
    }
  }

  const { aadhaarNumber, panNumber, documents } = data;

  const grouped = groupDocuments(Array.isArray(documents) ? documents : []);

  // Build modal grid HTML — selfie first, then Aadhaar, then PAN
  let html = `
  <div class="mb-3 p-3 border rounded bg-light">
    <h6 class="fw-bold mb-2">KYC Numbers</h6>
    <p class="mb-1"><strong>Aadhaar Number:</strong> ${aadhaarNumber || "-"}</p>
    <p class="mb-0"><strong>PAN Number:</strong> ${panNumber || "-"}</p>
  </div>
  <div class="modal-document-grid">
`;

  // SELFIE (single large preview)
  if (grouped.selfie && grouped.selfie.frontUrl) {
    html += `
      <div class="modal-document-item">
        <img src="${grouped.selfie.frontUrl}" alt="Selfie" loading="lazy">
        <div class="modal-document-label">SELFIE</div>
      </div>
    `;
  }

  // AADHAAR front/back
  if (
    grouped.aadhaar &&
    (grouped.aadhaar.frontUrl || grouped.aadhaar.backUrl)
  ) {
    if (grouped.aadhaar.frontUrl) {
      html += `
        <div class="modal-document-item">
          <img src="${grouped.aadhaar.frontUrl}" alt="Aadhaar Front" loading="lazy">
          <div class="modal-document-label">AADHAAR (Front)</div>
        </div>
      `;
    }
    if (grouped.aadhaar.backUrl) {
      html += `
        <div class="modal-document-item">
          <img src="${grouped.aadhaar.backUrl}" alt="Aadhaar Back" loading="lazy">
          <div class="modal-document-label">AADHAAR (Back)</div>
        </div>
      `;
    }
  }

  // PAN front/back
  if (grouped.pan && (grouped.pan.frontUrl || grouped.pan.backUrl)) {
    if (grouped.pan.frontUrl) {
      html += `
        <div class="modal-document-item">
          <img src="${grouped.pan.frontUrl}" alt="PAN Front" loading="lazy">
          <div class="modal-document-label">PAN (Front)</div>
        </div>
      `;
    }
    // if (grouped.pan.backUrl) {
    //   html += `
    //     <div class="modal-document-item">
    //       <img src="${grouped.pan.backUrl}" alt="PAN Back" loading="lazy">
    //       <div class="modal-document-label">PAN (Back)</div>
    //     </div>
    //   `;
    // }
  }

  html += `</div>`;

  const container = document.getElementById("documentModalContent");
  if (container) {
    container.innerHTML = html;
    const modalEl = document.getElementById("documentModal");
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  } else {
    console.error("openDocumentModal: #documentModalContent not found");
  }
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
  expandedRowId = null; // Collapse expanded row on page change
  renderTable();
}

// ================================
// SEARCH INPUT HANDLER
// ================================
document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value;
  expandedRowId = null;
  applyFilters();
});

// ================================
// STATUS FILTER HANDLER
// ================================
document.getElementById("filterStatus").addEventListener("change", (e) => {
  statusFilter = e.target.value;
  expandedRowId = null;
  applyFilters();
});

// ================================
// STATUS COLOR
// ================================
function getStatusColor(status) {
  switch (status) {
    case "approved":
      return "success";
    case "auto_approved":
      return "primary";
    case "rejected":
      return "danger";
    default:
      return "warning";
  }
}

// ================================
// AUTO-APPROVE TIMER
// ================================
function startTimers() {
  filteredList.forEach((item) => {
    if (item.status !== "pending") return;

    const timerEl = document.getElementById(`timer-${item._id}`);
    if (!timerEl) return;

    const created = new Date(item.submittedAt).getTime();
    const expireTime = created + 6 * 60 * 60 * 1000;

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
    if (res.success) {
      expandedRowId = null;
      loadKyc();
    }
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

document
  .getElementById("rejectSubmitBtn")
  .addEventListener("click", async () => {
    const note = document.getElementById("rejectNote").value.trim();
    if (!note) return alert("Please enter a rejection reason.");

    try {
      const res = await API.patch(`/kyc/admin/reject/${rejectKycId}`, { note });
      if (res.success) {
        bootstrap.Modal.getInstance(
          document.getElementById("rejectModal")
        ).hide();
        expandedRowId = null;
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
