// image-uploader.js
// Requires global: API_CONFIG, API, AUTH, adminPanel (optional)

/* Utility - safe notifier */
function notify(message, type = "info") {
  if (window.adminPanel && typeof window.adminPanel.showNotification === "function") {
    window.adminPanel.showNotification(message, type === "error" ? "danger" : type);
  } else {
    if (type === "error") alert("Error: " + message);
    else alert(message);
  }
}

/* Safe JSON parse helper */
async function safeJson(resp) {
  try {
    return await resp.json();
  } catch (e) {
    return null;
  }
}

/* DOM-ready init */
document.addEventListener("DOMContentLoaded", () => {
  try {
    initImageUploader();
  } catch (e) {
    console.error("image-uploader init failed", e);
  }
});

function initImageUploader() {
  const btnUploadBanner = document.getElementById("btnUploadBanner");
  const btnClearBanner = document.getElementById("btnClearBanner");
  const btnUploadStory = document.getElementById("btnUploadStory");
  const btnClearStory = document.getElementById("btnClearStory");
  const btnRefreshBanners = document.getElementById("btnRefreshBanners");
  const btnRefreshStories = document.getElementById("btnRefreshStories");

  if (btnUploadBanner) btnUploadBanner.addEventListener("click", uploadBanner);
  if (btnClearBanner) btnClearBanner.addEventListener("click", clearBannerForm);
  if (btnUploadStory) btnUploadStory.addEventListener("click", uploadStory);
  if (btnClearStory) btnClearStory.addEventListener("click", clearStoryForm);
  if (btnRefreshBanners) btnRefreshBanners.addEventListener("click", loadBanners);
  if (btnRefreshStories) btnRefreshStories.addEventListener("click", loadStories);

  loadBanners();
  loadStories();
  setupImagePreviews();
}

/* -----------------------------
   IMAGE PREVIEW HANDLERS
----------------------------- */

function setupImagePreviews() {
  const bannerInput = document.getElementById("bannerImage");
  const bannerPreview = document.getElementById("bannerPreview");

  if (bannerInput && bannerPreview) {
    bannerInput.addEventListener("change", () => {
      const file = bannerInput.files[0];
      if (file) {
        bannerPreview.src = URL.createObjectURL(file);
        bannerPreview.style.display = "block";
      } else {
        bannerPreview.src = "";
        bannerPreview.style.display = "none";
      }
    });
  }

  const storyInput = document.getElementById("storyImage");
  const storyPreview = document.getElementById("storyPreview");

  if (storyInput && storyPreview) {
    storyInput.addEventListener("change", () => {
      const file = storyInput.files[0];
      if (file) {
        storyPreview.src = URL.createObjectURL(file);
        storyPreview.style.display = "block";
      } else {
        storyPreview.src = "";
        storyPreview.style.display = "none";
      }
    });
  }
}

/* -----------------------------
   BANNERS
----------------------------- */

async function loadBanners() {
  const tbody = document.getElementById("bannersTableBody");
  const bannerCount = document.getElementById("bannerCount");

  if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
  if (bannerCount) bannerCount.textContent = "(loading...)";

  try {
    const res = await API.get("/banners/admin/all", {}, { page: 1, limit: 200 });
    const banners = res.data || res || [];

    if (bannerCount)
      bannerCount.textContent = `(${res.pagination?.total ?? banners.length})`;

    if (!banners.length) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">No banners found</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    banners.forEach((b, i) =>
      tbody.insertAdjacentHTML("beforeend", renderBannerRow(b, i + 1))
    );

  } catch (err) {
    notify("Failed to load banners", "error");
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">Failed to load</td></tr>`;
    if (bannerCount) bannerCount.textContent = "(error)";
  }
}

