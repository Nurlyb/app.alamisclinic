/**
 * GET /api/auth/me
 * Получение информации о текущем пользователе
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getRolePermissions } from '@/lib/auth/rbac';

export const GET = withAuth(async (request, user) => {
  try {
    // Получение полной информации о пользователе
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
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

    if (!userData) {
      return NextResponse.json(
        { error: 'Пользователь не найден', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Получение прав доступа
    const permissions = getRolePermissions(userData.role);

    return NextResponse.json({
      success: true,
      user: userData,
      permissions,
    });
  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
