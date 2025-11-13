// image-uploader.js
// Requires: API_CONFIG, API, AUTH, adminPanel (from your existing scripts)

document.addEventListener('DOMContentLoaded', () => {
  initImageUploader();
});

function initImageUploader() {
  // Buttons and forms
  document.getElementById('btnUploadBanner').addEventListener('click', uploadBanner);
  document.getElementById('btnClearBanner').addEventListener('click', clearBannerForm);
  document.getElementById('btnUploadStory').addEventListener('click', uploadStory);
  document.getElementById('btnClearStory').addEventListener('click', clearStoryForm);

  document.getElementById('btnRefreshBanners').addEventListener('click', loadBanners);
  document.getElementById('btnRefreshStories').addEventListener('click', loadStories);

  loadBanners();
  loadStories();
}

/* -----------------------------
   BANNERS
   ----------------------------- */

async function loadBanners() {
  const tbody = document.getElementById('bannersTableBody');
  const bannerCount = document.getElementById('bannerCount');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
  bannerCount.textContent = '(loading...)';

  try {
    const res = await API.get('/banners/admin/all', {}, { page: 1, limit: 200 });
    const banners = res.data || [];

    bannerCount.textContent = `(${res.pagination?.total ?? banners.length})`;

    if (!banners || banners.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">No banners found</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    banners.forEach((b, i) => {
      tbody.insertAdjacentHTML('beforeend', renderBannerRow(b, i + 1));
    });

  } catch (err) {
    console.error('Error loading banners:', err);
    adminPanel.showNotification('Failed to load banners', 'danger');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Failed to load</td></tr>`;
    bannerCount.textContent = '(error)';
  }
}

function renderBannerRow(b, idx) {
  const activeBadge = b.isActive ? `<span class="badge bg-success">Active</span>` : `<span class="badge bg-warning">Inactive</span>`;
  const created = new Date(b.createdAt).toLocaleDateString();
  const imageUrl = b.imageUrl || '';

  return `
    <tr>
      <td>${idx}</td>
      <td><img src="${imageUrl}" class="thumb" alt="${escapeHtml(b.altText || b.title)}"></td>
      <td style="max-width:220px;">${escapeHtml(b.title)}<br/><small class="text-muted">${truncateText(b.description || '', 80)}</small></td>
      <td>${escapeHtml(b.platform || 'both')}</td>
      <td>${b.displayOrder ?? 0}</td>
      <td>${activeBadge}</td>
      <td>${created}</td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="openEditBannerModal('${b._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-secondary" onclick="openReplaceBannerImageModal('${b._id}')"><i class="bi bi-image"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="toggleBanner('${b._id}')"><i class="bi bi-toggle-on"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="softDeleteBanner('${b._id}')"><i class="bi bi-trash"></i></button>
          <button class="btn btn-sm btn-outline-danger" title="Permanent delete" onclick="permanentlyDeleteBanner('${b._id}')"><i class="bi bi-x-circle"></i></button>
        </div>
      </td>
    </tr>
  `;
}

/* Upload banner (multipart/form-data) */
async function uploadBanner() {
  const title = document.getElementById('bannerTitle').value.trim();
  const description = document.getElementById('bannerDescription').value.trim();
  const platform = document.getElementById('bannerPlatform').value;
  const displayOrder = document.getElementById('bannerOrder').value;
  const linkUrl = document.getElementById('bannerLink').value.trim();
  const fileInput = document.getElementById('bannerImage');

  if (!title) {
    adminPanel.showNotification('Enter banner title', 'warning');
    return;
  }

  if (!fileInput.files || fileInput.files.length === 0) {
    adminPanel.showNotification('Select an image file', 'warning');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();

  formData.append('title', title);
  formData.append('description', description);
  formData.append('platform', platform);
  formData.append('displayOrder', displayOrder);
  formData.append('linkUrl', linkUrl);
  formData.append('image', file);

  try {
    const headers = AUTH.getAuthHeaders();
    // fetch because API.post serializes JSON. DO NOT set Content-Type for FormData
    const resp = await fetch(`${API_CONFIG.baseURL}/banners`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Upload failed');

    adminPanel.showNotification('Banner uploaded', 'success');
    clearBannerForm();
    loadBanners();
  } catch (err) {
    console.error('Error uploading banner:', err);
    adminPanel.showNotification(err.message || 'Banner upload failed', 'danger');
  }
}

function clearBannerForm() {
  document.getElementById('bannerUploadForm').reset();
}

/* Edit banner text modal */
function openEditBannerModal(bannerId) {
  // fetch banner detail and show a modal form
  (async () => {
    try {
      const res = await API.get('/banners/:id', { id: bannerId });
      const b = res.data;
      injectEditBannerModal(b);
    } catch (err) {
      console.error('Error loading banner:', err);
      adminPanel.showNotification('Failed to load banner', 'danger');
    }
  })();
}

function injectEditBannerModal(b) {
  const old = document.getElementById('editBannerModal');
  if (old) old.remove();

  const html = `
    <div class="modal fade" id="editBannerModal" tabindex="-1"><div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Edit Banner - ${escapeHtml(b.title)}</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <form id="editBannerForm">
          <div class="mb-2"><label class="form-label">Title</label><input id="editBannerTitle" class="form-control" value="${escapeHtml(b.title)}"></div>
          <div class="mb-2"><label class="form-label">Description</label><textarea id="editBannerDescription" class="form-control">${escapeHtml(b.description||'')}</textarea></div>
          <div class="mb-2"><label class="form-label">Platform</label>
            <select id="editBannerPlatform" class="form-select">
              <option value="both" ${b.platform==='both'?'selected':''}>Both</option>
              <option value="web" ${b.platform==='web'?'selected':''}>Web</option>
              <option value="app" ${b.platform==='app'?'selected':''}>App</option>
            </select></div>
          <div class="mb-2 row">
            <div class="col"><label class="form-label">Display Order</label><input id="editBannerOrder" type="number" class="form-control" value="${b.displayOrder||0}"></div>
            <div class="col"><label class="form-label">Link URL</label><input id="editBannerLink" class="form-control" value="${escapeHtml(b.linkUrl||'')}"></div>
          </div>
          <div class="mb-2"><label class="form-label">Active</label>
            <select id="editBannerActive" class="form-select">
              <option value="true" ${b.isActive ? 'selected' : ''}>Active</option>
              <option value="false" ${!b.isActive ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-primary" id="saveBannerChanges">Save</button>
      </div>
    </div></div></div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  const modalEl = document.getElementById('editBannerModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  document.getElementById('saveBannerChanges').addEventListener('click', async () => {
    const data = {
      title: document.getElementById('editBannerTitle').value.trim(),
      description: document.getElementById('editBannerDescription').value.trim(),
      platform: document.getElementById('editBannerPlatform').value,
      displayOrder: document.getElementById('editBannerOrder').value,
      linkUrl: document.getElementById('editBannerLink').value.trim(),
      isActive: document.getElementById('editBannerActive').value === 'true'
    };

    try {
      await API.put('/banners/admin/:id', data, { id: b._id });
      adminPanel.showNotification('Banner updated', 'success');
      modal.hide();
      loadBanners();
    } catch (err) {
      console.error('Error updating banner:', err);
      adminPanel.showNotification('Failed to update banner', 'danger');
    }
  });
}

