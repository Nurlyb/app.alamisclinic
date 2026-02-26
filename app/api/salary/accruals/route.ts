/**
 * GET /api/salary/accruals - Получение начислений зарплаты
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { salaryAccrualsQuerySchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  forbiddenResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryValidation = salaryAccrualsQuerySchema.safeParse({
        doctorId: searchParams.get('doctorId') || undefined,
        month: searchParams.get('month') || undefined,
        year: searchParams.get('year') || undefined,
      });

      if (!queryValidation.success) {
        return validationErrorResponse(queryValidation.error);
      }

      const { doctorId, month, year } = queryValidation.data;

      // Доктора могут видеть только свои начисления
      let targetDoctorId = doctorId;
      if (user.role === 'DOCTOR') {
        if (doctorId && doctorId !== user.userId) {
          return forbiddenResponse('Вы можете видеть только свои начисления');
        }
        targetDoctorId = user.userId;
      }

      const where: any = {};

      if (targetDoctorId) {
        where.doctorId = targetDoctorId;
      }

      if (month) {
        where.periodMonth = parseInt(month);
      }

      if (year) {
        where.periodYear = parseInt(year);
      }

      const accruals = await prisma.salaryAccrual.findMany({
        where,
        include: {
          doctor: {
            select: {
              name: true,
            },
          },
          payment: {
            include: {
              appointment: {
                include: {
                  patient: {
                    select: {
                      fullName: true,
                    },
                  },
                  service: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Подсчёт итогов
      const summary = {
        totalGross: accruals.reduce((sum, a) => sum + Number(a.grossAmount), 0),
        totalNet: accruals.reduce((sum, a) => sum + Number(a.netAmount), 0),
        count: accruals.length,
      };

      return successResponse({
        accruals,
        summary,
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['salary:view:all', 'salary:view:own']
);
