import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Sends signed-out visitors to the sign-in page and remembers where they were
 * going (including any booking state) so they land back there afterwards.
 */
export default function ProtectedRoute({ children, user, requireAdmin = false }) {
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: location.pathname, search: location.search, state: location.state } }}
      />
    );
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