/* Replace banner image modal */
function openReplaceBannerImageModal(bannerId) {
  const old = document.getElementById('replaceBannerModal');
  if (old) old.remove();

  const html = `
    <div class="modal fade" id="replaceBannerModal" tabindex="-1"><div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Replace Banner Image</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <input id="replaceBannerFile" type="file" accept="image/*" class="form-control" />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-primary" id="confirmReplaceBanner">Replace</button>
      </div>
    </div></div></div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const modalEl = document.getElementById('replaceBannerModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  document.getElementById('confirmReplaceBanner').addEventListener('click', async () => {
    const fileInput = document.getElementById('replaceBannerFile');
    if (!fileInput.files || fileInput.files.length === 0) {
      adminPanel.showNotification('Select an image', 'warning');
      return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const headers = AUTH.getAuthHeaders();
      const resp = await fetch(`${API_CONFIG.baseURL}/banners/${bannerId}/image`, {
        method: 'PUT',
        headers,
        body: formData
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Replace failed');

      adminPanel.showNotification('Banner image replaced', 'success');
      modal.hide();
      loadBanners();
    } catch (err) {
      console.error('Error replacing image:', err);
      adminPanel.showNotification(err.message || 'Failed to replace image', 'danger');
    }
  });
}

async function toggleBanner(id) {
  try {
    // Use API.request to send PATCH
    const url = API.buildURL('/banners/:id/toggle', { id });
    await API.request(url, { method: 'PATCH' });
    adminPanel.showNotification('Banner status toggled', 'success');
    loadBanners();
  } catch (err) {
    console.error('Error toggling banner:', err);
    adminPanel.showNotification('Failed to toggle banner', 'danger');
  }
}

async function softDeleteBanner(id) {
  if (!confirm('Move banner to trash?')) return;
  try {
    await API.delete('/banners/admin/:id', { id });
    adminPanel.showNotification('Banner soft deleted', 'success');
    loadBanners();
  } catch (err) {
    console.error('Error deleting banner:', err);
    adminPanel.showNotification('Failed to delete banner', 'danger');
  }
}

async function permanentlyDeleteBanner(id) {
  if (!confirm('Permanently delete this banner? This cannot be undone.')) return;
  try {
    await API.delete('/banners/admin/:id/permanent', { id });
    adminPanel.showNotification('Banner permanently deleted', 'success');
    loadBanners();
  } catch (err) {
    console.error('Error permanently deleting banner:', err);
    adminPanel.showNotification('Failed to permanently delete', 'danger');
  }
}

/* -----------------------------
   SUCCESS STORIES
   ----------------------------- */

async function loadStories() {
  const tbody = document.getElementById('storiesTableBody');
  const storyCount = document.getElementById('storyCount');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
  storyCount.textContent = '(loading...)';

  try {
    const res = await API.get('/success-stories/admin/all', {}, { page: 1, limit: 200 });
    const stories = res.data || [];

    storyCount.textContent = `(${res.pagination?.total ?? stories.length})`;

    if (!stories || stories.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">No success stories found</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    stories.forEach((s, i) => {
      tbody.insertAdjacentHTML('beforeend', renderStoryRow(s, i + 1));
    });

  } catch (err) {
    console.error('Error loading stories:', err);
    adminPanel.showNotification('Failed to load success stories', 'danger');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Failed to load</td></tr>`;
    storyCount.textContent = '(error)';
  }
}

