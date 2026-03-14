/**
 * PATCH /api/doctor-service-assignments/[id]/complete - Завершение операции
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

const completeOperationSchema = z.object({
  duration: z.number().positive('Длительность должна быть положительной'),
});

export const PATCH = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Извлекаем ID из URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const id = pathSegments[pathSegments.length - 2]; // ID находится перед /complete

      if (!id) {
        return errorResponse('ID операции обязателен', 'ID_REQUIRED', 400);
      }

      const body = await request.json();
      const validation = completeOperationSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const { duration } = validation.data;

      // Находим операцию
      const assignment = await prisma.doctorServiceAssignment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!assignment) {
        return errorResponse('Операция не найдена', 'ASSIGNMENT_NOT_FOUND', 404);
      }

      // Проверка прав доступа
      if (user.role === 'DOCTOR' && assignment.doctorId !== user.userId) {
        return errorResponse('Нет доступа к этой операции', 'ACCESS_DENIED', 403);
      }

      // Проверка статуса
      if (assignment.status !== 'IN_PROGRESS') {
        return errorResponse('Операция должна быть запущена для завершения', 'INVALID_STATUS', 400);
      }

      // Завершаем операцию
      const updatedAssignment = await prisma.doctorServiceAssignment.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
          duration,
        },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return successResponse(updatedAssignment);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);