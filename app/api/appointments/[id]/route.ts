/**
 * GET /api/appointments/[id] - Получение записи по ID
 * PUT /api/appointments/[id] - Обновление записи
 * DELETE /api/appointments/[id] - Удаление записи
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { updateAppointmentSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logUpdate, logDelete } from '@/lib/audit/logger';
import { extractIdFromUrl } from '@/lib/utils/url';

// GET - Получение записи по ID
async function getHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        service: true,
        department: true,
      },
    });

    if (!appointment) {
      return notFoundResponse('Запись');
    }

    // Проверка прав доступа
    if (user.role === 'DOCTOR' && appointment.doctorId !== user.userId) {
      return errorResponse('Нет доступа к этой записи', 'FORBIDDEN', 403);
    }

    return successResponse(appointment);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const GET = withAuth(getHandler, 'appointments:view:all');

// PUT - Обновление записи
async function putHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);
    const body = await request.json();
    
    console.log('PUT/PATCH /api/appointments/[id]');
    console.log('ID:', id);
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('User:', user.userId, user.role);
    
    const validation = updateAppointmentSchema.safeParse(body);

      if (!validation.success) {
        console.error('Validation error:', validation.error);
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      // Получение текущей записи
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!existingAppointment) {
        return notFoundResponse('Запись');
      }

      // Проверка прав доступа (доктор может редактировать только свои записи)
      if (user.role === 'DOCTOR' && existingAppointment.doctorId !== user.userId) {
        return errorResponse('Нет доступа к этой записи', 'FORBIDDEN', 403);
      }

      // Проверка на конфликт времени при изменении даты/времени
      if (data.datetime) {
        const conflictingAppointment = await prisma.appointment.findFirst({
          where: {
            id: { not: id },
            doctorId: existingAppointment.doctorId,
            datetime: new Date(data.datetime),
            status: {
              notIn: ['CANCELLED', 'NO_SHOW'],
            },
          },
        });

        if (conflictingAppointment) {
          return errorResponse(
            'На это время уже есть запись',
            'TIME_CONFLICT',
            409
          );
        }
      }

      // Обновление записи
      const updateData: any = {
        ...(data.datetime && { datetime: new Date(data.datetime) }),
        ...(data.status && { status: data.status }),
        ...(data.comment !== undefined && { comment: data.comment }),
        ...(data.prepayment !== undefined && { prepayment: data.prepayment }),
      };

      // Добавляем информацию о том, кто выполнил действие
      if (data.status === 'CANCELLED') {
        updateData.cancelledBy = user.userId;
        updateData.cancelledAt = new Date();
      } else if (data.status === 'TRANSFERRED') {
        updateData.transferredBy = user.userId;
        updateData.transferredAt = new Date();
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              fullName: true,
              phone: true,
            },
          },
          doctor: {
            select: {
              name: true,
            },
          },
          service: {
            select: {
              name: true,
              price: true,
            },
          },
        },
      });

      // Логирование
      await logUpdate(
        user.userId,
        'appointments',
        id,
        existingAppointment,
        updatedAppointment,
        request.headers.get('x-forwarded-for') || undefined
      );

      // WebSocket уведомление
      const { notifyAppointmentUpdated } = await import('@/lib/socket/integration');
      await notifyAppointmentUpdated(updatedAppointment);

      return successResponse(updatedAppointment);
    } catch (error) {
      console.error('PUT /api/appointments/[id] error:', error);
      return internalErrorResponse(error);
    }
}

export const PUT = withAuth(putHandler, 'appointments:update');
export const PATCH = withAuth(putHandler, 'appointments:update'); // Добавляем поддержку PATCH

// DELETE - Удаление (отмена) записи
async function deleteHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

      const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
      });

      if (!existingAppointment) {
        return notFoundResponse('Запись');
      }

      // Проверка прав доступа
      if (user.role === 'DOCTOR' && existingAppointment.doctorId !== user.userId) {
        return errorResponse('Нет доступа к этой записи', 'FORBIDDEN', 403);
      }

      // Мягкое удаление - изменение статуса на CANCELLED
      const cancelledAppointment = await prisma.appointment.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          cancelledBy: user.userId,
          cancelledAt: new Date(),
        },
      });

      // Логирование
      await logDelete(
        user.userId,
        'appointments',
        id,
        existingAppointment,
        request.headers.get('x-forwarded-for') || undefined
      );

      // WebSocket уведомление
      const { notifyAppointmentCancelled } = await import('@/lib/socket/integration');
      await notifyAppointmentCancelled(cancelledAppointment);

      return successResponse({
        message: 'Запись отменена',
        appointment: cancelledAppointment,
      });
    } catch (error) {
      console.error('DELETE /api/appointments/[id] error:', error);
      return internalErrorResponse(error);
    }
}

export const DELETE = withAuth(deleteHandler, 'appointments:delete');
