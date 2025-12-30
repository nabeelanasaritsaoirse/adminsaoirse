(() => {
  let currentPeriod = "all";

  // 🔹 Chart instances (IMPORTANT to avoid duplicates)
  let userChart = null;
  let productChart = null;
  let paymentChart = null;
  let overdueChart = null;
  let forecastChart = null;

  /* =========================
     SKELETON HELPERS
  ========================= */
  function showSkeleton(containerId, count = 3) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = Array(count)
      .fill(`<div class="skeleton skeleton-box"></div>`)
      .join("");
  }

  function clearSkeleton(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";
  }

  /* =========================
     USER ANALYTICS
  ========================= */
  async function loadUserAnalytics(period) {
    showSkeleton("userSummary");

    const res = await API.get(
      "/installments/admin/analytics/users",
      {},
      { limit: 10, period }
    );

    const { summary, topUsersByPayments } = res.data;

    clearSkeleton("userSummary");

    document.getElementById("userSummary").innerHTML = `
      <div class="col-md-3">
        <div class="stat">${summary.totalUniqueUsers}</div>
        <div class="muted">Unique Users</div>
      </div>
      <div class="col-md-3">
        <div class="stat">${summary.usersWithMultipleOrders}</div>
        <div class="muted">Repeat Users</div>
      </div>
      <div class="col-md-3">
        <div class="stat">${summary.retentionRate}%</div>
        <div class="muted">Retention</div>
      </div>
    `;

    document.getElementById("topUsersTable").innerHTML =
      topUsersByPayments.length
        ? topUsersByPayments
            .map(
              (u) => `
          <tr>
            <td>${u.name || "-"}</td>
            <td>${u.email || "-"}</td>
            <td>₹${u.totalPaid || 0}</td>
            <td>${u.paymentCount || 0}</td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="4" class="text-center text-muted">No data</td></tr>`;

    // 📊 Chart
    const labels = topUsersByPayments.map((u) => u.name);
    const values = topUsersByPayments.map((u) => u.totalPaid);

    userChart = ChartUtils.createBarChart("userPaymentsChart", {
      labels,
      values,
      backgroundColor: "#51cf66",
    });
  }

  /* =========================
     PRODUCT ANALYTICS
  ========================= */
  async function loadProductAnalytics(period) {
    showSkeleton("productSummary");

    const res = await API.get(
      "/installments/admin/analytics/products",
      {},
      { limit: 10, period }
    );

    const { summary, bestSellingByRevenue } = res.data;

    clearSkeleton("productSummary");

    document.getElementById("productSummary").innerHTML = `
      <div class="col-md-4">
        <div class="stat">${summary.totalProducts}</div>
        <div class="muted">Products Ordered</div>
      </div>
      <div class="col-md-4">
        <div class="stat">${summary.totalOrders}</div>
        <div class="muted">Total Orders</div>
      </div>
    `;

    document.getElementById("topProductsTable").innerHTML =
      bestSellingByRevenue.length
        ? bestSellingByRevenue
            .map(
              (p) => `
          <tr>
            <td>${p.name || "-"}</td>
            <td>${p.orderCount || 0}</td>
            <td>₹${p.totalRevenue || 0}</td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="3" class="text-center text-muted">No data</td></tr>`;

    const top5 = bestSellingByRevenue.slice(0, 5);

    productChart = ChartUtils.createBarChart("productRevenueChart", {
      labels: top5.map((p) =>
        p.name.length > 30 ? p.name.slice(0, 30) + "…" : p.name
      ),
      values: top5.map((p) => p.totalRevenue),
      horizontal: true,
      backgroundColor: "#4dabf7",
      tooltipTitle: (ctx) => top5[ctx[0].dataIndex].name,
    });
  }

  /* =========================
     PAYMENT METHODS
  ========================= */
  async function loadPaymentAnalytics(period) {
    const res = await API.get(
      "/installments/admin/analytics/payment-methods",
      {},
      { period }
    );

    const { comparison } = res.data;

    paymentChart = ChartUtils.createPieChart("paymentMethodsChart", {
      labels: ["Razorpay", "Wallet"],
      values: [comparison.razorpayPercentage, comparison.walletPercentage],
    });
  }

  /* =========================
     OVERDUE
  ========================= */
  async function loadOverdueAnalytics() {
    const res = await API.get("/installments/admin/analytics/overdue");
    const { summary, overdueByDays } = res.data;

    // Summary cards
    document.getElementById("overdueSummary").innerHTML = `
    <div class="col-md-4">
      <div class="stat">${summary.totalOverdueOrders}</div>
      <div class="muted">Overdue Orders</div>
    </div>
    <div class="col-md-4">
      <div class="stat">₹${summary.totalOverdueAmount}</div>
      <div class="muted">Money At Risk</div>
    </div>
    <div class="col-md-4">
      <div class="stat">${summary.avgDaysOverdue}</div>
      <div class="muted">Avg Days Overdue</div>
    </div>
  `;

    // -------------------------
    // 📊 Overdue Chart
    // -------------------------
    const labels = Object.keys(overdueByDays);
    const values = labels.map((key) => overdueByDays[key] || 0);

    overdueChart = ChartUtils.createBarChart("overdueChart", {
      labels,
      values,
      backgroundColor: values.map((v) =>
        v >= 5 ? "#dc3545" : v >= 3 ? "#ffc107" : "#198754"
      ),
    });
  }

  /* =========================
     FORECAST
  ========================= */
  async function loadForecast() {
    const res = await API.get(
      "/installments/admin/analytics/forecast",
      {},
      { days: 30 }
    );

    const { summary, dailyForecast } = res.data;

    // Summary cards
    document.getElementById("forecastSummary").innerHTML = `
    <div class="col-md-3">
      <div class="stat">₹${summary.totalExpectedRevenue}</div>
      <div class="muted">Expected Revenue</div>
    </div>
    <div class="col-md-3">
      <div class="stat">${summary.totalExpectedPayments}</div>
      <div class="muted">Expected Payments</div>
    </div>
    <div class="col-md-3">
      <div class="stat">₹${summary.avgDailyExpected}</div>
      <div class="muted">Daily Avg</div>
    </div>
    <div class="col-md-3">
      <div class="stat">₹${summary.upcomingDuePayments7Days}</div>
      <div class="muted">Next 7 Days</div>
    </div>
  `;

    // -------------------------
    // 📈 Forecast Line Chart
    // -------------------------
    const labels = dailyForecast.map((d) => d.date);
    const values = dailyForecast.map((d) => d.expected);

    forecastChart = ChartUtils.createLineChart("forecastChart", {
      labels,
      values,
      fill: true,
    });
  }

  /* =========================
     LOAD ALL
  ========================= */
  async function loadAllAnalytics(period) {
    await Promise.all([
      loadUserAnalytics(period),
      loadProductAnalytics(period),
      loadPaymentAnalytics(period),
      loadOverdueAnalytics(),
      loadForecast(),
    ]);
  }

  /* =========================
     FILTER
  ========================= */
  function setupPeriodFilter() {
    const filter = document.getElementById("periodFilter");
    if (!filter) return;

    filter.addEventListener("change", async (e) => {
      currentPeriod = e.target.value;
      await loadAllAnalytics(currentPeriod);
    });
  }

  /* =========================
     INIT
  ========================= */
  (async function init() {
    try {
      setupPeriodFilter();
      await loadAllAnalytics(currentPeriod);
      console.log("Analytics loaded with charts & skeletons");
    } catch (err) {
      console.error("Analytics error:", err);
      alert(err.message || "Failed to load analytics");
    }
  })();
})();
