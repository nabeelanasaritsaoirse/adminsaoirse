// ===============================
// 🔵 REVIEWS ADMIN CONTROLLER
// ===============================

const ReviewsAdmin = (() => {
  const token = AUTH.getToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let currentPage = 1;
  let currentStatus = "";

  // ===============================
  // 🔵 INIT
  // ===============================

  function init() {
    loadStats();
    loadReviews();

    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        currentStatus = e.target.value;
        loadReviews(1);
      });
    }
  }

  // ===============================
  // 🔵 LOAD STATS
  // ===============================

  async function loadStats() {
    try {
      const res = await fetch(`${BASE_URL}/reviews/admin/stats`, {
        headers,
      });

      const result = await res.json();
      if (!result.success) return showError(result.message);

      const stats = result.data.stats;

      document.getElementById("totalReviews").textContent = stats.totalReviews;
      document.getElementById("publishedReviews").textContent =
        stats.publishedReviews;
      document.getElementById("flaggedReviews").textContent =
        stats.flaggedReviews;
      document.getElementById("averageRating").textContent =
        stats.averageRating;
    } catch (err) {
      console.error(err);
      showError("Failed to load review statistics");
    }
  }

  // ===============================
  // 🔵 LOAD TABLE
  // ===============================

  async function loadReviews(page = 1) {
    try {
      currentPage = page;

      let url = `${BASE_URL}/reviews/admin/all?page=${page}&limit=20`;
      if (currentStatus) url += `&status=${currentStatus}`;

      const res = await fetch(url, { headers });
      const result = await res.json();

      if (!result.success) return showError(result.message);

      renderTable(result.data.reviews);
      renderPagination(result.data.pagination);
    } catch (err) {
      console.error(err);
      showError("Failed to load reviews");
    }
  }

  function renderTable(reviews) {
    const table = document.getElementById("reviewsTable");
    table.innerHTML = "";

    if (!reviews.length) {
      table.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">
            No reviews found
          </td>
        </tr>
      `;
      return;
    }

    reviews.forEach((review) => {
      table.innerHTML += `
        <tr>
          <td>${review.user?.name || "-"}</td>
          <td>${review.product?.name || "-"}</td>
          <td>${review.rating} ⭐</td>
          <td>
            <span class="badge bg-${statusColor(review.status)}">
              ${review.status}
            </span>
          </td>
          <td>${formatDate(review.createdAt)}</td>
          <td>
            <button class="btn btn-sm btn-primary"
              onclick="ReviewsAdmin.openModal('${review._id}')">
              View
            </button>
          </td>
        </tr>
      `;
    });
  }

  function statusColor(status) {
    if (status === "published") return "success";
    if (status === "flagged") return "danger";
    if (status === "unpublished") return "secondary";
    return "dark";
  }

  // ===============================
  // 🔵 PAGINATION
  // ===============================

  function renderPagination(pagination) {
    // Optional: add pagination UI if needed
  }

  // ===============================
  // 🔵 REVIEW MODAL
  // ===============================

  async function openModal(id) {
    try {
      const res = await fetch(`${BASE_URL}/reviews/admin/${id}`, {
        headers,
      });

      const result = await res.json();
      if (!result.success) return showError(result.message);

      const review = result.data.review;

      document.getElementById("reviewModalBody").innerHTML = `
        <p><strong>User:</strong> ${review.user.name}</p>
        <p><strong>Email:</strong> ${review.user.email}</p>
        <p><strong>Product:</strong> ${review.product.name}</p>
        <p><strong>Rating:</strong> ${review.rating} ⭐</p>
        <p><strong>Title:</strong> ${review.title}</p>
        <p><strong>Comment:</strong><br>${review.comment}</p>

        <hr>

        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-success"
            onclick="ReviewsAdmin.publish('${review._id}')">
            Publish
          </button>

          <button class="btn btn-warning"
            onclick="ReviewsAdmin.unpublish('${review._id}')">
            Unpublish
          </button>

          <button class="btn btn-danger"
            onclick="ReviewsAdmin.delete('${review._id}')">
            Delete
          </button>
        </div>

        <hr>

        <textarea id="adminResponseMessage"
          class="form-control"
          placeholder="Write seller response..."></textarea>

        <button class="btn btn-dark mt-2"
          onclick="ReviewsAdmin.respond('${review._id}')">
          Respond
        </button>
      `;

      new bootstrap.Modal(document.getElementById("reviewModal")).show();
    } catch (err) {
      console.error(err);
      showError("Failed to load review details");
    }
  }

  // ===============================
  // 🔵 ADMIN ACTIONS
  // ===============================

  async function publish(id) {
    await adminAction(`/reviews/admin/${id}/publish`, "PATCH");
  }

  async function unpublish(id) {
    await adminAction(`/reviews/admin/${id}/unpublish`, "PATCH");
  }

  async function deleteReview(id) {
    if (!confirm("Are you sure you want to delete this review?")) return;
    await adminAction(`/reviews/admin/${id}`, "DELETE");
  }

  async function respond(id) {
    const message = document.getElementById("adminResponseMessage").value;
    if (!message) return alert("Response message required");

    await fetch(`${BASE_URL}/reviews/admin/${id}/respond`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
    });

    alert("Response added");
    loadReviews(currentPage);
  }

  async function adminAction(endpoint, method) {
    await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
    });

    loadReviews(currentPage);
    loadStats();
  }

  // ===============================
  // 🔵 HELPERS
  // ===============================

  function formatDate(date) {
    return new Date(date).toLocaleDateString();
  }

  function showError(message) {
    alert(message);
  }

  // ===============================
  // 🔵 PUBLIC API
  // ===============================

  return {
    init,
    openModal,
    publish,
    unpublish,
    delete: deleteReview,
    respond,
  };
})();

// ===============================
// 🔵 AUTO INIT
// ===============================

document.addEventListener("DOMContentLoaded", ReviewsAdmin.init);
