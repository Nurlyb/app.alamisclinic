/**
 * JWT утилиты для аутентификации
 * Генерация и верификация access и refresh токенов
 */

import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  role: Role;
  name: string;
  departmentId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Генерация access токена
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'clinic-management-system',
    audience: 'clinic-api',
  });
}

/**
 * Генерация refresh токена
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'clinic-management-system',
    audience: 'clinic-api',
  });
}

/**
 * Генерация пары токенов (access + refresh)
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Верификация access токена
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'clinic-management-system',
      audience: 'clinic-api',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('ACCESS_TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('INVALID_ACCESS_TOKEN');
    }
    throw new Error('TOKEN_VERIFICATION_FAILED');
  }
}

/**
 * Верификация refresh токена
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'clinic-management-system',
      audience: 'clinic-api',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    throw new Error('TOKEN_VERIFICATION_FAILED');
  }
}

/**
 * Декодирование токена без верификации (для отладки)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
