/**
 * API для привязки ассистента к доктору
 * PUT - привязать ассистента к доктору
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { extractIdFromUrl } from '@/lib/utils/url';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

const assignDoctorSchema = z.object({
  doctorId: z.string().uuid().nullable(),
});

export const PUT = withAuth(
  async (request, user) => {
    try {
      const id = extractIdFromUrl(request.url, 2);
      const body = await request.json();
      const validation = assignDoctorSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const { doctorId } = validation.data;

      // Проверка существования ассистента
      const assistant = await prisma.user.findUnique({
        where: { id },
      });

      if (!assistant) {
        return errorResponse('Пользователь не найден', 'USER_NOT_FOUND', 404);
      }

      if (assistant.role !== 'ASSISTANT') {
        return errorResponse(
          'Пользователь не является ассистентом',
          'NOT_ASSISTANT',
          400
        );
      }

      // Если указан doctorId, проверяем существование доктора
      if (doctorId) {
        const doctor = await prisma.user.findUnique({
          where: { id: doctorId },
        });

        if (!doctor || doctor.role !== 'DOCTOR') {
          return errorResponse('Доктор не найден', 'DOCTOR_NOT_FOUND', 404);
        }
      }

      // Обновляем ассистента
      const updated = await prisma.user.update({
        where: { id },
        data: {
          assistingDoctorId: doctorId,
        },
        include: {
          assistingDoctor: {
            select: {
              id: true,
              name: true,
              departmentId: true,
            },
          },
        },
      });

      return successResponse({ user: updated });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'users:update'
);
