import React, { useCallback, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import { useToast } from './components/ui/Toast';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Register from './pages/Register';

// Read the stored user synchronously so the first render already knows who is
// signed in. Reading it in an effect sent admins away from /admin on refresh.
function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(readStoredUser);
  const navigate = useNavigate();
  const { notify } = useToast();

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    notify({ tone: 'info', title: 'You’re signed out' });
    navigate('/');
  }, [navigate, notify]);

  return (
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
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} requireAdmin>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <SiteFooter user={user} />
    </div>
  );
}
