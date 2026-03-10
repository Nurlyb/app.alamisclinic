/**
 * POST /api/doctor-service-assignments/[id]/payment - Оплата операции
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { extractIdFromUrl } from '@/lib/utils/url';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

const operationPaymentSchema = z.object({
  amount: z.number().positive('Сумма должна быть положительной'),
  cash: z.number().min(0, 'Наличные не могут быть отрицательными').default(0),
  cashless: z.number().min(0, 'Безнал не может быть отрицательным').default(0),
  change: z.number().min(0, 'Сдача не может быть отрицательной').default(0),
  method: z.enum(['CASH', 'KASPI', 'CARD', 'MIXED']),
});

export const POST = withAuth(
  async (request, user) => {
    try {
      // Извлекаем ID из URL (предпоследний сегмент перед /payment)
      const id = extractIdFromUrl(request.url, 2);
      const body = await request.json();
      const validation = operationPaymentSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      // Проверка существования операции
      const assignment = await prisma.doctorServiceAssignment.findUnique({
        where: { id },
        include: {
          patient: true,
          service: true,
        },
      });

      if (!assignment) {
        return errorResponse('Операция не найдена', 'ASSIGNMENT_NOT_FOUND', 404);
      }

      // Проверка, что операция еще не оплачена
      if (assignment.status === 'COMPLETED' || assignment.status === 'PAID') {
        return errorResponse('Операция уже оплачена', 'ALREADY_PAID', 409);
      }

      // Обновляем статус операции на PAID (оплачено, но еще не выполнено)
      const updatedAssignment = await prisma.doctorServiceAssignment.update({
        where: { id },
        data: {
          status: 'PAID',
          notes: assignment.notes 
            ? `${assignment.notes}\n\nОплата: ${data.amount} ₸ (${data.method}) - ${new Date().toLocaleString('ru-RU')}`
            : `Оплата: ${data.amount} ₸ (${data.method}) - ${new Date().toLocaleString('ru-RU')}`,
        },
      });

      // TODO: Начисление зарплаты доктору за операции будет реализовано отдельно

      return successResponse(
        {
          assignment: updatedAssignment,
          message: 'Оплата операции успешно принята',
        },
        200
      );
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'payments:create'
);
