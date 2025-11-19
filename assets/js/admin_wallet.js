// assets/js/admin_wallet.js
(() => {
  // endpoint: API.buildURL uses BASE_URL from config.js so endpoint must be '/admin/wallet'
  const API_ENDPOINT = '/admin/wallet';

  const $ = id => document.getElementById(id);

  // Elements (match HTML you supplied)
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

  // Optional modals (only initialize if present)
  const creditModalEl = $('#creditModal');
  const debitModalEl = $('#debitModal');
  let creditModal = null;
  let debitModal = null;
  try {
    if (creditModalEl) creditModal = new bootstrap.Modal(creditModalEl);
    if (debitModalEl) debitModal = new bootstrap.Modal(debitModalEl);
  } catch (e) {
    // ignore bootstrap modal errors if elements not present
    console.warn('Bootstrap modal init skipped or failed:', e.message);
  }

  // helpers
  function getAuthHeaders() {
    // config.js AUTH.getToken handles admin token or fallback
    const token = AUTH.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function searchWallet() {
    const q = searchInput.value.trim();
    if (!q) {
      return alert('Enter phone or email to search');
    }

    // decide whether it's phone or email
    let query = {};
    if (q.includes('@')) query.email = q;
    else query.phone = q;

    // Call API wrapper
    try {
      const data = await API.get(API_ENDPOINT, {}, query);
      // success path
      if (!data || !data.success) {
        alert(data?.message || 'No data returned');
        return;
      }

      // Show wallet card and populate
      walletCard.classList.remove('d-none');

      walletBalanceEl.innerText = `₹ ${data.availableBalance ?? 0}`;
      holdBalanceEl.innerText = `₹ ${data.holdBalance ?? 0}`;
      referralBonusEl.innerText = `₹ ${data.referralBonus ?? 0}`;
      investedAmountEl.innerText = `₹ ${data.investedAmount ?? 0}`;

      // Transactions list
      txnTable.innerHTML = '';
      (data.transactions || []).forEach(tx => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${new Date(tx.createdAt).toLocaleString()}</td>
          <td>${tx.type}</td>
          <td>₹ ${tx.amount}</td>
          <td>${tx.description || ''}</td>
        `;
        txnTable.appendChild(tr);
      });

    } catch (err) {
      console.error('Wallet search error:', err);
      alert(err.message || 'Server/API error (check console)');
    }
  }

  async function adjustBalance(action) {
    // action: 'credit' or 'debit'
    const q = searchInput.value.trim();
    if (!q) return alert('Enter phone or email to identify user');
    const amount = Number(adjustAmount.value);
    if (!amount || amount <= 0) return alert('Invalid amount');

    const body = {};
    if (q.includes('@')) body.email = q;
    else body.phone = q;
    body.amount = amount;
    body.description = (action === 'credit') ? 'Admin credit' : 'Admin debit';

    try {
      const endpoint = (action === 'credit') ? '/admin/wallet/credit' : '/admin/wallet/debit';
      const res = await API.post(endpoint, body);
      if (!res || !res.success) {
        alert(res?.message || 'Error');
        return;
      }
      alert(res.message || 'Success');
      // refresh wallet
      await searchWallet();
      adjustAmount.value = '';
    } catch (err) {
      console.error(`${action} error:`, err);
      alert(err.message || 'Server error');
    }
  }

  // wire events
  if (searchBtn) searchBtn.addEventListener('click', searchWallet);
  if (searchInput) searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWallet();
  });

  if (addMoneyBtn) addMoneyBtn.addEventListener('click', () => adjustBalance('credit'));
  if (deductMoneyBtn) deductMoneyBtn.addEventListener('click', () => adjustBalance('debit'));

  // expose for console debugging
  window.adminWallet = {
    searchWallet,
    adjustBalance
  };
})();