function renderBannerRow(b, idx) {
  const activeBadge = b.isActive
    ? `<span class="badge bg-success">Active</span>`
    : `<span class="badge bg-warning">Inactive</span>`;

  const created = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-";
  const imageUrl = b.imageUrl || b.s3Url || "";

  return `
    <tr>
      <td>${idx}</td>
      <td><img src="${escapeHtml(imageUrl)}" class="thumb"></td>
      <td style="max-width:220px;">
        <strong>${escapeHtml(b.title || "")}</strong>
        <div class="text-muted small">${escapeHtml((b.description || "").substring(0, 120))}</div>
      </td>
      <td>${escapeHtml(b.platform || "both")}</td>
      <td>${b.displayOrder ?? 0}</td>
      <td>${activeBadge}</td>
      <td>${created}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary" onclick="openEditBannerModal('${b._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-secondary" onclick="openReplaceBannerImageModal('${b._id}')"><i class="bi bi-image"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="toggleBanner('${b._id}')"><i class="bi bi-toggle-on"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="softDeleteBanner('${b._id}')"><i class="bi bi-trash"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="permanentlyDeleteBanner('${b._id}')"><i class="bi bi-x-circle"></i></button>
        </div>
      </td>
    </tr>
  `;
}

/* UPLOAD BANNER */

async function uploadBanner() {
  const title = document.getElementById("bannerTitle")?.value?.trim() || "";
  const description = document.getElementById("bannerDescription")?.value?.trim() || "";
  const platform = document.getElementById("bannerPlatform")?.value || "both";
  const displayOrder = document.getElementById("bannerOrder")?.value?.trim() || 0;
  const linkUrl = document.getElementById("bannerLink")?.value?.trim() || "";
  const redirectType = document.getElementById("bannerRedirectType")?.value || "none";
  const redirectValue = document.getElementById("bannerRedirectValue")?.value?.trim() || "";
  const fileInput = document.getElementById("bannerImage");

  if (!title) return notify("Enter banner title", "warning");
  if (!fileInput?.files?.length) return notify("Select a banner image", "warning");

  if (redirectType !== "none" && !redirectValue)
    return notify(`Enter redirect value for ${redirectType}`, "warning");

  const file = fileInput.files[0];
  const formData = new FormData();

  formData.append("title", title);
  formData.append("description", description);
  formData.append("platform", platform);
  formData.append("displayOrder", displayOrder);
  formData.append("linkUrl", linkUrl);
  formData.append("redirectType", redirectType);
  formData.append("redirectValue", redirectValue);
  formData.append("image", file);

  try {
    const headers = AUTH.getAuthHeaders();
    const resp = await fetch(`${API_CONFIG.baseURL}/banners`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await safeJson(resp);
    if (!resp.ok) throw new Error(data?.message || "Upload failed");

    notify("Banner uploaded", "success");
    clearBannerForm();
    loadBanners();

  } catch (err) {
    notify("Banner upload failed", "error");
  }
}

function clearBannerForm() {
  const form = document.getElementById("bannerUploadForm");
  if (form) form.reset();

  const preview = document.getElementById("bannerPreview");
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }

  document.getElementById("bannerRedirectType").value = "none";
  document.getElementById("bannerRedirectValue").value = "";
}

/* -----------------------------
   Edit Banner
----------------------------- */

function openEditBannerModal(bannerId) {
  (async () => {
    try {
      const res = await API.get("/banners/:id", { id: bannerId });
      injectEditBannerModal(res.data || res);
    } catch {
      notify("Failed to load banner", "error");
    }
  })();
}

