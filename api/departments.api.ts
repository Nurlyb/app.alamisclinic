import { api } from './client';
import type { Department, ApiResponse } from '@/types';

export const departmentsApi = {
  // Получить все отделения
  getAll: () =>
    api.get<ApiResponse<Department[]>>('/api/departments'),

  // Получить отделение по ID
  getById: (id: string) =>
    api.get<ApiResponse<Department>>(`/api/departments/${id}`),

  // Создать отделение
  create: (data: { name: string; isActive?: boolean }) =>
    api.post<ApiResponse<Department>>('/api/departments', data),

  // Обновить отделение
  update: (id: string, data: { name: string; isActive?: boolean }) =>
    api.put<ApiResponse<Department>>(`/api/departments/${id}`, data),

  // Удалить (деактивировать) отделение
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/api/departments/${id}`),
};
