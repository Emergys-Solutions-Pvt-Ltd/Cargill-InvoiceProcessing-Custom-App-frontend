import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { apiClient } from '../services/network.service';
import { storageService } from '../services/storage.service';
import { msalRedirectResult } from '../services/msal.service';

export const AuthContext = createContext();

// Inactivity sign-out: any of these counts as user activity (the timeout comes from the API, default 30 minutes)
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];
const ACTIVITY_WRITE_THROTTLE_MS = 10_000;
const IDLE_CHECK_INTERVAL_MS = 15_000;
// While the user is active, tell the API every few minutes so its session does not expire during work without API calls
const KEEPALIVE_INTERVAL_MS = 5 * 60_000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ssoError, setSsoError] = useState('');

  /** Signs out (API session revoked, local and Microsoft tokens removed) and remembers why for the login page. */
  const endSession = useCallback(async (reason) => {
    setUser(null);
    if (reason) storageService.set('logoutReason', reason);
    await authService.logout();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let current = authService.getCurrentUser();
      if (current && authService.isIdleExpired()) {
        await authService.logout();
        storageService.set('logoutReason', 'idle');
        current = null;
      }
      if (current) authService.markActivity(); // opening / reloading the app is activity
      // Coming back from the Microsoft sign-in page: exchange the Entra token for an app session
      try {
        const redirect = await msalRedirectResult;
        if (redirect?.token) current = await authService.loginWithMicrosoft(redirect.token);
      } catch (err) {
        if (!cancelled) setSsoError(typeof err === 'string' ? err : err?.message || 'Microsoft sign-in failed');
      }
      if (!cancelled) {
        setUser(current);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Inactivity timer, keep-alive and sign-out in other tabs
  useEffect(() => {
    if (!user) return undefined;
    let lastWrite = 0;
    let lastKeepAlive = Date.now();
    let activeSinceKeepAlive = false;

    const onActivity = () => {
      const now = Date.now();
      activeSinceKeepAlive = true;
      if (now - lastWrite >= ACTIVITY_WRITE_THROTTLE_MS) {
        lastWrite = now;
        authService.markActivity(now);
      }
    };

    const check = () => {
      if (!storageService.get('token')) {
        setUser(null); // signed out in another tab
        return;
      }
      if (authService.isIdleExpired()) {
        endSession('idle');
        return;
      }
      if (activeSinceKeepAlive && Date.now() - lastKeepAlive >= KEEPALIVE_INTERVAL_MS) {
        activeSinceKeepAlive = false;
        lastKeepAlive = Date.now();
        apiClient.get('/auth/me').catch(() => {});
      }
    };

    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) setUser(null);
    };
    // Background tabs and sleeping laptops delay timers: check as soon as the tab is visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(check, IDLE_CHECK_INTERVAL_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [user, endSession]);

  const login = async (username, password, isAD) => {
    const loggedInUser = await authService.login(username, password, isAD);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => endSession(null);

  const clearSsoError = () => setSsoError('');

  const isAdmin = () => {
    return user?.role?.toLowerCase() === 'admin';
  };

  const hasAppAccess = (appKey) => {
    if (!user) return false;
    if (isAdmin()) return true;
    return Array.isArray(user.assignedApps) && user.assignedApps.includes(appKey);
  };

  const getDefaultRoute = (targetUser = user) => {
    if (!targetUser) return '/login';
    if (targetUser.role?.toLowerCase() === 'admin') {
      return '/settings/users';
    }
    if (targetUser.assignedApps?.includes('GP')) {
      return '/app/GP/invoices';
    }
    if (targetUser.assignedApps?.includes('sjo')) {
      return '/app/sjo/invoices';
    }
    if (targetUser.assignedApps?.includes('rospbu')) {
      return '/app/rospbu/invoices';
    }
    return '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, hasAppAccess, getDefaultRoute, ssoError, clearSsoError }}>
      {children}
    </AuthContext.Provider>
  );
};
