import axios from 'axios';

// Relative by default: in development the CRA proxy (package.json "proxy")
// forwards /api to the Express server, and in production Express serves both
// the built client and the API from the same origin.
export const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the session token to every request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// An expired or revoked session answers 401: clear it and go to sign-in.
// Failed sign-in and registration attempts also return 401; those are left to
// the form so the person sees why it failed instead of a page reload.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthAttempt = /\/auth\/(login|register)$/.test(requestUrl);
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** URL for the live-updates stream. EventSource can't send headers, so the token rides in the query. */
export function eventsUrl(token) {
  return `${API_URL}/events?token=${encodeURIComponent(token)}`;
}

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/password', data),
};

export const doctorAPI = {
  getAll: (filters = {}) => api.get('/doctors', { params: filters }),
  getById: (id) => api.get(`/doctors/${id}`),
  getSlots: (id, date) => api.get(`/doctors/${id}/slots`, { params: { date } }),
  getCalendar: (id, params = {}) => api.get(`/doctors/${id}/calendar`, { params }),
  create: (data) => api.post('/doctors', data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  delete: (id) => api.delete(`/doctors/${id}`),
};

export const appointmentAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  reschedule: (id, data) => api.patch(`/appointments/${id}/reschedule`, data),
  cancel: (id, reason) => api.patch(`/appointments/${id}/cancel`, reason ? { reason } : {}),
};

export const doctorPortalAPI = {
  me: () => api.get('/doctor/me'),
  appointments: (params = {}) => api.get('/doctor/appointments', { params }),
  updateAppointment: (id, data) => api.patch(`/doctor/appointments/${id}`, data),
  saveAvailability: (data) => api.put('/doctor/availability', data),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAppointments: (filters = {}) => api.get('/admin/appointments', { params: filters }),
  updateAppointmentStatus: (id, data) => api.patch(`/admin/appointments/${id}`, data),
  getDoctors: () => api.get('/admin/doctors'),
  getUsers: () => api.get('/admin/users'),
};

export default api;
