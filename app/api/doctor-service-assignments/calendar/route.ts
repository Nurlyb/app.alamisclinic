/**
 * GET /api/doctor-service-assignments/calendar - Получение операций по дате для календаря
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get('date');
      const doctorIdParam = searchParams.get('doctorId');

      if (!date) {
        return successResponse({ data: [] });
      }

      // Определяем ID доктора
      let doctorId: string | undefined;

      if (user.role === 'DOCTOR') {
        // Доктор видит только свои операции
        doctorId = user.userId;
      } else if (user.role === 'ASSISTANT') {
        // Ассистент может выбрать доктора через параметр или видит всех
        if (doctorIdParam && doctorIdParam !== 'all') {
          doctorId = doctorIdParam;
        }
        // Если doctorId не указан или 'all', показываем операции всех докторов
      } else if (user.role === 'RECEPTIONIST') {
        // Регистратор видит все операции (для оплаты)
        // Не фильтруем по doctorId
      } else if (user.role === 'OPERATOR') {
        // Оператор видит все операции (для предотвращения конфликтов времени)
        // Не фильтруем по doctorId
      } else {
        // Другие роли не имеют доступа
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

      // Построение where условия
      const where: any = {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };

      // Добавляем фильтр по доктору если указан
      if (doctorId) {
        where.doctorId = doctorId;
      }

      // Получаем операции
      const assignments = await prisma.doctorServiceAssignment.findMany({
        where,
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
        orderBy: {
          scheduledDate: 'asc',
        },
      });

      // Форматируем данные
      const formattedAssignments = assignments.map((assignment) => {
        if (!assignment.scheduledDate) {
          return {
            ...assignment,
            price: Number(assignment.price),
            date: null,
            time: null,
          };
        }

        // Конвертируем UTC в локальное время Казахстана (UTC+5)
        const kazakhstanOffset = 5 * 60 * 60 * 1000;
        const localDate = new Date(assignment.scheduledDate.getTime() + kazakhstanOffset);
        
        return {
          ...assignment,
          price: Number(assignment.price),
          date: assignment.scheduledDate.toISOString().split('T')[0],
          time: `${localDate.getUTCHours().toString().padStart(2, '0')}:${localDate.getUTCMinutes().toString().padStart(2, '0')}`,
        };
      });

      return successResponse({ data: formattedAssignments });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:own', 'appointments:view:all']
);
