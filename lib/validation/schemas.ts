/**
 * Zod схемы валидации для всех API endpoints
 */

import { z } from 'zod';
import {
  AppointmentStatus,
  VisitType,
  PaymentMethod,
  Gender,
  Source,
  Urgency,
  RefundType,
  SalaryType,
} from '@prisma/client';

// ============================================
// ПАЦИЕНТЫ
// ============================================

export const createPatientSchema = z.object({
  fullName: z.string().min(2, 'ФИО должно содержать минимум 2 символа'),
  iin: z.string().length(12, 'ИИН должен содержать 12 цифр').regex(/^\d+$/, 'ИИН должен содержать только цифры').optional(),
  dob: z.string().datetime('Некорректная дата рождения').optional(),
  gender: z.nativeEnum(Gender, { errorMap: () => ({ message: 'Некорректный пол' }) }).optional(),
  phone: z.string().min(10, 'Некорректный номер телефона'),
  address: z.string().optional(),
  source: z.nativeEnum(Source, { errorMap: () => ({ message: 'Некорректный источник' }) }),
});

export const updatePatientSchema = createPatientSchema.partial();

export const blacklistPatientSchema = z.object({
  blacklist: z.boolean(),
  reason: z.string().optional(),
});

// ============================================
// ЗАПИСИ НА ПРИЁМ
// ============================================

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Некорректный ID пациента'),
  doctorId: z.string().uuid('Некорректный ID доктора'),
  serviceId: z.string().uuid('Некорректный ID услуги'),
  departmentId: z.string().uuid('Некорректный ID отделения'),
  datetime: z.string().datetime('Некорректная дата и время'),
  comment: z.string().optional(),
  prepayment: z.number().min(0, 'Предоплата не может быть отрицательной').default(0),
});

export const updateAppointmentSchema = z.object({
  datetime: z.string().datetime('Некорректная дата и время').optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  comment: z.string().optional(),
  prepayment: z.number().min(0).optional(),
});

export const arriveAppointmentSchema = z.object({
  arrivedAt: z.string().datetime('Некорректная дата и время').optional(),
});

// ============================================
// НАПРАВЛЕНИЯ
// ============================================

export const createDirectionSchema = z.object({
  appointmentId: z.string().uuid('Некорректный ID записи'),
  fromDoctorId: z.string().uuid('Некорректный ID доктора').optional(),
  toDoctorId: z.string().uuid('Некорректный ID доктора'),
  patientId: z.string().uuid('Некорректный ID пациента'),
  serviceId: z.string().uuid('Некорректный ID услуги'),
  comment: z.string().optional(),
  urgency: z.nativeEnum(Urgency).default('NORMAL'),
});

export const updateDirectionStatusSchema = z.object({
  status: z.enum(['CREATED', 'SCHEDULED', 'ARRIVED', 'DONE', 'CANCELLED']),
});

// ============================================
// ОПЛАТА
// ============================================

export const createPaymentSchema = z.object({
  appointmentId: z.string().uuid('Некорректный ID записи'),
  amount: z.number().positive('Сумма должна быть положительной'),
  cash: z.number().min(0, 'Наличные не могут быть отрицательными').default(0),
  cashless: z.number().min(0, 'Безналичные не могут быть отрицательными').default(0),
  change: z.number().min(0, 'Сдача не может быть отрицательной').default(0),
  method: z.nativeEnum(PaymentMethod, { errorMap: () => ({ message: 'Некорректный способ оплаты' }) }),
}).refine(
  (data) => data.cash + data.cashless >= data.amount,
  'Сумма наличных и безналичных должна быть >= общей суммы'
);

// ============================================
// ВОЗВРАТЫ
// ============================================

export const createRefundSchema = z.object({
  paymentId: z.string().uuid('Некорректный ID оплаты'),
  appointmentId: z.string().uuid('Некорректный ID записи'),
  amount: z.number().positive('Сумма должна быть положительной'),
  type: z.nativeEnum(RefundType, { errorMap: () => ({ message: 'Некорректный тип возврата' }) }),
  reasonCategory: z.string().min(1, 'Категория причины обязательна'),
  reasonText: z.string().optional(),
  refundMethod: z.nativeEnum(PaymentMethod),
});

