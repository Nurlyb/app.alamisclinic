/**
 * GET /api/appointments/stats - Статистика записей
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

async function getHandler(request: NextRequest, user: JWTPayload) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const managerId = searchParams.get('managerId');

    // Построение фильтров
    const where: any = {};

    // Если указан managerId (для статистики конкретного оператора)
    if (managerId) {
      where.managerId = managerId;
    } else if (user.role === 'OPERATOR') {
      // Оператор видит только свою статистику
      where.managerId = user.userId;
    }

    // Фильтр по дате
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.datetime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Получаем статистику
    const [
      total,
      confirmed,
      arrived,
      done,
      cancelled,
      noShow,
      transferred,
    ] = await Promise.all([
      // Всего записей
      prisma.appointment.count({ where }),
      // Подтверждено
      prisma.appointment.count({
        where: { ...where, status: 'CONFIRMED' },
      }),
      // Прибыл
      prisma.appointment.count({
        where: { ...where, status: 'ARRIVED' },
      }),
      // Выполнено
      prisma.appointment.count({
        where: { ...where, status: 'DONE' },
      }),
      // Отменено
      prisma.appointment.count({
        where: { ...where, status: 'CANCELLED' },
      }),
      // Не пришел
      prisma.appointment.count({
        where: { ...where, status: 'NO_SHOW' },
      }),
      // Перенесено
      prisma.appointment.count({
        where: { ...where, status: 'TRANSFERRED' },
      }),
    ]);

    return successResponse({
      total,
      confirmed,
      arrived,
      done,
      cancelled,
      noShow,
      transferred,
      pending: total - confirmed - arrived - done - cancelled - noShow - transferred,
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const GET = withAuth(getHandler, ['appointments:view:all', 'appointments:view:own']);
