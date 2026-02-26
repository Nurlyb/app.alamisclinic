/**
 * GET /api/appointments - Получение списка записей
 * POST /api/appointments - Создание новой записи
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import {
  createAppointmentSchema,
  appointmentQuerySchema,
} from '@/lib/validation/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logCreate } from '@/lib/audit/logger';
import { canAccessResource } from '@/lib/auth/rbac';

// GET - Получение списка записей
export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryValidation = appointmentQuerySchema.safeParse({
        date: searchParams.get('date') || undefined,
        doctorId: searchParams.get('doctorId') || undefined,
        departmentId: searchParams.get('departmentId') || undefined,
        status: searchParams.get('status') || undefined,
      });

      if (!queryValidation.success) {
        return validationErrorResponse(queryValidation.error);
      }

      const { date, doctorId, departmentId, status } = queryValidation.data;

      // Построение фильтров
      const where: any = {};

      // Доктора видят только свои записи
      if (user.role === 'DOCTOR') {
        where.doctorId = user.userId;
      } else if (doctorId) {
        where.doctorId = doctorId;
      }

      if (departmentId) {
        where.departmentId = departmentId;
      }

      if (status) {
        where.status = status;
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

      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              blacklist: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              colorBadge: true,
            },
          },
          manager: {
            select: {
              id: true,
              name: true,
              colorBadge: true,
            },
          },
          service: {
            select: {
              id: true,
              code: true,
              name: true,
              price: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          datetime: 'asc',
        },
      });

      // Преобразуем datetime в date и time, и blacklist в isBlacklisted
      const formattedAppointments = appointments.map((apt) => ({
        ...apt,
        date: apt.datetime.toISOString().split('T')[0],
        time: apt.datetime.toTimeString().slice(0, 5),
        patient: {
          ...apt.patient,
          isBlacklisted: apt.patient.blacklist,
        },
      }));

      return successResponse(formattedAppointments);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);

// POST - Создание новой записи
export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createAppointmentSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      // Проверка существования пациента
      const patient = await prisma.patient.findUnique({
        where: { id: data.patientId },
        select: { id: true, fullName: true, blacklist: true, noShowCount: true },
      });

      if (!patient) {
        return errorResponse('Пациент не найден', 'PATIENT_NOT_FOUND', 404);
      }

      // Проверка существования доктора
      const doctor = await prisma.user.findUnique({
        where: { id: data.doctorId, role: 'DOCTOR' },
      });

      if (!doctor) {
        return errorResponse('Доктор не найден', 'DOCTOR_NOT_FOUND', 404);
      }

      // Проверка существования услуги
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId },
      });

      if (!service) {
        return errorResponse('Услуга не найдена', 'SERVICE_NOT_FOUND', 404);
      }

      // Проверка на конфликт времени
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          doctorId: data.doctorId,
          datetime: new Date(data.datetime),
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
        },
      });

      if (conflictingAppointment) {
        return errorResponse(
          'На это время уже есть запись',
          'TIME_CONFLICT',
          409
        );
      }

      // Определение типа визита (первичный/повторный)
      const previousAppointments = await prisma.appointment.count({
        where: {
          patientId: data.patientId,
          status: 'DONE',
        },
      });

      const visitType = previousAppointments > 0 ? 'REPEAT' : 'PRIMARY';

      // Создание записи
      const appointment = await prisma.appointment.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          serviceId: data.serviceId,
          departmentId: data.departmentId,
          datetime: new Date(data.datetime),
          type: visitType,
          comment: data.comment,
          managerId: user.userId,
          prepayment: data.prepayment,
          status: 'PENDING',
        },
        include: {
          patient: {
            select: {
              fullName: true,
              phone: true,
              blacklist: true,
            },
          },
          doctor: {
            select: {
              name: true,
            },
          },
          service: {
            select: {
              name: true,
              price: true,
            },
          },
        },
      });

      // Логирование
      await logCreate(
        user.userId,
        'appointments',
        appointment.id,
        appointment,
        request.headers.get('x-forwarded-for') || undefined
      );

      // WebSocket уведомление
      const { notifyAppointmentCreated } = await import('@/lib/socket/integration');
      await notifyAppointmentCreated(appointment);

      return successResponse(appointment, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'appointments:create'
);
