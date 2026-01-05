/*******************************
 * BASE URL (GLOBAL)
 *******************************/
window.BASE_URL = "http://13.127.15.87:8080/api";

// ✅ SINGLE SOURCE OF TRUTH
const API_BASE = window.BASE_URL;

// ✅ Installments
const INSTALLMENTS_BASE = `${API_BASE}/installments`;
const INSTALLMENTS_ADMIN_BASE = `${INSTALLMENTS_BASE}/admin`;

// ⭐ CRITICAL: Expose BASE_URL globally IMMEDIATELY after computation
// This MUST happen before any script tries to use it
if (!window.BASE_URL) {
  window.BASE_URL = BASE_URL;
}

/*******************************
 * APP CONFIG
 *******************************/
const APP_CONFIG = {
  version: "1.0.0",
  dateFormat: "YYYY-MM-DD",
  maxFileSize: 5 * 1024 * 1024,
  categories: {
    maxLevels: 5,
  },
};

/*******************************
 * API CONFIGURATION
 *******************************/
const API_CONFIG = {
  baseURL: window.BASE_URL,
  timeout: 30000,

  endpoints: {
    auth: {
      adminLogin: "/admin-auth/login", // ✅ New unified endpoint
      legacyLogin: "/auth/admin-login", // Old endpoint for reference
      refreshToken: "/auth/refresh-token",
      logout: "/auth/logout",
    },

    adminManagement: {
      subAdmins: "/admin-mgmt/sub-admins",
      subAdminById: "/admin-mgmt/sub-admins/:adminId",
      resetPassword: "/admin-mgmt/sub-admins/:adminId/reset-password",
    },

    users: {
      getAll: "/users",
      getById: "/users/:userId",
      create: "/users/admin/create",
      update: "/users/admin/:userId",
      delete: "/users/admin/:userId",
    },

    categories: {
      getAll: "/categories",
      getById: "/categories/:categoryId",
      create: "/categories",
      update: "/categories/:categoryId",
      delete: "/categories/:categoryId",
      hardDelete: "/categories/:categoryId/hard",
      toggleStatus: "/categories/:categoryId",
      toggleFeatured: "/categories/:categoryId/toggle-featured",
      uploadImage: "/categories/:categoryId/upload-image",
      deleteImage: "/categories/:categoryId/image",
      search: "/categories/search/:query",
      withSubcategories: "/categories/:categoryId/with-subcategories",
      dropdown: "/categories/dropdown/all",
      getFeatured: "/categories/featured/all",
      reorder: "/categories/bulk/reorder",
    },

    products: {
      getAll: "/products",
      getById: "/products/:productId",
      create: "/products",
      update: "/products/:productId",
      delete: "/products/:productId",
      hardDelete: "/products/:productId/hard",
      toggleStatus: "/products/:productId/toggle-status",
      search: "/products/search",
      uploadImage: "/products/:productId/upload-image",
      deleteImage: "/products/:productId/image/:imageId",
    },
    featuredLists: {
      getAll: "/featured-lists/admin/lists",
      getById: "/featured-lists/admin/lists/:listId",
      create: "/featured-lists/admin/lists",
      update: "/featured-lists/admin/lists/:listId",
      delete: "/featured-lists/admin/lists/:listId",

      addProduct: "/featured-lists/admin/lists/:listId/products",
      removeProduct: "/featured-lists/admin/lists/:listId/products/:productId",

      reorderProducts: "/featured-lists/admin/lists/:listId/reorder",

      syncProduct:
        "/featured-lists/admin/lists/:listId/products/:productId/sync",
      syncAllProducts: "/featured-lists/admin/lists/:listId/sync-all",
    },

    about: {
      getAll: "/about/admin/all",
      getById: "/about/:aboutId",
      create: "/about",
      update: "/about/:aboutId",
      delete: "/about/:aboutId",
    },

    notifications: {
      getAll: "/admin/notifications",
      getById: "/admin/notifications/:id",
      create: "/admin/notifications/create",
      update: "/admin/notifications/:id",
      delete: "/admin/notifications/:id",
      publish: "/admin/notifications/:id/publish",
      schedule: "/admin/notifications/:id/schedule",
      uploadImage: "/admin/notifications/:id/upload-image",
      settings: "/admin/notifications/:id/settings",
      analytics: "/admin/notifications/analytics",
      deleteComment: "/admin/notifications/:notificationId/comments/:commentId",
    },

    chat: {
      conversations: "/admin/chat/conversations",
      messages: "/admin/chat/conversations/:conversationId/messages",
      reports: "/admin/chat/reports",
      reportAction: "/admin/chat/reports/:reportId/action",
      deleteMessage: "/admin/chat/messages/:messageId",
      broadcast: "/admin/chat/broadcast",
      analytics: "/admin/chat/analytics",
    },

    banners: {
      getAll: "/banners/admin/all",
      getById: "/banners/:id",
      create: "/banners",
      update: "/banners/:id",
      uploadImage: "/banners/:id/image",
      toggle: "/banners/:id/toggle",
      delete: "/banners/:id",
      permanentDelete: "/banners/:id/permanent",
      getActive: "/banners/public/active",
      trackClick: "/banners/:id/click",
      stats: "/banners/admin/stats",
    },

    successStories: {
      getAll: "/success-stories/admin/all",
      getById: "/success-stories/:id",
      create: "/success-stories",
      update: "/success-stories/:id",
      uploadImage: "/success-stories/:id/image",
      toggle: "/success-stories/:id/toggle",
      delete: "/success-stories/:id",
      permanentDelete: "/success-stories/:id/permanent",
      getActive: "/success-stories/public/active",
      stats: "/success-stories/admin/stats",
    },

    featuredLists: {
      // Public endpoints
      getAllPublic: "/featured-lists",
      getBySlug: "/featured-lists/:slug",

      // Admin endpoints
      getAll: "/featured-lists/admin/lists",
      getById: "/featured-lists/admin/lists/:listId",
      create: "/featured-lists/admin/lists",
      update: "/featured-lists/admin/lists/:listId",
      delete: "/featured-lists/admin/lists/:listId",

      // Product management
      addProduct: "/featured-lists/admin/lists/:listId/products",
      removeProduct: "/featured-lists/admin/lists/:listId/products/:productId",
      reorderProducts: "/featured-lists/admin/lists/:listId/reorder",

      // Sync endpoints
      syncProduct:
        "/featured-lists/admin/lists/:listId/products/:productId/sync",
      syncAllProducts: "/featured-lists/admin/lists/:listId/sync-all",
    },
  },
};

