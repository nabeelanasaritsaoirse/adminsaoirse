/*******************************
 * BASE URL (AUTO + SAFE)
 *******************************/
const BASE_URL = (() => {
  const prodURL = "https://api.epielio.com/api";
  const localURL = "http://localhost:5000/api";

  if (window.location.hostname === "localhost") return localURL;
  if (window.location.hostname === "127.0.0.1") return localURL;

  return prodURL;
})();


/*******************************
 * APP CONFIG (YOU DIDN’T HAVE THIS — ADDED)
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
