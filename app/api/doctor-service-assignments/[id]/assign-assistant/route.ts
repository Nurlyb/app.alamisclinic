/**
 * POST /api/doctor-service-assignments/[id]/assign-assistant - Взять операцию на работу ассистентом
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { emitOperationUpdated } from '@/lib/socket/server';
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Извлекаем ID из URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const id = pathSegments[pathSegments.length - 2]; // ID находится перед /assign-assistant

      if (!id) {
        return errorResponse('ID операции обязателен', 'ID_REQUIRED', 400);
      }

      // Только ассистенты могут брать операции на работу
      if (user.role !== 'ASSISTANT') {
        return errorResponse('Только ассистенты могут брать операции на работу', 'ACCESS_DENIED', 403);
      }

      // Находим операцию
      const operation = await prisma.doctorServiceAssignment.findUnique({
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

      if (!operation) {
        return errorResponse('Операция не найдена', 'OPERATION_NOT_FOUND', 404);
      }

      // Проверяем, что операция еще не взята другим ассистентом
      if ((operation as any).assistantId && (operation as any).assistantId !== user.userId) {
        return errorResponse('Операция уже взята другим ассистентом', 'ALREADY_ASSIGNED', 400);
      }

      // Проверяем, что операция не взята этим же ассистентом
      if ((operation as any).assistantId === user.userId) {
        return errorResponse('Вы уже взяли эту операцию на работу', 'ALREADY_TAKEN', 400);
      }

      // Обновляем операцию
      const updatedOperation = await prisma.doctorServiceAssignment.update({
        where: { id },
        data: {
          assistantId: user.userId,
          assistantTakenAt: new Date(),
        } as any,
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
          assistant: {
            select: {
              id: true,
              name: true,
            },
          },
        } as any,
      });

      // Отправляем WebSocket событие
      emitOperationUpdated(updatedOperation);

      return successResponse(updatedOperation);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);