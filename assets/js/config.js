// API Configuration
const API_CONFIG = {
    // Base URL for API endpoints
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
            getById: '/users/:userId',            // ✔ CORRECT
            create: '/users/admin/create',
            update: '/users/admin/:userId',       // ✔ FIXED
            delete: '/users/admin/:userId'        // ✔ FIXED
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
    name: 'Admin Panel',
    version: '1.0.0',

    pagination: {
        defaultPageSize: 10,
        pageSizeOptions: [5, 10, 25, 50, 100]
    },

    dateFormat: 'YYYY-MM-DD',
    dateTimeFormat: 'YYYY-MM-DD HH:mm:ss',

    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],

    categories: {
        maxLevels: 5,
        maxNameLength: 100,
        maxDescriptionLength: 500
    },

    notifications: {
        duration: 3000,
        position: 'top-right'
    }
};

// Authentication helper
const AUTH = {
    getToken: function() {
        return localStorage.getItem('authToken');
    },

    setToken: function(token) {
        localStorage.setItem('authToken', token);
    },

    removeToken: function() {
        localStorage.removeItem('authToken');
    },

    isAuthenticated: function() {
        return !!this.getToken();
    },

    getAuthHeaders: function() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

// API Helper
const API = {
    buildURL: function(endpoint, params = {}) {
        let url = API_CONFIG.baseURL + endpoint;

        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });

        return url;
    },

    request: async function(url, options = {}) {
        try {
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

    get: async function(endpoint, params = {}, query = {}) {
        let url = this.buildURL(endpoint, params);

        if (Object.keys(query).length > 0) {
            const queryString = new URLSearchParams(query).toString();
            url += `?${queryString}`;
        }

        return this.request(url, { method: 'GET' });
    },

    post: async function(endpoint, data, params = {}) {
        const url = this.buildURL(endpoint, params);
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    put: async function(endpoint, data, params = {}) {
        const url = this.buildURL(endpoint, params);
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    delete: async function(endpoint, params = {}, query = {}) {
        let url = this.buildURL(endpoint, params);

        if (Object.keys(query).length > 0) {
            const queryString = new URLSearchParams(query).toString();
            url += `?${queryString}`;
        }

        return this.request(url, { method: 'DELETE' });
    }
};

if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
    window.APP_CONFIG = APP_CONFIG;
    window.AUTH = AUTH;
    window.API = API;
}