function injectEditBannerModal(b) {
  const existing = document.getElementById("editBannerModal");
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="editBannerModal">
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">Edit Banner - ${escapeHtml(b.title)}</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <form id="editBannerForm">

              <div class="mb-2">
                <label class="form-label">Title</label>
                <input id="editBannerTitle" class="form-control" value="${escapeHtml(b.title)}">
              </div>

              <div class="mb-2">
                <label class="form-label">Description</label>
                <textarea id="editBannerDescription" class="form-control">${escapeHtml(b.description || "")}</textarea>
              </div>

              <div class="mb-2">
                <label class="form-label">Platform</label>
                <select id="editBannerPlatform" class="form-select">
                  <option value="both" ${b.platform === "both" ? "selected" : ""}>Both</option>
                  <option value="web" ${b.platform === "web" ? "selected" : ""}>Web</option>
                  <option value="app" ${b.platform === "app" ? "selected" : ""}>App</option>
                </select>
              </div>

              <div class="mb-2 row">
                <div class="col">
                  <label class="form-label">Display Order</label>
                  <input id="editBannerOrder" type="number" class="form-control" value="${b.displayOrder || 0}">
                </div>

                <div class="col">
                  <label class="form-label">Link URL</label>
                  <input id="editBannerLink" class="form-control" value="${escapeHtml(b.linkUrl || "")}">
                </div>
              </div>

              <div class="mb-2">
                <label class="form-label">Redirect Type</label>
                <select id="editBannerRedirectType" class="form-select">
                  <option value="none" ${b.redirectType === "none" ? "selected" : ""}>None</option>
                  <option value="product" ${b.redirectType === "product" ? "selected" : ""}>Product</option>
                  <option value="category" ${b.redirectType === "category" ? "selected" : ""}>Category</option>
                  <option value="url" ${b.redirectType === "url" ? "selected" : ""}>External URL</option>
                </select>
              </div>

              <div class="mb-2">
                <label class="form-label">Redirect Value</label>
                <input id="editBannerRedirectValue" class="form-control" value="${escapeHtml(b.redirectValue || "")}">
              </div>

              <div class="mb-2">
                <label class="form-label">Active</label>
                <select id="editBannerActive" class="form-select">
                  <option value="true" ${b.isActive ? "selected" : ""}>Active</option>
                  <option value="false" ${!b.isActive ? "selected" : ""}>Inactive</option>
                </select>
              </div>

            </form>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button class="btn btn-primary" id="saveBannerChanges">Save</button>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  const modal = new bootstrap.Modal(document.getElementById("editBannerModal"));
  modal.show();

  document.getElementById("saveBannerChanges").addEventListener("click", async () => {
    const redirectTypeVal = document.getElementById("editBannerRedirectType").value;
    const redirectValueVal = document.getElementById("editBannerRedirectValue").value.trim();

    if (redirectTypeVal !== "none" && !redirectValueVal)
      return notify(`Enter redirect value for ${redirectTypeVal}`, "warning");

    const data = {
      title: document.getElementById("editBannerTitle").value.trim(),
      description: document.getElementById("editBannerDescription").value.trim(),
      platform: document.getElementById("editBannerPlatform").value,
      displayOrder: Number(document.getElementById("editBannerOrder").value) || 0,
      linkUrl: document.getElementById("editBannerLink").value.trim(),
      isActive: document.getElementById("editBannerActive").value === "true",

      redirectType: redirectTypeVal,
      redirectValue: redirectValueVal || null,
    };

    try {
      await API.put("/banners/:id", data, { id: b._id });
      notify("Banner updated", "success");
      modal.hide();
      loadBanners();
    } catch {
      notify("Failed to update banner", "error");
    }
  });
}

/* -----------------------------
   Replace Banner Image
----------------------------- */

