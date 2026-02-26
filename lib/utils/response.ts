/**
 * Утилиты для стандартизированных API ответов
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Успешный ответ
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Ответ с ошибкой
 */
export function errorResponse(
  message: string,
  code: string = 'ERROR',
  status: number = 400,
  details?: any
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      ...(details && { details }),
    },
    { status }
  );
}

/**
 * Ответ с ошибкой валидации Zod
 */
export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: 'Ошибка валидации',
      code: 'VALIDATION_ERROR',
      details: error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    },
    { status: 400 }
  );
}

/**
 * Ответ "не найдено"
 */
export function notFoundResponse(resource: string = 'Ресурс') {
  return NextResponse.json(
    {
      success: false,
      error: `${resource} не найден`,
      code: 'NOT_FOUND',
    },
    { status: 404 }
  );
}

/**
 * Ответ "нет доступа"
 */
export function forbiddenResponse(message: string = 'Недостаточно прав доступа') {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'FORBIDDEN',
    },
    { status: 403 }
  );
}

/**
 * Ответ "не авторизован"
 */
export function unauthorizedResponse(message: string = 'Требуется авторизация') {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  );
}

/**
 * Ответ "внутренняя ошибка сервера"
 */
export function internalErrorResponse(error?: any) {
  console.error('Internal server error:', error);
  return NextResponse.json(
    {
      success: false,
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Ответ с пагинацией
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
}
