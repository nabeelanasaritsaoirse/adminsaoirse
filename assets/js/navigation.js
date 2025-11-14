/**
 * Common Navigation Component
 * Manages sidebar navigation across all pages
 */

// Navigation configuration
const NAV_CONFIG = {
    items: [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: 'bi-speedometer2',
            href: '../index.html',
            hrefFromRoot: 'index.html'
        },
        {
            id: 'users',
            label: 'Users',
            icon: 'bi-people',
            href: 'users.html',
            hrefFromRoot: 'pages/users.html'
        },
        {
            id: 'categories',
            label: 'Categories',
            icon: 'bi-folder-fill',
            href: 'categories.html',
            hrefFromRoot: 'pages/categories.html'
        },
        {
            id: 'products',
            label: 'Products',
            icon: 'bi-box-seam',
            href: 'products.html',
            hrefFromRoot: 'pages/products.html'
        },

        /* ⭐ ADDED — Image Uploader */
        {
            id: 'uploader',
            label: 'Image Uploader',
            icon: 'bi-image',
            href: 'uploader.html',
            hrefFromRoot: 'pages/uploader.html'
        },

        {
            id: 'orders',
            label: 'Orders',
            icon: 'bi-cart3',
            href: '#orders',
            hrefFromRoot: '#orders'
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: 'bi-graph-up',
            href: '#analytics',
            hrefFromRoot: '#analytics'
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: 'bi-bell',
            href: 'notifications.html',
            hrefFromRoot: 'pages/notifications.html'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: 'bi-gear',
            href: 'settings.html',
            hrefFromRoot: 'pages/settings.html'
        }
    ]
};

/**
 * Determine if current page is in root or pages folder
 */
function isRootPage() {
    const path = window.location.pathname;
    return !path.includes('/pages/');
}

/**
 * Get the correct href for navigation item
 */
function getNavHref(item) {
    return isRootPage() ? item.hrefFromRoot : item.href;
}

/**
 * Get active navigation item based on current page
 */
function getActiveNavItem() {
    const currentPath = window.location.pathname.toLowerCase();
    const currentPage = currentPath.split('/').pop() || 'index.html';

    const cleanPage = currentPage.split('?')[0];

    const activeItem = NAV_CONFIG.items.find(item => {
        const itemPage = item.hrefFromRoot.split('/').pop().split('?')[0];
        return cleanPage === itemPage || cleanPage === item.href.split('?')[0];
    });

    return activeItem ? activeItem.id : 'dashboard';
}

/**
 * Render navigation sidebar
 */
function renderNavigation(containerId = 'sidebar') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Navigation container not found:', containerId);
        return;
    }

    const activeId = getActiveNavItem();

    const navHTML = `
        <div class="position-sticky pt-3">
            <ul class="nav flex-column">
                ${NAV_CONFIG.items.map(item => {
                    const href = getNavHref(item);
                    const isActive = item.id === activeId;

                    return `
                        <li class="nav-item">
                            <a class="nav-link ${isActive ? 'active' : ''}" 
                               data-nav-id="${item.id}"
                               href="${href}">
                                <i class="bi ${item.icon} me-2"></i>${item.label}
                            </a>
                        </li>
                    `;
                }).join('')}
            </ul>

            <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                <span>Quick Actions</span>
            </h6>
            <ul class="nav flex-column mb-2">
                <li class="nav-item">
                    <a class="nav-link" href="#">
                        <i class="bi bi-file-earmark-plus me-2"></i>Add New
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#">
                        <i class="bi bi-download me-2"></i>Reports
                    </a>
                </li>
            </ul>
        </div>
    `;

    container.innerHTML = navHTML;
}

/**
 * Initialize navigation on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('sidebar')) {
        renderNavigation('sidebar');
    }
});

/**
 * Update active navigation item
 */
function updateActiveNav(itemId) {
    const navLinks = document.querySelectorAll('#sidebar .nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`#sidebar .nav-link[data-nav-id="${itemId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/* ⭐ SIDEBAR TOGGLE RE-ADDED */
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const main = document.querySelector('.main-content');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            if (main) {
                main.classList.toggle('expanded');
            }
        });
    }
});

// Export functions
if (typeof window !== 'undefined') {
    window.Navigation = {
        render: renderNavigation,
        updateActive: updateActiveNav,
        getActive: getActiveNavItem,
        config: NAV_CONFIG
    };
}
