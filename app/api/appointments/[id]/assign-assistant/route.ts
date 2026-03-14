/**
 * PATCH /api/appointments/[id]/assign-assistant - Закрепление пациента за ассистентом
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
      const id = pathSegments[pathSegments.length - 2]; // ID находится перед /assign-assistant

      if (!id) {
        return errorResponse('ID записи обязателен', 'ID_REQUIRED', 400);
      }

      // Проверяем, что пользователь - ассистент
      if (user.role !== 'ASSISTANT') {
        return errorResponse('Только ассистенты могут закреплять пациентов', 'ACCESS_DENIED', 403);
      }

      // Находим запись
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          doctor: {
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

      if (!appointment) {
        return errorResponse('Запись не найдена', 'APPOINTMENT_NOT_FOUND', 404);
      }

      // Проверяем, что запись еще не закреплена за другим ассистентом
      if (appointment.assistantId && appointment.assistantId !== user.userId) {
        return errorResponse('Пациент уже закреплен за другим ассистентом', 'ALREADY_ASSIGNED', 400);
      }

      // Если уже закреплен за этим ассистентом, возвращаем текущее состояние
      if (appointment.assistantId === user.userId) {
        return successResponse(appointment);
      }

      // Закрепляем пациента за ассистентом
      const updatedAppointment = await prisma.appointment.update({
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
          doctor: {
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

      return successResponse(updatedAppointment);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);