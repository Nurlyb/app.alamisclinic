/**
 * GET /api/directions - Получение списка направлений
 * POST /api/directions - Создание направления
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { createDirectionSchema, directionQuerySchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logCreate } from '@/lib/audit/logger';

// GET - Получение списка направлений
export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryValidation = directionQuerySchema.safeParse({
        status: searchParams.get('status') || undefined,
        doctorId: searchParams.get('doctorId') || undefined,
        patientId: searchParams.get('patientId') || undefined,
      });

      if (!queryValidation.success) {
        return validationErrorResponse(queryValidation.error);
      }

      const { status, doctorId, patientId } = queryValidation.data;

      const where: any = {};

      // Доктора видят только свои направления
      if (user.role === 'DOCTOR') {
        where.OR = [
          { fromDoctorId: user.userId },
          { toDoctorId: user.userId },
        ];
      } else if (doctorId) {
        where.OR = [
          { fromDoctorId: doctorId },
          { toDoctorId: doctorId },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (patientId) {
        where.patientId = patientId;
      }

      const directions = await prisma.direction.findMany({
        where,
        include: {
          fromDoctor: {
            select: {
              name: true,
              departmentId: true,
            },
          },
          toDoctor: {
            select: {
              name: true,
              departmentId: true,
            },
          },
          patient: {
            select: {
              fullName: true,
              phone: true,
            },
          },
          service: {
            select: {
              name: true,
              price: true,
            },
          },
          appointment: {
            select: {
              datetime: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return successResponse(directions);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['directions:view:all', 'directions:view:own']
);

// POST - Создание направления
export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createDirectionSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      // Проверка существования записи
      const appointment = await prisma.appointment.findUnique({
        where: { id: data.appointmentId },
      });

      if (!appointment) {
        return errorResponse('Запись не найдена', 'APPOINTMENT_NOT_FOUND', 404);
      }

      // Проверка, что направление ещё не создано для этой записи
      const existingDirection = await prisma.direction.findUnique({
        where: { appointmentId: data.appointmentId },
      });

      if (existingDirection) {
        return errorResponse('Направление уже создано для этой записи', 'DIRECTION_EXISTS', 409);
      }

      // Создание направления
      const direction = await prisma.direction.create({
        data: {
          appointmentId: data.appointmentId,
          fromDoctorId: data.fromDoctorId,
          toDoctorId: data.toDoctorId,
          patientId: data.patientId,
          serviceId: data.serviceId,
          comment: data.comment,
          urgency: data.urgency,
          status: 'CREATED',
        },
        include: {
          fromDoctor: {
            select: {
              name: true,
            },
          },
          toDoctor: {
            select: {
              name: true,
            },
          },
          patient: {
            select: {
              fullName: true,
              phone: true,
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

      // Создание уведомления для оператора
      const operators = await prisma.user.findMany({
        where: { role: 'OPERATOR', isActive: true },
        select: { id: true },
      });

      await Promise.all(
        operators.map((operator) =>
          prisma.notification.create({
            data: {
              userId: operator.id,
              type: 'direction:created',
              title: 'Новое направление',
              message: `Направление: ${direction.patient.fullName} → ${direction.toDoctor.name}`,
              link: `/directions/${direction.id}`,
            },
          })
        )
      );

      // Логирование
      await logCreate(
        user.userId,
        'directions',
        direction.id,
        direction,
        request.headers.get('x-forwarded-for') || undefined
      );

      // WebSocket уведомление
      const { notifyDirectionCreated } = await import('@/lib/socket/integration');
      await notifyDirectionCreated(direction);

      return successResponse(direction, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'directions:create'
);
