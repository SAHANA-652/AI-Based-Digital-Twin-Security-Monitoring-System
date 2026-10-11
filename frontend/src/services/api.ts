import axios from 'axios';
import { User, SystemInfo, DashboardData } from '../types';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: any) => api.post<{access_token: string, user: User}>('/auth/login', data),
  getMe: () => api.get<User>('/auth/me'),
};

export const systemApi = {
  getInfo: () => api.get<SystemInfo>('/system/info'),
};

export const dashboardApi = {
  getData: () => api.get<DashboardData>('/dashboard'),
};

export default api;
