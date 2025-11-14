// coupons.js
// Handles creating coupons and loading all coupons for the Coupons page

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('couponForm');
    const tableBody = document.getElementById('couponsTableBody');
    const alertContainer = document.getElementById('couponAlert');

    if (!form) {
        console.warn('Coupon form not found (id="couponForm").');
        return;
    }

    if (!tableBody) {
        console.warn('Coupons table body not found (id="couponsTableBody").');
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const couponCode = document.getElementById('couponCode').value.trim();
        const discountType = document.getElementById('discountType').value;
        const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
        const minOrderValue = parseFloat(document.getElementById('minOrderValue').value) || 0;
        const expiryDate = document.getElementById('expiryDate').value;

        const payload = {
            couponCode,
            discountType,
            discountValue,
            minOrderValue,
            expiryDate
        };

        try {
            const res = await fetch('http://localhost:5000/api/admin/coupon/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to create coupon');
            }

            const data = await res.json();
            showMessage('success', 'Coupon created successfully');

            form.reset();
            loadCoupons();
        } catch (err) {
            console.error('Create coupon error:', err);
            showMessage('danger', 'Error creating coupon: ' + err.message);
        }
    });

    // Expose loadCoupons for manual refresh if needed
    window.loadCoupons = loadCoupons;

    // Initial load
    loadCoupons();

    async function loadCoupons() {
        tableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

        try {
            const res = await fetch('http://localhost:5000/api/admin/coupon/all', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to fetch coupons');
            }

            const result = await res.json();
            const coupons = Array.isArray(result) ? result : (result.data || []);

            if (!coupons || coupons.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">No coupons found.</td></tr>';
                return;
            }

            tableBody.innerHTML = coupons.map(formatCouponRow).join('');

            // Attach delete handlers for newly created buttons
            const deleteButtons = tableBody.querySelectorAll('.btn-delete-coupon');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', handleDeleteClick);
            });

        } catch (err) {
            console.error('Load coupons error:', err);
            tableBody.innerHTML = '<tr><td colspan="7">Error loading coupons.</td></tr>';
            showMessage('danger', 'Error loading coupons: ' + err.message);
        }
    }

    function formatCouponRow(coupon) {
        // Expect coupon to have id, couponCode, discountType, discountValue, minOrderValue, expiryDate
        const id = coupon.id || coupon._id || '';
        const code = escapeHtml(coupon.couponCode || coupon.code || '');
        const type = escapeHtml(coupon.discountType || coupon.type || '');
        const value = coupon.discountValue != null ? coupon.discountValue : '';
        const minVal = coupon.minOrderValue != null ? coupon.minOrderValue : '';
        const expiry = coupon.expiryDate ? (new Date(coupon.expiryDate)).toLocaleDateString() : '';

        return `
            <tr data-coupon-id="${id}">
                <td>${id}</td>
                <td>${code}</td>
                <td>${type}</td>
                <td>${value}</td>
                <td>${minVal}</td>
                <td>${expiry}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger btn-delete-coupon" data-id="${id}">Delete</button>
                </td>
            </tr>
        `;
    }

    async function handleDeleteClick(e) {
        const id = e.currentTarget.getAttribute('data-id');
        if (!id) return;

        if (!confirm('Are you sure you want to delete this coupon?')) return;

        try {
            const res = await fetch(`http://localhost:5000/api/admin/coupon/delete/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to delete coupon');
            }

            showMessage('success', 'Coupon deleted');

            loadCoupons();
        } catch (err) {
            console.error('Delete coupon error:', err);
            showMessage('danger', 'Error deleting coupon: ' + err.message);
        }
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper to show messages in the page (falls back to adminPanel.showNotification or alert)
    function showMessage(type, message) {
        // type: 'success' | 'danger' | 'info' | 'warning'
        if (alertContainer) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert">
                ${escapeHtml(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
            alertContainer.innerHTML = ''; // replace previous
            alertContainer.appendChild(wrapper);
            return;
        }

        if (window.adminPanel && typeof window.adminPanel.showNotification === 'function') {
            // map bootstrap types to adminPanel types if needed
            window.adminPanel.showNotification(message, type === 'danger' ? 'danger' : (type === 'success' ? 'success' : 'info'));
            return;
        }

        // Last resort
        alert(message);
    }
});
