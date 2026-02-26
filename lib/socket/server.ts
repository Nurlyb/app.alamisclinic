/**
 * Socket.io Server для real-time обновлений
 * Поддержка событий: расписание, уведомления, направления
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, JWTPayload } from '@/lib/auth/jwt';

export interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

let io: SocketIOServer | null = null;

/**
 * Инициализация Socket.io сервера
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  // Middleware для аутентификации
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('NO_TOKEN'));
      }

      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch (error) {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return;

    console.log(`✅ Socket connected: ${user.name} (${user.role})`);

    // Присоединение к комнатам на основе роли
    socket.join(`user:${user.userId}`);
    socket.join(`role:${user.role}`);

    if (user.departmentId) {
      socket.join(`department:${user.departmentId}`);
    }

    // Подписка на расписание конкретного доктора
    socket.on('join:schedule', (doctorId: string) => {
      // Доктора могут подписаться только на своё расписание
      if (user.role === 'DOCTOR' && doctorId !== user.userId) {
        socket.emit('error', { message: 'Нет доступа к этому расписанию' });
        return;
      }

      socket.join(`schedule:${doctorId}`);
      console.log(`📅 ${user.name} подписался на расписание доктора ${doctorId}`);
    });

    // Подписка на отделение
    socket.on('join:department', (departmentId: string) => {
      socket.join(`department:${departmentId}`);
      console.log(`🏥 ${user.name} подписался на отделение ${departmentId}`);
    });

    // Отписка от расписания
    socket.on('leave:schedule', (doctorId: string) => {
      socket.leave(`schedule:${doctorId}`);
      console.log(`📅 ${user.name} отписался от расписания доктора ${doctorId}`);
    });

    // Отписка от отделения
    socket.on('leave:department', (departmentId: string) => {
      socket.leave(`department:${departmentId}`);
      console.log(`🏥 ${user.name} отписался от отделения ${departmentId}`);
    });

    // Отключение
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${user.name}`);
    });
  });

  console.log('🚀 Socket.io сервер запущен');
  return io;
}

/**
 * Получение экземпляра Socket.io сервера
 */
export function getSocketServer(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io сервер не инициализирован');
  }
  return io;
}

// ============================================
// СОБЫТИЯ - РАСПИСАНИЕ
// ============================================

/**
 * Уведомление о создании записи
 */
export function emitAppointmentCreated(appointment: any) {
  if (!io) return;

  // Отправка всем, кто подписан на расписание этого доктора
  io.to(`schedule:${appointment.doctorId}`).emit('appointment:created', appointment);

  // Отправка в отделение
  io.to(`department:${appointment.departmentId}`).emit('appointment:created', appointment);

  console.log(`📅 Событие: appointment:created для доктора ${appointment.doctorId}`);
}

/**
 * Уведомление об обновлении записи
 */
export function emitAppointmentUpdated(appointment: any) {
  if (!io) return;

  io.to(`schedule:${appointment.doctorId}`).emit('appointment:updated', appointment);
  io.to(`department:${appointment.departmentId}`).emit('appointment:updated', appointment);

  console.log(`📅 Событие: appointment:updated для записи ${appointment.id}`);
}

/**
 * Уведомление об отмене записи
 */
export function emitAppointmentCancelled(appointment: any) {
  if (!io) return;

  io.to(`schedule:${appointment.doctorId}`).emit('appointment:cancelled', appointment);
  io.to(`department:${appointment.departmentId}`).emit('appointment:cancelled', appointment);

  console.log(`📅 Событие: appointment:cancelled для записи ${appointment.id}`);
}

// ============================================
// СОБЫТИЯ - ПАЦИЕНТЫ
// ============================================

/**
 * Уведомление о прибытии пациента
 */
export function emitPatientArrived(appointment: any) {
  if (!io) return;

  // Уведомление доктору
  io.to(`user:${appointment.doctorId}`).emit('patient:arrived', {
    appointmentId: appointment.id,
    patientName: appointment.patient?.fullName,
    datetime: appointment.datetime,
  });

  // Обновление расписания
  io.to(`schedule:${appointment.doctorId}`).emit('appointment:updated', appointment);

  console.log(`🚶 Событие: patient:arrived для доктора ${appointment.doctorId}`);
}

