/**
 * Zod схемы валидации для аутентификации
 */

import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().min(10, 'Некорректный номер телефона'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
