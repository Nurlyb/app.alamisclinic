/**
 * GET /api/doctor-service-assignments/receptionist - Получение операций для регистратора
 * Показывает операции со статусом PLANNED на выбранную дату для приема оплаты
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const GET = withAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date');

      if (!date) {
        return successResponse({ data: [] });
      }

      // Парсим дату
      const inputDate = new Date(date);
      const kazakhstanOffset = 5 * 60 * 60 * 1000;
      const localDate = new Date(inputDate.getTime() + kazakhstanOffset);
      
      const year = localDate.getUTCFullYear();
      const month = localDate.getUTCMonth();
      const day = localDate.getUTCDate();
      
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

      // Получаем операции со статусом PLANNED (не оплаченные)
      const assignments = await prisma.doctorServiceAssignment.findMany({
        where: {
          scheduledDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'PLANNED', // Только запланированные (не оплаченные)
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
              description: true,
            },
          },
        },
        orderBy: {
          scheduledDate: 'asc',
        },
      });

      // Форматируем данные
      const formattedAssignments = assignments.map((assignment) => ({
        ...assignment,
        price: Number(assignment.price),
        date: assignment.scheduledDate?.toISOString().split('T')[0] || null,
        time: assignment.scheduledDate
          ? `${assignment.scheduledDate.getUTCHours().toString().padStart(2, '0')}:${assignment.scheduledDate.getUTCMinutes().toString().padStart(2, '0')}`
          : null,
      }));

      return successResponse(formattedAssignments);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'payments:create' // Регистратор имеет это право
);
