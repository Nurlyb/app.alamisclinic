import { api } from './client';
import type { Department, ApiResponse } from '@/types';

export const departmentsApi = {
  // Получить все отделения
  getAll: () =>
    api.get<ApiResponse<Department[]>>('/api/departments'),

  // Получить отделение по ID
  getById: (id: string) =>
    api.get<ApiResponse<Department>>(`/api/departments/${id}`),
};
