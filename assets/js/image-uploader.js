// image-uploader.js
// Requires global: API_CONFIG, API, AUTH, adminPanel (optional)

/* Utility - safe notifier */
function notify(message, type = 'info') {
  if (window.adminPanel && typeof window.adminPanel.showNotification === 'function') {
    // adminPanel uses 'success', 'danger', 'warning' etc.
    window.adminPanel.showNotification(message, type === 'error' ? 'danger' : type);
  } else {
    // fallback
    if (type === 'error') alert('Error: ' + message);
    else alert(message);
  }
}

/* Safe JSON parse helper (returns null on failure) */
async function safeJson(resp) {
  try {
    return await resp.json();
  } catch (e) {
    return null;
  }
}

/* DOM-ready init */
document.addEventListener('DOMContentLoaded', () => {
  try {
    initImageUploader();
  } catch (e) {
    console.error('image-uploader init failed', e);
  }
});

function initImageUploader() {
  // guard - some pages may not have these elements; attach only if they exist
  const btnUploadBanner = document.getElementById('btnUploadBanner');
  const btnClearBanner = document.getElementById('btnClearBanner');
  const btnUploadStory = document.getElementById('btnUploadStory');
  const btnClearStory = document.getElementById('btnClearStory');
  const btnRefreshBanners = document.getElementById('btnRefreshBanners');
  const btnRefreshStories = document.getElementById('btnRefreshStories');

  if (btnUploadBanner) btnUploadBanner.addEventListener('click', uploadBanner);
  if (btnClearBanner) btnClearBanner.addEventListener('click', clearBannerForm);
  if (btnUploadStory) btnUploadStory.addEventListener('click', uploadStory);
  if (btnClearStory) btnClearStory.addEventListener('click', clearStoryForm);
  if (btnRefreshBanners) btnRefreshBanners.addEventListener('click', loadBanners);
  if (btnRefreshStories) btnRefreshStories.addEventListener('click', loadStories);

  // initial loads
  loadBanners();
  loadStories();
}

/* -----------------------------
   BANNERS
   ----------------------------- */

async function loadBanners() {
  const tbody = document.getElementById('bannersTableBody');
  const bannerCount = document.getElementById('bannerCount');
  if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
  if (bannerCount) bannerCount.textContent = '(loading...)';

  try {
    const res = await API.get('/banners/admin/all', {}, { page: 1, limit: 200 });
    // some APIs return { success, data } while others return array; handle both
    const banners = res.data || res || [];

    if (bannerCount) bannerCount.textContent = `(${res.pagination?.total ?? banners.length})`;

    if (!banners || banners.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">No banners found</td></tr>`;
      return;
    }

    if (tbody) {
      tbody.innerHTML = '';
      banners.forEach((b, i) => tbody.insertAdjacentHTML('beforeend', renderBannerRow(b, i + 1)));
    }
  } catch (err) {
    console.error('Error loading banners:', err);
    notify('Failed to load banners: ' + (err.message || ''), 'error');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">Failed to load</td></tr>`;
    if (bannerCount) bannerCount.textContent = '(error)';
  }
}

