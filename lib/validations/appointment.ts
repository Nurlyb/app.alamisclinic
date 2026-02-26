/**
 * Zod схемы валидации для записей на приём
 */

import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  serviceId: z.string().uuid(),
  departmentId: z.string().uuid(),
  datetime: z.string().datetime(),
  comment: z.string().optional(),
  prepayment: z.number().min(0).default(0),
});

export const updateAppointmentSchema = z.object({
  datetime: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'ARRIVED', 'DONE', 'CANCELLED', 'NO_SHOW', 'TRANSFERRED']).optional(),
  comment: z.string().optional(),
  prepayment: z.number().min(0).optional(),
});

export const appointmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'ARRIVED', 'DONE', 'CANCELLED', 'NO_SHOW', 'TRANSFERRED']),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>;
