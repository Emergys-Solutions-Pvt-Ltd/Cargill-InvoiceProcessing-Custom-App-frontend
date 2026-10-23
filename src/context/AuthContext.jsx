import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const login = async (username, password, isAD) => {
    const loggedInUser = await authService.login(username, password, isAD);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

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
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, hasAppAccess, getDefaultRoute }}>
      {children}
    </AuthContext.Provider>
  );
};

