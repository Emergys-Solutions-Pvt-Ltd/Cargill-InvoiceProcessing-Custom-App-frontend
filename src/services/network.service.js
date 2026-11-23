import axios from 'axios';
import { storageService } from './storage.service';
import { config } from '../config/env';

const apiClient = axios.create({
  // '/api' (same origin) or VITE_API_BASE_URL[_DEV|_STG] + '/api' - see src/config/env.js
  baseURL: config.apiBaseUrl,
  timeout: 5000,
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = storageService.get('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 = token expired, signed out (also from another tab) or idle too long: drop the session, back to /login.
    // Sign-in / sign-out calls pass skipAuthRedirect and handle their own errors.
    if (error.response && error.response.status === 401 && !error.config?.skipAuthRedirect) {
      const hadSession = !!storageService.get('token');
      storageService.remove('token');
      storageService.remove('user');
      storageService.remove('lastActivityAt');
      if (hadSession) storageService.set('logoutReason', 'expired');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { apiClient };
