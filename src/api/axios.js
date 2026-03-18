import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ── Request interceptor: attach auth token if present ── */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response interceptor: normalize response + errors ── */
api.interceptors.response.use(
  (response) => {
    // If backend wraps array as { data: [...] }, unwrap so callers get the array directly.
    const d = response.data;
    if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.data)) {
      response.data = d.data;
    }
    return response;
  },
  (error) => {
    // Auto-logout on 401 (expired / invalid token)
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Something went wrong';
    error.displayMessage = message;
    return Promise.reject(error);
  }
);

export default api;
