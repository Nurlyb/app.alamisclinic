/**
 * GET /api/departments/[id] - Получение отделения по ID
 * PUT /api/departments/[id] - Обновление отделения
 * DELETE /api/departments/[id] - Удаление (деактивация) отделения
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logUpdate, logDelete } from '@/lib/audit/logger';
import { extractIdFromUrl } from '@/lib/utils/url';

// GET - Получение отделения по ID
async function getHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            services: true,
          },
        },
      },
    });

    if (!department) {
      return notFoundResponse('Отделение');
    }

    return successResponse(department);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const GET = withAuth(getHandler);

// PUT - Обновление отделения
async function putHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);
    const body = await request.json();

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      return notFoundResponse('Отделение');
    }

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    await logUpdate(
      user.userId,
      'departments',
      id,
      existingDepartment,
      updatedDepartment,
      request.headers.get('x-forwarded-for') || undefined
    );

    return successResponse(updatedDepartment);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const PUT = withAuth(putHandler, 'departments:manage');
export const PATCH = withAuth(putHandler, 'departments:manage');

// DELETE - Деактивация отделения
async function deleteHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      return notFoundResponse('Отделение');
    }

    const deactivatedDepartment = await prisma.department.update({
      where: { id },
      data: { isActive: false },
    });

    await logDelete(
      user.userId,
      'departments',
      id,
      existingDepartment,
      request.headers.get('x-forwarded-for') || undefined
    );

    return successResponse({
      message: 'Отделение деактивировано',
      department: deactivatedDepartment,
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const DELETE = withAuth(deleteHandler, 'departments:manage');
