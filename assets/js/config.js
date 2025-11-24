/*******************************
 * BASE URL (FORCE PRODUCTION)
 *******************************/
const BASE_URL = "https://api.epielio.com/api";

/*******************************
 * APP CONFIG 
 *******************************/
const APP_CONFIG = {
  version: "1.0.0",
  dateFormat: "YYYY-MM-DD",
  maxFileSize: 5 * 1024 * 1024,
  categories: {
    maxLevels: 5
  }
};

/*******************************
 * API CONFIGURATION
 *******************************/
const API_CONFIG = {
  baseURL: BASE_URL,
  timeout: 30000,

  endpoints: {
    auth: {
      adminLogin: "/auth/admin-login",
      refreshToken: "/auth/refresh-token",
      logout: "/auth/logout",
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
      toggleStatus: "/categories/:categoryId",
      toggleFeatured: "/categories/:categoryId/toggle-featured",
      uploadImage: "/categories/:categoryId/upload-image",
      deleteImage: "/categories/:categoryId/image",
      search: "/categories/search/:query",
      withSubcategories: "/categories/:categoryId/with-subcategories",
      dropdown: "/categories/dropdown/all",
      getFeatured: "/categories/featured/all",
      reorder: "/categories/bulk/reorder"
    },

    products: {
      getAll: "/products",
      getById: "/products/:productId",
      create: "/products",
      update: "/products/:productId",
      delete: "/products/:productId",
      toggleStatus: "/products/:productId/toggle-status",
      search: "/products/search",
      uploadImage: "/products/:productId/upload-image",
      deleteImage: "/products/:productId/image/:imageId"
    },

    about: {
      getAll: "/about/admin/all",
      getById: "/about/:aboutId",
      create: "/about",
      update: "/about/:aboutId",
      delete: "/about/:aboutId"
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
      deleteComment: "/admin/notifications/:notificationId/comments/:commentId"
    },

    chat: {
      conversations: "/admin/chat/conversations",
      messages: "/admin/chat/conversations/:conversationId/messages",
      reports: "/admin/chat/reports",
      reportAction: "/admin/chat/reports/:reportId/action",
      deleteMessage: "/admin/chat/messages/:messageId",
      broadcast: "/admin/chat/broadcast",
      analytics: "/admin/chat/analytics"
    }
  }
};

/*******************************
 * AUTH HANDLER (FIXED)
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
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
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

      // Handle non-JSON responses
      if (res.status === 204) {
        return { success: true };
      }

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(json.message || `HTTP ${res.status}: ${res.statusText}`);
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

  delete(endpoint, params = {}) {
    const url = this.buildURL(endpoint, params);
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

/*******************************
 * EXPORT GLOBAL
 *******************************/
window.BASE_URL = BASE_URL;
window.API_CONFIG = API_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.AUTH = AUTH;
window.API = API;