/**
 * Zod схемы валидации для пациентов
 */

import { z } from 'zod';

export const createPatientSchema = z.object({
  fullName: z.string().min(2, 'ФИО должно содержать минимум 2 символа'),
  iin: z.string().length(12, 'ИИН должен содержать 12 цифр').regex(/^\d+$/, 'ИИН должен содержать только цифры'),
  dob: z.string().datetime(),
  gender: z.enum(['MALE', 'FEMALE']),
  phone: z.string().min(10, 'Некорректный номер телефона'),
  address: z.string().optional(),
  source: z.enum(['INSTAGRAM', 'GIS', 'REFERRAL', 'SITE', 'OTHER']),
});

export const updatePatientSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  address: z.string().optional(),
  source: z.enum(['INSTAGRAM', 'GIS', 'REFERRAL', 'SITE', 'OTHER']).optional(),
});

export const blacklistPatientSchema = z.object({
  blacklist: z.boolean(),
  reason: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type BlacklistPatientInput = z.infer<typeof blacklistPatientSchema>;
