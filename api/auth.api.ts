import { api } from './client';
import type { LoginRequest, LoginResponse, User, ApiResponse } from '@/types';

export const authApi = {
  // Вход
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/api/auth/login', data),

  // Выход
  logout: () =>
    api.post<ApiResponse<null>>('/api/auth/logout'),

  // Получить текущего пользователя
  me: () =>
    api.get<ApiResponse<{ user: User; permissions: string[] }>>('/api/auth/me'),

  // Обновить токен
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<{ accessToken: string }>>('/api/auth/refresh', { refreshToken }),
};
