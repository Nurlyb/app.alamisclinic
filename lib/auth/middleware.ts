/**
 * Middleware для аутентификации и авторизации
 * Проверка JWT токенов и прав доступа
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JWTPayload } from './jwt';
import { hasPermission, hasAnyPermission, Permission } from './rbac';
import { prisma } from '@/lib/db/prisma';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Извлечение токена из заголовка Authorization
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Middleware для проверки аутентификации
 */
export async function authenticate(
  request: NextRequest
): Promise<{ user: JWTPayload } | NextResponse> {
  const token = extractToken(request);

  if (!token) {
    return NextResponse.json(
      { error: 'Токен не предоставлен', code: 'NO_TOKEN' },
      { status: 401 }
    );
  }

  try {
    const payload = verifyAccessToken(token);

    // Проверяем, что пользователь активен
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Пользователь неактивен', code: 'USER_INACTIVE' },
        { status: 403 }
      );
    }

    return { user: payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    if (message === 'ACCESS_TOKEN_EXPIRED') {
      return NextResponse.json(
        { error: 'Токен истёк', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Недействительный токен', code: 'INVALID_TOKEN' },
      { status: 401 }
    );
  }
}

/**
 * Middleware для проверки прав доступа
 */
export function authorize(permissions: Permission | Permission[]) {
  return async (
    request: NextRequest,
    user: JWTPayload
  ): Promise<true | NextResponse> => {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    // Проверяем наличие хотя бы одного из требуемых прав
    const hasAccess = hasAnyPermission(user.role, requiredPermissions);

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Недостаточно прав доступа',
          code: 'FORBIDDEN',
          required: requiredPermissions,
        },
        { status: 403 }
      );
    }

    return true;
  };
}

/**
 * Комбинированный middleware: аутентификация + авторизация
 */
export function withAuth(
  handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>,
  permissions?: Permission | Permission[]
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Проверка аутентификации
    const authResult = await authenticate(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;

    // Проверка авторизации (если указаны права)
    if (permissions) {
      const authzResult = await authorize(permissions)(request, user);
      if (authzResult instanceof NextResponse) {
        return authzResult;
      }
    }

    // Вызов основного обработчика
    return handler(request, user);
  };
}

/**
 * Rate limiting middleware
 * Ограничение количества запросов с одного IP
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return async (request: NextRequest): Promise<true | NextResponse> => {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();

    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      // Новое окно или истекло время
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return NextResponse.json(
        {
          error: 'Слишком много запросов',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        { status: 429 }
      );
    }

    record.count++;
    return true;
  };
}

/**
 * Middleware для логирования запросов
 */
export async function logRequest(
  request: NextRequest,
  user?: JWTPayload
): Promise<void> {
  const { method, url } = request;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

  console.log({
    timestamp: new Date().toISOString(),
    method,
    url,
    userId: user?.userId,
    role: user?.role,
    ip,
  });
}
