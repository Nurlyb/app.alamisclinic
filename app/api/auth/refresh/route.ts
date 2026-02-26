/**
 * POST /api/auth/refresh
 * Обновление access токена с помощью refresh токена
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRefreshToken, generateAccessToken } from '@/lib/auth/jwt';
import { getRefreshToken } from '@/lib/redis/client';
import { prisma } from '@/lib/db/prisma';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh токен обязателен'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = refreshSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Ошибка валидации',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { refreshToken } = validation.data;

    // Верификация refresh токена
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      return NextResponse.json(
        { error: 'Недействительный refresh токен', code: message },
        { status: 401 }
      );
    }

    // Проверка наличия токена в Redis
    const storedToken = await getRefreshToken(payload.userId);
    if (!storedToken || storedToken !== refreshToken) {
      return NextResponse.json(
        { error: 'Refresh токен не найден или недействителен', code: 'TOKEN_NOT_FOUND' },
        { status: 401 }
      );
    }

    // Проверка активности пользователя
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        role: true,
        departmentId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Пользователь неактивен', code: 'USER_INACTIVE' },
        { status: 403 }
      );
    }

    // Генерация нового access токена
    const newAccessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      departmentId: user.departmentId || undefined,
    });

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
