/**
 * GET /api/analytics/dashboard - Дашборд аналитики для владельца
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
      // Используем часовой пояс Казахстана (UTC+5)
      const now = new Date();
      const kazakhstanOffset = 5 * 60 * 60 * 1000; // 5 часов в миллисекундах
      const localNow = new Date(now.getTime() + kazakhstanOffset);
      
      // Получаем дату в формате YYYY-MM-DD для Казахстана
      const year = localNow.getUTCFullYear();
      const month = localNow.getUTCMonth();
      const date = localNow.getUTCDate();
      
      // Создаем границы дня в UTC (без смещения)
      const startOfToday = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
      const endOfToday = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));

      const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

      // Записи сегодня
      const appointmentsToday = await prisma.appointment.count({
        where: {
          datetime: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      });

      console.log('Dashboard API - Today:', {
        now: now.toISOString(),
        localNow: localNow.toISOString(),
        startOfToday: startOfToday.toISOString(),
        endOfToday: endOfToday.toISOString(),
        appointmentsToday,
      });

      // Пациенты сегодня
      const patientsToday = await prisma.appointment.count({
        where: {
          datetime: {
            gte: startOfToday,
            lte: endOfToday,
          },
          status: {
            in: ['CONFIRMED', 'ARRIVED', 'DONE'],
          },
        },
      });

      // Выручка сегодня
      const paymentsToday = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        select: {
          amount: true,
        },
      });

      const revenueToday = paymentsToday.reduce((sum, p) => sum + Number(p.amount), 0);

      // Выручка за месяц
      const paymentsMonth = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: {
          amount: true,
        },
      });

      const revenueMonth = paymentsMonth.reduce((sum, p) => sum + Number(p.amount), 0);

      // Конверсия (записались → пришли)
      const appointmentsMonth = await prisma.appointment.count({
        where: {
          datetime: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      const arrivedMonth = await prisma.appointment.count({
        where: {
          datetime: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: {
            in: ['ARRIVED', 'DONE'],
          },
        },
      });

      const conversionRate = appointmentsMonth > 0 ? (arrivedMonth / appointmentsMonth) * 100 : 0;

      // Долги
      const totalDebt = await prisma.patient.aggregate({
        _sum: {
          debt: true,
        },
      });

      // Возвраты за месяц
      const refundsMonth = await prisma.refund.findMany({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: 'COMPLETED',
        },
        select: {
          amount: true,
        },
      });

      const totalRefunds = refundsMonth.reduce((sum, r) => sum + Number(r.amount), 0);

      // Источники пациентов
      const patientsBySource = await prisma.patient.groupBy({
        by: ['source'],
        _count: {
          id: true,
        },
      });

      // Топ докторов за месяц
      const doctorStats = await prisma.appointment.groupBy({
        by: ['doctorId'],
        where: {
          datetime: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: 'DONE',
        },
        _count: {
          id: true,
        },
      });

      const doctorIds = doctorStats.map((d) => d.doctorId);
      const doctors = await prisma.user.findMany({
        where: {
          id: {
            in: doctorIds,
          },
        },
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      });

      // Получаем отделения
      const departmentIds = doctors.map((d) => d.departmentId).filter(Boolean) as string[];
      const departments = await prisma.department.findMany({
        where: {
          id: {
            in: departmentIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      // Получаем выручку по докторам
      const doctorPayments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          appointment: {
            doctorId: {
              in: doctorIds,
            },
          },
        },
        select: {
          amount: true,
          appointment: {
            select: {
              doctorId: true,
            },
          },
        },
      });

      const topDoctors = doctorStats.map((ds) => {
        const doctor = doctors.find((d) => d.id === ds.doctorId);
        const department = departments.find((dep) => dep.id === doctor?.departmentId);
        const revenue = doctorPayments
          .filter((p) => p.appointment.doctorId === ds.doctorId)
          .reduce((sum, p) => sum + Number(p.amount), 0);

        return {
          id: ds.doctorId,
          name: doctor?.name || 'Неизвестно',
          department: {
            name: department?.name || 'Неизвестно',
          },
          patients: ds._count.id,
          revenue,
        };
      }).sort((a, b) => b.revenue - a.revenue);

      // Топ услуг
      const topServices = await prisma.appointment.groupBy({
        by: ['serviceId'],
        where: {
          datetime: {
            gte: startOfMonth,
            lte: endOfMonth,
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
        take: 10,
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
          price: true,
        },
      });

      const topServicesWithNames = topServices.map((ts) => {
        const service = services.find((s) => s.id === ts.serviceId);
        
        // Получаем выручку по этой услуге
        const servicePayments = paymentsMonth.filter((p: any) => {
          // Нужно получить serviceId из appointment
          return false; // Временно
        });
        
        return {
          id: ts.serviceId,
          name: service?.name || 'Неизвестно',
          price: Number(service?.price || 0),
          count: ts._count.id,
          revenue: Number(service?.price || 0) * ts._count.id,
        };
      });

      return successResponse({
        today: {
          appointments: appointmentsToday,
          patients: patientsToday,
          revenue: revenueToday,
        },
        month: {
          revenue: revenueMonth,
          appointments: appointmentsMonth,
          arrived: arrivedMonth,
          conversionRate: Math.round(conversionRate * 100) / 100,
          refunds: totalRefunds,
        },
        debt: Number(totalDebt._sum.debt || 0),
        patientsBySource: patientsBySource.map((p) => ({
          source: p.source,
          count: p._count.id,
        })),
        topDoctors,
        topServices: topServicesWithNames,
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'analytics:view:all'
);
