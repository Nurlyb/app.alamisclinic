/**
 * Next.js Middleware для защиты маршрутов и CORS
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS headers для всех запросов
  const response = NextResponse.next();
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  // Обработка preflight запросов
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Публичные маршруты (не требуют авторизации)
  const publicPaths = ['/login', '/api/auth/login', '/api/auth/refresh'];
  
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return response;
  }

  // Для API маршрутов проверяем Authorization header или cookie
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('accessToken')?.value;
    
    // Если есть Authorization header или cookie - пропускаем
    // Проверка самого токена будет в withAuth middleware
    if (authHeader || cookieToken) {
      return response;
    }
    
    // Если нет ни того, ни другого - возвращаем 401
    return NextResponse.json(
      { error: 'Не авторизован' },
      { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  // Для страниц (не API) - не редиректим, пусть сами проверяют
  // Это позволит использовать client-side навигацию с токенами в localStorage
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
