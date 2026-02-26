/**
 * GET /api/analytics/doctor/[id] - Личная статистика доктора
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

async function handler(request: NextRequest, user: JWTPayload) {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    const { searchParams } = url;
    const period = searchParams.get('period') || 'month';

    // Доктора могут видеть только свою статистику
    if (user.role === 'DOCTOR' && id !== user.userId) {
      return forbiddenResponse('Вы можете видеть только свою статистику');
    }

    // Проверка существования доктора
    const doctor = await prisma.user.findUnique({
      where: { id, role: 'DOCTOR' },
      select: {
        id: true,
        name: true,
      },
    });

    if (!doctor) {
      return notFoundResponse('Доктор');
    }

    // Определение периода
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Принято пациентов
    const totalPatients = await prisma.appointment.count({
      where: {
        doctorId: id,
        datetime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'DONE',
      },
    });

    // Не пришли
    const noShow = await prisma.appointment.count({
      where: {
        doctorId: id,
        datetime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'NO_SHOW',
      },
    });

    // Повторные пациенты
    const repeatPatients = await prisma.appointment.count({
      where: {
        doctorId: id,
        datetime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'DONE',
        type: 'REPEAT',
      },
    });

    const repeatRate = totalPatients > 0 ? (repeatPatients / totalPatients) * 100 : 0;

    // Направил пациентов
    const directionsCount = await prisma.direction.count({
      where: {
        fromDoctorId: id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Выручка
    const payments = await prisma.payment.findMany({
      where: {
        appointment: {
          doctorId: id,
          datetime: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: {
        amount: true,
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const averageCheck = totalPatients > 0 ? totalRevenue / totalPatients : 0;

    // Начисления зарплаты
    const accruals = await prisma.salaryAccrual.findMany({
      where: {
        doctorId: id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        netAmount: true,
      },
    });

    const totalSalary = accruals.reduce((sum, a) => sum + Number(a.netAmount), 0);

    // Топ услуг
    const topServices = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        doctorId: id,
        datetime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'DONE',
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    const serviceIds = topServices.map((s) => s.serviceId);
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const topServicesWithNames = topServices.map((ts) => {
      const service = services.find((s) => s.id === ts.serviceId);
      return {
        serviceName: service?.name || 'Неизвестно',
        count: ts._count.id,
      };
    });

    return successResponse({
      doctor: {
        id: doctor.id,
        name: doctor.name,
      },
      period,
      stats: {
        totalPatients,
        noShow,
        noShowRate: totalPatients > 0 ? Math.round((noShow / totalPatients) * 10000) / 100 : 0,
        repeatPatients,
        repeatRate: Math.round(repeatRate * 100) / 100,
        directionsCount,
        totalRevenue,
        averageCheck: Math.round(averageCheck * 100) / 100,
        totalSalary,
      },
      topServices: topServicesWithNames,
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const GET = withAuth(handler, ['analytics:view:all', 'analytics:view:own']);
