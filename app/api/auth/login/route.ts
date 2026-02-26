/**
 * POST /api/auth/login
 * Вход в систему
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { saveRefreshToken } from '@/lib/redis/client';
import { rateLimit } from '@/lib/auth/middleware';

const loginSchema = z.object({
  phone: z.string().min(10, 'Некорректный номер телефона'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (100 запросов в минуту для dev, 10 для prod)
    const isDev = process.env.NODE_ENV === 'development';
    const rateLimitResult = await rateLimit(isDev ? 100 : 10, 60000)(request);
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Ошибка валидации',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { phone, password } = validation.data;

    // Поиск пользователя по телефону
    const user = await prisma.user.findFirst({
      where: { phone },
      select: {
        id: true,
        name: true,
        role: true,
        departmentId: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный телефон или пароль', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Пользователь неактивен', code: 'USER_INACTIVE' },
        { status: 403 }
      );
    }

    // Проверка пароля
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Неверный телефон или пароль', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // Генерация токенов
    const tokens = generateTokenPair({
      userId: user.id,
      role: user.role,
      name: user.name,
      departmentId: user.departmentId || undefined,
    });

    // Сохранение refresh токена в Redis
    await saveRefreshToken(user.id, tokens.refreshToken);

    // Логирование входа
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        tableName: 'users',
        recordId: user.id,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
      },
      tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
