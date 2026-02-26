/**
 * GET /api/services - Получение списка услуг
 * POST /api/services - Создание услуги (только OWNER)
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { createServiceSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logCreate } from '@/lib/audit/logger';

// GET - Получение списка услуг
export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const categoryId = searchParams.get('categoryId');
    const isActive = searchParams.get('isActive');

    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ departmentId: 'asc' }, { code: 'asc' }],
    });

    return successResponse(services);
  } catch (error) {
    return internalErrorResponse(error);
  }
});

// POST - Создание услуги
export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createServiceSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      const service = await prisma.service.create({
        data: {
          code: data.code,
          name: data.name,
          price: data.price,
          categoryId: data.categoryId,
          departmentId: data.departmentId,
          durationMin: data.durationMin,
          isActive: data.isActive,
        },
        include: {
          category: {
            select: {
              name: true,
            },
          },
          department: {
            select: {
              name: true,
            },
          },
        },
      });

      await logCreate(
        user.userId,
        'services',
        service.id,
        service,
        request.headers.get('x-forwarded-for') || undefined
      );

      return successResponse(service, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'services:manage'
);
