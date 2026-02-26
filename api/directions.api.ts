import { api } from './client';
import type { Direction, ApiResponse, DirectionStatus } from '@/types';

export interface CreateDirectionData {
  patientId: string;
  fromDoctorId: string;
  toDoctorId: string;
  serviceId: string;
  comment?: string;
}

export interface DirectionFilters {
  patientId?: string;
  fromDoctorId?: string;
  toDoctorId?: string;
  status?: DirectionStatus;
}

export const directionsApi = {
  // Получить все направления
  getAll: (filters?: DirectionFilters) =>
    api.get<ApiResponse<Direction[]>>('/api/directions', { params: filters }),

  // Получить направление по ID
  getById: (id: string) =>
    api.get<ApiResponse<Direction>>(`/api/directions/${id}`),

  // Создать направление
  create: (data: CreateDirectionData) =>
    api.post<ApiResponse<Direction>>('/api/directions', data),

  // Обновить статус
  updateStatus: (id: string, status: DirectionStatus) =>
    api.patch<ApiResponse<Direction>>(`/api/directions/${id}`, { status }),
};
