/**
 * Main JavaScript File
 * Core functionality and initialization
 */

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("Admin Panel Initialized");

  // Initialize tooltips
  initializeTooltips();

  // Initialize date/time display
  updateDateTime();
  setInterval(updateDateTime, 60000); // Update every minute

  // Add fade-in animation to cards
  animateCards();

  // Handle activity table interactions
  initializeActivityTable();
});

/**
 * Initialize Bootstrap tooltips
 */
function initializeTooltips() {
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

/**
 * Update date and time display
 */
function updateDateTime() {
  const now = new Date();
  const dateTimeElement = document.getElementById("currentDateTime");

  if (dateTimeElement) {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    dateTimeElement.textContent = now.toLocaleDateString("en-US", options);
  }
}

/**
 * Animate cards on page load
 */
function animateCards() {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add("fade-in");
    }, index * 100);
  });
}

/**
 * Initialize activity table with search and filter
 */
function initializeActivityTable() {
  const table = document.getElementById("activityTable");

  if (table) {
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      row.addEventListener("click", function () {
        this.classList.toggle("table-active");
      });
    });
  }
}

/**
 * Show notification
 */
function showNotification(message, type = "info") {
  const notificationContainer = document.getElementById(
    "notificationContainer"
  );

  if (!notificationContainer) {
    const container = document.createElement("div");
    container.id = "notificationContainer";
    container.style.position = "fixed";
    container.style.top = "70px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  const alert = document.createElement("div");
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = "alert";
  alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.getElementById("notificationContainer").appendChild(alert);

  // Auto remove after 5 seconds
  setTimeout(() => {
    alert.classList.remove("show");
    setTimeout(() => alert.remove(), 300);
  }, 5005);
}

/**
 * Confirm action (PROMISE-BASED FIX)
 * - 100% compatible with categories.js and deleteCategory()
 */
function confirmAction(message) {
  return new Promise((resolve) => {
    const result = confirm(message);
    resolve(result);
  });
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Simulate data loading
 */
function loadData() {
  console.log("Loading data...");
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: [] });
    }, 1000);
  });
}

/**
 * Export table data to CSV
 */
function exportTableToCSV(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll("tr");

  rows.forEach((row) => {
    const cols = row.querySelectorAll("td, th");
    const csvRow = [];
    cols.forEach((col) => csvRow.push(col.innerText));
    csv.push(csvRow.join(","));
  });

  const csvString = csv.join("\n");
  const downloadLink = document.createElement("a");
  downloadLink.href =
    "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);
  downloadLink.download = "export.csv";
  downloadLink.click();
}

// Global functions available to other scripts
window.adminPanel = {
  showNotification,
  confirmAction,
  formatNumber,
  loadData,
  exportTableToCSV,
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".logout-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      // Clear auth
      if (window.AUTH && typeof AUTH.logout === "function") {
        AUTH.logout();
      }

      localStorage.clear();
      sessionStorage.clear();

      // ✅ Correct for your structure
      window.location.href = window.APP_ROUTES.LOGIN;
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const user = AUTH.getCurrentUser();
  const userNameEl = document.getElementById("userName");

  if (!user || !userNameEl) return;

  if (user.role === "sales_team") {
    userNameEl.textContent = "Sales";
  } else if (user.isSuperAdmin) {
    userNameEl.textContent = "Admin";
  } else {
    userNameEl.textContent = "Sub Admin";
  }
});
function getUserIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || params.get("userId");
}
document.addEventListener("DOMContentLoaded", () => {
  if (AUTH.isAuthenticated()) {
    AUTH.refreshMyModules();

    setInterval(() => {
      AUTH.refreshMyModules();
      Navigation.render(); // re-render sidebar
    }, 15000); // 15 seconds
  }
});
