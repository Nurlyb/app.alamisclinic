/**
 * POST /api/auth/logout
 * Выход из системы (удаление refresh токена)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { deleteRefreshToken } from '@/lib/redis/client';
import { prisma } from '@/lib/db/prisma';

export const POST = withAuth(async (request, user) => {
  try {
    // Удаление refresh токена из Redis
    await deleteRefreshToken(user.userId);

    // Логирование выхода
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'LOGOUT',
        tableName: 'users',
        recordId: user.userId,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Выход выполнен успешно',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
