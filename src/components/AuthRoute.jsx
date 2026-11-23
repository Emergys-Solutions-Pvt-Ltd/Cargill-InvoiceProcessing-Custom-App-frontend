import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import { AuthContext } from '../context/AuthContext';

const AuthRoute = ({ children, requireAdmin, requireApp }) => {
  const { user, loading, isAdmin, hasAppAccess, getDefaultRoute } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" role="status" aria-label="Loading">
        <CircularProgress size={28} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // UAM Access Guard: Admin only
  if (requireAdmin && !isAdmin()) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  // Custom App Access Guard: User with assigned app only (Not Admin, Not wrong app)
  if (requireApp && !hasAppAccess(requireApp)) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  // Used as a layout route (no children) it guards its nested routes
  return children ?? <Outlet />;
};

export default AuthRoute;
