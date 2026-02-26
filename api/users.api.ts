import { api } from './client';
import type { User, ApiResponse, Role } from '@/types';

export interface UserFilters {
  role?: Role;
  departmentId?: string;
  isActive?: boolean;
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
};
