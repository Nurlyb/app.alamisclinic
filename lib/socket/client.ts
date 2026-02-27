/**
 * Socket.io Client для использования на фронтенде
 * Типизированный клиент с автоматическим переподключением
 */

import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from './events';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

/**
 * Инициализация Socket.io клиента
 */
export function initSocketClient(token: string): TypedSocket {
  if (socket?.connected) {
    return socket;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  socket = io(socketUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // Обработка подключения
  socket.on('connect', () => {
    console.log('✅ Socket.io подключён');
  });

  // Обработка отключения
  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.io отключён:', reason);
  });

  // Обработка ошибок (тихо, без вывода в консоль)
  socket.on('error', (error) => {
    // Игнорируем ошибки, т.к. WebSocket сервер не запущен
  });

  // Обработка ошибок подключения (тихо, без вывода в консоль)
  socket.on('connect_error', (error) => {
    // Игнорируем ошибки подключения, т.к. WebSocket сервер не запущен
  });

  return socket;
}

/**
 * Получение экземпляра Socket.io клиента
 */
export function getSocketClient(): TypedSocket {
  if (!socket) {
    throw new Error('Socket.io клиент не инициализирован. Вызовите initSocketClient() сначала.');
  }
  return socket;
}

/**
 * Отключение Socket.io клиента
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket.io клиент отключён');
  }
}

/**
 * Проверка подключения
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

// ============================================
// ХЕЛПЕРЫ ДЛЯ ПОДПИСОК
// ============================================

/**
 * Подписка на расписание доктора
 */
export function subscribeToSchedule(doctorId: string) {
  const client = getSocketClient();
  client.emit('join:schedule', doctorId);
}

/**
 * Отписка от расписания доктора
 */
export function unsubscribeFromSchedule(doctorId: string) {
  const client = getSocketClient();
  client.emit('leave:schedule', doctorId);
}

/**
 * Подписка на отделение
 */
export function subscribeToDepartment(departmentId: string) {
  const client = getSocketClient();
  client.emit('join:department', departmentId);
}

/**
 * Отписка от отделения
 */
export function unsubscribeFromDepartment(departmentId: string) {
  const client = getSocketClient();
  client.emit('leave:department', departmentId);
}
