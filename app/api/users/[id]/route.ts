/**
 * GET /api/users/[id] - Получение пользователя по ID
 * PUT /api/users/[id] - Обновление пользователя
 * DELETE /api/users/[id] - Удаление (деактивация) пользователя
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { JWTPayload } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { updateUserSchema } from '@/lib/validation/schemas';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/utils/response';
import { logUpdate, logDelete } from '@/lib/audit/logger';
import { extractIdFromUrl } from '@/lib/utils/url';

// GET - Получение пользователя по ID
async function getHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

    const foundUser = await prisma.user.findUnique({
      where: { id },
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

    if (!foundUser) {
      return notFoundResponse('Пользователь');
    }

    return successResponse(foundUser);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const GET = withAuth(getHandler, 'users:manage');

// PUT - Обновление пользователя
async function putHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);
    const body = await request.json();

    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const data = validation.data;

    // Получение текущего пользователя
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse('Пользователь');
    }

    // Проверка на дубликат телефона (если телефон изменился)
    if (data.phone && data.phone !== existingUser.phone) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          phone: data.phone,
          id: { not: id },
        },
      });

      if (duplicateUser) {
        return errorResponse(
          'Пользователь с таким телефоном уже существует',
          'DUPLICATE_PHONE',
          409
        );
      }
    }

    // Обновление пользователя
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.role && { role: data.role }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.colorBadge && { colorBadge: data.colorBadge }),
        ...(data.phone && { phone: data.phone }),
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

    // Логирование
    await logUpdate(
      user.userId,
      'users',
      id,
      existingUser,
      updatedUser,
      request.headers.get('x-forwarded-for') || undefined
    );

    return successResponse(updatedUser);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const PUT = withAuth(putHandler, 'users:manage');
export const PATCH = withAuth(putHandler, 'users:manage');

// DELETE - Деактивация пользователя
async function deleteHandler(request: NextRequest, user: JWTPayload) {
  try {
    const id = extractIdFromUrl(request.url);

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse('Пользователь');
    }

    // Нельзя удалить самого себя
    if (id === user.userId) {
      return errorResponse(
        'Нельзя удалить самого себя',
        'CANNOT_DELETE_SELF',
        400
      );
    }

    // Мягкое удаление - деактивация
    const deactivatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Логирование
    await logDelete(
      user.userId,
      'users',
      id,
      existingUser,
      request.headers.get('x-forwarded-for') || undefined
    );

    return successResponse({
      message: 'Пользователь деактивирован',
      user: deactivatedUser,
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export const DELETE = withAuth(deleteHandler, 'users:manage');
