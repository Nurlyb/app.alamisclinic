/**
 * POST /api/medical-records - Создание медицинской записи (для доктора)
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

      // Проверка, что медицинская запись еще не создана
      const existingRecord = await prisma.medicalRecord.findUnique({
        where: { appointmentId },
      });

      if (existingRecord) {
        // Обновляем существующую запись
        const updatedRecord = await prisma.medicalRecord.update({
          where: { appointmentId },
          data: {
            diagnosis,
            notes,
          },
        });

        return successResponse({
          record: updatedRecord,
          message: 'Медицинская запись обновлена',
        });
      }

      // Создание новой медицинской записи
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
          message: 'Медицинская запись создана',
        },
        201
      );
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);
