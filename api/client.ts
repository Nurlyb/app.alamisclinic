import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/store/auth';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Создаём axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - добавляем токен к каждому запросу
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - обрабатываем ошибки и обновляем токен
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Если 401 и это не повторный запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Пытаемся обновить токен
        const refreshToken = useAuthStore.getState().refreshToken;
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;

        // Обновляем токен в store
        useAuthStore.getState().updateToken(accessToken);

        // Повторяем оригинальный запрос с новым токеном
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Если не удалось обновить токен - разлогиниваем
        useAuthStore.getState().logout();
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Показываем toast с ошибкой
    const errorMessage = (error.response?.data as any)?.error || 'Произошла ошибка';
    
    if (error.response?.status !== 401) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Типизированные хелперы
export const api = {
  get: <T>(url: string, config?: any) => 
    apiClient.get<T>(url, config).then(res => res.data),
  
  post: <T>(url: string, data?: any, config?: any) => 
    apiClient.post<T>(url, data, config).then(res => res.data),
  
  put: <T>(url: string, data?: any, config?: any) => 
    apiClient.put<T>(url, data, config).then(res => res.data),
  
  patch: <T>(url: string, data?: any, config?: any) => 
    apiClient.patch<T>(url, data, config).then(res => res.data),
  
  delete: <T>(url: string, config?: any) => 
    apiClient.delete<T>(url, config).then(res => res.data),
};
