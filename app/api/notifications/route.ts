/**
 * GET /api/notifications - Получение уведомлений пользователя
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, internalErrorResponse } from '@/lib/utils/response';

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      userId: user.userId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.userId,
        isRead: false,
      },
    });

    return successResponse({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
});
