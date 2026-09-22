import axios from "axios";
import { generateDpopProof, clearDpopKeys } from "../utils/dpop";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true, // Enables transmission of HttpOnly secure cookies
});

// Configure defaults on global axios as well so any legacy or unmigrated calls inherit DPoP & cookies
axios.defaults.baseURL = apiUrl;
axios.defaults.withCredentials = true;

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Universal Request Interceptor: Attaches Authorization & cryptographic DPoP Proof
 */
const requestInterceptor = async (config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers["Authorization"]) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  config.withCredentials = true;

  // Generate cryptographic DPoP Proof for the outbound request
  try {
    let fullUrl = config.url || "";
    if (!fullUrl.startsWith("http")) {
      const base = (config.baseURL || apiUrl).replace(/\/+$/, "");
      fullUrl = `${base}/${fullUrl.replace(/^\/+/, "")}`;
    }

    const dpopProof = await generateDpopProof(config.method || "GET", fullUrl);
    if (dpopProof) {
      config.headers["DPoP"] = dpopProof;
    }
  } catch (e) {
    // Non-blocking fallback
  }

  return config;
};

/**
 * Universal Response Interceptor: Auto-Refreshes Sessions on 401 Token Expiration
 */
const responseInterceptorSuccess = (response) => response;
const responseInterceptorError = async (error) => {
  const originalRequest = error.config;

  if (
    error.response &&
    error.response.status === 401 &&
    originalRequest &&
    !originalRequest._retry &&
    !originalRequest.url?.includes("/auth/signin") &&
    !originalRequest.url?.includes("/auth/signup") &&
    !originalRequest.url?.includes("/auth/refresh-token")
  ) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (token) originalRequest.headers["Authorization"] = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Attempt to rotate refresh token
      const { data } = await axios.post(
        `${apiUrl}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      const newAccessToken = data.accessToken || data.token;
      if (newAccessToken) {
        localStorage.setItem("token", newAccessToken);
      }

      processQueue(null, newAccessToken);

      if (newAccessToken) {
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      localStorage.removeItem("token");
      clearDpopKeys();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/signin")) {
        window.location.href = "/signin";
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }

  return Promise.reject(error);
};

// Mount interceptors on both apiClient AND the global axios instance
apiClient.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
apiClient.interceptors.response.use(responseInterceptorSuccess, responseInterceptorError);

axios.interceptors.request.use(requestInterceptor, (error) => Promise.reject(error));
axios.interceptors.response.use(responseInterceptorSuccess, responseInterceptorError);

export default apiClient;
