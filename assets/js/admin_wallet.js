// assets/js/admin_wallet.js
(() => {
  const API_ENDPOINT = "/admin/wallet";
  const $ = (id) => document.getElementById(id);
  // =========================
  // PAGINATION STATE
  // =========================
  let withdrawalCurrentPage = 1;
  let withdrawalTotalPages = 1;
  let withdrawalLimit = 10;
  let withdrawalStatus = "pending"; // default tab
  let withdrawalSearch = "";
  let withdrawalDateRange = "";
  let isUserViewActive = false;
  // Elements
  const searchInput = $("searchInput");
  const searchBtn = $("searchBtn");
  const walletCard = $("walletCard");
  const walletBalanceEl = $("walletBalance");
  const holdBalanceEl = $("holdBalance");
  const referralBonusEl = $("referralBonus");
  const investedAmountEl = $("investedAmount");
  const txnTable = $("txnTable");
  const adjustAmount = $("adjustAmount");
  const addMoneyBtn = $("addMoneyBtn");
  const deductMoneyBtn = $("deductMoneyBtn");
  const withdrawTable = $("withdrawTable");
  // Withdrawal filters
  const withdrawSearchInput = $("withdrawSearchInput");
  const withdrawDateFilter = $("withdrawDateFilter");
  const withdrawStatusFilter = $("withdrawStatusFilter");
  const withdrawSection = $("withdrawSection");

  // Tab-related elements (optional – safe if missing)
  const withdrawTabBtn = $("withdrawTabBtn");
  const walletTabBtn = $("walletTabBtn");
  const searchCard = $("searchCard");

  let currentUserId = null;

  // =========================
  // Helpers
  // =========================
  function renderEmptyWithdrawals(message) {
    if (!withdrawTable) return;
    withdrawTable.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          ${message || "No withdrawal requests"}
        </td>
      </tr>
    `;
  }

  function resetUI() {
    if (walletBalanceEl) walletBalanceEl.innerText = "₹ 0";
    if (holdBalanceEl) walletBalanceEl.innerText = "₹ 0";
    if (referralBonusEl) referralBonusEl.innerText = "₹ 0";
    if (investedAmountEl) investedAmountEl.innerText = "₹ 0";
    if (txnTable) txnTable.innerHTML = "";
    currentUserId = null;
    allTransactions = [];
    txnVisibleCount = 5;
    isTxnExpanded = false;
    renderEmptyWithdrawals("Search a user to view withdrawal requests.");
  }

  // =========================
  // SEARCH + WALLET INFO
  // =========================
  async function searchWallet() {
    const q = (searchInput?.value || "").trim();
    if (!q) {
      alert("Enter phone, email, name, userId OR referral code");
      return;
    }

    resetUI();

    // Build query based on input type
    let query = {};
    if (/@/.test(q)) query.email = q;
    else if (/^[a-fA-F0-9]{24}$/.test(q)) query.userId = q;
    else if (/^REF/i.test(q)) query.referral = q;
    else if (/^\d{10,12}$/.test(q)) query.phone = q;
    else query.name = q;

    try {
      const data = await API.get(API_ENDPOINT, {}, query);

      if (!data?.success) {
        walletCard?.classList.add("d-none");
        alert(data?.message || "User not found");
        return;
      }

      walletCard?.classList.remove("d-none");
      // 🔥 Hide global withdrawal section in user view
      withdrawSection?.classList.add("d-none");
      const userViewAlert = document.getElementById("userViewAlert");
      const selectedUserLabel = document.getElementById("selectedUserLabel");

      if (userViewAlert) userViewAlert.classList.remove("d-none");

      if (selectedUserLabel && data.user) {
        selectedUserLabel.innerText = `${data.user.name} (${data.user.email})`;
      }
      isUserViewActive = true;
      currentUserId = data.user?._id || null;

      if (walletBalanceEl)
        walletBalanceEl.innerText = `₹ ${data.availableBalance ?? 0}`;
      if (holdBalanceEl) holdBalanceEl.innerText = `₹ ${data.holdBalance ?? 0}`;
      if (referralBonusEl)
        referralBonusEl.innerText = `₹ ${data.referralBonus ?? 0}`;
      if (investedAmountEl)
        investedAmountEl.innerText = `₹ ${data.investedAmount ?? 0}`;

      // Store all transactions
      allTransactions = data.transactions || [];
      txnVisibleCount = 5;
      isTxnExpanded = false;

      renderTransactions();

      // User-specific withdrawals in the Withdrawals tab
      if (currentUserId) {
        loadUserWithdrawals(currentUserId);
      } else {
        renderEmptyWithdrawals("No user id found for withdrawals.");
      }
    } catch (err) {
      console.error("WALLET SEARCH ERROR:", err);
      alert("Server error");
    }
  }

  // =========================
  // ADD / DEDUCT BALANCE
  // =========================
  async function adjustBalance(action) {
    if (!currentUserId) {
      alert("Search and select a user first!");
      return;
    }

    const amount = Number(adjustAmount?.value);
    if (!amount || amount <= 0) {
      alert("Invalid amount");
      return;
    }

    const body = {
      userId: currentUserId, // ✅ SINGLE SOURCE OF TRUTH
      amount,
      description: action === "credit" ? "Admin credit" : "Admin debit",
    };

    try {
      const endpoint =
        action === "credit"
          ? API_CONFIG.endpoints.adminWallet.credit
          : API_CONFIG.endpoints.adminWallet.debit;

      const res = await API.post(endpoint, body);

      if (!res?.success) {
        alert(res?.message || "Error");
        return;
      }

      alert(res.message || "Success");
      adjustAmount.value = "";
      await searchWallet();
    } catch (err) {
      console.error("ADJUST BALANCE ERROR:", err);
      alert("Server error");
    }
  }

  // =========================
  // USER-SPECIFIC WITHDRAWALS (after search)
  // =========================
  async function loadUserWithdrawals(userId) {
    if (!withdrawTable) return;

    try {
      const res = await API.get(
        "/admin/wallet/withdrawals",
        {},
        { status: "all", limit: 100, page: 1 },
      );

      if (!res?.success) {
        renderEmptyWithdrawals("Failed to load withdrawal requests.");
        return;
      }

      const allWithdrawals = res.withdrawals || [];
      const userWithdrawals = allWithdrawals.filter(
        (w) => w.user && w.user._id === userId,
      );

      if (!userWithdrawals.length) {
        renderEmptyWithdrawals("No withdrawal requests found for this user.");
        return;
      }

      withdrawTable.innerHTML = "";

      userWithdrawals.forEach((w) => {
        const createdAt = new Date(w.createdAt).toLocaleString();
        const amount = `₹ ${w.amount}`;
        const method = (w.paymentMethod || "").toUpperCase();

        const pd = w.paymentDetails || {};
        let details = "-";

        if (w.paymentMethod === "upi" && pd.upiId) {
          details = `UPI: ${pd.upiId}`;
        } else if (w.paymentMethod === "bank_transfer") {
          const acc = pd.accountNumber || "";
          const bankName = pd.bankName || "";
          const ifsc = pd.ifscCode || "";
          details = `
            Bank: ${bankName || "-"}<br>
            A/C: ${acc || "-"}<br>
            IFSC: ${ifsc || "-"}
          `;
        }

        let statusClass = "secondary";
        if (w.status === "pending") statusClass = "warning";
        else if (w.status === "completed") statusClass = "success";
        else if (w.status === "failed") statusClass = "danger";

        const statusBadge = `<span class="badge bg-${statusClass} text-uppercase">${w.status}</span>`;

        let actionsHtml = `<span class="text-muted small">No actions</span>`;
        if (w.status === "pending") {
          actionsHtml = `
            <button 
              class="btn btn-sm btn-success me-1"
              onclick="adminWallet.approveWithdrawal('${w._id}')"
            >
              Approve
            </button>
            <button 
              class="btn btn-sm btn-outline-danger"
              onclick="adminWallet.rejectWithdrawal('${w._id}')"
            >
              Reject
            </button>
          `;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
  <td>${createdAt}</td>
  <td>
    ${w.user?.name || "-"}<br>
    <small class="text-muted">${w.user?.email || ""}</small>
  </td>
  <td>${amount}</td>
  <td>${method}</td>
  <td>${details}</td>
  <td>${statusBadge}</td>
  <td>${actionsHtml}</td>
`;
        withdrawTable.appendChild(tr);
      });
    } catch (err) {
      console.error("LOAD USER WITHDRAWALS ERROR:", err);
      renderEmptyWithdrawals("Error while loading withdrawal requests.");
    }
  }

  // =========================
  // GLOBAL PENDING WITHDRAWALS (Withdrawals tab)
  // =========================
  async function loadWithdrawals() {
    if (!withdrawTable) return;

    try {
      const query = {
        status: withdrawalStatus || "all",
        limit: withdrawalLimit,
        page: withdrawalCurrentPage,
      };

      if (withdrawalSearch) {
        query.search = withdrawalSearch;
      }

      if (withdrawalDateRange) {
        const days = parseInt(withdrawalDateRange);

        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - days);

        query.fromDate = fromDate.toISOString();
        query.toDate = toDate.toISOString();
      }

      const res = await API.get("/admin/wallet/withdrawals", {}, query);

      withdrawTable.innerHTML = "";

      if (!res?.success) {
        renderEmptyWithdrawals("Failed to load withdrawal requests.");
        return;
      }

      const withdrawals = res.withdrawals || [];
      const pagination = res.pagination || {};

      withdrawalTotalPages = pagination.totalPages || 1;
      withdrawalCurrentPage = pagination.currentPage || 1;

      if (!withdrawals.length) {
        renderEmptyWithdrawals("No withdrawal requests found.");
        renderWithdrawalPagination();
        return;
      }

      withdrawals.forEach((w) => {
        const user = w.user || {};
        const createdAt = new Date(w.createdAt).toLocaleString();
        const amount = `₹ ${w.amount}`;
        const method = (w.paymentMethod || "").toUpperCase();

        const pd = w.paymentDetails || {};
        let details = "-";

        if (w.paymentMethod === "upi" && pd.upiId) {
          details = `UPI: ${pd.upiId}`;
        } else if (
          (w.paymentMethod === "bank_transfer" || w.paymentMethod === "bank") &&
          (pd.accountNumber || pd.bankName || pd.ifscCode)
        ) {
          details = `Bank: ${pd.bankName || "-"} | A/C: ${
            pd.accountNumber || "-"
          } | IFSC: ${pd.ifscCode || "-"}`;
        }

        const statusClass =
          w.status === "pending"
            ? "warning"
            : w.status === "completed"
              ? "success"
              : "danger";

        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td>${createdAt}</td>
        <td>${user.name || "-"}<br><small class="text-muted">${
          user.email || ""
        }</small></td>
        <td>${amount}</td>
        <td>${method}</td>
        <td>${details}</td>
        <td><span class="badge bg-${statusClass} text-uppercase">${
          w.status
        }</span></td>
        <td>
          <button class="btn btn-primary btn-sm me-1" onclick="openWithdrawModal('${
            w._id
          }')">View</button>
          ${
            w.status === "pending"
              ? `<button class="btn btn-sm btn-success me-1" onclick="approveWithdrawalFromList('${w._id}')">Approve</button>
              <button class="btn btn-sm btn-outline-danger" onclick="rejectWithdrawalFromList('${w._id}')">Reject</button>`
              : `<span class="text-muted small">No actions</span>`
          }
        </td>
      `;
        withdrawTable.appendChild(tr);
      });

      renderWithdrawalPagination();
    } catch (err) {
      console.error("LOAD WITHDRAWALS ERROR:", err);
      renderEmptyWithdrawals("Error loading withdrawals.");
    }
  }
  function renderWithdrawalPagination() {
    const container = document.getElementById("withdrawalPagination");
    if (!container) return;

    container.innerHTML = "";
    if (withdrawalTotalPages <= 1) return;

    const PAGE_WINDOW = 10;

    const windowStart =
      Math.floor((withdrawalCurrentPage - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;
    const windowEnd = Math.min(
      windowStart + PAGE_WINDOW - 1,
      withdrawalTotalPages,
    );

    let html = `<ul class="pagination justify-content-center mb-0">`;

    html += `
    <li class="page-item ${withdrawalCurrentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${
        withdrawalCurrentPage - 1
      }">&lsaquo;</a>
    </li>
  `;

    for (let p = windowStart; p <= windowEnd; p++) {
      html += `
      <li class="page-item ${p === withdrawalCurrentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${p}">${p}</a>
      </li>
    `;
    }

    html += `
    <li class="page-item ${
      withdrawalCurrentPage === withdrawalTotalPages ? "disabled" : ""
    }">
      <a class="page-link" href="#" data-page="${
        withdrawalCurrentPage + 1
      }">&rsaquo;</a>
    </li>
  `;

    html += `</ul>`;
    container.innerHTML = html;

    container.querySelectorAll("a.page-link").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const page = parseInt(a.dataset.page);
        if (!page || page < 1 || page > withdrawalTotalPages) return;

        withdrawalCurrentPage = page;
        loadWithdrawals();
      });
    });
  }
  // =========================
  // MODAL VIEW FOR A WITHDRAWAL
  // =========================
  function openWithdrawModal(transactionId) {
    const modalBody = $("withdrawModalContent");
    const approveBtn = $("modalApproveBtn");
    const rejectBtn = $("modalRejectBtn");

    if (!modalBody) return;

    modalBody.innerHTML = "Loading...";

    API.get("/admin/wallet/withdrawals", {}, { status: "all" })
      .then((res) => {
        if (!res?.success) {
          modalBody.innerHTML = "Error loading withdrawal.";
          return;
        }

        const tx = (res.withdrawals || []).find((w) => w._id === transactionId);
        if (!tx) {
          modalBody.innerHTML = "Withdrawal not found.";
          return;
        }

        const user = tx.user || {};
        const pd = tx.paymentDetails || {};

        let detailsHTML = "-";
        if (tx.paymentMethod === "upi" && pd.upiId) {
          detailsHTML = `<p><strong>UPI ID:</strong> ${pd.upiId}</p>`;
        } else if (tx.paymentMethod === "bank_transfer") {
          detailsHTML = `
            <p><strong>Bank:</strong> ${pd.bankName || "-"}</p>
            <p><strong>Account Number:</strong> ${pd.accountNumber || "-"}</p>
            <p><strong>IFSC:</strong> ${pd.ifscCode || "-"}</p>
            <p><strong>Account Holder:</strong> ${
              pd.accountHolderName || "-"
            }</p>
          `;
        }

        modalBody.innerHTML = `
          <h5>User Details</h5>
          <p>
            <strong>Name:</strong> ${user.name || "-"}<br>
            <strong>Email:</strong> ${user.email || "-"}<br>
            <strong>Phone:</strong> ${user.phoneNumber || "-"}
          </p>

          <h5>Withdrawal</h5>
          <p>
            <strong>Amount:</strong> ₹ ${tx.amount}<br>
            <strong>Status:</strong> ${tx.status}<br>
            <strong>Method:</strong> ${tx.paymentMethod.toUpperCase()}<br>
            <strong>Requested At:</strong> ${new Date(
              tx.createdAt,
            ).toLocaleString()}
          </p>

          <h5>Payment Details</h5>
          ${detailsHTML}
        `;

        if (approveBtn) {
          approveBtn.onclick = () => approveWithdrawalFromList(transactionId);
        }
        if (rejectBtn) {
          rejectBtn.onclick = () => rejectWithdrawalFromList(transactionId);
        }
      })
      .catch((err) => {
        console.error("OPEN WITHDRAW MODAL ERROR:", err);
        modalBody.innerHTML = "Error loading withdrawal details.";
      });

    if (window.bootstrap) {
      const modalEl = $("withdrawModal");
      if (modalEl) {
        const modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();
      }
    }
  }

  // =========================
  // APPROVE / REJECT HELPERS
  // =========================
  async function approveWithdrawalFromList(transactionId) {
    if (!transactionId) return;
    const ok = confirm(
      "Approve this withdrawal? Only after sending money manually.",
    );
    if (!ok) return;

    try {
      const res = await API.post("/admin/wallet/withdrawals/approve", {
        transactionId,
      });
      if (!res?.success) {
        alert(res?.message || "Failed to approve");
        return;
      }
      alert("Withdrawal approved");
      await loadWithdrawals();
    } catch (err) {
      console.error("APPROVE ERROR:", err);
      alert("Server error");
    }
  }

  async function rejectWithdrawalFromList(transactionId) {
    if (!transactionId) return;
    const reason = prompt("Enter rejection reason:");
    if (!reason || !reason.trim()) {
      alert("Rejection reason required");
      return;
    }

    try {
      const res = await API.post("/admin/wallet/withdrawals/reject", {
        transactionId,
        reason: reason.trim(),
      });
      if (!res?.success) {
        alert(res?.message || "Failed to reject");
        return;
      }
      alert("Withdrawal rejected");
      await loadWithdrawals();
    } catch (err) {
      console.error("REJECT ERROR:", err);
      alert("Server error");
    }
  }

  // Thin wrappers so inline onclick="adminWallet.approveWithdrawal" still works
  async function approveWithdrawal(transactionId) {
    return approveWithdrawalFromList(transactionId);
  }

  async function rejectWithdrawal(transactionId) {
    return rejectWithdrawalFromList(transactionId);
  }

  // =========================
  // TAB HANDLERS
  // =========================
  withdrawTabBtn?.addEventListener("click", () => {
    searchCard?.classList.add("d-none");

    withdrawalCurrentPage = 1;
    withdrawalStatus = "pending";
    withdrawalSearch = "";
    withdrawalDateRange = "";

    if (withdrawSearchInput) withdrawSearchInput.value = "";
    if (withdrawDateFilter) withdrawDateFilter.value = "";
    if (withdrawStatusFilter) withdrawStatusFilter.value = "pending";

    loadWithdrawals();
  });

  walletTabBtn?.addEventListener("click", () => {
    searchCard?.classList.remove("d-none");
  });
  function renderTransactions() {
    if (!txnTable) return;

    txnTable.innerHTML = "";

    const transactionsToShow = isTxnExpanded
      ? allTransactions.slice(0, txnVisibleCount)
      : allTransactions.slice(0, 5);

    if (!transactionsToShow.length) {
      txnTable.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          No transactions found
        </td>
      </tr>
    `;
      return;
    }

    transactionsToShow.forEach((tx) => {
      txnTable.insertAdjacentHTML(
        "beforeend",
        `<tr>
        <td>${new Date(tx.createdAt).toLocaleString()}</td>
        <td>${tx.type}</td>
        <td>₹ ${tx.amount}</td>
        <td>${tx.description || ""}</td>
      </tr>`,
      );
    });

    renderTransactionControls();
  }
  function renderTransactionControls() {
    const containerId = "txnControls";
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.className = "mt-3 text-center";
      txnTable.closest(".table-responsive")?.after(container);
    }

    container.innerHTML = "";

    // If not expanded and more than 5 exist
    if (!isTxnExpanded && allTransactions.length > 5) {
      container.innerHTML = `
      <button class="btn btn-outline-primary btn-sm">
        View All Transactions
      </button>
    `;
      container.querySelector("button").onclick = () => {
        isTxnExpanded = true;
        txnVisibleCount = 5;
        renderTransactions();
      };
      return;
    }

    // If expanded
    if (isTxnExpanded) {
      let html = "";

      if (txnVisibleCount < allTransactions.length) {
        html += `
        <button class="btn btn-outline-secondary btn-sm me-2" id="txnLoadMore">
          Load More
        </button>
      `;
      }

      html += `
      <button class="btn btn-link btn-sm" id="txnCollapse">
        Collapse
      </button>
    `;

      container.innerHTML = html;

      const loadMoreBtn = document.getElementById("txnLoadMore");
      if (loadMoreBtn) {
        loadMoreBtn.onclick = () => {
          txnVisibleCount += 5;
          renderTransactions();
        };
      }

      document.getElementById("txnCollapse").onclick = () => {
        isTxnExpanded = false;
        txnVisibleCount = 5;
        renderTransactions();
      };
    }
  }
  // =========================
  // EVENT LISTENERS
  // =========================
  searchBtn?.addEventListener("click", searchWallet);
  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchWallet();
  });
  const resetUserBtn = $("resetUserBtn");

  resetUserBtn?.addEventListener("click", resetUserView);
  const backToGlobalBtn = document.getElementById("backToGlobalBtn");
  backToGlobalBtn?.addEventListener("click", resetUserView);
  // Status filter
  withdrawStatusFilter?.addEventListener("change", () => {
    withdrawalStatus = withdrawStatusFilter.value || "all";
    withdrawalCurrentPage = 1;
    loadWithdrawals();
  });

  // Date filter
  withdrawDateFilter?.addEventListener("change", () => {
    withdrawalDateRange = withdrawDateFilter.value || "";
    withdrawalCurrentPage = 1;
    loadWithdrawals();
  });

  // Debounce helper
  function debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Live search
  withdrawSearchInput?.addEventListener(
    "input",
    debounce(() => {
      withdrawalSearch = withdrawSearchInput.value.trim();
      withdrawalCurrentPage = 1;
      loadWithdrawals();
    }, 400),
  );
  function resetUserView() {
    isUserViewActive = false;
    currentUserId = null;
    const userViewAlert = document.getElementById("userViewAlert");
    if (userViewAlert) userViewAlert.classList.add("d-none");
    if (walletCard) walletCard.classList.add("d-none");
    // 🔥 Restore global withdrawal section
    withdrawSection?.classList.remove("d-none");
    if (searchInput) searchInput.value = "";

    resetUI();
    loadWithdrawals();
  }
  addMoneyBtn?.addEventListener("click", () => adjustBalance("credit"));
  deductMoneyBtn?.addEventListener("click", () => adjustBalance("debit"));
  // Load default withdrawals when page opens
  document.addEventListener("DOMContentLoaded", () => {
    loadWithdrawals();
  });
  // =========================
  // EXPORT TO WINDOW
  // =========================
  // Export to window (for inline onclick + debugging)
  window.adminWallet = {
    searchWallet,
    adjustBalance,
    loadUserWithdrawals,
    loadWithdrawals,
    openWithdrawModal,
    approveWithdrawalFromList,
    rejectWithdrawalFromList,
    approveWithdrawal,
    rejectWithdrawal,
  };

  // 🔥 Make openWithdrawModal available for inline onclick="openWithdrawModal('...')"
  window.openWithdrawModal = openWithdrawModal;
})();