// ============================================
// СОБЫТИЯ - НАПРАВЛЕНИЯ
// ============================================

/**
 * Уведомление о создании направления
 */
export function emitDirectionCreated(direction: any) {
  if (!io) return;

  // Уведомление операторам
  io.to('role:OPERATOR').emit('direction:created', direction);

  // Уведомление целевому доктору
  io.to(`user:${direction.toDoctorId}`).emit('direction:created', direction);

  console.log(`📋 Событие: direction:created от ${direction.fromDoctorId} к ${direction.toDoctorId}`);
}

/**
 * Уведомление об обновлении статуса направления
 */
export function emitDirectionUpdated(direction: any) {
  if (!io) return;

  // Уведомление докторам
  if (direction.fromDoctorId) {
    io.to(`user:${direction.fromDoctorId}`).emit('direction:updated', direction);
  }
  io.to(`user:${direction.toDoctorId}`).emit('direction:updated', direction);

  // Уведомление операторам
  io.to('role:OPERATOR').emit('direction:updated', direction);

  console.log(`📋 Событие: direction:updated для направления ${direction.id}`);
}

// ============================================
// СОБЫТИЯ - ВОЗВРАТЫ
// ============================================

/**
 * Уведомление о запросе на одобрение возврата
 */
export function emitRefundApprovalNeeded(refund: any) {
  if (!io) return;

  // Уведомление владельцу
  io.to('role:OWNER').emit('refund:approval_needed', refund);

  console.log(`💰 Событие: refund:approval_needed для возврата ${refund.id}`);
}

/**
 * Уведомление об одобрении/отклонении возврата
 */
export function emitRefundStatusChanged(refund: any) {
  if (!io) return;

  // Уведомление инициатору
  io.to(`user:${refund.requestedBy}`).emit('refund:status_changed', refund);

  console.log(`💰 Событие: refund:status_changed для возврата ${refund.id}`);
}

// ============================================
// СОБЫТИЯ - УВЕДОМЛЕНИЯ
// ============================================

/**
 * Отправка уведомления конкретному пользователю
 */
export function emitNotification(userId: string, notification: any) {
  if (!io) return;

  io.to(`user:${userId}`).emit('notification:new', notification);

  console.log(`🔔 Событие: notification:new для пользователя ${userId}`);
}

/**
 * Отправка уведомления роли
 */
export function emitNotificationToRole(role: string, notification: any) {
  if (!io) return;

  io.to(`role:${role}`).emit('notification:new', notification);

  console.log(`🔔 Событие: notification:new для роли ${role}`);
}

// ============================================
// СОБЫТИЯ - АССИСТЕНТ
// ============================================

/**
 * Уведомление ассистенту о взятии пациента в работу
 */
export function emitAssistantAssigned(appointment: any, assistantId: string) {
  if (!io) return;

  io.to(`user:${assistantId}`).emit('assistant:assigned', {
    appointmentId: appointment.id,
    patientName: appointment.patient?.fullName,
    doctorName: appointment.doctor?.name,
  });

  console.log(`👨‍⚕️ Событие: assistant:assigned для ассистента ${assistantId}`);
}

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Получение количества подключённых клиентов
 */
export async function getConnectedClientsCount(): Promise<number> {
  if (!io) return 0;
  const sockets = await io.fetchSockets();
  return sockets.length;
}

/**
 * Получение списка подключённых пользователей
 */
export async function getConnectedUsers(): Promise<Array<{ userId: string; name: string; role: string }>> {
  if (!io) return [];

  const sockets = await io.fetchSockets();
  return sockets
    .map((socket: any) => socket.user)
    .filter((user: any) => user !== undefined);
}

/**
 * Отключение всех клиентов (для graceful shutdown)
 */
export function disconnectAllClients() {
  if (!io) return;
  io.disconnectSockets();
  console.log('🔌 Все Socket.io клиенты отключены');
}
