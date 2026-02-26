/**
 * Утилиты для работы с паролями
 * Хеширование и верификация паролей с использованием bcrypt
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Хеширование пароля
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Верификация пароля
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Валидация силы пароля
 * Минимум 8 символов, хотя бы одна цифра и одна буква
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Пароль должен содержать минимум 8 символов');
  }

  if (!/\d/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну цифру');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну букву');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