function renderStoryRow(s, idx) {
  const activeBadge = s.isActive ? `<span class="badge bg-success">Active</span>` : `<span class="badge bg-warning">Inactive</span>`;
  const created = new Date(s.createdAt).toLocaleDateString();
  const imageUrl = s.imageUrl || '';

  return `
    <tr>
      <td>${idx}</td>
      <td><img src="${imageUrl}" class="thumb" alt="${escapeHtml(s.altText || s.title)}"></td>
      <td style="max-width:220px;">${escapeHtml(s.title)}<br/><small class="text-muted">${truncateText(s.description || '', 80)}</small></td>
      <td>${escapeHtml(s.platform || 'both')}</td>
      <td>${s.displayOrder ?? 0}</td>
      <td>${activeBadge}</td>
      <td>${created}</td>
      <td>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="openEditStoryModal('${s._id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-secondary" onclick="openReplaceStoryImageModal('${s._id}')"><i class="bi bi-image"></i></button>
          <button class="btn btn-sm btn-outline-warning" onclick="toggleStory('${s._id}')"><i class="bi bi-toggle-on"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="softDeleteStory('${s._id}')"><i class="bi bi-trash"></i></button>
          <button class="btn btn-sm btn-outline-danger" title="Permanent delete" onclick="permanentlyDeleteStory('${s._id}')"><i class="bi bi-x-circle"></i></button>
        </div>
      </td>
    </tr>
  `;
}

