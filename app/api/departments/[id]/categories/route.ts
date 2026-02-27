/**
 * GET /api/departments/[id]/categories - Получение категорий отделения
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
import { extractIdFromUrl } from '@/lib/utils/url';

async function getHandler(request: NextRequest, user: JWTPayload) {
  try {
    // Извлекаем ID отделения (второй сегмент с конца, т.к. последний - "categories")
    const id = extractIdFromUrl(request.url, 2);

    // Проверка существования отделения
    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return notFoundResponse('Отделение');
    }

    // Получение категорий
    const categories = await prisma.serviceCategory.findMany({
      where: { departmentId: id },
      orderBy: { name: 'asc' },
    });

    return successResponse(categories);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const GET = withAuth(getHandler);
