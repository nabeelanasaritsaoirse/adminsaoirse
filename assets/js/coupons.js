// coupons.js
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('couponForm');
    const tableBody = document.getElementById('couponsTableBody');
    const alertContainer = document.getElementById('couponAlert');

    if (!form || !tableBody) {
        console.warn("Coupon form or table not found");
        return;
    }

    // SHOW/HIDE milestone fields
    const couponTypeInput = document.getElementById("couponType");
    const milestoneFields = document.getElementById("milestoneFields");

    couponTypeInput.addEventListener("change", () => {
        milestoneFields.style.display =
            couponTypeInput.value === "MILESTONE_REWARD" ? "block" : "none";
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const couponCode = document.getElementById('couponCode').value.trim();
        const discountType = document.getElementById('discountType').value;
        const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
        const minOrderValue = parseFloat(document.getElementById('minOrderValue').value) || 0;
        const expiryDate = document.getElementById('expiryDate').value;

        const couponType = document.getElementById("couponType").value;
        const rewardCondition = parseInt(document.getElementById("rewardCondition").value) || null;
        const rewardValue = parseInt(document.getElementById("rewardValue").value) || null;

        // BUILD PAYLOAD
        const payload = {
            couponCode,
            discountType,
            discountValue,
            minOrderValue,
            expiryDate,
            couponType,
        };

        if (couponType === "MILESTONE_REWARD") {
            payload.rewardCondition = rewardCondition;
            payload.rewardValue = rewardValue;
        }

        try {
            const res = await fetch(`${BASEURL}/coupons/admin/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            if (!res.ok) throw new Error(text);

            showMessage('success', 'Coupon created successfully');
            form.reset();
            milestoneFields.style.display = "none";
            loadCoupons();
        } catch (err) {
            console.error('Create coupon error:', err);
            showMessage('danger', 'Error creating coupon: ' + err.message);
        }
    });

    window.loadCoupons = loadCoupons;
    loadCoupons();

    async function loadCoupons() {
        tableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

        try {
            const res = await fetch(`${BASEURL}/coupons/admin/all`);
            const data = await res.json();

            const coupons = data.coupons || [];

            if (coupons.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">No coupons found.</td></tr>';
                return;
            }

            tableBody.innerHTML = coupons.map(formatCouponRow).join('');

            tableBody.querySelectorAll('.btn-delete-coupon')
                .forEach(btn => btn.addEventListener('click', handleDeleteClick));

        } catch (err) {
            console.error('Load coupons error:', err);
            tableBody.innerHTML = '<tr><td colspan="7">Error loading coupons.</td></tr>';
            showMessage('danger', err.message);
        }
    }

    function formatCouponRow(coupon) {
        return `
        <tr>
            <td>${coupon._id}</td>
            <td>${escapeHtml(coupon.couponCode)}</td>
            <td>${coupon.discountType} (${coupon.discountValue})</td>
            <td>${coupon.couponType}</td>
            <td>${coupon.minOrderValue}</td>
            <td>${coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : ''}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger btn-delete-coupon"
                    data-id="${coupon._id}">
                    Delete
                </button>
            </td>
        </tr>`;
    }

    async function handleDeleteClick(e) {
        const id = e.currentTarget.getAttribute('data-id');
        if (!confirm('Delete this coupon?')) return;

        try {
            const res = await fetch(`${BASEURL}/coupons/admin/delete/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error(await res.text());

            showMessage('success', 'Coupon deleted');
            loadCoupons();
        } catch (err) {
            showMessage('danger', err.message);
        }
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#039;'
        }[m]));
    }

    function showMessage(type, message) {
        if (!alertContainer) return alert(message);

        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible" role="alert">
                ${escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>`;
    }
});
