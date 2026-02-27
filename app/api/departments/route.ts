/**
 * GET /api/departments - Получение списка отделений
 * POST /api/departments - Создание отделения
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { 
  successResponse, 
  validationErrorResponse,
  internalErrorResponse 
} from '@/lib/utils/response';
import { logCreate } from '@/lib/audit/logger';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  isActive: z.boolean().default(true),
});

export const GET = withAuth(async (request, user) => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
      },
      include: {
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return successResponse(departments);
  } catch (error) {
    return internalErrorResponse(error);
  }
});

// POST - Создание отделения
async function postHandler(request: NextRequest, user: JWTPayload) {
  try {
    const body = await request.json();
    const validation = createDepartmentSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const data = validation.data;

    const department = await prisma.department.create({
      data: {
        name: data.name,
        isActive: data.isActive,
      },
    });

    await logCreate(
      user.userId,
      'departments',
      department.id,
      department,
      request.headers.get('x-forwarded-for') || undefined
    );

    return successResponse(department, 201);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const POST = withAuth(postHandler, 'departments:manage');
