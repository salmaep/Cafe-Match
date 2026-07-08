import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only bounce to login when an *authenticated* request (had a Bearer token)
    // gets a 401 — i.e. a stale/expired session. Do NOT redirect for auth
    // attempts themselves (login / register / 2fa): a wrong password is a 401
    // the form should show inline, not a full-page reload.
    const url: string = error.config?.url ?? "";
    const hadAuth = !!error.config?.headers?.Authorization;
    const isAuthEndpoint = url.includes("/auth/");
    if (error.response?.status === 401 && hadAuth && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const isOwnerRoute = window.location.pathname.startsWith("/owner");
      window.location.href = isOwnerRoute ? "/owner/login" : "/login";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
