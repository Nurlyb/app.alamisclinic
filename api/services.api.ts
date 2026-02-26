import { api } from './client';
import type { Service, ApiResponse } from '@/types';

export interface ServiceFilters {
  departmentId?: string;
  isActive?: boolean;
}

export const servicesApi = {
  // Получить все услуги
  getAll: (filters?: ServiceFilters) =>
    api.get<ApiResponse<Service[]>>('/api/services', { params: filters }),

  // Получить услугу по ID
  getById: (id: string) =>
    api.get<ApiResponse<Service>>(`/api/services/${id}`),
};
