import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken = null;
let refreshHandler = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || !original || original._retried ||
        original.url?.includes('/auth/refresh-token') || original.url?.includes('/auth/login') ||
        original.url?.includes('/auth/register') || !refreshHandler) {
      return Promise.reject(error);
    }
    original._retried = true;
    try {
      refreshPromise ||= refreshHandler().finally(() => { refreshPromise = null; });
      await refreshPromise;
      return apiClient(original);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
