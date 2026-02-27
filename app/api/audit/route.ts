/**
 * GET /api/audit - Получение журнала аудита
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

async function getHandler(request: NextRequest, user: JWTPayload) {
  try {
    // Только OWNER может просматривать журнал аудита
    if (user.role !== 'OWNER') {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const tableName = searchParams.get('tableName');

    const skip = (page - 1) * limit;

    // Фильтры
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (tableName) where.tableName = tableName;

    // Получение записей
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return successResponse({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const GET = withAuth(getHandler);