/*******************************
 * RBAC PERMISSIONS CONFIGURATION
 *******************************/
const PERMISSIONS = {
  DASHBOARD: "dashboard",
  USERS: "users",
  WALLET: "wallet",
  KYC: "kyc",
  CATEGORIES: "categories",
  PRODUCTS: "products",
  UPLOADER: "uploader",
  COUPONS: "coupons",
  ORDERS: "orders",
  ANALYTICS: "analytics",
  NOTIFICATIONS: "notifications",
  CHAT: "chat",
  CHAT_REPORTS: "chat-reports",
  CHAT_ANALYTICS: "chat-analytics",
  SETTINGS: "settings",
  ADMIN_MANAGEMENT: "admin_management",
  FEATURED_LISTS: "featured_lists",
};

/*******************************
 * AUTH HANDLER (ENHANCED WITH RBAC)
 *******************************/
const AUTH = {
  getToken() {
    return (
      localStorage.getItem("epi_admin_token") ||
      localStorage.getItem("authToken") ||
      null
    );
  },

  setToken(token) {
    if (!token) return;
    localStorage.setItem("epi_admin_token", token);
    localStorage.setItem("authToken", token);
  },

  removeToken() {
    localStorage.removeItem("epi_admin_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("epi_admin_user");
    localStorage.removeItem("epi_admin_username");
    localStorage.removeItem("epi_refresh_token");
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // ===== RBAC FUNCTIONS =====

  // Get current user data from localStorage
  getCurrentUser() {
    const userData = localStorage.getItem("epi_admin_user");
    return userData ? JSON.parse(userData) : null;
  },

  // Get username from localStorage
  getUsername() {
    return localStorage.getItem("epi_admin_username") || null;
  },

  // Get user's accessible modules/permissions
  getUserModules() {
    const user = this.getCurrentUser();
    if (!user) return [];

    // If user is super admin, return empty array (means ALL access)
    if (user.isSuperAdmin === true) {
      return [];
    }

    // Return user's specific modules array
    return user.modules || [];
  },

  // Check if user has access to a specific module
  hasModule(moduleName) {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Super admin has access to ALL modules
    if (user.isSuperAdmin === true) {
      return true;
    }

    // Sub-admin only has assigned modules
    const modules = user.modules || [];
    return modules.includes(moduleName);
  },

  // Check if user is super admin
  isSuperAdmin() {
    const user = this.getCurrentUser();
    return user && user.isSuperAdmin === true;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  // Save user data after login
  saveUserData(userData) {
    if (!userData) return;

    // Save complete user object
    localStorage.setItem(
      "epi_admin_user",
      JSON.stringify({
        userId: userData.userId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        profilePicture: userData.profilePicture || "",
        isSuperAdmin: userData.isSuperAdmin,
        modules: userData.modules || [],
      })
    );

    // Save username separately for easy access
    localStorage.setItem("epi_admin_username", userData.name);

    // Save tokens
    if (userData.accessToken) {
      this.setToken(userData.accessToken);
    }

    if (userData.refreshToken) {
      localStorage.setItem("epi_refresh_token", userData.refreshToken);
    }
  },

  // Logout and clear all data
  logout() {
    this.removeToken();
    window.location.href = "../pages/login.html";
  },
};

/*******************************
 * API WRAPPER (FIXED)
 *******************************/
const API = {
  buildURL(endpoint, params = {}) {
    let url = API_CONFIG.baseURL + endpoint;

    Object.keys(params).forEach((key) => {
      url = url.replace(`:${key}`, params[key]);
    });

    return url;
  },

  async request(url, options = {}) {
    try {
      const token = AUTH.getToken();

      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const config = { ...options, headers };

      const res = await fetch(url, config);

      if (res.status === 204) {
        return { success: true };
      }

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(
          json.message || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      return json;
    } catch (err) {
      console.error("API Request Error:", err);
      throw err;
    }
  },

  get(endpoint, params = {}, query = {}) {
    let url = this.buildURL(endpoint, params);
    if (Object.keys(query).length) {
      url += "?" + new URLSearchParams(query).toString();
    }
    return this.request(url, { method: "GET" });
  },

  post(endpoint, data, params = {}) {
    const url = this.buildURL(endpoint, params);
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  put(endpoint, data, params = {}) {
    const url = this.buildURL(endpoint, params);
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete(endpoint, pathParams = {}, queryParams = {}) {
    let url = this.buildURL(endpoint, pathParams);

    // Attach query params like ?force=true
    if (Object.keys(queryParams).length > 0) {
      url += "?" + new URLSearchParams(queryParams).toString();
    }

    return this.request(url, { method: "DELETE" });
  },

  patch(endpoint, data, params = {}) {
    const url = this.buildURL(endpoint, params);
    return this.request(url, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
document.addEventListener("DOMContentLoaded", () => {
  const adminBrand = document.querySelector(".navbar-brand");

  if (!adminBrand) return;

  adminBrand.addEventListener("click", (e) => {
    const user = AUTH.getCurrentUser();
    if (!user) return;

    // Stop default <a href="index.html">
    e.preventDefault();

    // Role-aware routing
    if (user.isSuperAdmin) {
      window.location.href = isRootPage() ? "index.html" : "../index.html";
    } else {
      window.location.href = isRootPage()
        ? "pages/welcome.html"
        : "welcome.html";
    }
  });
});

// ===============================
// GLOBAL ROUTES (S3 SAFE)
// ===============================
window.APP_ROUTES = {
  LOGIN: "/pages/login.html",
};

/*******************************
 * EXPORT GLOBAL
 *******************************/
// window.BASE_URL already set at line 22 (no duplication needed)
window.API_CONFIG = API_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.AUTH = AUTH;
window.API = API;
window.PERMISSIONS = PERMISSIONS;
