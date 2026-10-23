import { apiClient } from './network.service';
import { storageService } from './storage.service';

class AuthService {
  async login(username, password, isAD = false) {
    try {
      const response = await apiClient.post('/auth/login', { username, password, isAD });
      const user = response.data;
      if (user.token) {
        storageService.set('token', user.token);
        storageService.set('user', user);
      }
      return user;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  }

  logout() {
    storageService.remove('token');
    storageService.remove('user');
  }

  getCurrentUser() {
    return storageService.get('user');
  }
}

export const authService = new AuthService();