function renderBannerRow(b, idx) {
  const activeBadge = b.isActive ? `<span class="badge bg-success">Active</span>` : `<span class="badge bg-warning">Inactive</span>`;
  const created = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-';
  const imageUrl = b.imageUrl || b.s3Url || '';

  return `
    <tr>
      <td>${idx}</td>
      <td><img src="${escapeHtml(imageUrl)}" class="thumb" style="width:70px;height:45px;object-fit:cover" alt="${escapeHtml(b.altText || b.title || '')}"></td>
      <td style="max-width:220px;">
        <strong>${escapeHtml(b.title || '')}</strong>
        <div class="text-muted small">${escapeHtml((b.description || '').substring(0, 120))}</div>
      </td>
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

async function uploadBanner(e) {
  // form fields
  const titleEl = document.getElementById('bannerTitle');
  const descEl = document.getElementById('bannerDescription');
  const platformEl = document.getElementById('bannerPlatform');
  const orderEl = document.getElementById('bannerOrder');
  const linkEl = document.getElementById('bannerLink');
  const fileInput = document.getElementById('bannerImage');

  const title = titleEl?.value?.trim() || '';
  const description = descEl?.value?.trim() || '';
  const platform = platformEl?.value || 'both';
  const displayOrder = orderEl?.value || 0;
  const linkUrl = linkEl?.value?.trim() || '';

  if (!title) {
    notify('Enter banner title', 'warning');
    return;
  }
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    notify('Select an image file', 'warning');
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
    const headers = AUTH.getAuthHeaders(); // do NOT set Content-Type
    const resp = await fetch(`${API_CONFIG.baseURL}/banners`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await safeJson(resp);
    if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);

    notify('Banner uploaded', 'success');
    clearBannerForm();
    await loadBanners();
  } catch (err) {
    console.error('Error uploading banner:', err);
    notify('Banner upload failed: ' + (err.message || ''), 'error');
  }
}

function clearBannerForm() {
  const form = document.getElementById('bannerUploadForm');
  if (form) form.reset();
}

/* Edit banner modal (loads banner, allows editing text fields, not image) */
function openEditBannerModal(bannerId) {
  (async () => {
    try {
      const res = await API.get('/banners/:id', { id: bannerId });
      const b = res.data || res;
      injectEditBannerModal(b);
    } catch (err) {
      console.error('Error loading banner:', err);
      notify('Failed to load banner', 'error');
    }
  })();
}

function injectEditBannerModal(b) {
  const existing = document.getElementById('editBannerModal');
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="editBannerModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit Banner - ${escapeHtml(b.title || '')}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="editBannerForm">
              <div class="mb-2"><label class="form-label">Title</label><input id="editBannerTitle" class="form-control" value="${escapeHtml(b.title || '')}"></div>
              <div class="mb-2"><label class="form-label">Description</label><textarea id="editBannerDescription" class="form-control">${escapeHtml(b.description || '')}</textarea></div>
              <div class="mb-2"><label class="form-label">Platform</label>
                <select id="editBannerPlatform" class="form-select">
                  <option value="both" ${b.platform==='both'?'selected':''}>Both</option>
                  <option value="web" ${b.platform==='web'?'selected':''}>Web</option>
                  <option value="app" ${b.platform==='app'?'selected':''}>App</option>
                </select></div>
              <div class="mb-2 row">
                <div class="col"><label class="form-label">Display Order</label><input id="editBannerOrder" type="number" class="form-control" value="${b.displayOrder||0}"></div>
                <div class="col"><label class="form-label">Link URL</label><input id="editBannerLink" class="form-control" value="${escapeHtml(b.linkUrl || '')}"></div>
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
        </div>
      </div>
    </div>
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
      displayOrder: Number(document.getElementById('editBannerOrder').value) || 0,
      linkUrl: document.getElementById('editBannerLink').value.trim(),
      isActive: document.getElementById('editBannerActive').value === 'true'
    };

    try {
      await API.put('/banners/:id', data, { id: b._id });
      notify('Banner updated', 'success');
      modal.hide();
      await loadBanners();
    } catch (err) {
      console.error('Error updating banner:', err);
      notify('Failed to update banner', 'error');
    }
  });
}

/* Replace banner image modal and upload */
function openReplaceBannerImageModal(bannerId) {
  const existing = document.getElementById('replaceBannerModal');
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="replaceBannerModal" tabindex="-1">
      <div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Replace Banner Image</h5>
          <button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <input id="replaceBannerFile" type="file" accept="image/*" class="form-control" />
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          <button class="btn btn-primary" id="confirmReplaceBanner">Replace</button>
        </div>
      </div></div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const modalEl = document.getElementById('replaceBannerModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  document.getElementById('confirmReplaceBanner').addEventListener('click', async () => {
    const fileInput = document.getElementById('replaceBannerFile');
    if (!fileInput.files || fileInput.files.length === 0) {
      notify('Select an image', 'warning');
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
      const data = await safeJson(resp);
      if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);

      notify('Banner image replaced', 'success');
      modal.hide();
      await loadBanners();
    } catch (err) {
      console.error('Error replacing image:', err);
      notify('Failed to replace image: ' + (err.message || ''), 'error');
    }
  });
}

/* Toggle banner status */
async function toggleBanner(id) {
  try {
    const url = API.buildURL('/banners/:id/toggle', { id });
    await API.request(url, { method: 'PATCH' });
    notify('Banner status toggled', 'success');
    await loadBanners();
  } catch (err) {
    console.error('Error toggling banner:', err);
    notify('Failed to toggle banner', 'error');
  }
}

/* Soft delete banner */
async function softDeleteBanner(id) {
  if (!confirm('Move banner to trash?')) return;
  try {
    await API.delete('/banners/:id', { id });
    notify('Banner moved to trash', 'success');
    await loadBanners();
  } catch (err) {
    console.error('Error deleting banner:', err);
    notify('Failed to delete banner', 'error');
  }
}

/* Permanent delete banner */
async function permanentlyDeleteBanner(id) {
  if (!confirm('Permanently delete this banner? This cannot be undone.')) return;
  try {
    await API.delete('/banners/:id/permanent', { id });
    notify('Banner permanently deleted', 'success');
    await loadBanners();
  } catch (err) {
    console.error('Error permanently deleting banner:', err);
    notify('Failed to permanently delete banner', 'error');
  }
}

/* -----------------------------
   SUCCESS STORIES
   ----------------------------- */

async function loadStories() {
  const tbody = document.getElementById('storiesTableBody');
  const storyCount = document.getElementById('storyCount');
  if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
  if (storyCount) storyCount.textContent = '(loading...)';

  try {
    const res = await API.get('/success-stories/admin/all', {}, { page: 1, limit: 200 });
    const stories = res.data || res || [];
    if (storyCount) storyCount.textContent = `(${res.pagination?.total ?? stories.length})`;

    if (!stories || stories.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">No success stories found</td></tr>`;
      return;
    }

    if (tbody) {
      tbody.innerHTML = '';
      stories.forEach((s, i) => tbody.insertAdjacentHTML('beforeend', renderStoryRow(s, i + 1)));
    }
  } catch (err) {
    console.error('Error loading stories:', err);
    notify('Failed to load success stories', 'error');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center">Failed to load</td></tr>`;
    if (storyCount) storyCount.textContent = '(error)';
  }
}

