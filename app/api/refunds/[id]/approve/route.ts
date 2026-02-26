/**
 * PATCH /api/refunds/[id]/approve - Одобрение/отклонение возврата
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { JWTPayload } from '@/lib/auth/jwt';
import { extractIdFromUrl } from '@/lib/utils/url';
import { approveRefundSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logUpdate } from '@/lib/audit/logger';

export const PATCH = withAuth(
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const id = extractIdFromUrl(request.url);
      const body = await request.json();
      const validation = approveRefundSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const { approved, notes } = validation.data;

      const existingRefund = await prisma.refund.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              appointment: {
                include: {
                  doctor: true,
                },
              },
            },
          },
        },
      });

      if (!existingRefund) {
        return notFoundResponse('Возврат');
      }

      if (existingRefund.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Возврат уже обработан', code: 'ALREADY_PROCESSED' },
          { status: 400 }
        );
      }

      const newStatus = approved ? 'APPROVED' : 'REJECTED';

      // Обновление возврата
      const updatedRefund = await prisma.refund.update({
        where: { id },
        data: {
          status: newStatus,
          approvedBy: user.userId,
          completedAt: approved ? new Date() : null,
        },
      });

      // Если одобрено, корректируем зарплату доктора
      if (approved) {
        const salaryAccrual = await prisma.salaryAccrual.findUnique({
          where: { paymentId: existingRefund.paymentId },
        });

        if (salaryAccrual) {
          // Вычитаем из начислений
          const refundPercent = Number(salaryAccrual.percentApplied);
          const refundAmount = (Number(existingRefund.amount) * refundPercent) / 100;

          await prisma.salaryAccrual.update({
            where: { id: salaryAccrual.id },
            data: {
              netAmount: {
                decrement: refundAmount,
              },
              status: 'ADJUSTED',
            },
          });
        }
      }

      // Уведомление инициатору
      await prisma.notification.create({
        data: {
          userId: existingRefund.requestedBy,
          type: 'refund:status_changed',
          title: approved ? 'Возврат одобрен' : 'Возврат отклонён',
          message: approved
            ? `Возврат на сумму ${existingRefund.amount} ₸ одобрен`
            : `Возврат на сумму ${existingRefund.amount} ₸ отклонён${notes ? `: ${notes}` : ''}`,
          link: `/refunds/${id}`,
        },
      });

      // WebSocket уведомление
      const { notifyRefundStatusChanged } = await import('@/lib/socket/integration');
      await notifyRefundStatusChanged(updatedRefund);

      // Логирование
      await logUpdate(
        user.userId,
        'refunds',
        id,
        existingRefund,
        updatedRefund,
        request.headers.get('x-forwarded-for') || undefined
      );

      return successResponse({
        message: approved ? 'Возврат одобрен' : 'Возврат отклонён',
        refund: updatedRefund,
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'refunds:approve'
);
