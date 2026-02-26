import { api } from './client';
import type { Payment, ApiResponse, PaymentMethod } from '@/types';

export interface CreatePaymentData {
  appointmentId?: string;
  patientId: string;
  serviceId: string;
  amount: number;
  method: PaymentMethod;
}

export interface PaymentFilters {
  patientId?: string;
  appointmentId?: string;
  startDate?: string;
  endDate?: string;
}

export const paymentsApi = {
  // Получить все платежи
  getAll: (filters?: PaymentFilters) =>
    api.get<ApiResponse<Payment[]>>('/api/payments', { params: filters }),

  // Получить платёж по ID
  getById: (id: string) =>
    api.get<ApiResponse<Payment>>(`/api/payments/${id}`),

  // Создать платёж
  create: (data: CreatePaymentData) =>
    api.post<ApiResponse<Payment>>('/api/payments', data),

  // Получить чек (PDF)
  getReceipt: (id: string) =>
    api.get(`/api/payments/${id}/receipt`, { responseType: 'blob' }),
};
