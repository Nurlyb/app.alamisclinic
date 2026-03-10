/**
 * API для назначения операций пациентам
 * GET - получить назначения (для доктора/ассистента - только свои)
 * POST - назначить операцию пациенту
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

const createAssignmentSchema = z.object({
  patientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  price: z.number().positive('Цена должна быть положительной'),
  notes: z.string().optional(),
  scheduledDate: z.string().optional(),
});

// GET - получить назначения
export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');

      let where: any = {};

      // Доктор видит только свои назначения
      if (user.role === 'DOCTOR') {
        where.doctorId = user.userId;
      }

      // Ассистент видит назначения своего доктора
      if (user.role === 'ASSISTANT') {
        const assistant = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { assistingDoctorId: true },
        });

        if (assistant?.assistingDoctorId) {
          where.doctorId = assistant.assistingDoctorId;
        }
      }

      // Фильтр по пациенту
      if (patientId) {
        where.patientId = patientId;
      }

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
          service: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return successResponse({ assignments });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);

// POST - назначить операцию
export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createAssignmentSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const { patientId, serviceId, price, notes, scheduledDate } = validation.data;

      // Проверка существования пациента
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        return errorResponse('Пациент не найден', 'PATIENT_NOT_FOUND', 404);
      }

      // Проверка существования услуги
      const service = await prisma.doctorService.findUnique({
        where: { id: serviceId },
      });

      if (!service || !service.isActive) {
        return errorResponse('Услуга не найдена', 'SERVICE_NOT_FOUND', 404);
      }

      // Определяем ID доктора
      let doctorId = user.userId;

      // Если это ассистент, берем ID его доктора
      if (user.role === 'ASSISTANT') {
        const assistant = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { assistingDoctorId: true },
        });

        if (!assistant?.assistingDoctorId) {
          return errorResponse(
            'Ассистент не привязан к доктору',
            'ASSISTANT_NO_DOCTOR',
            400
          );
        }

        doctorId = assistant.assistingDoctorId;
      }

      // Создаем назначение
      const assignment = await prisma.doctorServiceAssignment.create({
        data: {
          patientId,
          doctorId,
          serviceId,
          price,
          notes,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          service: true,
        },
      });

      return successResponse({ assignment }, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['appointments:view:all', 'appointments:view:own']
);
