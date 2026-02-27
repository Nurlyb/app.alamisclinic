/**
 * GET /api/services/[id] - Получение услуги по ID
 * PUT /api/services/[id] - Обновление услуги
 * DELETE /api/services/[id] - Удаление (деактивация) услуги
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { updateServiceSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logUpdate, logDelete } from '@/lib/audit/logger';
import { extractIdFromUrl } from '@/lib/utils/url';

// GET - Получение услуги по ID
async function getHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
      },
    });

    if (!service) {
      return notFoundResponse('Услуга');
    }

    return successResponse(service);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const GET = withAuth(getHandler);

// PUT - Обновление услуги
async function putHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);
    const body = await request.json();

    const validation = updateServiceSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const data = validation.data;

    // Получение текущей услуги
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      return notFoundResponse('Услуга');
    }

    // Обновление услуги
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.departmentId && { departmentId: data.departmentId }),
        ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        category: true,
        department: true,
      },
    });

    // Логирование
    await logUpdate(
      user.userId,
      'services',
      id,
      existingService,
      updatedService,
      request.headers.get('x-forwarded-for') || undefined
    );

    return successResponse(updatedService);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const PUT = withAuth(putHandler, 'services:manage');
export const PATCH = withAuth(putHandler, 'services:manage');

// DELETE - Деактивация услуги
async function deleteHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      return notFoundResponse('Услуга');
    }

    // Мягкое удаление - деактивация
    const deactivatedService = await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });

    // Логирование
    await logDelete(
      user.userId,
      'services',
      id,
      existingService,
      request.headers.get('x-forwarded-for') || undefined
    );

    return successResponse({
      message: 'Услуга деактивирована',
      service: deactivatedService,
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const DELETE = withAuth(deleteHandler, 'services:manage');
