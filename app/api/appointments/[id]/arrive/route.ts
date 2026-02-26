/**
 * PATCH /api/appointments/[id]/arrive - Отметка о прибытии пациента
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { extractIdFromUrl } from '@/lib/utils/url';

async function handler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        service: true,
      },
    });

    if (!appointment) {
      return notFoundResponse('Запись');
    }

    if (appointment.status !== 'CONFIRMED' && appointment.status !== 'PENDING') {
      return errorResponse(
        'Можно отметить прибытие только для подтверждённых или ожидающих записей',
        'INVALID_STATUS',
        400
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'ARRIVED',
        arrivedAt: new Date(),
        arrivedBy: user.userId, // Кто отметил прибытие
      },
      include: {
        patient: true,
        doctor: true,
        service: true,
        department: true,
      },
    });

    // WebSocket уведомление
    const { notifyAppointmentUpdated } = await import('@/lib/socket/integration');
    await notifyAppointmentUpdated(updatedAppointment);

    return successResponse(updatedAppointment);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const PATCH = withAuth(handler, 'appointments:arrive');
export const POST = withAuth(handler, 'appointments:arrive'); // Добавляем поддержку POST
