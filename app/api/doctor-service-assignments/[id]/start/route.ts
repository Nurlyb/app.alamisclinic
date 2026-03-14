/**
 * PATCH /api/doctor-service-assignments/[id]/start - Запуск операции
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const PATCH = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Извлекаем ID из URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const id = pathSegments[pathSegments.length - 2]; // ID находится перед /start

      if (!id) {
        return errorResponse('ID операции обязателен', 'ID_REQUIRED', 400);
      }

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
      if (assignment.status !== 'PAID') {
        return errorResponse('Операция должна быть оплачена для запуска', 'INVALID_STATUS', 400);
      }

      // Запускаем операцию
      const updatedAssignment = await prisma.doctorServiceAssignment.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
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