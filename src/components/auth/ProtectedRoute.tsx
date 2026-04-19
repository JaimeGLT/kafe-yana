import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function getDefaultRoute(rol?: string | null): string {
  const role = rol?.toLowerCase();
  if (role === 'admin') return '/';
  return '/sales/pos';
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isCheckingSession, user } = useAuth();
  const location = useLocation();

  if (isCheckingSession) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.rol?.toLowerCase();
    const allowed = allowedRoles.map((r) => r.toLowerCase());
    if (userRole && !allowed.includes(userRole)) {
      return <Navigate to={getDefaultRoute(userRole)} replace />;
    }
  }

  return <>{children}</>;
};
