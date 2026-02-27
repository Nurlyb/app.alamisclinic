import { api } from './client';
import type { User, ApiResponse, Role } from '@/types';

export interface UserFilters {
  role?: Role;
  departmentId?: string;
  isActive?: boolean;
}

export interface CreateUserData {
  name: string;
  role: Role;
  departmentId?: string;
  colorBadge: string;
  phone: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  role?: Role;
  departmentId?: string;
  colorBadge?: string;
  phone?: string;
}

export const usersApi = {
  // Получить всех пользователей
  getAll: (filters?: UserFilters) =>
    api.get<ApiResponse<User[]>>('/api/users', { params: filters }),

  // Получить пользователя по ID
  getById: (id: string) =>
    api.get<ApiResponse<User>>(`/api/users/${id}`),

  // Получить докторов
  getDoctors: (departmentId?: string) =>
    api.get<ApiResponse<User[]>>('/api/users', { 
      params: { role: 'DOCTOR', departmentId, isActive: true } 
    }),

  // Создать пользователя
  create: (data: CreateUserData) =>
    api.post<ApiResponse<User>>('/api/users', data),

  // Обновить пользователя
  update: (id: string, data: UpdateUserData) =>
    api.put<ApiResponse<User>>(`/api/users/${id}`, data),

  // Удалить (деактивировать) пользователя
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/users/${id}`),
};
