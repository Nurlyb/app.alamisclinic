/**
 * POST /api/doctor-service-assignments/[id]/assign-assistant - Взять операцию на работу ассистентом
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { emitOperationUpdated } from '@/lib/socket/server';
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const POST = withAuth(
  async (request: NextRequest, user, context: { params: { id: string } }) => {
    try {
      // Извлекаем ID из параметров
      const { id } = context.params;

      if (!id) {
        return forbiddenResponse('ID операции обязателен');
      }

      // Только ассистенты могут брать операции на работу
      if (user.role !== 'ASSISTANT') {
        return forbiddenResponse('Только ассистенты могут брать операции на работу');
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
        return notFoundResponse('Операция не найдена');
      }

      // Проверяем, что операция еще не взята другим ассистентом
      if (operation.assistantId && operation.assistantId !== user.userId) {
        return forbiddenResponse('Операция уже взята другим ассистентом');
      }

      // Проверяем, что операция не взята этим же ассистентом
      if (operation.assistantId === user.userId) {
        return forbiddenResponse('Вы уже взяли эту операцию на работу');
      }

      // Обновляем операцию
      const updatedOperation = await prisma.doctorServiceAssignment.update({
        where: { id },
        data: {
          assistantId: user.userId,
          assistantTakenAt: new Date(),
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
          assistant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
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