/* Upload story (multipart) */
async function uploadStory() {
  const title = document.getElementById('storyTitle').value.trim();
  const description = document.getElementById('storyDescription').value.trim();
  const platform = document.getElementById('storyPlatform').value;
  const displayOrder = document.getElementById('storyOrder').value;
  const fileInput = document.getElementById('storyImage');

  if (!title) {
    adminPanel.showNotification('Enter story title', 'warning');
    return;
  }

  if (!fileInput.files || fileInput.files.length === 0) {
    adminPanel.showNotification('Select an image file', 'warning');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();

  formData.append('title', title);
  formData.append('description', description);
  formData.append('platform', platform);
  formData.append('displayOrder', displayOrder);
  formData.append('image', file);

  try {
    const headers = AUTH.getAuthHeaders();
    const resp = await fetch(`${API_CONFIG.baseURL}/success-stories`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Upload failed');

    adminPanel.showNotification('Success story uploaded', 'success');
    clearStoryForm();
    loadStories();
  } catch (err) {
    console.error('Error uploading story:', err);
    adminPanel.showNotification(err.message || 'Story upload failed', 'danger');
  }
}

function clearStoryForm() {
  document.getElementById('storyUploadForm').reset();
}

/* Edit story modal */
function openEditStoryModal(storyId) {
  (async () => {
    try {
      const res = await API.get('/success-stories/:id', { id: storyId });
      const s = res.data;
      injectEditStoryModal(s);
    } catch (err) {
      console.error('Error loading story:', err);
      adminPanel.showNotification('Failed to load story', 'danger');
    }
  })();
}

function injectEditStoryModal(s) {
  const old = document.getElementById('editStoryModal');
  if (old) old.remove();

  const html = `
    <div class="modal fade" id="editStoryModal" tabindex="-1"><div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Edit Story - ${escapeHtml(s.title)}</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <form id="editStoryForm">
          <div class="mb-2"><label class="form-label">Title</label><input id="editStoryTitle" class="form-control" value="${escapeHtml(s.title)}"></div>
          <div class="mb-2"><label class="form-label">Description</label><textarea id="editStoryDescription" class="form-control">${escapeHtml(s.description||'')}</textarea></div>
          <div class="mb-2"><label class="form-label">Platform</label>
            <select id="editStoryPlatform" class="form-select">
              <option value="both" ${s.platform==='both'?'selected':''}>Both</option>
              <option value="web" ${s.platform==='web'?'selected':''}>Web</option>
              <option value="app" ${s.platform==='app'?'selected':''}>App</option>
            </select></div>
          <div class="mb-2 row">
            <div class="col"><label class="form-label">Display Order</label><input id="editStoryOrder" type="number" class="form-control" value="${s.displayOrder||0}"></div>
          </div>
          <div class="mb-2"><label class="form-label">Active</label>
            <select id="editStoryActive" class="form-select">
              <option value="true" ${s.isActive ? 'selected' : ''}>Active</option>
              <option value="false" ${!s.isActive ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-primary" id="saveStoryChanges">Save</button>
      </div>
    </div></div></div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const modalEl = document.getElementById('editStoryModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  document.getElementById('saveStoryChanges').addEventListener('click', async () => {
    const data = {
      title: document.getElementById('editStoryTitle').value.trim(),
      description: document.getElementById('editStoryDescription').value.trim(),
      platform: document.getElementById('editStoryPlatform').value,
      displayOrder: document.getElementById('editStoryOrder').value,
      isActive: document.getElementById('editStoryActive').value === 'true'
    };
    try {
      await API.put('/success-stories/:id', data, { id: s._id });
      adminPanel.showNotification('Success story updated', 'success');
      modal.hide();
      loadStories();
    } catch (err) {
      console.error('Error updating story:', err);
      adminPanel.showNotification('Failed to update story', 'danger');
    }
  });
}

/* Replace story image modal */
function openReplaceStoryImageModal(storyId) {
  const old = document.getElementById('replaceStoryModal');
  if (old) old.remove();

  const html = `
    <div class="modal fade" id="replaceStoryModal" tabindex="-1"><div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Replace Story Image</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <input id="replaceStoryFile" type="file" accept="image/*" class="form-control" />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-primary" id="confirmReplaceStory">Replace</button>
      </div>
    </div></div></div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const modalEl = document.getElementById('replaceStoryModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  document.getElementById('confirmReplaceStory').addEventListener('click', async () => {
    const fileInput = document.getElementById('replaceStoryFile');
    if (!fileInput.files || fileInput.files.length === 0) {
      adminPanel.showNotification('Select an image', 'warning');
      return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const headers = AUTH.getAuthHeaders();
      const resp = await fetch(`${API_CONFIG.baseURL}/success-stories/${storyId}/image`, {
        method: 'PUT',
        headers,
        body: formData
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Replace failed');

      adminPanel.showNotification('Story image replaced', 'success');
      modal.hide();
      loadStories();
    } catch (err) {
      console.error('Error replacing story image:', err);
      adminPanel.showNotification(err.message || 'Failed to replace image', 'danger');
    }
  });
}

async function toggleStory(id) {
  try {
    const url = API.buildURL('/success-stories/:id/toggle', { id });
    await API.request(url, { method: 'PATCH' });
    adminPanel.showNotification('Success story status toggled', 'success');
    loadStories();
  } catch (err) {
    console.error('Error toggling story:', err);
    adminPanel.showNotification('Failed to toggle story', 'danger');
  }
}

async function softDeleteStory(id) {
  if (!confirm('Move story to trash?')) return;
  try {
    await API.delete('/success-stories/admin/:id', { id });
    adminPanel.showNotification('Success story soft deleted', 'success');
    loadStories();
  } catch (err) {
    console.error('Error deleting story:', err);
    adminPanel.showNotification('Failed to delete story', 'danger');
  }
}

async function permanentlyDeleteStory(id) {
  if (!confirm('Permanently delete this story? This cannot be undone.')) return;
  try {
    await API.delete('/success-stories/admin/:id/permanent', { id });
    adminPanel.showNotification('Success story permanently deleted', 'success');
    loadStories();
  } catch (err) {
    console.error('Error permanently deleting story:', err);
    adminPanel.showNotification('Failed to permanently delete', 'danger');
  }
}

/* -----------------------------
   Small helpers
   ----------------------------- */

function truncateText(text, max = 60) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max) + '...' : text;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
