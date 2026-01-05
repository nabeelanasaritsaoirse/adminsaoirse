/* ============================================================
   SAFE HELPERS
============================================================ */

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;
  overlay.style.display = show ? "flex" : "none";
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function notify(msg, type = "info") {
  if (typeof showNotification === "function") {
    showNotification(msg, type);
  } else {
    alert(msg);
  }
}

/* ============================================================
   STATE
============================================================ */

let globalFaqs = [];

/* ============================================================
   LOAD APP (GLOBAL) FAQs
============================================================ */

async function loadGlobalFaqs() {
  try {
    showLoading(true);

    const res = await API.get("/faqs/app");
    globalFaqs = Array.isArray(res?.data) ? res.data : [];

    renderGlobalFaqs();
  } catch (err) {
    console.error("❌ Failed to load FAQs:", err);
    notify("Failed to load FAQs", "error");
  } finally {
    showLoading(false);
  }
}

/* ============================================================
   RENDER
============================================================ */

function renderGlobalFaqs() {
  const container = document.getElementById("faqList");
  if (!container) return;

  container.innerHTML = "";

  if (globalFaqs.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        No FAQs found. Click <strong>Add FAQ</strong>.
      </div>
    `;
    return;
  }

  globalFaqs.forEach((faq) => {
    container.insertAdjacentHTML("beforeend", renderFaqCard(faq));
  });
}

function renderFaqCard(faq) {
  return `
    <div class="card shadow-sm mb-3 ${faq.__isNew ? "border-primary" : ""}"
         data-id="${faq._id || ""}"
         data-new="${faq.__isNew ? "1" : "0"}">

      <div class="card-body">

        ${
          faq.__isNew
            ? `
          <span class="badge bg-primary mb-2">New FAQ</span>
        `
            : ""
        }

        <div class="mb-2">
          <label class="form-label">Question</label>
          <input
            class="form-control faq-question"
            value="${escapeHtml(faq.question || "")}"
          />
        </div>

        <div class="mb-2">
          <label class="form-label">Answer</label>
          <textarea
            class="form-control faq-answer"
            rows="3"
          >${escapeHtml(faq.answer || "")}</textarea>
        </div>

        <div class="d-flex justify-content-between align-items-center">
          <label class="form-check-label">
            <input
              type="checkbox"
              class="form-check-input faq-active"
              ${faq.isActive !== false ? "checked" : ""}
            />
            Active
          </label>

          <div class="d-flex gap-2">
            <button
              class="btn btn-sm btn-success"
              onclick="saveGlobalFaq(this)"
            >
              Save
            </button>

            <button
              class="btn btn-sm btn-danger"
              ${faq.__isNew ? "disabled" : ""}
              onclick="deleteGlobalFaq('${faq._id || ""}')"
            >
              Delete
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

/* ============================================================
   ADD
============================================================ */

function addGlobalFaq() {
  globalFaqs.unshift({
    question: "",
    answer: "",
    isActive: true,
    __isNew: true,
  });

  renderGlobalFaqs();

  // ✅ AUTO SCROLL + FOCUS (THIS IS THE KEY FIX)
  setTimeout(() => {
    const firstCard = document.querySelector("#faqList .card");
    if (!firstCard) return;

    firstCard.scrollIntoView({ behavior: "smooth", block: "start" });

    const qInput = firstCard.querySelector(".faq-question");
    qInput?.focus();
  }, 50);
}

/* ============================================================
   SAVE
============================================================ */

async function saveGlobalFaq(btn) {
  const card = btn.closest(".card");
  if (!card) return;

  const isNew = card.dataset.new === "1";
  const faqId = card.dataset.id;

  const payload = {
    question: card.querySelector(".faq-question").value.trim(),
    answer: card.querySelector(".faq-answer").value.trim(),
    isActive: card.querySelector(".faq-active").checked,
  };

  if (!payload.question || !payload.answer) {
    notify("Question and Answer required", "warning");
    return;
  }

  try {
    showLoading(true);

    if (isNew) {
      await API.post("/faqs/admin/app", payload);
      notify("FAQ created", "success");
    } else {
      await API.put(`/faqs/admin/${faqId}`, payload);
      notify("FAQ updated", "success");
    }

    await loadGlobalFaqs();
  } catch (err) {
    console.error("❌ Save failed:", err);
    notify("Save failed", "error");
  } finally {
    showLoading(false);
  }
}

/* ============================================================
   DELETE
============================================================ */

async function deleteGlobalFaq(faqId) {
  if (!faqId) return;
  if (!confirm("Delete this FAQ?")) return;

  try {
    showLoading(true);
    await API.delete(`/faqs/admin/${faqId}`);
    notify("FAQ deleted", "success");
    await loadGlobalFaqs();
  } catch (err) {
    console.error("❌ Delete failed:", err);
    notify("Delete failed", "error");
  } finally {
    showLoading(false);
  }
}
function clearFaqForm() {
  document.getElementById("newFaqQuestion").value = "";
  document.getElementById("newFaqAnswer").value = "";
  document.getElementById("newFaqActive").checked = true;
}

async function createFaq() {
  const payload = {
    question: document.getElementById("newFaqQuestion").value.trim(),
    answer: document.getElementById("newFaqAnswer").value.trim(),
    isActive: document.getElementById("newFaqActive").checked,
  };

  if (!payload.question || !payload.answer) {
    notify("Question and Answer required", "warning");
    return;
  }

  try {
    showLoading(true);

    await API.post("/faqs/admin/app", payload);

    notify("FAQ created", "success");
    clearFaqForm();
    document.getElementById("faqFormCard").classList.add("d-none");

    await loadGlobalFaqs();
  } catch (err) {
    console.error(err);
    notify("Failed to create FAQ", "error");
  } finally {
    showLoading(false);
  }
}

/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addFaqBtn")?.addEventListener("click", () => {
    document.getElementById("faqFormCard")?.classList.remove("d-none");
    document.getElementById("newFaqQuestion")?.focus();
  });

  document.getElementById("cancelFaqBtn")?.addEventListener("click", () => {
    document.getElementById("faqFormCard")?.classList.add("d-none");
    clearFaqForm();
  });

  document.getElementById("createFaqBtn")?.addEventListener("click", createFaq);

  loadGlobalFaqs();
});

window.saveGlobalFaq = saveGlobalFaq;
window.deleteGlobalFaq = deleteGlobalFaq;
