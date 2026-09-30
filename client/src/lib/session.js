/** Where each kind of account lands after signing in. */
export function homeFor(user) {
  if (user?.role === 'doctor') return '/doctor';
  if (user?.role === 'admin') return '/admin';
  return '/';
}

export function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function storeSession({ token, user }) {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
