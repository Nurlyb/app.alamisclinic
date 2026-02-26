/**
 * React хуки для работы с Socket.io
 * Упрощают использование WebSocket на фронтенде
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocketClient, initSocketClient, isSocketConnected } from './client';
import type { TypedSocket } from './client';
import type {
  AppointmentEvent,
  PatientArrivedEvent,
  DirectionEvent,
  NotificationEvent,
} from './events';

/**
 * Хук для инициализации Socket.io клиента
 */
export function useSocket(token: string | null) {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const client = initSocketClient(token);
    setSocket(client);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    client.on('connect', handleConnect);
    client.on('disconnect', handleDisconnect);

    setConnected(client.connected);

    return () => {
      client.off('connect', handleConnect);
      client.off('disconnect', handleDisconnect);
    };
  }, [token]);

  return { socket, connected };
}

/**
 * Хук для подписки на события расписания
 */
export function useScheduleEvents(
  doctorId: string | null,
  callbacks: {
    onCreated?: (appointment: AppointmentEvent) => void;
    onUpdated?: (appointment: AppointmentEvent) => void;
    onCancelled?: (appointment: AppointmentEvent) => void;
  }
) {
  useEffect(() => {
    if (!doctorId || !isSocketConnected()) return;

    const socket = getSocketClient();

    // Подписка на расписание
    socket.emit('join:schedule', doctorId);

    // Обработчики событий
    if (callbacks.onCreated) {
      socket.on('appointment:created', callbacks.onCreated);
    }
    if (callbacks.onUpdated) {
      socket.on('appointment:updated', callbacks.onUpdated);
    }
    if (callbacks.onCancelled) {
      socket.on('appointment:cancelled', callbacks.onCancelled);
    }

    return () => {
      // Отписка от событий
      if (callbacks.onCreated) {
        socket.off('appointment:created', callbacks.onCreated);
      }
      if (callbacks.onUpdated) {
        socket.off('appointment:updated', callbacks.onUpdated);
      }
      if (callbacks.onCancelled) {
        socket.off('appointment:cancelled', callbacks.onCancelled);
      }

      // Отписка от расписания
      socket.emit('leave:schedule', doctorId);
    };
  }, [doctorId, callbacks]);
}

/**
 * Хук для подписки на уведомления о прибытии пациентов
 */
export function usePatientArrivals(
  onArrived: (data: PatientArrivedEvent) => void
) {
  useEffect(() => {
    if (!isSocketConnected()) return;

    const socket = getSocketClient();
    socket.on('patient:arrived', onArrived);

    return () => {
      socket.off('patient:arrived', onArrived);
    };
  }, [onArrived]);
}

/**
 * Хук для подписки на направления
 */
export function useDirectionEvents(
  callbacks: {
    onCreated?: (direction: DirectionEvent) => void;
    onUpdated?: (direction: DirectionEvent) => void;
  }
) {
  useEffect(() => {
    if (!isSocketConnected()) return;

    const socket = getSocketClient();

    if (callbacks.onCreated) {
      socket.on('direction:created', callbacks.onCreated);
    }
    if (callbacks.onUpdated) {
      socket.on('direction:updated', callbacks.onUpdated);
    }

    return () => {
      if (callbacks.onCreated) {
        socket.off('direction:created', callbacks.onCreated);
      }
      if (callbacks.onUpdated) {
        socket.off('direction:updated', callbacks.onUpdated);
      }
    };
  }, [callbacks]);
}

/**
 * Хук для подписки на уведомления
 */
export function useNotifications(
  onNotification: (notification: NotificationEvent) => void
) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    if (!isSocketConnected()) return;

    const socket = getSocketClient();

    const handleNotification = (notification: NotificationEvent) => {
      setNotifications((prev) => [notification, ...prev]);
      onNotification(notification);
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [onNotification]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, clearNotifications };
}

/**
 * Хук для подписки на отделение
 */
export function useDepartmentEvents(
  departmentId: string | null,
  callbacks: {
    onAppointmentCreated?: (appointment: AppointmentEvent) => void;
    onAppointmentUpdated?: (appointment: AppointmentEvent) => void;
  }
) {
  useEffect(() => {
    if (!departmentId || !isSocketConnected()) return;

    const socket = getSocketClient();

    // Подписка на отделение
    socket.emit('join:department', departmentId);

    // Обработчики событий
    if (callbacks.onAppointmentCreated) {
      socket.on('appointment:created', callbacks.onAppointmentCreated);
    }
    if (callbacks.onAppointmentUpdated) {
      socket.on('appointment:updated', callbacks.onAppointmentUpdated);
    }

    return () => {
      // Отписка от событий
      if (callbacks.onAppointmentCreated) {
        socket.off('appointment:created', callbacks.onAppointmentCreated);
      }
      if (callbacks.onAppointmentUpdated) {
        socket.off('appointment:updated', callbacks.onAppointmentUpdated);
      }

      // Отписка от отделения
      socket.emit('leave:department', departmentId);
    };
  }, [departmentId, callbacks]);
}
