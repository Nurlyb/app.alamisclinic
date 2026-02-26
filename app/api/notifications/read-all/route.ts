/**
 * PATCH /api/notifications/read-all - Отметить все уведомления как прочитанные
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, internalErrorResponse } from '@/lib/utils/response';

export const PATCH = withAuth(async (request, user) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return successResponse({
      message: 'Все уведомления отмечены как прочитанные',
      count: result.count,
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}, 'notifications:view');
