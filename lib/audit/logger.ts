/**
 * Утилиты для логирования действий пользователей
 * Audit Log для отслеживания всех изменений
 */

import { prisma } from '@/lib/db/prisma';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'VIEW'
  | 'APPROVE'
  | 'REJECT'
  | 'PAYMENT'
  | 'REFUND';

interface AuditLogData {
  userId: string;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValue?: any;
  newValue?: any;
  ip?: string;
}

/**
 * Создание записи в audit log
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        tableName: data.tableName,
        recordId: data.recordId,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        ip: data.ip || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Не бросаем ошибку, чтобы не прерывать основной процесс
  }
}

/**
 * Логирование создания записи
 */
export async function logCreate(
  userId: string,
  tableName: string,
  recordId: string,
  newValue: any,
  ip?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'CREATE',
    tableName,
    recordId,
    newValue,
    ip,
  });
}

/**
 * Логирование обновления записи
 */
export async function logUpdate(
  userId: string,
  tableName: string,
  recordId: string,
  oldValue: any,
  newValue: any,
  ip?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'UPDATE',
    tableName,
    recordId,
    oldValue,
    newValue,
    ip,
  });
}

/**
 * Логирование удаления записи
 */
export async function logDelete(
  userId: string,
  tableName: string,
  recordId: string,
  oldValue: any,
  ip?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'DELETE',
    tableName,
    recordId,
    oldValue,
    ip,
  });
}

/**
 * Логирование оплаты
 */
export async function logPayment(
  userId: string,
  recordId: string,
  amount: number,
  method: string,
  ip?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'PAYMENT',
    tableName: 'payments',
    recordId,
    newValue: { amount, method },
    ip,
  });
}

/**
 * Логирование возврата
 */
export async function logRefund(
  userId: string,
  recordId: string,
  amount: number,
  reason: string,
  ip?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'REFUND',
    tableName: 'refunds',
    recordId,
    newValue: { amount, reason },
    ip,
  });
}
