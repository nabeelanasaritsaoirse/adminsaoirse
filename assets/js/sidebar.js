/**
 * Sidebar Navigation JavaScript
 * Handles sidebar toggle and navigation interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    highlightActiveLink();
});

/**
 * Initialize sidebar functionality
 */
function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            toggleSidebar();
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle = sidebarToggle.contains(event.target);
        const isMobile = window.innerWidth < 992;

        if (!isClickInsideSidebar && !isClickOnToggle && isMobile && sidebar.classList.contains('show')) {
            toggleSidebar();
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 992) {
            sidebar.classList.remove('show');
            sidebar.classList.remove('collapsed');
            if (mainContent) {
                mainContent.classList.remove('expanded');
            }
        }
    });
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const isMobile = window.innerWidth < 992;

    if (sidebar) {
        if (isMobile) {
            // On mobile, show/hide sidebar with overlay
            sidebar.classList.toggle('show');
        } else {
            // On desktop, collapse/expand sidebar
            sidebar.classList.toggle('collapsed');
            if (mainContent) {
                mainContent.classList.toggle('expanded');
            }
        }
    }
}

/**
 * Highlight active navigation link based on current page
 */
function highlightActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.sidebar .nav-link');

    navLinks.forEach(link => {
        link.classList.remove('active');

        const linkHref = link.getAttribute('href');
        if (linkHref && linkHref.includes(currentPage)) {
            link.classList.add('active');
        }
    });

    // If no match, highlight dashboard
    if (!document.querySelector('.sidebar .nav-link.active')) {
        const dashboardLink = document.querySelector('.sidebar .nav-link[href*="index.html"]');
        if (dashboardLink) {
            dashboardLink.classList.add('active');
        }
    }
}

/**
 * Add submenu functionality (for future use)
 */
function initializeSubmenus() {
    const submenus = document.querySelectorAll('.has-submenu');

    submenus.forEach(menu => {
        menu.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.toggle('active');
            const submenu = this.nextElementSibling;
            if (submenu) {
                submenu.classList.toggle('show');
            }
        });
    });
}

/**
 * Smooth scroll to section (for single page apps)
 * @param {string} sectionId - ID of section to scroll to
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Export functions for external use
window.sidebarFunctions = {
    toggleSidebar,
    highlightActiveLink,
    scrollToSection
};
