/**
 * API для конкретной услуги доктора
 * PUT - обновить услугу (только владелец)
 * DELETE - удалить услугу (только владелец)
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

const updateDoctorServiceSchema = z.object({
  name: z.string().min(1, 'Название обязательно').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PUT - обновить услугу
export const PUT = withAuth(
  async (request, user, { params }) => {
    try {
      const { id } = params;
      const body = await request.json();
      const validation = updateDoctorServiceSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const service = await prisma.doctorService.findUnique({
        where: { id },
      });

      if (!service) {
        return errorResponse('Услуга не найдена', 'SERVICE_NOT_FOUND', 404);
      }

      const updated = await prisma.doctorService.update({
        where: { id },
        data: validation.data,
      });

      return successResponse({ service: updated });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'services:manage'
);

// DELETE - удалить услугу (мягкое удаление)
export const DELETE = withAuth(
  async (request, user, { params }) => {
    try {
      const { id } = params;

      const service = await prisma.doctorService.findUnique({
        where: { id },
      });

      if (!service) {
        return errorResponse('Услуга не найдена', 'SERVICE_NOT_FOUND', 404);
      }

      await prisma.doctorService.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse({ message: 'Услуга удалена' });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'services:manage'
);
