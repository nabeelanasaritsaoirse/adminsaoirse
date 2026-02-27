/*************************************************
 * DATABASE BACKUP MANAGER
 *************************************************/

const BACKUP_API = {
  DOWNLOAD: `${BASE_URL}/admin/backup/download`,
  TRIGGER: `${BASE_URL}/admin/backup/trigger`,
  LIST: `${BASE_URL}/admin/backup/list`,
  URL: `${BASE_URL}/admin/backup/url`,
};

let backups = [];
let actionRunning = false;

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  initializeBackupManager();
});

function initializeBackupManager() {
  attachEventListeners();
  fetchBackupList();
}

/*************************************************
 * EVENT LISTENERS
 *************************************************/
function attachEventListeners() {
  document
    .getElementById("downloadBackupBtn")
    ?.addEventListener("click", downloadDirectBackup);

  document
    .getElementById("triggerBackupBtn")
    ?.addEventListener("click", triggerS3Backup);

  document
    .getElementById("refreshBackupBtn")
    ?.addEventListener("click", fetchBackupList);
}

/*************************************************
 * STATUS HANDLER
 *************************************************/
function setStatus(message, type = "muted") {
  const el = document.getElementById("backupStatus");
  if (!el) return;

  el.className = `text-${type}`;
  el.innerText = message;
}

/*************************************************
 * API 3 — LIST BACKUPS
 *************************************************/
async function fetchBackupList() {
  try {
    setStatus("Loading backups...", "secondary");

    const res = await fetch(BACKUP_API.LIST, {
      method: "GET",
      headers: AUTH.getAuthHeaders(),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    backups = (data.backups || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    renderBackupTable();
    updateStats();
    checkBackupHealth();

    setStatus("Backup list updated ✅", "success");
  } catch (error) {
    console.error(error);
    setStatus("Failed to load backups", "danger");
  }
}

/*************************************************
 * RENDER TABLE
 *************************************************/
function renderBackupTable() {
  const tbody = document.getElementById("backupTableBody");

  if (!tbody) return;

  if (!backups.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          No backups found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = backups
    .map(
      (backup) => `
      <tr>
        <td>${backup.name}</td>
        <td>${backup.sizeKB} KB</td>
        <td>${formatDate(backup.createdAt)}</td>
        <td>
          <button 
            class="btn btn-sm btn-primary"
            onclick="downloadFromS3('${backup.fileName}')"
          >
            <i class="bi bi-download"></i> Download
          </button>
        </td>
      </tr>
    `,
    )
    .join("");
}

/*************************************************
 * UPDATE STATS CARDS
 *************************************************/
function updateStats() {
  document.getElementById("totalBackups").innerText = backups.length || 0;

  if (backups.length > 0) {
    const latest = backups[0];

    document.getElementById("latestBackupSize").innerText =
      `${latest.sizeKB} KB`;

    document.getElementById("lastBackupTime").innerText = formatDate(
      latest.createdAt,
    );
  }
}

/*************************************************
 * API 1 — DIRECT DOWNLOAD
 *************************************************/
async function downloadDirectBackup() {
  if (!confirm("Download full database backup?")) return;
  try {
    setStatus("Preparing database download...", "warning");

    const response = await fetch(BACKUP_API.DOWNLOAD, {
      method: "GET",
      headers: AUTH.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Backup download failed");
    }

    const disposition = response.headers.get("Content-Disposition");

    let fileName = "epi_backup.json.gz";

    if (disposition && disposition.includes("filename")) {
      fileName = disposition.split("filename=")[1].replace(/"/g, "");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);

    setStatus("Download started ✅", "success");
  } catch (error) {
    console.error(error);
    setStatus("Download failed", "danger");
  }
}

/*************************************************
 * API 2 — TRIGGER S3 BACKUP
 *************************************************/
async function triggerS3Backup() {
  if (actionRunning) return;

  actionRunning = true;

  const btn = document.getElementById("triggerBackupBtn");
  const originalHTML = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Creating...`;

  try {
    setStatus("Creating S3 backup...", "warning");

    const response = await fetch(BACKUP_API.TRIGGER, {
      method: "POST",
      headers: {
        ...AUTH.getAuthHeaders(),
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    setStatus(`Backup saved ✅ Size: ${result.data.sizeKB} KB`, "success");

    fetchBackupList();
  } catch (error) {
    console.error(error);
    setStatus("S3 backup failed", "danger");
  }

  btn.disabled = false;
  btn.innerHTML = originalHTML;
  actionRunning = false;
}

/*************************************************
 * API 4 — DOWNLOAD FROM S3
 *************************************************/
async function downloadFromS3(fileName) {
  try {
    setStatus("Generating secure download link...", "warning");

    const encoded = encodeURIComponent(fileName);

    const response = await fetch(`${BACKUP_API.URL}?fileName=${encoded}`, {
      method: "GET",
      headers: AUTH.getAuthHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    window.open(result.downloadUrl, "_blank");

    setStatus("Download link opened (expires in 1 hour) ✅", "success");
  } catch (error) {
    console.error(error);
    setStatus("Failed to generate download link", "danger");
  }
}
function checkBackupHealth() {
  if (!backups.length) {
    setStatus("⚠ No backups found!", "danger");
    return;
  }

  const latestBackup = new Date(backups[0].createdAt);
  const now = new Date();

  const diffDays = (now - latestBackup) / (1000 * 60 * 60 * 24);

  if (diffDays > 7) {
    setStatus("⚠ Last backup older than 7 days", "warning");
  }
}
/*************************************************
 * UTIL
 *************************************************/
function formatDate(date) {
  if (!date) return "--";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
