/**
 * POST /api/payments - Создание оплаты и генерация чека
 * GET /api/payments/journal - Кассовый журнал
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { createPaymentSchema, paymentJournalQuerySchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logPayment } from '@/lib/audit/logger';

// POST - Создание оплаты
export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createPaymentSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      // Проверка существования записи
      const appointment = await prisma.appointment.findUnique({
        where: { id: data.appointmentId },
        include: {
          patient: true,
          doctor: true,
          service: true,
          department: true,
        },
      });

      if (!appointment) {
        return errorResponse('Запись не найдена', 'APPOINTMENT_NOT_FOUND', 404);
      }

      // Проверка, что оплата ещё не создана
      const existingPayment = await prisma.payment.findUnique({
        where: { appointmentId: data.appointmentId },
      });

      if (existingPayment) {
        return errorResponse('Оплата уже создана для этой записи', 'PAYMENT_EXISTS', 409);
      }

      // Создание оплаты
      const payment = await prisma.payment.create({
        data: {
          appointmentId: data.appointmentId,
          amount: data.amount,
          cash: data.cash,
          cashless: data.cashless,
          change: data.change,
          method: data.method,
          receivedBy: user.userId,
        },
      });

      // Обновление статуса записи
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: {
          finalPayment: data.amount,
          paymentMethod: data.method,
        },
      });

      // Создание начисления зарплаты доктору
      const salaryScheme = await prisma.salaryScheme.findUnique({
        where: { doctorId: appointment.doctorId },
      });

      if (salaryScheme) {
        let percentApplied = 0;

        // Определение процента в зависимости от типа визита
        if (appointment.type === 'PRIMARY') {
          percentApplied = Number(salaryScheme.primaryPercent);
        } else if (appointment.type === 'REPEAT') {
          percentApplied = Number(salaryScheme.repeatPercent);
        }

        const netAmount = (Number(data.amount) * percentApplied) / 100;

        const now = new Date();
        await prisma.salaryAccrual.create({
          data: {
            doctorId: appointment.doctorId,
            paymentId: payment.id,
            grossAmount: data.amount,
            percentApplied,
            netAmount,
            periodMonth: now.getMonth() + 1,
            periodYear: now.getFullYear(),
            status: 'PENDING',
          },
        });
      }

      // Логирование
      await logPayment(
        user.userId,
        payment.id,
        Number(data.amount),
        data.method,
        request.headers.get('x-forwarded-for') || undefined
      );

      // Генерация PDF чека
      const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/${payment.id}/receipt`;

      return successResponse(
        {
          payment,
          receiptUrl,
          message: 'Оплата успешно создана',
        },
        201
      );
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'payments:create'
);
