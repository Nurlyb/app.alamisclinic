/**
 * API для получения отделений услуги доктора
 * GET - получить отделения услуги
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';

// GET - получить отделения услуги доктора
export const GET = withAuth(
  async (request, user) => {
    try {
      const { pathname } = new URL(request.url);
      const id = pathname.split('/').slice(-2, -1)[0]; // Извлекаем ID из URL

      const service = await prisma.doctorService.findUnique({
        where: { id },
        include: {
          departments: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!service) {
        return notFoundResponse('Услуга не найдена');
      }

      const departments = service.departments.map(dept => dept.department);

      return successResponse({ departments });
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['services:manage'] // Только владелец может просматривать
);