/**
 * POST /api/medical-records - Создание медицинской записи (для доктора)
 * GET /api/medical-records - Получение медицинских записей пациента
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

const createMedicalRecordSchema = z.object({
  appointmentId: z.string().uuid(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

// GET - получить медицинские записи пациента
export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');

      if (!patientId) {
        return errorResponse('patientId обязателен', 'PATIENT_ID_REQUIRED', 400);
      }

      // Получаем записи пациента
      const records = await prisma.medicalRecord.findMany({
        where: {
          patientId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return successResponse({ records });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);

export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createMedicalRecordSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const { appointmentId, diagnosis, notes } = validation.data;

      // Проверка существования записи
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: true,
        },
      });

      if (!appointment) {
        return errorResponse('Запись не найдена', 'APPOINTMENT_NOT_FOUND', 404);
      }

      // Доктор может создавать медицинские записи только для своих пациентов
      if (user.role === 'DOCTOR' && appointment.doctorId !== user.userId) {
        return errorResponse('Нет доступа к этой записи', 'FORBIDDEN', 403);
      }

      // Всегда создаем новую медицинскую запись (история диагнозов)
      // Убираем проверку на существующую запись - каждый диагноз это новая запись
      const medicalRecord = await prisma.medicalRecord.create({
        data: {
          appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          diagnosis,
          notes,
        },
      });

      return successResponse(
        {
          record: medicalRecord,
          message: 'Диагноз добавлен в историю',
        },
        201
      );
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);
