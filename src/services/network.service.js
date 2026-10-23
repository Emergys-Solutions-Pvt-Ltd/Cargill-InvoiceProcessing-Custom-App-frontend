import axios from 'axios';
import { storageService } from './storage.service';

const apiClient = axios.create({
  baseURL: '/api',
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
    if (error.response && error.response.status === 401) {
      // Auto logout if 401 response returned from api
      storageService.remove('token');
      storageService.remove('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { apiClient };
