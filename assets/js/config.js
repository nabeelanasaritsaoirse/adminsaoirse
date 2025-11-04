/**
 * Global Configuration
 * Common configuration settings used across the application
 */

// API Configuration
const API_CONFIG = {
    // Base URL for API endpoints
    // Change this for production environment
    baseURL: 'http://localhost:5000/api',

    // Timeout for API requests (milliseconds)
    timeout: 30000,

    // API Endpoints
    endpoints: {
        // Categories
        categories: {
            getAll: '/categories',
            getTree: '/categories/tree',
            getRoot: '/categories/root',
            getById: '/categories/:id',
            getBreadcrumb: '/categories/:id/breadcrumb',
            getSubcategories: '/categories/:id/subcategories',
            // Admin endpoints
            create: '/categories/admin/create',
            update: '/categories/admin/:id',
            delete: '/categories/admin/:id',
            toggleStatus: '/categories/admin/:id/toggle-status',
            updateDisplayOrder: '/categories/admin/display-order',
            updateProductCount: '/categories/admin/:id/product-count'
        },

        // Products
        products: {
            getAll: '/products',
            getById: '/products/:id',
            create: '/products/admin/create',
            update: '/products/admin/:id',
            delete: '/products/admin/:id'
        },

        // Users
        users: {
            getAll: '/users',
            getById: '/users/:id',
            create: '/users/admin/create',
            update: '/users/admin/:id',
            delete: '/users/admin/:id'
        },

        // Notifications
        notifications: {
            send: '/notifications/send',
            getAll: '/notifications',
            getById: '/notifications/:id',
            delete: '/notifications/:id'
        },

        // Authentication
        auth: {
            login: '/auth/login',
            logout: '/auth/logout',
            register: '/auth/register',
            refreshToken: '/auth/refresh-token'
        }
    }
};

// App Configuration
const APP_CONFIG = {
    // Application name
    name: 'Admin Panel',

    // Version
    version: '1.0.0',

    // Pagination
    pagination: {
        defaultPageSize: 10,
        pageSizeOptions: [5, 10, 25, 50, 100]
    },

    // Date format
    dateFormat: 'YYYY-MM-DD',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',

    // Maximum file upload size (in bytes)
    maxFileSize: 5 * 1024 * 1024, // 5MB

    // Allowed image formats
    allowedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],

    // Category settings
    categories: {
        maxLevels: 5,
        maxNameLength: 100,
        maxDescriptionLength: 500
    },

    // Notification settings
    notifications: {
        duration: 3000, // milliseconds
        position: 'top-right'
    }
};

// Authentication helper
const AUTH = {
    /**
     * Get authentication token from localStorage
     * @returns {string|null} Authentication token
     */
    getToken: function() {
        return localStorage.getItem('authToken');
    },

    /**
     * Set authentication token in localStorage
     * @param {string} token - Authentication token
     */
    setToken: function(token) {
        localStorage.setItem('authToken', token);
    },

    /**
     * Remove authentication token from localStorage
     */
    removeToken: function() {
        localStorage.removeItem('authToken');
    },

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated: function() {
        return !!this.getToken();
    },

    /**
     * Get authorization header
     * @returns {Object} Headers object with Authorization
     */
    getAuthHeaders: function() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

// API Helper functions
const API = {
    /**
     * Build full API URL
     * @param {string} endpoint - API endpoint path
     * @param {Object} params - URL parameters to replace
     * @returns {string} Full URL
     */
    buildURL: function(endpoint, params = {}) {
        let url = API_CONFIG.baseURL + endpoint;

        // Replace URL parameters
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });

        return url;
    },

    /**
     * Make API request
     * @param {string} url - Full URL or endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise} Response data
     */
    request: async function(url, options = {}) {
        try {
            // Add default headers
            const defaultHeaders = {
                'Content-Type': 'application/json',
                ...AUTH.getAuthHeaders()
            };

            const config = {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers
                }
            };

            const response = await fetch(url, config);

            // Handle unauthorized - TEMPORARILY DISABLED FOR TESTING
            // TODO: Enable this when authentication is implemented
            // if (response.status === 401) {
            //     AUTH.removeToken();
            //     window.location.href = '/login.html';
            //     throw new Error('Unauthorized');
            // }

            // Parse response
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;

        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },

    /**
     * GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - URL parameters
     * @param {Object} query - Query string parameters
     * @returns {Promise} Response data
     */
    get: async function(endpoint, params = {}, query = {}) {
        let url = this.buildURL(endpoint, params);

        // Add query parameters
        if (Object.keys(query).length > 0) {
            const queryString = new URLSearchParams(query).toString();
            url += `?${queryString}`;
        }

        return this.request(url, { method: 'GET' });
    },

    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} params - URL parameters
     * @returns {Promise} Response data
     */
    post: async function(endpoint, data, params = {}) {
        const url = this.buildURL(endpoint, params);
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} params - URL parameters
     * @returns {Promise} Response data
     */
    put: async function(endpoint, data, params = {}) {
        const url = this.buildURL(endpoint, params);
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - URL parameters
     * @param {Object} query - Query string parameters
     * @returns {Promise} Response data
     */
    delete: async function(endpoint, params = {}, query = {}) {
        let url = this.buildURL(endpoint, params);

        // Add query parameters
        if (Object.keys(query).length > 0) {
            const queryString = new URLSearchParams(query).toString();
            url += `?${queryString}`;
        }

        return this.request(url, { method: 'DELETE' });
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
    window.APP_CONFIG = APP_CONFIG;
    window.AUTH = AUTH;
    window.API = API;
}
