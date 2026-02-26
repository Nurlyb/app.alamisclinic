/**
 * GET /api/salary/summary - Сводка по зарплате за период
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  forbiddenResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const month = searchParams.get('month');
      const year = searchParams.get('year');

      const now = new Date();
      const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
      const targetYear = year ? parseInt(year) : now.getFullYear();

      // Доктора могут видеть только свою сводку
      const where: any = {
        periodMonth: targetMonth,
        periodYear: targetYear,
      };

      if (user.role === 'DOCTOR') {
        where.doctorId = user.userId;
      }

      // Получение начислений
      const accruals = await prisma.salaryAccrual.findMany({
        where,
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Группировка по докторам
      const doctorSummaries = accruals.reduce((acc, accrual) => {
        const doctorId = accrual.doctorId;
        if (!acc[doctorId]) {
          acc[doctorId] = {
            doctorId,
            doctorName: accrual.doctor.name,
            totalGross: 0,
            totalNet: 0,
            count: 0,
          };
        }
        acc[doctorId].totalGross += Number(accrual.grossAmount);
        acc[doctorId].totalNet += Number(accrual.netAmount);
        acc[doctorId].count += 1;
        return acc;
      }, {} as Record<string, any>);

      const summaries = Object.values(doctorSummaries);

      // Общие итоги
      const totals = {
        totalGross: summaries.reduce((sum, s) => sum + s.totalGross, 0),
        totalNet: summaries.reduce((sum, s) => sum + s.totalNet, 0),
        totalCount: summaries.reduce((sum, s) => sum + s.count, 0),
        doctorsCount: summaries.length,
      };

      return successResponse({
        period: {
          month: targetMonth,
          year: targetYear,
        },
        summaries,
        totals,
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['salary:view:all', 'salary:view:own']
);
