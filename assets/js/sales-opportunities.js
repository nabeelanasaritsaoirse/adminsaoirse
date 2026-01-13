/**
 * Sales Opportunities – MY TEAM
 */

let page = 1;
const limit = 20;
let type = "all";

document.addEventListener("DOMContentLoaded", () => {
  const user = AUTH.getCurrentUser();

  if (
    !AUTH.isAuthenticated() ||
    !["sales_team", "admin", "super_admin"].includes(user?.role)
  ) {
    AUTH.unauthorizedRedirect();
    return;
  }

  document.getElementById("topUserName").textContent = user?.name || "User";

  document.getElementById("prevPage").onclick = () => {
    if (page > 1) {
      page--;
      fetchOpportunities();
    }
  };

  document.getElementById("nextPage").onclick = () => {
    page++;
    fetchOpportunities();
  };

  fetchOpportunities();
});

function setType(t) {
  type = t;
  page = 1;

  document
    .querySelectorAll(".nav-link")
    .forEach((b) => b.classList.remove("active"));
  event.target.classList.add("active");

  fetchOpportunities();
}

async function fetchOpportunities() {
  try {
    const query = { page, limit };
    if (type !== "all") query.type = type;

    const res = await API.get("/sales/my-opportunities", {}, query);

    if (!res?.success) throw new Error();

    renderTable(res.data.opportunities || []);
    renderPagination(res.data.pagination);
  } catch (e) {
    alert("Failed to load opportunities");
  }
}

function renderTable(items) {
  const tbody = document.getElementById("opportunityTable");

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No opportunities</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map(
      (o) => `
      <tr>
        <td>${o.name}</td>
        <td><span class="badge bg-warning text-dark">${o.type}</span></td>
        <td>L${o.level}</td>
        <td>${JSON.stringify(o.details || {}).replace(/[{}"]/g, "")}</td>
        <td>${new Date(
          o.details?.lastActivity || o.timestamp || Date.now()
        ).toLocaleDateString()}</td>
      </tr>
    `
    )
    .join("");
}

function renderPagination(p) {
  if (!p) return;
  document.getElementById(
    "pageInfo"
  ).textContent = `Page ${p.page} of ${p.totalPages}`;
  document.getElementById("prevPage").disabled = p.page <= 1;
  document.getElementById("nextPage").disabled = p.page >= p.totalPages;
}
