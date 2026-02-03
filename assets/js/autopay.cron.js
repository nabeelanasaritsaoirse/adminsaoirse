// assets/js/autopay.cron.js

const CRON_REFRESH_INTERVAL = 60000; // 60 seconds
let cronIntervalId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadCronStatus();
  startCronAutoRefresh();

  const triggerBtn = document.getElementById("triggerAutopayBtn");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", handleManualTrigger);
  }
});

/**
 * ============================
 * LOAD CRON STATUS
 * ============================
 */
async function loadCronStatus() {
  try {
    console.log("[AUTOPAY][CRON] Fetching cron status...");

    // ✅ Use global API wrapper
    const res = await API.get("/installments/admin/autopay/cron-status");

    renderCronStatus(res.data);
  } catch (err) {
    console.error("[AUTOPAY][CRON] Error:", err);
    renderCronError(err.message || "Unknown error");
  }
}

/**
 * ============================
 * RENDER CRON STATUS
 * ============================
 */
function renderCronStatus(data) {
  const container = document.getElementById("cronStatusContainer");
  if (!container) return;

  const jobs = data.jobs || {};
  const serverTime = data.serverTime;
  const timezone = data.timezone;

  let html = `<div class="row mb-3">`;

  Object.keys(jobs).forEach((slot) => {
    const job = jobs[slot];
    const statusClass = job.running ? "success" : "danger";
    const statusText = job.running ? "Running" : "Stopped";

    html += `
      <div class="col-md-4 mb-3">
        <div class="card border-left-${statusClass} shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between">
              <div>
                <div class="fw-bold">${formatTimeSlot(slot)}</div>
                <div class="text-${statusClass}">${statusText}</div>
                <small class="text-muted">
                  Last Run: ${formatDateTime(job.lastRun)}
                </small>
              </div>
              <i class="bi bi-clock-history fs-2 text-muted"></i>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  html += `
    <div class="text-muted small">
      Server Time: ${formatDateTime(serverTime)} (${timezone})
    </div>
  `;

  container.innerHTML = html;
}

/**
 * ============================
 * ERROR STATE
 * ============================
 */
function renderCronError(message) {
  const container = document.getElementById("cronStatusContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-danger">
      Failed to load cron status: ${message}
    </div>
  `;
}

/**
 * ============================
 * AUTO REFRESH
 * ============================
 */
function startCronAutoRefresh() {
  if (cronIntervalId) clearInterval(cronIntervalId);

  cronIntervalId = setInterval(() => {
    loadCronStatus();
  }, CRON_REFRESH_INTERVAL);
}

/**
 * ============================
 * MANUAL AUTOPAY TRIGGER
 * ============================
 */
async function handleManualTrigger() {
  const timeSlotSelect = document.getElementById("triggerTimeSlot");
  const timeSlot = timeSlotSelect?.value;

  if (!timeSlot) {
    alert("Please select a time slot");
    return;
  }

  const confirmed = confirm(
    `Are you sure you want to manually trigger autopay for ${formatTimeSlot(
      timeSlot,
    )}?\n\nThis action will process real payments.`,
  );

  if (!confirmed) return;

  try {
    console.log("[AUTOPAY][TRIGGER] Triggering for:", timeSlot);

    // ✅ Use API.post
    const res = await API.post("/installments/admin/autopay/trigger", {
      timeSlot,
    });

    showTriggerResult(res.data);

    // Refresh cron status after trigger
    setTimeout(loadCronStatus, 2000);
  } catch (err) {
    console.error("[AUTOPAY][TRIGGER] Error:", err);
    alert(`Autopay trigger failed: ${err.message}`);
  }
}

/**
 * ============================
 * RESULT DISPLAY
 * ============================
 */
function showTriggerResult(data) {
  const message = `
Autopay Triggered Successfully

Processed Users: ${data.processedUsers}
Successful Payments: ${data.successfulPayments}
Failed Payments: ${data.failedPayments}
Total Amount: ₹${data.totalAmount}
  `.trim();

  alert(message);
}

/**
 * ============================
 * UTILITIES
 * ============================
 */
function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
}
