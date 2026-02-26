/**
 * Интеграция Socket.io с API endpoints
 * Автоматическая отправка событий при изменениях
 */

import {
  emitAppointmentCreated,
  emitAppointmentUpdated,
  emitAppointmentCancelled,
  emitPatientArrived,
  emitDirectionCreated,
  emitDirectionUpdated,
  emitRefundApprovalNeeded,
  emitRefundStatusChanged,
  emitNotification,
  emitNotificationToRole,
  emitAssistantAssigned,
} from './server';

/**
 * Отправка события создания записи
 */
export async function notifyAppointmentCreated(appointment: any) {
  try {
    emitAppointmentCreated(appointment);
  } catch (error) {
    console.error('Failed to emit appointment:created', error);
  }
}

/**
 * Отправка события обновления записи
 */
export async function notifyAppointmentUpdated(appointment: any) {
  try {
    emitAppointmentUpdated(appointment);
  } catch (error) {
    console.error('Failed to emit appointment:updated', error);
  }
}

/**
 * Отправка события отмены записи
 */
export async function notifyAppointmentCancelled(appointment: any) {
  try {
    emitAppointmentCancelled(appointment);
  } catch (error) {
    console.error('Failed to emit appointment:cancelled', error);
  }
}

/**
 * Отправка события прибытия пациента
 */
export async function notifyPatientArrived(appointment: any) {
  try {
    emitPatientArrived(appointment);
  } catch (error) {
    console.error('Failed to emit patient:arrived', error);
  }
}

/**
 * Отправка события создания направления
 */
export async function notifyDirectionCreated(direction: any) {
  try {
    emitDirectionCreated(direction);
  } catch (error) {
    console.error('Failed to emit direction:created', error);
  }
}

/**
 * Отправка события обновления направления
 */
export async function notifyDirectionUpdated(direction: any) {
  try {
    emitDirectionUpdated(direction);
  } catch (error) {
    console.error('Failed to emit direction:updated', error);
  }
}

/**
 * Отправка события запроса одобрения возврата
 */
export async function notifyRefundApprovalNeeded(refund: any) {
  try {
    emitRefundApprovalNeeded(refund);
  } catch (error) {
    console.error('Failed to emit refund:approval_needed', error);
  }
}

/**
 * Отправка события изменения статуса возврата
 */
export async function notifyRefundStatusChanged(refund: any) {
  try {
    emitRefundStatusChanged(refund);
  } catch (error) {
    console.error('Failed to emit refund:status_changed', error);
  }
}

/**
 * Отправка уведомления пользователю
 */
export async function notifyUser(userId: string, notification: any) {
  try {
    emitNotification(userId, notification);
  } catch (error) {
    console.error('Failed to emit notification', error);
  }
}

/**
 * Отправка уведомления роли
 */
export async function notifyRole(role: string, notification: any) {
  try {
    emitNotificationToRole(role, notification);
  } catch (error) {
    console.error('Failed to emit notification to role', error);
  }
}

/**
 * Отправка уведомления ассистенту
 */
export async function notifyAssistantAssigned(appointment: any, assistantId: string) {
  try {
    emitAssistantAssigned(appointment, assistantId);
  } catch (error) {
    console.error('Failed to emit assistant:assigned', error);
  }
}
