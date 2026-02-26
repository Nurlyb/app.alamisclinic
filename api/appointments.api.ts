import { api } from './client';
import type { Appointment, ApiResponse, PaginatedResponse, AppointmentStatus } from '@/types';

export interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  serviceId: string;
  departmentId: string;
  datetime: string;
  prepayment?: number;
  comment?: string;
  source?: string;
}

export interface UpdateAppointmentData {
  status?: AppointmentStatus;
  comment?: string;
  prepayment?: number;
}

export interface AppointmentFilters {
  date?: string;
  doctorId?: string;
  departmentId?: string;
  status?: AppointmentStatus;
}

export const appointmentsApi = {
  // Получить список записей
  getAll: (filters?: AppointmentFilters) =>
    api.get<ApiResponse<Appointment[]>>('/api/appointments', { params: filters }),

  // Получить запись по ID
  getById: (id: string) =>
    api.get<ApiResponse<Appointment>>(`/api/appointments/${id}`),

  // Создать запись
  create: (data: CreateAppointmentData) =>
    api.post<ApiResponse<Appointment>>('/api/appointments', data),

  // Обновить запись
  update: (id: string, data: UpdateAppointmentData) =>
    api.patch<ApiResponse<Appointment>>(`/api/appointments/${id}`, data),

  // Удалить запись
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/api/appointments/${id}`),

  // Отметить приход пациента
  markArrived: (id: string) =>
    api.post<ApiResponse<Appointment>>(`/api/appointments/${id}/arrive`),
};
