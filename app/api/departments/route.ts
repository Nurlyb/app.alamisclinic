/**
 * GET /api/departments - Получение списка отделений
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, internalErrorResponse } from '@/lib/utils/response';

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