export const approveRefundSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
});

// ============================================
// МЕДИЦИНСКИЕ КАРТОЧКИ
// ============================================

export const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid('Некорректный ID пациента'),
  appointmentId: z.string().uuid('Некорректный ID записи'),
  diagnosis: z.string().optional(),
  icd10: z.string().optional(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  vitals: z.object({
    weight: z.number().optional(),
    height: z.number().optional(),
    bloodPressure: z.string().optional(),
    temperature: z.number().optional(),
    complaints: z.string().optional(),
  }).optional(),
  nextVisitDate: z.string().datetime().optional(),
});

export const updateMedicalRecordSchema = createMedicalRecordSchema.partial().omit({
  patientId: true,
  appointmentId: true,
});

export const createRecordTemplateSchema = z.object({
  name: z.string().min(1, 'Название шаблона обязательно'),
  diagnosis: z.string().optional(),
  icd10: z.string().optional(),
  prescription: z.string().optional(),
  notes: z.string().optional(),
  vitals: z.object({
    weight: z.number().optional(),
    height: z.number().optional(),
    bloodPressure: z.string().optional(),
    temperature: z.number().optional(),
    complaints: z.string().optional(),
  }).optional(),
});

// ============================================
// УСЛУГИ
// ============================================

export const createServiceSchema = z.object({
  code: z.string().min(1, 'Код услуги обязателен'),
  name: z.string().min(1, 'Название услуги обязательно'),
  price: z.number().positive('Цена должна быть положительной'),
  categoryId: z.string().uuid('Некорректный ID категории').optional(),
  departmentId: z.string().uuid('Некорректный ID отделения'),
  durationMin: z.number().int().positive('Длительность должна быть положительной'),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();

// ============================================
// ПОЛЬЗОВАТЕЛИ
// ============================================

export const createUserSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  role: z.enum(['OPERATOR', 'RECEPTIONIST', 'ASSISTANT', 'DOCTOR', 'OWNER']),
  departmentId: z.string().uuid('Некорректный ID отделения').optional(),
  colorBadge: z.string().regex(/^#[0-9A-F]{6}$/i, 'Некорректный цвет (формат: #RRGGBB)'),
  phone: z.string().min(10, 'Некорректный номер телефона'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const updateSalarySchemeSchema = z.object({
  type: z.nativeEnum(SalaryType),
  baseSalary: z.number().min(0).default(0),
  primaryPercent: z.number().min(0).max(100).default(0),
  repeatPercent: z.number().min(0).max(100).default(0),
  operationPercent: z.number().min(0).max(100).default(0),
  effectiveFrom: z.string().datetime(),
});

// ============================================
// ФАЙЛЫ
// ============================================

export const uploadFileSchema = z.object({
  patientId: z.string().uuid('Некорректный ID пациента'),
  appointmentId: z.string().uuid('Некорректный ID записи').optional(),
  type: z.enum(['ANALYSIS', 'XRAY', 'PRESCRIPTION', 'RECEIPT', 'OTHER']),
  name: z.string().min(1, 'Имя файла обязательно'),
});

// ============================================
// QUERY ПАРАМЕТРЫ
// ============================================

export const appointmentQuerySchema = z.object({
  date: z.string().optional(),
  doctorId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export const patientQuerySchema = z.object({
  search: z.string().optional(),
  blacklist: z.enum(['true', 'false']).optional(),
  source: z.nativeEnum(Source).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export const directionQuerySchema = z.object({
  status: z.enum(['CREATED', 'SCHEDULED', 'ARRIVED', 'DONE', 'CANCELLED']).optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
});

export const paymentJournalQuerySchema = z.object({
  date: z.string().optional(),
  doctorId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
});

export const salaryAccrualsQuerySchema = z.object({
  doctorId: z.string().uuid().optional(),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
});

export const analyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  doctorId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});