function openReplaceBannerImageModal(bannerId) {
  const existing = document.getElementById("replaceBannerModal");
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="replaceBannerModal">
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">Replace Banner Image</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <input id="replaceBannerFile" type="file" accept="image/*" class="form-control" />
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button class="btn btn-primary" id="confirmReplaceBanner">Replace</button>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  const modal = new bootstrap.Modal(document.getElementById("replaceBannerModal"));
  modal.show();

  document.getElementById("confirmReplaceBanner").addEventListener("click", async () => {
    const fileInput = document.getElementById("replaceBannerFile");
    if (!fileInput?.files?.length) return notify("Select an image", "warning");

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      const headers = AUTH.getAuthHeaders();
      const resp = await fetch(`${API_CONFIG.baseURL}/banners/${bannerId}/image`, {
        method: "PUT",
        headers,
        body: formData,
      });

      const data = await safeJson(resp);
      if (!resp.ok) throw new Error(data?.message || "Failed");

      notify("Banner image replaced", "success");
      modal.hide();
      loadBanners();

    } catch {
      notify("Failed to replace image", "error");
    }
  });
}

/* -----------------------------
   Banner Status / Delete
----------------------------- */

async function toggleBanner(id) {
  try {
    const url = API.buildURL("/banners/:id/toggle", { id });
    await API.request(url, { method: "PATCH" });
    notify("Banner status toggled", "success");
    loadBanners();
  } catch {
    notify("Failed to toggle banner", "error");
  }
}

async function softDeleteBanner(id) {
  if (!confirm("Move banner to trash?")) return;

  try {
    await API.delete("/banners/:id", { id });
    notify("Banner moved to trash", "success");
    loadBanners();
  } catch {
    notify("Failed to delete banner", "error");
  }
}

async function permanentlyDeleteBanner(id) {
  if (!confirm("Permanently delete banner?")) return;

  try {
    await API.delete("/banners/:id/permanent", { id });
    notify("Banner permanently deleted", "success");
    loadBanners();
  } catch {
    notify("Failed to permanently delete banner", "error");
  }
}

/* -----------------------------
   SUCCESS STORIES
----------------------------- */

async function loadStories() {
  const tbody = document.getElementById("storiesTableBody");
  const storyCount = document.getElementById("storyCount");

  if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
  if (storyCount) storyCount.textContent = "(loading...)";

  try {
    const res = await API.get("/success-stories/admin/all", {}, { page: 1, limit: 200 });
    const stories = res.data || res || [];

    storyCount.textContent = `(${res.pagination?.total ?? stories.length})`;

    if (!stories.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">No success stories found</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    stories.forEach((s, i) =>
      tbody.insertAdjacentHTML("beforeend", renderStoryRow(s, i + 1))
    );

  } catch (err) {
    notify("Failed to load success stories", "error");
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Failed to load</td></tr>`;
    storyCount.textContent = "(error)";
  }
}

function renderStoryRow(s, idx) {
  const activeBadge = s.isActive
    ? `<span class="badge bg-success">Active</span>`
    : `<span class="badge bg-warning">Inactive</span>`;

  const created = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-";
  const imageUrl = s.imageUrl || s.s3Url || "";

  return `
    <tr>
      <td>${idx}</td>
      <td><img src="${escapeHtml(imageUrl)}" class="thumb"></td>
      <td style="max-width:220px;">
        <strong>${escapeHtml(s.title)}</strong>
        <div class="text-muted small">${escapeHtml((s.description || "").substring(0, 120))}</div>
      </td>
      <td>${escapeHtml(s.platform)}</td>
      <td>${s.displayOrder}</td>
      <td>${activeBadge}</td>
      <td>${created}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary" onclick="openEditStoryModal('${s._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-secondary" onclick="openReplaceStoryImageModal('${s._id}')"><i class="bi bi-image"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="toggleStory('${s._id}')"><i class="bi bi-toggle-on"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="softDeleteStory('${s._id}')"><i class="bi bi-trash"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="permanentlyDeleteStory('${s._id}')"><i class="bi bi-x-circle"></i></button>
        </div>
      </td>
    </tr>
  `;
}

/* Upload Story */

async function uploadStory() {
  const title = document.getElementById("storyTitle")?.value?.trim() || "";
  const description = document.getElementById("storyDescription")?.value?.trim() || "";
  const platform = document.getElementById("storyPlatform")?.value || "both";
  const displayOrder = document.getElementById("storyOrder")?.value?.trim() || 0;
  const fileInput = document.getElementById("storyImage");

  if (!title) return notify("Enter story title", "warning");
  if (!fileInput?.files?.length) return notify("Select a story image", "warning");

  const file = fileInput.files[0];
  const formData = new FormData();

  formData.append("title", title);
  formData.append("description", description);
  formData.append("platform", platform);
  formData.append("displayOrder", displayOrder);
  formData.append("image", file);

  try {
    const headers = AUTH.getAuthHeaders();
    const resp = await fetch(`${API_CONFIG.baseURL}/success-stories`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await safeJson(resp);
    if (!resp.ok) throw new Error(data?.message || "Failed");

    notify("Success story uploaded", "success");
    clearStoryForm();
    loadStories();

  } catch (err) {
    notify("Story upload failed", "error");
  }
}

function clearStoryForm() {
  const form = document.getElementById("storyUploadForm");
  if (form) form.reset();

  const preview = document.getElementById("storyPreview");
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
}

/* Edit Story */

function openEditStoryModal(storyId) {
  (async () => {
    try {
      const res = await API.get("/success-stories/:id", { id: storyId });
      injectEditStoryModal(res.data || res);
    } catch {
      notify("Failed to load story", "error");
    }
  })();
}

function injectEditStoryModal(s) {
  const existing = document.getElementById("editStoryModal");
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="editStoryModal">
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">Edit Story - ${escapeHtml(s.title)}</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <form>

              <div class="mb-2">
                <label class="form-label">Title</label>
                <input id="editStoryTitle" class="form-control" value="${escapeHtml(s.title)}">
              </div>

              <div class="mb-2">
                <label class="form-label">Description</label>
                <textarea id="editStoryDescription" class="form-control">${escapeHtml(s.description || "")}</textarea>
              </div>

              <div class="mb-2">
                <label class="form-label">Platform</label>
                <select id="editStoryPlatform" class="form-select">
                  <option value="both" ${s.platform === "both" ? "selected" : ""}>Both</option>
                  <option value="web" ${s.platform === "web" ? "selected" : ""}>Web</option>
                  <option value="app" ${s.platform === "app" ? "selected" : ""}>App</option>
                </select>
              </div>

              <div class="mb-2">
                <label class="form-label">Display Order</label>
                <input id="editStoryOrder" type="number" class="form-control" value="${s.displayOrder || 0}">
              </div>

              <div class="mb-2">
                <label class="form-label">Active</label>
                <select id="editStoryActive" class="form-select">
                  <option value="true" ${s.isActive ? "selected" : ""}>Active</option>
                  <option value="false" ${!s.isActive ? "selected" : ""}>Inactive</option>
                </select>
              </div>

            </form>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button class="btn btn-primary" id="saveStoryChanges">Save</button>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  const modal = new bootstrap.Modal(document.getElementById("editStoryModal"));
  modal.show();

  document.getElementById("saveStoryChanges").addEventListener("click", async () => {
    const data = {
      title: document.getElementById("editStoryTitle").value.trim(),
      description: document.getElementById("editStoryDescription").value.trim(),
      platform: document.getElementById("editStoryPlatform").value,
      displayOrder: Number(document.getElementById("editStoryOrder").value) || 0,
      isActive: document.getElementById("editStoryActive").value === "true",
    };

    try {
      await API.put("/success-stories/:id", data, { id: s._id });
      notify("Success story updated", "success");
      modal.hide();
      loadStories();
    } catch {
      notify("Failed to update story", "error");
    }
  });
}

/* Replace Story Image */

function openReplaceStoryImageModal(storyId) {
  const existing = document.getElementById("replaceStoryModal");
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="replaceStoryModal">
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">Replace Story Image</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <input id="replaceStoryFile" type="file" accept="image/*" class="form-control">
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button class="btn btn-primary" id="confirmReplaceStory">Replace</button>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", html);

  const modal = new bootstrap.Modal(document.getElementById("replaceStoryModal"));
  modal.show();

  document.getElementById("confirmReplaceStory").addEventListener("click", async () => {
    const fileInput = document.getElementById("replaceStoryFile");
    if (!fileInput?.files?.length) return notify("Select an image", "warning");

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      const headers = AUTH.getAuthHeaders();
      const resp = await fetch(`${API_CONFIG.baseURL}/success-stories/${storyId}/image`, {
        method: "PUT",
        headers,
        body: formData,
      });

      const data = await safeJson(resp);
      if (!resp.ok) throw new Error(data?.message || "Failed");

      notify("Story image replaced", "success");
      modal.hide();
      loadStories();

    } catch {
      notify("Failed to replace image", "error");
    }
  });
}

/* Story Status + Delete */

async function toggleStory(id) {
  try {
    const url = API.buildURL("/success-stories/:id/toggle", { id });
    await API.request(url, { method: "PATCH" });

    notify("Story status toggled", "success");
    loadStories();
  } catch {
    notify("Failed to toggle story", "error");
  }
}

async function softDeleteStory(id) {
  if (!confirm("Move story to trash?")) return;

  try {
    await API.delete("/success-stories/:id", { id });
    notify("Story moved to trash", "success");
    loadStories();
  } catch {
    notify("Failed to delete story", "error");
  }
}

async function permanentlyDeleteStory(id) {
  if (!confirm("Permanently delete story?")) return;

  try {
    await API.delete("/success-stories/:id/permanent", { id });
    notify("Story permanently deleted", "success");
    loadStories();
  } catch {
    notify("Failed to permanently delete story", "error");
  }
}

/* Helpers */

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/* Expose functions globally */

window.openEditBannerModal = openEditBannerModal;
window.openReplaceBannerImageModal = openReplaceBannerImageModal;
window.toggleBanner = toggleBanner;
window.softDeleteBanner = softDeleteBanner;
window.permanentlyDeleteBanner = permanentlyDeleteBanner;

window.openEditStoryModal = openEditStoryModal;
window.openReplaceStoryImageModal = openReplaceStoryImageModal;
window.toggleStory = toggleStory;
window.softDeleteStory = softDeleteStory;
window.permanentlyDeleteStory = permanentlyDeleteStory;