function renderStoryRow(s, idx) {
  const activeBadge = s.isActive ? `<span class="badge bg-success">Active</span>` : `<span class="badge bg-warning">Inactive</span>`;
  const created = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-';
  const imageUrl = s.imageUrl || s.s3Url || '';

  return `
    <tr>
      <td>${idx}</td>
      <td><img src="${escapeHtml(imageUrl)}" class="thumb" style="width:70px;height:45px;object-fit:cover" alt="${escapeHtml(s.altText || s.title || '')}"></td>
      <td style="max-width:220px;"><strong>${escapeHtml(s.title || '')}</strong><div class="text-muted small">${escapeHtml((s.description || '').substring(0, 120))}</div></td>
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

async function uploadStory() {
  const titleEl = document.getElementById('storyTitle');
  const descEl = document.getElementById('storyDescription');
  const platformEl = document.getElementById('storyPlatform');
  const orderEl = document.getElementById('storyOrder');
  const fileInput = document.getElementById('storyImage');

  const title = titleEl?.value?.trim() || '';
  const description = descEl?.value?.trim() || '';
  const platform = platformEl?.value || 'both';
  const displayOrder = orderEl?.value || 0;

  if (!title) {
    notify('Enter story title', 'warning');
    return;
  }
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    notify('Select an image file', 'warning');
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
    const data = await safeJson(resp);
    if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);

    notify('Success story uploaded', 'success');
    clearStoryForm();
    await loadStories();
  } catch (err) {
    console.error('Error uploading story:', err);
    notify('Story upload failed: ' + (err.message || ''), 'error');
  }
}

function clearStoryForm() {
  const form = document.getElementById('storyUploadForm');
  if (form) form.reset();
}

function openEditStoryModal(storyId) {
  (async () => {
    try {
      const res = await API.get('/success-stories/:id', { id: storyId });
      const s = res.data || res;
      injectEditStoryModal(s);
    } catch (err) {
      console.error('Error loading story:', err);
      notify('Failed to load story', 'error');
    }
  })();
}

function injectEditStoryModal(s) {
  const existing = document.getElementById('editStoryModal');
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="editStoryModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Edit Story - ${escapeHtml(s.title || '')}</h5>
        <button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <form id="editStoryForm">
          <div class="mb-2"><label class="form-label">Title</label><input id="editStoryTitle" class="form-control" value="${escapeHtml(s.title || '')}"></div>
          <div class="mb-2"><label class="form-label">Description</label><textarea id="editStoryDescription" class="form-control">${escapeHtml(s.description || '')}</textarea></div>
          <div class="mb-2"><label class="form-label">Platform</label>
            <select id="editStoryPlatform" class="form-select">
              <option value="both" ${s.platform==='both'?'selected':''}>Both</option>
              <option value="web" ${s.platform==='web'?'selected':''}>Web</option>
              <option value="app" ${s.platform==='app'?'selected':''}>App</option>
            </select></div>
          <div class="mb-2 row"><div class="col"><label class="form-label">Display Order</label><input id="editStoryOrder" type="number" class="form-control" value="${s.displayOrder||0}"></div></div>
          <div class="mb-2"><label class="form-label">Active</label>
            <select id="editStoryActive" class="form-select">
              <option value="true" ${s.isActive ? 'selected' : ''}>Active</option>
              <option value="false" ${!s.isActive ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Close</button><button class="btn btn-primary" id="saveStoryChanges">Save</button></div>
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
      displayOrder: Number(document.getElementById('editStoryOrder').value) || 0,
      isActive: document.getElementById('editStoryActive').value === 'true'
    };
    try {
      await API.put('/success-stories/:id', data, { id: s._id });
      notify('Success story updated', 'success');
      modal.hide();
      await loadStories();
    } catch (err) {
      console.error('Error updating story:', err);
      notify('Failed to update story', 'error');
    }
  });
}

function openReplaceStoryImageModal(storyId) {
  const existing = document.getElementById('replaceStoryModal');
  if (existing) existing.remove();

  const html = `
    <div class="modal fade" id="replaceStoryModal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Replace Story Image</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body"><input id="replaceStoryFile" type="file" accept="image/*" class="form-control" /></div>
      <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Close</button><button class="btn btn-primary" id="confirmReplaceStory">Replace</button></div>
    </div></div></div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const modalEl = document.getElementById('replaceStoryModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  document.getElementById('confirmReplaceStory').addEventListener('click', async () => {
    const fileInput = document.getElementById('replaceStoryFile');
    if (!fileInput.files || fileInput.files.length === 0) {
      notify('Select an image', 'warning');
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
      const data = await safeJson(resp);
      if (!resp.ok) throw new Error(data?.message || `HTTP ${resp.status}`);

      notify('Story image replaced', 'success');
      modal.hide();
      await loadStories();
    } catch (err) {
      console.error('Error replacing story image:', err);
      notify('Failed to replace image', 'error');
    }
  });
}

async function toggleStory(id) {
  try {
    const url = API.buildURL('/success-stories/:id/toggle', { id });
    await API.request(url, { method: 'PATCH' });
    notify('Success story status toggled', 'success');
    await loadStories();
  } catch (err) {
    console.error('Error toggling story:', err);
    notify('Failed to toggle story', 'error');
  }
}

async function softDeleteStory(id) {
  if (!confirm('Move story to trash?')) return;
  try {
    await API.delete('/success-stories/:id', { id });
    notify('Success story moved to trash', 'success');
    await loadStories();
  } catch (err) {
    console.error('Error deleting story:', err);
    notify('Failed to delete story', 'error');
  }
}

async function permanentlyDeleteStory(id) {
  if (!confirm('Permanently delete this story? This cannot be undone.')) return;
  try {
    await API.delete('/success-stories/:id/permanent', { id });
    notify('Success story permanently deleted', 'success');
    await loadStories();
  } catch (err) {
    console.error('Error permanently deleting story:', err);
    notify('Failed to permanently delete story', 'error');
  }
}

/* -----------------------------
   helpers
   ----------------------------- */

function truncateText(text = '', max = 60) {
  return text.length > max ? text.substring(0, max) + '...' : text;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* expose functions for onclick usage in HTML */
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
