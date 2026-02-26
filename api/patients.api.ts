import { api } from './client';
import type { Patient, ApiResponse, PaginatedResponse, Source } from '@/types';

export interface CreatePatientData {
  fullName: string;
  phone: string;
  source: Source;
  iin?: string;
  dob?: string; // ISO datetime string
  gender?: 'MALE' | 'FEMALE';
  address?: string;
}

export interface UpdatePatientData {
  fullName?: string;
  phone?: string;
  iin?: string;
  dateOfBirth?: string;
}

export interface PatientFilters {
  search?: string;
  blacklist?: boolean;
  source?: Source;
  page?: number;
  limit?: number;
}

export const patientsApi = {
  // Получить список пациентов
  getAll: (filters?: PatientFilters) =>
    api.get<PaginatedResponse<Patient>>('/api/patients', { params: filters }),

  // Получить пациента по ID
  getById: (id: string) =>
    api.get<ApiResponse<Patient>>(`/api/patients/${id}`),

  // Поиск пациентов
  search: (query: string) =>
    api.get<ApiResponse<Patient[]>>('/api/patients', { 
      params: { search: query, limit: 10 } 
    }),

  // Создать пациента
  create: (data: CreatePatientData) =>
    api.post<ApiResponse<Patient>>('/api/patients', data),

  // Обновить пациента
  update: (id: string, data: UpdatePatientData) =>
    api.patch<ApiResponse<Patient>>(`/api/patients/${id}`, data),

  // Добавить/убрать из чёрного списка
  toggleBlacklist: (id: string, reason?: string) =>
    api.post<ApiResponse<Patient>>(`/api/patients/${id}/blacklist`, { reason }),
};
