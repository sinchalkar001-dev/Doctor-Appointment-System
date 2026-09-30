import React, { useCallback, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { LiveNotifications, LiveProvider } from './components/LiveProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import { useToast } from './components/ui/Toast';
import { clearSession, readStoredUser, storeSession } from './lib/session';
import Account from './pages/Account';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import DoctorPortal from './pages/DoctorPortal';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Register from './pages/Register';

export default function App() {
  // Read the stored session synchronously so the first render already knows
  // who is signed in. Reading it in an effect sent admins away from /admin on refresh.
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const navigate = useNavigate();
  const { notify } = useToast();

  /** Save a new or updated session (sign-in, profile edit, password change). */
  const handleSession = useCallback(({ token: nextToken, user: nextUser }) => {
    storeSession({ token: nextToken, user: nextUser });
    if (nextToken) setToken(nextToken);
    if (nextUser) setUser(nextUser);
  }, []);

  const handleSignOut = useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
    notify({ tone: 'info', title: 'You’re signed out' });
    navigate('/');
  }, [navigate, notify]);

  return (
    <LiveProvider token={user ? token : null}>
      <LiveNotifications user={user} />
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only rounded-control bg-sign px-4 py-2 font-semibold text-ink-inverse focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70]"
        >
          Skip to main content
        </a>
        <ScrollToTop />
        <SiteHeader user={user} onSignOut={handleSignOut} />

        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/login" element={<Login onSession={handleSession} />} />
            <Route path="/register" element={<Register onSession={handleSession} />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user}>
                  <Dashboard user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor"
              element={
                <ProtectedRoute user={user} roles={['doctor']}>
                  <DoctorPortal user={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute user={user} roles={['admin']}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute user={user}>
                  <Account user={user} onSession={handleSession} />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <SiteFooter user={user} />
      </div>
    </LiveProvider>
  );
}
