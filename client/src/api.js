import axios from 'axios';

// Relative by default: in development the CRA proxy (package.json "proxy")
// forwards /api to the Express server, and in production Express serves both
// the built client and the API from the same origin.
const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token to every request
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

// Response interceptor: handle 401 errors (token expired).
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

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const doctorAPI = {
  getAll: (filters = {}) => api.get('/doctors', { params: filters }),
  getById: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  delete: (id) => api.delete(`/doctors/${id}`),
};

export const appointmentAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id) => api.delete(`/appointments/${id}`),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAppointments: (filters = {}) => api.get('/admin/appointments', { params: filters }),
  updateAppointmentStatus: (id, data) => api.put(`/admin/appointments/${id}`, data),
  getDoctors: () => api.get('/admin/doctors'),
  getUsers: () => api.get('/admin/users'),
};

export default api;
