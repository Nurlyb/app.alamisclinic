/**
 * GET /api/users - Получение списка пользователей
 * POST /api/users - Создание пользователя (только OWNER)
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { createUserSchema } from '@/lib/validation/schemas';
import { hashPassword } from '@/lib/auth/password';
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logCreate } from '@/lib/audit/logger';

// GET - Получение списка пользователей
export const GET = withAuth(
  async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const role = searchParams.get('role');
      const departmentId = searchParams.get('departmentId');
      const isActive = searchParams.get('isActive');

      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (departmentId) {
        where.departmentId = departmentId;
      }

      if (isActive !== null) {
        where.isActive = isActive === 'true';
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          role: true,
          departmentId: true,
          colorBadge: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return successResponse(users);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  ['users:manage', 'appointments:create'] // Разрешаем просмотр тем, кто может создавать записи
);

// POST - Создание пользователя
export const POST = withAuth(
  async (request, user) => {
    try {
      const body = await request.json();
      const validation = createUserSchema.safeParse(body);

      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }

      const data = validation.data;

      // Проверка на дубликат телефона
      const existingUser = await prisma.user.findFirst({
        where: { phone: data.phone },
      });

      if (existingUser) {
        return errorResponse(
          'Пользователь с таким телефоном уже существует',
          'DUPLICATE_PHONE',
          409
        );
      }

      // Хеширование пароля
      const passwordHash = await hashPassword(data.password);

      // Создание пользователя
      const newUser = await prisma.user.create({
        data: {
          name: data.name,
          role: data.role,
          departmentId: data.departmentId,
          colorBadge: data.colorBadge,
          phone: data.phone,
          passwordHash,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          role: true,
          departmentId: true,
          colorBadge: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });

      await logCreate(
        user.userId,
        'users',
        newUser.id,
        newUser,
        request.headers.get('x-forwarded-for') || undefined
      );

      return successResponse(newUser, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  },
  'users:manage'
);
