/**
 * PATCH /api/notifications/[id]/read - Отметить уведомление как прочитанное
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { JWTPayload } from '@/lib/auth/jwt';
import { extractIdFromUrl } from '@/lib/utils/url';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

export const PATCH = withAuth(
  async (request: NextRequest, user: JWTPayload) => {
    try {
      const id = extractIdFromUrl(request.url);

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return notFoundResponse('Уведомление');
      }

      // Проверка, что уведомление принадлежит пользователю
      if (notification.userId !== user.userId) {
        return notFoundResponse('Уведомление');
      }

      const updatedNotification = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return successResponse(updatedNotification);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'notifications:view'
);
