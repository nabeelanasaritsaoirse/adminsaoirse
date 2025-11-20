// assets/js/admin_wallet.js
(() => {
  const API_ENDPOINT = '/admin/wallet';
  const $ = id => document.getElementById(id);

  // Elements
  const searchInput = $('searchInput');
  const searchBtn = $('searchBtn');
  const walletCard = $('walletCard');
  const walletBalanceEl = $('walletBalance');
  const holdBalanceEl = $('holdBalance');
  const referralBonusEl = $('referralBonus');
  const investedAmountEl = $('investedAmount');
  const txnTable = $('txnTable');
  const adjustAmount = $('adjustAmount');
  const addMoneyBtn = $('addMoneyBtn');
  const deductMoneyBtn = $('deductMoneyBtn');

  function resetUI() {
    walletBalanceEl.innerText = "₹ 0";
    holdBalanceEl.innerText = "₹ 0";
    referralBonusEl.innerText = "₹ 0";
    investedAmountEl.innerText = "₹ 0";
    txnTable.innerHTML = "";
  }

  /* ---------------------------------------
      SEARCH WALLET
  ----------------------------------------*/
  async function searchWallet() {
    const q = searchInput.value.trim();
    if (!q) return alert('Enter phone or email to search');

    resetUI();

    let query = {};
    if (q.includes('@')) query.email = q;
    else query.phone = q;

    // 🔥 LOGS ADDED
    console.log("🔍 SEARCH QUERY:", query);

    const finalURL = API.buildURL(API_ENDPOINT, {}) + "?" + new URLSearchParams(query).toString();
    console.log("🌐 FINAL REQUEST URL:", finalURL);

    try {
      const data = await API.get(API_ENDPOINT, {}, query);

      // 🔥 LOG RESPONSE
      console.log("📩 API RESPONSE:", data);

      if (!data?.success) {
        alert(data?.message || 'User not found');
        walletCard.classList.add('d-none');
        return;
      }

      walletCard.classList.remove('d-none');

      walletBalanceEl.innerText = `₹ ${data.availableBalance ?? 0}`;
      holdBalanceEl.innerText = `₹ ${data.holdBalance ?? 0}`;
      referralBonusEl.innerText = `₹ ${data.referralBonus ?? 0}`;
      investedAmountEl.innerText = `₹ ${data.investedAmount ?? 0}`;

      txnTable.innerHTML = "";
      (data.transactions || []).forEach(tx => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${new Date(tx.createdAt).toLocaleString()}</td>
          <td>${tx.type}</td>
          <td>₹ ${tx.amount}</td>
          <td>${tx.description || ""}</td>
        `;
        txnTable.appendChild(tr);
      });

    } catch (err) {
      console.error("❌ WALLET SEARCH ERROR:", err);
      alert("Server error");
    }
  }

  /* ---------------------------------------
      ADD/DEDUCT MONEY
  ----------------------------------------*/
  async function adjustBalance(action) {
    const q = searchInput.value.trim();
    if (!q) return alert('Enter phone/email first');

    const amount = Number(adjustAmount.value);
    if (!amount || amount <= 0) return alert('Invalid amount');

    const body = {
      amount,
      description: action === 'credit' ? "Admin credit" : "Admin debit"
    };

    if (q.includes('@')) body.email = q;
    else body.phone = q;

    // LOG for debugging
    console.log(`⚡ ${action.toUpperCase()} REQUEST BODY:`, body);

    try {
      const endpoint = action === 'credit'
        ? '/admin/wallet/credit'
        : '/admin/wallet/debit';

      const res = await API.post(endpoint, body);

      console.log(`📩 ${action.toUpperCase()} RESPONSE:`, res);

      if (!res?.success) return alert(res?.message || "Error");

      alert(res.message || "Success");

      adjustAmount.value = "";
      await searchWallet();

    } catch (err) {
      console.error(`❌ ${action.toUpperCase()} ERROR:`, err);
      alert("Server error");
    }
  }

  if (searchBtn) searchBtn.addEventListener('click', searchWallet);
  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') searchWallet();
    });
  }

  if (addMoneyBtn) addMoneyBtn.addEventListener('click', () => adjustBalance("credit"));
  if (deductMoneyBtn) deductMoneyBtn.addEventListener('click', () => adjustBalance("debit"));

  window.adminWallet = { searchWallet, adjustBalance };
})();
