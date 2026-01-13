/**
 * Sales Activity – Read Only
 * Uses MY TEAM activity feed
 */

let page = 1;
const limit = 20;
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     RBAC GUARD
  ========================= */
  const currentUser = AUTH.getCurrentUser();

  if (
    !AUTH.isAuthenticated() ||
    !["sales_team", "admin", "super_admin"].includes(currentUser?.role)
  ) {
    AUTH.unauthorizedRedirect();
    return;
  }

  /* =========================
     TOP USER NAME
  ========================= */
  const topUserEl = document.getElementById("topUserName");
  if (topUserEl) {
    topUserEl.textContent = currentUser?.name || "User";
  }

  /* =========================
     PAGINATION
  ========================= */
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (page > 1) {
      page--;
      fetchActivity();
    }
  });

  document.getElementById("nextPage")?.addEventListener("click", () => {
    page++;
    fetchActivity();
  });

  fetchActivity();
});

/* =========================
   FILTER CHANGE
========================= */
function changeFilter(type) {
  currentFilter = type;
  page = 1;

  document
    .querySelectorAll("#activityTabs .nav-link")
    .forEach((el) => el.classList.remove("active"));

  event.target.classList.add("active");

  fetchActivity();
}

/* =========================
   FETCH ACTIVITY
========================= */
async function fetchActivity() {
  try {
    const query = { page, limit };
    if (currentFilter !== "all") {
      query.type = currentFilter;
    }

    const url = API.buildURL("/sales/my-activity");

    const res = await API.get(url, {}, query);

    if (!res?.success) {
      throw new Error("API failed");
    }

    renderActivity(res.data?.activities || []);
    renderPagination(res.data?.pagination);

    if (res.data?.pagination && page > res.data.pagination.totalPages) {
      page = res.data.pagination.totalPages;
    }
  } catch (e) {
    console.error(e);
    alert("Failed to load activity");
  }
}

/* =========================
   RENDER ACTIVITY FEED
========================= */
function renderActivity(activities = []) {
  const list = document.getElementById("activityList");
  if (!list) return;

  if (!activities.length) {
    list.innerHTML = `
      <li class="list-group-item text-muted text-center">
        No activity found
      </li>
    `;
    return;
  }

  list.innerHTML = activities
    .map((a) => {
      const icon =
        a.type === "signup"
          ? "bi-person-plus"
          : a.type === "order"
          ? "bi-cart-check"
          : a.type === "payment"
          ? "bi-cash-coin"
          : "bi-dot";

      const message = buildMessage(a);

      return `
        <li class="list-group-item">
          <div class="d-flex">
            <i class="bi ${icon} fs-4 me-3 text-primary"></i>
            <div>
              <div>${message}</div>
              <small class="text-muted">
                ${new Date(a.timestamp).toLocaleString("en-IN")}
                • L${a.level}
              </small>
            </div>
          </div>
        </li>
      `;
    })
    .join("");
}

/* =========================
   MESSAGE BUILDER
========================= */
function buildMessage(a) {
  switch (a.type) {
    case "signup":
      return `<strong>${a.user?.name}</strong> joined via <strong>${
        a.referredBy?.name || "Direct"
      }</strong>`;
    case "order":
      return `<strong>${a.user?.name}</strong> placed order for <strong>${a.details?.productName}</strong>`;
    case "payment":
      return `<strong>${a.user?.name}</strong> paid ₹${a.details?.amount}`;
    default:
      return "Activity recorded";
  }
}

/* =========================
   PAGINATION UI
========================= */
function renderPagination(pagination) {
  if (!pagination) return;

  document.getElementById(
    "pageInfo"
  ).textContent = `Page ${pagination.page} of ${pagination.totalPages}`;

  document.getElementById("prevPage").disabled = pagination.page <= 1;
  document.getElementById("nextPage").disabled =
    pagination.page >= pagination.totalPages;
}
