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
  maxFileSize: 5 * 1024 * 1024
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
    }
  }
};

/*******************************
 * AUTH HANDLER (FIXED)
 *******************************/
const AUTH = {
  // FIXED PRIORITY → admin token first
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

      // FIXED: Make sure Authorization header is ALWAYS attached
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const config = { ...options, headers };

      const res = await fetch(url, config);

      const json = await res.json().catch(() => {
        throw new Error("Invalid JSON response from server");
      });

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
 * EXPORT GLOBAL
 *******************************/
window.BASE_URL = BASE_URL;
window.API_CONFIG = API_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.AUTH = AUTH;
window.API = API;
