import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { homeFor } from '../lib/session';

/**
 * Sends signed-out visitors to sign in and remembers where they were going
 * (including any booking state). `roles` limits a page to certain accounts.
 */
export default function ProtectedRoute({ children, user, roles }) {
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

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user)} replace />;
  }

  return children;
}
