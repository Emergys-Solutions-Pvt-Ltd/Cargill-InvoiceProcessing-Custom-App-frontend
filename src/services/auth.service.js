import { apiClient } from './network.service';
import { storageService } from './storage.service';
import { clearMicrosoftSession } from './msal.service';

const DEFAULT_IDLE_MINUTES = 30;
const LAST_ACTIVITY_KEY = 'lastActivityAt';

class AuthService {
  async login(username, password, isAD = false) {
    try {
      const response = await apiClient.post('/auth/login', { username, password, isAD }, { skipAuthRedirect: true });
      return this.storeSession(response.data);
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  }

  /** Exchanges a Microsoft Entra ID token (from MSAL) for the app's own session token. */
  async loginWithMicrosoft(entraToken) {
    try {
      const response = await apiClient.post('/auth/sso', { accessToken: entraToken }, { skipAuthRedirect: true });
      return this.storeSession(response.data);
    } catch (error) {
      await clearMicrosoftSession();
      throw error.response?.data?.message || 'Microsoft sign-in failed';
    }
  }

  /** Public: which sign-in methods the login page offers. */
  async getOptions() {
    const response = await apiClient.get('/auth/options', { skipAuthRedirect: true });
    return response.data;
  }

  storeSession(user) {
    if (user.token) {
      storageService.set('token', user.token);
      storageService.set('user', user);
      this.markActivity();
    }
    return user;
  }

  /**
   * Signs out: the API revokes the session (the token stops working everywhere), then every local copy of the
   * app token and of the Microsoft tokens is removed. Local cleanup happens even when the API cannot be reached.
   */
  async logout() {
    const token = storageService.get('token');
    this.clearLocalSession();
    if (token) {
      try {
        await apiClient.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` }, skipAuthRedirect: true });
      } catch {
        // already expired / revoked, or the API is down: the server session ends by itself (idle timeout)
      }
    }
    await clearMicrosoftSession();
  }

  clearLocalSession() {
    storageService.remove('token');
    storageService.remove('user');
    storageService.remove(LAST_ACTIVITY_KEY);
  }

  getCurrentUser() {
    return storageService.get('user');
  }

  getIdleTimeoutMs() {
    const minutes = Number(this.getCurrentUser()?.sessionIdleTimeoutMinutes) || DEFAULT_IDLE_MINUTES;
    return minutes * 60_000;
  }

  /** Last user activity, shared by all tabs (localStorage). */
  markActivity(at = Date.now()) {
    storageService.set(LAST_ACTIVITY_KEY, at);
  }

  getLastActivity() {
    return Number(storageService.get(LAST_ACTIVITY_KEY)) || 0;
  }

  isIdleExpired(now = Date.now()) {
    const last = this.getLastActivity();
    return last > 0 && now - last >= this.getIdleTimeoutMs();
  }
}

export const authService = new AuthService();
export { LAST_ACTIVITY_KEY };
