/*******************************
 * BASE URL (AUTO + SAFE)
 *******************************/
const BASE_URL = (() => {
  const prodURL = "https://api.epielio.com/api";
  const localURL = "http://localhost:5000/api";

  // If running on localhost → use local server
  if (window.location.hostname === "localhost") return localURL;
  if (window.location.hostname === "127.0.0.1") return localURL;

  // Always use HTTPS in production (prevents mixed-content)
  return prodURL;
})();


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
      getTree: "/categories/tree",
      getRoot: "/categories/root",
      getById: "/categories/:id",
      getBreadcrumb: "/categories/:id/breadcrumb",
      getSubcategories: "/categories/:id/subcategories",

      create: "/categories/admin/create",
      update: "/categories/admin/:id",
      delete: "/categories/admin/:id",

      toggleStatus: "/categories/admin/:id/toggle-status",
      updateDisplayOrder: "/categories/admin/display-order",
      updateProductCount: "/categories/admin/:id/product-count",
    },

    products: {
      getAll: "/products",
      getById: "/products/:id",
      create: "/products/admin/create",
      update: "/products/admin/:id",
      delete: "/products/admin/:id",
    },

    notifications: {
      send: "/notifications/send",
      getAll: "/notifications",
      getById: "/notifications/:id",
      delete: "/notifications/:id",
    },
  },
};


/*******************************
 * AUTH HANDLER
 *******************************/
const AUTH = {
  getToken() {
    return (
      localStorage.getItem("authToken") ||
      localStorage.getItem("epi_admin_token") ||
      null
    );
  },

  setToken(token) {
    if (!token) return;
    localStorage.setItem("authToken", token);
    localStorage.setItem("epi_admin_token", token);
  },

  removeToken() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("epi_admin_token");
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
};


/*******************************
 * API WRAPPER
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
      const headers = {
        "Content-Type": "application/json",
        ...AUTH.getAuthHeaders(),
        ...options.headers,
      };

      const config = { ...options, headers };

      const res = await fetch(url, config);

      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error("Invalid JSON response from server");
      }

      if (!res.ok) throw new Error(json.message || "API Error");

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
};


/*******************************
 * EXPORT
 *******************************/
if (typeof window !== "undefined") {
  window.BASE_URL = BASE_URL;
  window.API_CONFIG = API_CONFIG;
  window.APP_CONFIG = APP_CONFIG;
  window.AUTH = AUTH;
  window.API = API;
}
