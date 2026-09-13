import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenManager';

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach in-memory access token to every request
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — token expired, attempt transparent refresh using refresh token
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('adaptiq_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          const newAccessToken = data.data.accessToken;
          setAccessToken(newAccessToken);
          original.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(original);
        } catch {
          clearAccessToken();
          localStorage.removeItem('adaptiq_user');
          localStorage.removeItem('adaptiq_refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;
